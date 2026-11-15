import { describe, expect, it } from "vitest";
import rulesJson from "../../data/rules.json";
import { loadRules } from "../../rules/loadRules";
import { checkCheckup, checkEntry } from "./inputCheck";

const rules = loadRules(rulesJson);
const date = "2026-11-14";

type EntryResult = ReturnType<typeof checkEntry>;
type ErrorResult = Extract<EntryResult, { ok: false }>;
type OkResult = Extract<EntryResult, { ok: true }>;

function errorOf(result: EntryResult): ErrorResult {
  if (result.ok) {
    throw new Error("Expected an error result");
  }
  return result;
}

function okOf(result: EntryResult): OkResult {
  if (!result.ok) {
    throw new Error("Expected a valid result");
  }
  return result;
}

describe("input check", () => {
  it("criterion 1: rejects the Day-40 typo", () => {
    const error = errorOf(checkEntry({ metric: "heart_rate", raw: "920" }, date, rules));
    expect(error.code).toBe("out_of_range");
    expect(error.range).toEqual({ min: 20, max: 250, unit: "bpm" });
  });

  it("criterion 2: accepts a correct value", () => {
    const result = okOf(checkEntry({ metric: "heart_rate", raw: "80" }, date, rules));
    expect(result.reading).toEqual({
      date,
      metric: "heart_rate",
      value: 80,
      context: "rest",
      valid: true,
    });
  });

  it("criterion 3: accepts a comma decimal", () => {
    const result = okOf(checkEntry({ metric: "body_temp", raw: "36,8" }, date, rules));
    expect(result.reading.value).toBe(36.8);
  });

  it("criterion 4: rejects malformed numbers but trims whitespace", () => {
    for (const raw of ["abc", "72 bpm", "1e3", "7..5"]) {
      const error = errorOf(checkEntry({ metric: "heart_rate", raw }, date, rules));
      expect(error.code).toBe("not_a_number");
    }
    expect(okOf(checkEntry({ metric: "heart_rate", raw: " 72 " }, date, rules)).reading.value).toBe(
      72,
    );
  });

  it("criterion 5: accepts inclusive heart-rate bounds", () => {
    expect(okOf(checkEntry({ metric: "heart_rate", raw: "20" }, date, rules)).reading.value).toBe(20);
    expect(okOf(checkEntry({ metric: "heart_rate", raw: "250" }, date, rules)).reading.value).toBe(
      250,
    );
    expect(errorOf(checkEntry({ metric: "heart_rate", raw: "19.9" }, date, rules)).code).toBe(
      "out_of_range",
    );
    expect(errorOf(checkEntry({ metric: "heart_rate", raw: "250.1" }, date, rules)).code).toBe(
      "out_of_range",
    );
  });

  it("criterion 6: enforces systolic above diastolic", () => {
    const swapped = checkCheckup(
      [
        { metric: "bp_systolic", raw: 80 },
        { metric: "bp_diastolic", raw: 120 },
      ],
      date,
      rules,
    );
    expect(swapped.allOk).toBe(false);
    expect(swapped.readings).toEqual([]);
    expect(swapped.results.map((result) => (result.ok ? "ok" : result.code))).toEqual([
      "bp_order",
      "bp_order",
    ]);

    const ordered = checkCheckup(
      [
        { metric: "bp_systolic", raw: 120 },
        { metric: "bp_diastolic", raw: 80 },
      ],
      date,
      rules,
    );
    expect(ordered.allOk).toBe(true);
    expect(ordered.readings.map((reading) => reading.value)).toEqual([120, 80]);

    const upperBounds = checkCheckup(
      [
        { metric: "bp_systolic", raw: 300 },
        { metric: "bp_diastolic", raw: 200 },
      ],
      date,
      rules,
    );
    expect(upperBounds.allOk).toBe(true);

    const tooHigh = checkCheckup(
      [
        { metric: "bp_systolic", raw: 301 },
        { metric: "bp_diastolic", raw: 80 },
      ],
      date,
      rules,
    );
    expect(tooHigh.allOk).toBe(false);
    const systolicResult = tooHigh.results.find((result) => result.metric === "bp_systolic");
    if (!systolicResult || systolicResult.ok) {
      throw new Error("Expected a failed systolic result");
    }
    expect(systolicResult.code).toBe("out_of_range");
  });

  it("criterion 7: checks glucose bounds", () => {
    expect(okOf(checkEntry({ metric: "glucose", raw: "0" }, date, rules)).reading.value).toBe(0);
    expect(okOf(checkEntry({ metric: "glucose", raw: "600" }, date, rules)).reading.value).toBe(600);
    expect(errorOf(checkEntry({ metric: "glucose", raw: "601" }, date, rules)).code).toBe(
      "out_of_range",
    );
    expect(errorOf(checkEntry({ metric: "glucose", raw: "-1" }, date, rules)).code).toBe(
      "out_of_range",
    );
  });

  it("criterion 8: keeps existing sleep and mood ranges", () => {
    expect(errorOf(checkEntry({ metric: "sleep_hours", raw: "25" }, date, rules)).code).toBe(
      "out_of_range",
    );
    expect(errorOf(checkEntry({ metric: "mood", raw: "11" }, date, rules)).code).toBe(
      "out_of_range",
    );
  });

  it("criterion 9: handles body mass and radiation ranges", () => {
    expect(okOf(checkEntry({ metric: "body_mass", raw: "70.4" }, date, rules)).reading.value).toBe(
      70.4,
    );
    expect(errorOf(checkEntry({ metric: "body_mass", raw: "-5" }, date, rules)).code).toBe(
      "out_of_range",
    );
    expect(okOf(checkEntry({ metric: "body_mass", raw: "500" }, date, rules)).reading.value).toBe(
      500,
    );
    expect(
      okOf(checkEntry({ metric: "radiation_accumulated", raw: "1000" }, date, rules)).reading.value,
    ).toBe(1000);
    expect(
      errorOf(checkEntry({ metric: "radiation_accumulated", raw: "1000.1" }, date, rules)).code,
    ).toBe("out_of_range");
    expect(
      okOf(checkEntry({ metric: "radiation_dose_rate", raw: "150" }, date, rules)).reading.value,
    ).toBe(150);
  });

  it("criterion 10: rejects an unknown metric", () => {
    expect(errorOf(checkEntry({ metric: "sugar", raw: "100" }, date, rules)).code).toBe(
      "unknown_metric",
    );
  });

  it("criterion 11: reports mixed check-up results", () => {
    const failed = checkCheckup(
      [
        { metric: "heart_rate", raw: "920" },
        { metric: "sleep_hours", raw: "6.5" },
        { metric: "glucose", raw: "" },
      ],
      date,
      rules,
    );
    expect(failed.results).toHaveLength(2);
    expect(failed.skipped).toEqual(["glucose"]);
    expect(failed.allOk).toBe(false);
    expect(failed.readings).toEqual([]);

    const fixed = checkCheckup(
      [
        { metric: "heart_rate", raw: "80" },
        { metric: "sleep_hours", raw: "6.5" },
        { metric: "glucose", raw: "" },
      ],
      date,
      rules,
    );
    expect(fixed.allOk).toBe(true);
    expect(fixed.readings).toHaveLength(2);
    expect(fixed.readings.map((reading) => reading.metric)).toEqual([
      "heart_rate",
      "sleep_hours",
    ]);
  });

  it("criterion 12: preserves the exercise context", () => {
    const result = okOf(
      checkEntry({ metric: "body_temp", raw: "39.3", context: "exercise" }, date, rules),
    );
    expect(result.reading.context).toBe("exercise");
  });

  it("criterion 13: keeps only the last duplicate field", () => {
    const result = checkCheckup(
      [
        { metric: "heart_rate", raw: "70" },
        { metric: "heart_rate", raw: "72" },
      ],
      date,
      rules,
    );
    expect(result.results).toHaveLength(1);
    expect(okOf(result.results[0]).reading.value).toBe(72);
  });

  it("criterion 14: does not mutate inputs and is deterministic", () => {
    const entries = [
      { metric: "heart_rate", raw: "80" },
      { metric: "bp_systolic", raw: 120 },
      { metric: "bp_diastolic", raw: 80 },
    ];
    const entriesBefore = JSON.stringify(entries);
    const rulesBefore = JSON.stringify(rules);

    const first = checkCheckup(entries, date, rules);
    const second = checkCheckup(entries, date, rules);

    expect(second).toEqual(first);
    expect(JSON.stringify(entries)).toBe(entriesBefore);
    expect(JSON.stringify(rules)).toBe(rulesBefore);
  });

  it("criterion 15: shipped data has the confirmed plausibility bounds", () => {
    expect(rules.metrics.find((metric) => metric.id === "heart_rate")?.plausible_max).toBe(250);
    expect(rules.metrics.find((metric) => metric.id === "bp_diastolic")?.plausible_min).toBe(20);
    expect(() => loadRules(rulesJson)).not.toThrow();
  });
});
