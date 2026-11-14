import { describe, expect, it, vi } from "vitest";
import rulesJson from "../../data/rules.json";
import syntheticJson from "../../data/synthetic_history.json";
import { evaluate } from "../../rules/engine";
import { loadRules } from "../../rules/loadRules";
import { checkEntry } from "../input-check/inputCheck";
import { computeBaselines } from "../personal-baseline/baseline";
import {
  SyntheticDataError,
  createHistoryStore,
  loadSyntheticDataset,
} from "./historyStore";
import {
  DEMO_DAY,
  MISSION_DAY1,
  addDays,
  getToday,
  missionDateForDay,
  missionDayForDate,
} from "./missionClock";

type GeneratorModule = { buildSyntheticDataset: () => unknown };

async function loadGenerator(): Promise<GeneratorModule> {
  // @ts-ignore -- plain Node ESM script outside the TypeScript project
  const module = await import("../../../scripts/generate-synthetic.mjs");
  return module as GeneratorModule;
}

const dataset = loadSyntheticDataset(syntheticJson);
const rules = loadRules(rulesJson);

function indicator(result: ReturnType<typeof evaluate>, id: string) {
  const found = result.indicators.find((item) => item.indicator_id === id);
  if (!found) {
    throw new Error(`Missing indicator ${id}`);
  }
  return found;
}

function historyValue(date: string, metric: string): number {
  const reading = dataset.history.readings.find(
    (item) => item.date === date && item.metric === metric,
  );
  if (!reading) {
    throw new Error(`Missing reading ${metric} on ${date}`);
  }
  return reading.value;
}

