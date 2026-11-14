import { describe, expect, it } from "vitest";
import rulesJson from "../../data/rules.json";
import syntheticJson from "../../data/synthetic_history.json";
import type { Baseline, Reading } from "../../rules/types";
import { loadRules } from "../../rules/loadRules";
import { loadSyntheticDataset } from "../synthetic-data/historyStore";
import { computeBaselines, describeDeviation, getReferenceLines } from "./baseline";

const rules = loadRules(rulesJson);
const today = "2026-11-14";

function reading(
  date: string,
  metric: string,
  value: number,
  context: "rest" | "exercise" = "rest",
  valid = true,
): Reading {
  return { date, metric, value, context, valid };
}

function baseline(overrides: Partial<Baseline> = {}): Baseline {
  return {
    preflight_mean: null,
    preflight_sd: null,
    rolling_mean: null,
    rolling_sd: null,
    rolling_n: 0,
    ...overrides,
  };
}

describe("personal baseline", () => {
  it("criterion 1: computes the preflight heart baseline", () => {
    const dates = [
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
      "2026-09-28",
    ];
    const values = [62, 63, 61, 62, 63, 61, 62];
    const preflight = values.map((value, index) => reading(dates[index], "heart_rate", value));

    const result = computeBaselines({ today, preflight, history: [], rules });
    const heart = result.heart_rate;

    expect(heart.preflight_mean).toBe(62);
    expect(heart.preflight_sd).toBeCloseTo(0.8165, 3);
    expect(heart.rolling_n).toBe(0);
  });

  it("criterion 2: computes the preflight mood baseline", () => {
    const dates = [
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
      "2026-09-28",
    ];
    const values = [8, 8, 7, 8, 8, 7, 8];
    const preflight = values.map((value, index) => reading(dates[index], "mood", value));

    const result = computeBaselines({ today, preflight, history: [], rules });
    const mood = result.mood;

    expect(mood.preflight_mean).toBeCloseTo(7.7143, 3);
    expect(mood.preflight_sd).toBeCloseTo(0.488, 3);
  });

  it("criterion 3: computes a full rolling baseline and excludes today", () => {
    const dates = [
      "2026-11-07",
      "2026-11-08",
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
    ];
    const values = [37.0, 36.8, 36.9, 36.8, 36.9, 36.7, 36.8];
    const history = values.map((value, index) => reading(dates[index], "body_temp", value));
    history.push(reading("2026-11-14", "body_temp", 39.0));

    const result = computeBaselines({ today, preflight: [], history, rules });
    const temperature = result.body_temp;

    expect(temperature.rolling_n).toBe(7);
    expect(temperature.rolling_mean).toBeCloseTo(36.8429, 3);
  });

  it("criterion 4: computes partial rolling baselines", () => {
    const partial = computeBaselines({
      today,
      preflight: [],
      history: [
        reading("2026-11-12", "body_temp", 36.8),
        reading("2026-11-13", "body_temp", 36.9),
      ],
      rules,
    });
    expect(partial.body_temp.rolling_n).toBe(2);
    expect(partial.body_temp.rolling_mean).not.toBeNull();
    expect(partial.body_temp.rolling_sd).not.toBeNull();

    const single = computeBaselines({
      today,
      preflight: [],
      history: [reading("2026-11-13", "body_temp", 36.9)],
      rules,
    });
    expect(single.body_temp.rolling_n).toBe(1);
    expect(single.body_temp.rolling_sd).toBeNull();
  });

  it("criterion 5: excludes invalid, exercise and future readings", () => {
    const history = [
      reading("2026-11-11", "body_temp", 36.9),
      reading("2026-11-12", "body_temp", 36.8, "rest", false),
      reading("2026-11-13", "body_temp", 36.8, "exercise"),
      reading("2026-11-15", "body_temp", 36.8),
    ];

    const result = computeBaselines({ today, preflight: [], history, rules });
    expect(result.body_temp.rolling_n).toBe(1);
    expect(result.body_temp.rolling_mean).toBe(36.9);
  });

  it("criterion 6: keeps the last reading for a duplicate date", () => {
    const result = computeBaselines({
      today,
      preflight: [],
      history: [
        reading("2026-11-13", "heart_rate", 70),
        reading("2026-11-13", "heart_rate", 72),
      ],
      rules,
    });

    expect(result.heart_rate.rolling_n).toBe(1);
    expect(result.heart_rate.rolling_mean).toBe(72);
  });

  it("criterion 7: returns every metric id", () => {
    const result = computeBaselines({ today, preflight: [], history: [], rules });

    expect(Object.keys(result).sort()).toEqual(rules.metrics.map((metric) => metric.id).sort());
    expect(result.radiation_accumulated).toEqual({
      preflight_mean: null,
      preflight_sd: null,
      rolling_mean: null,
      rolling_sd: null,
      rolling_n: 0,
    });
  });

  it("criterion 8: describes the Day-40 heart deviation", () => {
    const result = describeDeviation(
      "heart_rate",
      80,
      baseline({ preflight_mean: 62, preflight_sd: 5 }),
      rules,
    );

    expect(result.source).toBe("preflight");
    expect(result.mean).toBe(62);
    expect(result.delta_abs).toBe(18);
    expect(result.delta_percent).toBeCloseTo(29.0323, 3);
  });

  it("criterion 9: leaves rolling deviations null while the baseline forms", () => {
    const result = describeDeviation(
      "body_temp",
      37.5,
      baseline({ rolling_mean: 36.8, rolling_sd: 0.2, rolling_n: 6 }),
      rules,
    );

    expect(result.source).toBe("rolling");
    expect(result.mean).toBeNull();
    expect(result.delta_abs).toBeNull();
    expect(result.delta_percent).toBeNull();
  });

  it("criterion 10: builds heart reference lines", () => {
    const lines = getReferenceLines(
      "heart_rate",
      { heart_rate: baseline({ preflight_mean: 62, preflight_sd: 5 }) },
      rules,
    );

    expect(lines.map((line) => line.value).sort((left, right) => left - right)).toEqual([
      50, 60, 62, 74, 100,
    ]);
    expect(lines.find((line) => line.kind === "baseline")?.label).toBe(
      "Your normal (before flight)",
    );
    expect(lines.some((line) => line.rule_id === "hr_r_baseline_symptoms")).toBe(false);
  });

  it("criterion 11: builds body mass reference lines", () => {
    const lines = getReferenceLines(
      "body_mass",
      { body_mass: baseline({ preflight_mean: 70 }) },
      rules,
    );
    const values = lines.map((line) => line.value).sort((left, right) => left - right);

    expect(values).toHaveLength(2);
    expect(values[0]).toBeCloseTo(68.6, 6);
    expect(values[1]).toBe(70);
    expect(lines.some((line) => line.rule_id === "bm_r_drop_symptoms")).toBe(false);
  });

  it("criterion 12: builds sleep reference lines without a baseline line", () => {
    const lines = getReferenceLines(
      "sleep_hours",
      { sleep_hours: baseline({ rolling_mean: 6.8, rolling_sd: 0.2, rolling_n: 6 }) },
      rules,
    );

    expect(lines.map((line) => line.value).sort((left, right) => left - right)).toEqual([6, 7]);
    expect(lines.some((line) => line.kind === "baseline")).toBe(false);
  });

  it("criterion 13: excludes disabled and exercise temperature rules", () => {
    const lines = getReferenceLines(
      "body_temp",
      { body_temp: baseline({ rolling_mean: 37, rolling_sd: 0.2, rolling_n: 7 }) },
      rules,
    );

    expect(lines.some((line) => line.rule_id === "temp_y_abs")).toBe(false);
    expect(lines.some((line) => line.rule_id === "temp_y_exercise")).toBe(false);
    expect(lines.some((line) => line.rule_id === "temp_r_exercise")).toBe(false);
    expect(lines.some((line) => line.value === 37.8)).toBe(false);
  });

  it("criterion 14: integrates with the synthetic Day-40 data", () => {
    const dataset = loadSyntheticDataset(syntheticJson);
    const history = [...dataset.history.readings, ...dataset.day40_checkup.readings];
    const result = computeBaselines({
      today,
      preflight: dataset.preflight.readings,
      history,
      rules,
    });

    expect(result.heart_rate.preflight_mean).toBe(62);
    expect(result.bp_systolic.preflight_mean).toBe(115);
    expect(result.bp_diastolic.preflight_mean).toBe(75);
    expect(result.body_mass.preflight_mean).toBeCloseTo(70, 6);
    expect(result.mood.preflight_mean).toBeCloseTo(7.7143, 3);
    expect(result.body_temp.rolling_n).toBe(7);
  });

  it("criterion 15: does not mutate inputs and is deterministic", () => {
    const input = {
      today,
      preflight: [reading("2026-09-22", "heart_rate", 62)],
      history: [reading("2026-11-13", "body_temp", 36.8)],
      rules,
    };
    const before = JSON.stringify(input);

    const first = computeBaselines(input);
    const second = computeBaselines(input);

    expect(second).toEqual(first);
    expect(JSON.stringify(input)).toBe(before);
    expect(getReferenceLines("heart_rate", first, rules)).toEqual(
      getReferenceLines("heart_rate", first, rules),
    );
  });
});