describe("synthetic dataset", () => {
  it("criterion 1: generator is deterministic and matches the committed file", async () => {
    const { buildSyntheticDataset } = await loadGenerator();
    const first = JSON.stringify(buildSyntheticDataset(), null, 2) + "\n";
    const second = JSON.stringify(buildSyntheticDataset(), null, 2) + "\n";

    expect(second).toBe(first);
    expect(first).toBe(JSON.stringify(syntheticJson, null, 2) + "\n");
  });

  it("criterion 2: label is explicit and the loader rejects synthetic: false", () => {
    expect(dataset.synthetic).toBe(true);
    expect(dataset.label).toContain("SYNTHETIC");

    const copy = JSON.parse(JSON.stringify(syntheticJson));
    copy.synthetic = false;
    expect(() => loadSyntheticDataset(copy)).toThrow(SyntheticDataError);
  });

  it("criterion 3: expected counts", () => {
    expect(dataset.preflight.readings).toHaveLength(35);
    expect(dataset.history.readings).toHaveLength(351);
    expect(Object.keys(dataset.history.flags_by_date)).toHaveLength(39);
    expect(
      Object.values(dataset.history.flags_by_date).every(
        (flags) => Array.isArray(flags) && flags.length === 0,
      ),
    ).toBe(true);
    expect(dataset.day40_checkup.readings).toHaveLength(9);
  });

  it("criterion 4: dates and mission clock", () => {
    expect(dataset.history.readings[0].date).toBe("2026-10-06");
    expect(dataset.history.readings[dataset.history.readings.length - 1].date).toBe("2026-11-13");
    expect(MISSION_DAY1).toBe("2026-10-06");
    expect(DEMO_DAY).toBe(40);
    expect(missionDateForDay(40)).toBe("2026-11-14");
    expect(missionDayForDate("2026-10-06")).toBe(1);
    expect(getToday()).toBe("2026-11-14");
    expect(addDays("2026-10-06", 39)).toBe("2026-11-14");
  });

  it("criterion 5: story values", () => {
    expect(historyValue("2026-11-12", "heart_rate")).toBe(62);
    expect(historyValue("2026-11-13", "heart_rate")).toBe(76);
    expect(
      dataset.day40_checkup.readings.find((reading) => reading.metric === "heart_rate")?.value,
    ).toBe(80);

    const sleepDates = [
      "2026-11-08",
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
    ];
    expect(sleepDates.map((date) => historyValue(date, "sleep_hours"))).toEqual([
      7, 6.5, 6.5, 7, 6.5, 6,
    ]);
    expect(
      dataset.day40_checkup.readings.find((reading) => reading.metric === "sleep_hours")?.value,
    ).toBe(6.5);

    expect(historyValue("2026-10-06", "body_mass")).toBe(70);
    expect(
      dataset.day40_checkup.readings.find((reading) => reading.metric === "body_mass")?.value,
    ).toBe(69.1);
  });

  it("criterion 6: evaluates the Day-40 story with baseline and rules", () => {
    const today = "2026-11-14";
    const store = createHistoryStore(dataset, { includeDay40: true });
    const baselines = computeBaselines({
      today,
      preflight: store.getPreflight(),
      history: store.getReadings(),
      rules,
    });
    const result = evaluate({
      today,
      readings: store.getReadings(),
      flags: [],
      baselines,
      rules,
    });

    const heart = indicator(result, "heart_rate");
    expect(heart.status).toBe("yellow");
    const heartRule = heart.triggered.find((rule) => rule.rule_id === "hr_y_baseline");
    expect(heartRule).toBeDefined();
    expect(heartRule?.observed?.delta).toBeCloseTo(18, 6);

    const sleep = indicator(result, "sleep_hours");
    expect(sleep.status).toBe("yellow");
    expect(sleep.triggered.some((rule) => rule.rule_id === "sleep_y_avg7")).toBe(true);

    for (const id of [
      "blood_pressure",
      "blood_sugar",
      "body_temperature",
      "mood",
      "body_mass",
      "skin_health",
      "immune_signs",
    ]) {
      expect(indicator(result, id).status).toBe("green");
    }
    expect(indicator(result, "radiation_dose").status).toBe("no_data");
    expect(result.overall_status).toBe("yellow");
    expect(result.overall_escalation).toBe("crew_medical_officer");
  });

  it("criterion 7: has no hidden alarms on days 8-39", () => {
    const violations: string[] = [];
    const yellowDays: Record<string, number[]> = {};

    for (let missionDay = 8; missionDay <= 39; missionDay += 1) {
      const today = missionDateForDay(missionDay);
      const readings = dataset.history.readings.filter((reading) => reading.date <= today);
      const baselines = computeBaselines({
        today,
        preflight: dataset.preflight.readings,
        history: readings,
        rules,
      });
      const result = evaluate({ today, readings, flags: [], baselines, rules });

      for (const item of result.indicators) {
        if (item.status === "red") {
          violations.push(`day ${missionDay}: ${item.indicator_id} red`);
        }
        if (item.indicator_id === "heart_rate" && item.status === "yellow") {
          violations.push(`day ${missionDay}: heart_rate yellow`);
        }
        if (item.indicator_id !== "sleep_hours" && item.status === "yellow") {
          violations.push(`day ${missionDay}: ${item.indicator_id} yellow`);
        }
        if (item.status === "yellow") {
          const days = yellowDays[item.indicator_id] ?? [];
          days.push(missionDay);
          yellowDays[item.indicator_id] = days;
        }
      }
    }

    expect(violations).toEqual([]);
    expect(yellowDays).toEqual({ sleep_hours: [38, 39] });
  });

  it("criterion 8: store rules", () => {
    const store = createHistoryStore(dataset);

    expect(() =>
      store.addReadings([
        { date: "2026-11-14", metric: "heart_rate", value: 80, valid: false },
      ]),
    ).toThrow();

    const firstCopy = store.getReadings();
    expect(firstCopy).toHaveLength(351);
    firstCopy[0].value = -1;
    firstCopy.push({ date: "2026-11-14", metric: "mood", value: 1, valid: true });
    expect(store.getReadings()).toHaveLength(351);
    expect(store.getReadings()[0].value).not.toBe(-1);

    store.setFlags("2026-11-14", ["cough", "cough"]);
    expect(store.getFlags("2026-11-14")).toEqual(["cough"]);

    store.reset();
    expect(store.getReadings()).toHaveLength(351);

    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.addReadings([
      { date: "2026-11-14", metric: "heart_rate", value: 80, context: "rest", valid: true },
    ]);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("criterion 9: includeDay40 defaults to false", () => {
    const store = createHistoryStore(dataset);
    expect(store.hasCheckup("2026-11-14")).toBe(false);

    const fullStore = createHistoryStore(dataset, { includeDay40: true });
    expect(fullStore.hasCheckup("2026-11-14")).toBe(true);
    expect(fullStore.getReadings()).toHaveLength(360);
  });

  it("criterion 10a: demo invalid entry is scripted", () => {
    expect(dataset.day40_checkup.demo_invalid_entry).toEqual({
      metric: "heart_rate",
      raw: "920",
    });
  });

  it("criterion 10b: input check rejects the scripted invalid entry", () => {
    const result = checkEntry(dataset.day40_checkup.demo_invalid_entry, "2026-11-14", rules);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("out_of_range");
    }
  });
});
