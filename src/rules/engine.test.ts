import { describe, expect, it } from "vitest";
import rulesJson from "../data/rules.json";
import { addDays } from "./dateMath";
import { evaluate } from "./engine";
import { RulesFileError, loadRules } from "./loadRules";
import type { Baseline, EvaluationInput, Reading } from "./types";

const rules = loadRules(rulesJson);
const today = "2026-11-14";

function day(k: number): string {
  return addDays(today, -k);
}

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

function input(
  readings: Reading[],
  flags: string[] = [],
  baselines: Record<string, Baseline> = {},
): EvaluationInput {
  return { today, readings, flags, baselines, rules };
}

function indicator(result: ReturnType<typeof evaluate>, id: string) {
  const found = result.indicators.find((item) => item.indicator_id === id);
  if (!found) {
    throw new Error(`Missing indicator ${id}`);
  }
  return found;
}

function skipReason(
  result: ReturnType<typeof evaluate>,
  indicatorId: string,
  ruleId: string,
): string | undefined {
  return indicator(result, indicatorId).skipped.find((entry) => entry.rule_id === ruleId)?.reason;
}

function findRuleJson(json: any, ruleId: string): any {
  for (const indicatorJson of json.indicators) {
    for (const rule of indicatorJson.rules) {
      if (rule.id === ruleId) {
        return rule;
      }
    }
  }
  throw new Error(`Missing rule ${ruleId}`);
}

describe("rules engine", () => {
  it("criterion 1: sleep is yellow from the window average", () => {
    const values = [7, 7, 6, 6, 7, 6, 6];
    const readings = values.map((value, index) => reading(day(6 - index), "sleep_hours", value));
    const result = evaluate(input(readings));
    const sleep = indicator(result, "sleep_hours");

    expect(sleep.status).toBe("yellow");
    expect(sleep.escalation).toBe("crew_medical_officer");
    expect(sleep.triggered.some((rule) => rule.rule_id === "sleep_y_avg7")).toBe(true);
    expect(
      sleep.triggered.find((rule) => rule.rule_id === "sleep_y_avg7")?.source,
    ).toBe("TABLE: Sleep hours, YELLOW");
  });

  it("criterion 2: sleep red streak is listed before the yellow window rule", () => {
    const values = [6, 5.5, 6, 6, 5, 6, 6];
    const readings = values.map((value, index) => reading(day(6 - index), "sleep_hours", value));
    const result = evaluate(input(readings));
    const sleep = indicator(result, "sleep_hours");
    const triggeredIds = sleep.triggered.map((rule) => rule.rule_id);

    expect(sleep.status).toBe("red");
    expect(sleep.escalation).toBe("ground_flight_surgeon");
    expect(triggeredIds[0]).toBe("sleep_r_streak");
    expect(triggeredIds).toContain("sleep_y_avg7");
  });

  it("criterion 3: a missing day skips sleep rules and stays green", () => {
    const values = [5, 5, 5, 5, 5, 5];
    const readings = values.map((value, index) => reading(day(5 - index), "sleep_hours", value));
    const result = evaluate(input(readings));
    const sleep = indicator(result, "sleep_hours");

    expect(sleep.status).toBe("green");
    expect(skipReason(result, "sleep_hours", "sleep_y_avg7")).toBe("insufficient_history");
    expect(skipReason(result, "sleep_hours", "sleep_r_streak")).toBe("insufficient_history");
  });

  it("criterion 4: evaluates glucose thresholds", () => {
    const low = indicator(evaluate(input([reading(today, "glucose", 60)])), "blood_sugar");
    expect(low.status).toBe("yellow");
    expect(low.triggered.some((rule) => rule.rule_id === "glu_y_low")).toBe(true);

    const veryLow = indicator(evaluate(input([reading(today, "glucose", 50)])), "blood_sugar");
    expect(veryLow.status).toBe("red");
    expect(veryLow.triggered.map((rule) => rule.rule_id)).toEqual(["glu_r_low", "glu_y_low"]);

    const normal = indicator(evaluate(input([reading(today, "glucose", 100)])), "blood_sugar");
    expect(normal.status).toBe("green");
    expect(normal.triggered).toEqual([]);
  });

  it("criterion 5: compares temperature with the personal baseline", () => {
    const baselines = {
      body_temp: baseline({ rolling_mean: 37.6, rolling_sd: 0.2, rolling_n: 7 }),
    };

    const hot = indicator(
      evaluate(input([reading(today, "body_temp", 38.7)], [], baselines)),
      "body_temperature",
    );
    const rule = hot.triggered.find((entry) => entry.rule_id === "temp_y_baseline");
    expect(hot.status).toBe("yellow");
    expect(rule).toBeDefined();
    expect(rule?.observed?.delta).toBeCloseTo(1.1, 5);

    const warm = indicator(
      evaluate(input([reading(today, "body_temp", 38.5)], [], baselines)),
      "body_temperature",
    );
    expect(warm.status).toBe("green");
  });

  it("criterion 6: absolute high temperature is red", () => {
    const result = evaluate(input([reading(today, "body_temp", 39.2)]));
    const temperature = indicator(result, "body_temperature");

    expect(temperature.status).toBe("red");
    expect(temperature.triggered.some((rule) => rule.rule_id === "temp_r_abs")).toBe(true);
    expect(result.overall_status).toBe("red");
  });

  it("criterion 7: reports a forming temperature baseline", () => {
    const result = evaluate(
      input([reading(today, "body_temp", 38.7)], [], {
        body_temp: baseline({ rolling_mean: 36.8, rolling_sd: 0.2, rolling_n: 3 }),
      }),
    );
    const temperature = indicator(result, "body_temperature");

    expect(temperature.status).toBe("green");
    expect(temperature.baseline_forming).toBe(true);
    expect(skipReason(result, "body_temperature", "temp_y_baseline")).toBe("no_baseline");
  });

  it("criterion 8: uses the exercise context for temperature", () => {
    const result = evaluate(input([reading(today, "body_temp", 39.3, "exercise")]));
    const temperature = indicator(result, "body_temperature");

    expect(temperature.status).toBe("yellow");
    expect(temperature.triggered.some((rule) => rule.rule_id === "temp_y_exercise")).toBe(true);
    expect(temperature.triggered.some((rule) => rule.rule_id === "temp_r_abs")).toBe(false);
  });

  it("criterion 9: requires three days of low mood", () => {
    const baselines = { mood: baseline({ preflight_mean: 7, preflight_sd: 0.5 }) };
    const threeDays = evaluate(
      input(
        [reading(day(2), "mood", 5), reading(day(1), "mood", 4), reading(day(0), "mood", 5)],
        [],
        baselines,
      ),
    );
    const mood = indicator(threeDays, "mood");
    expect(mood.status).toBe("yellow");
    expect(mood.triggered.some((rule) => rule.rule_id === "mood_y_drop")).toBe(true);

    const twoDays = evaluate(
      input([reading(day(1), "mood", 5), reading(day(0), "mood", 4)], [], baselines),
    );
    expect(indicator(twoDays, "mood").status).toBe("green");
    expect(skipReason(twoDays, "mood", "mood_y_drop")).toBe("insufficient_history");
  });

  it("criterion 10: compares body mass percentage with preflight", () => {
    const result = evaluate(
      input(
        [reading(day(1), "body_mass", 68.5), reading(day(0), "body_mass", 68.4)],
        [],
        { body_mass: baseline({ preflight_mean: 70 }) },
      ),
    );
    const mass = indicator(result, "body_mass");
    const rule = mass.triggered.find((entry) => entry.rule_id === "bm_y_drop");

    expect(mass.status).toBe("yellow");
    expect(rule).toBeDefined();
    expect(rule?.observed?.delta).toBeCloseTo(-2.2857, 3);
  });

  it("criterion 11: requires repeated high blood pressure", () => {
    const repeated = evaluate(
      input([reading(day(1), "bp_systolic", 135), reading(day(0), "bp_systolic", 135)]),
    );
    const pressure = indicator(repeated, "blood_pressure");
    expect(pressure.status).toBe("yellow");
    expect(pressure.triggered.some((rule) => rule.rule_id === "bp_y_high_sys")).toBe(true);

    const todayOnly = evaluate(input([reading(day(0), "bp_systolic", 135)]));
    expect(indicator(todayOnly, "blood_pressure").status).toBe("green");
    expect(skipReason(todayOnly, "blood_pressure", "bp_y_high_sys")).toBe(
      "insufficient_history",
    );

    const veryHigh = evaluate(input([reading(day(0), "bp_systolic", 185)]));
    const veryHighPressure = indicator(veryHigh, "blood_pressure");
    expect(veryHighPressure.status).toBe("red");
    expect(veryHighPressure.triggered.some((rule) => rule.rule_id === "bp_r_high_sys")).toBe(
      true,
    );
  });

  it("criterion 12: applies requires_flags to low blood pressure", () => {
    const withFlag = evaluate(input([reading(day(0), "bp_systolic", 85)], ["fainting"]));
    const pressure = indicator(withFlag, "blood_pressure");
    expect(pressure.status).toBe("red");
    expect(pressure.triggered.some((rule) => rule.rule_id === "bp_r_low_symptoms")).toBe(true);

    const withoutFlag = evaluate(input([reading(day(0), "bp_systolic", 85)]));
    expect(indicator(withoutFlag, "blood_pressure").status).toBe("green");
  });

  it("criterion 13: raises red statuses from flags alone", () => {
    const result = evaluate(input([], ["face_throat_swelling"]));
    const immune = indicator(result, "immune_signs");
    const skin = indicator(result, "skin_health");

    expect(immune.status).toBe("red");
    expect(immune.triggered.some((rule) => rule.rule_id === "imm_r_flags")).toBe(true);
    expect(skin.status).toBe("red");
    expect(skin.triggered.some((rule) => rule.rule_id === "skin_r_flags")).toBe(true);
    expect(result.overall_status).toBe("red");
    expect(result.overall_escalation).toBe("ground_flight_surgeon");
  });

  it("criterion 14: skips disabled rules and reflects the updated heart rule", () => {
    const heartBaseline = { heart_rate: baseline({ preflight_mean: 62, preflight_sd: 5 }) };
    const day40Readings = [reading(day(1), "heart_rate", 76), reading(day(0), "heart_rate", 80)];

    const shipped = evaluate(input(day40Readings, [], heartBaseline));
    const shippedHeart = indicator(shipped, "heart_rate");
    expect(shippedHeart.status).toBe("yellow");
    expect(shippedHeart.triggered.some((rule) => rule.rule_id === "hr_y_baseline")).toBe(true);

    const modifiedRules = JSON.parse(JSON.stringify(rulesJson));
    for (const indicatorJson of modifiedRules.indicators) {
      for (const rule of indicatorJson.rules) {
        if (rule.id === "hr_y_baseline" || rule.id === "hr_r_baseline_symptoms") {
          rule.enabled = false;
        }
      }
    }
    const disabled = evaluate({
      today,
      readings: day40Readings,
      flags: [],
      baselines: heartBaseline,
      rules: loadRules(modifiedRules),
    });
    const disabledHeart = indicator(disabled, "heart_rate");

    expect(disabledHeart.status).toBe("green");
    expect(skipReason(disabled, "heart_rate", "hr_y_baseline")).toBe("rule_disabled");
    expect(skipReason(disabled, "heart_rate", "hr_r_baseline_symptoms")).toBe("rule_disabled");
  });

  it("criterion 15: ignores invalid readings", () => {
    const result = evaluate(input([reading(today, "heart_rate", 920, "rest", false)]));
    const heart = indicator(result, "heart_rate");

    expect(heart.status).toBe("no_data");
    expect(heart.escalation).toBeNull();
  });

  it("criterion 16: reports no data for metric indicators and green immune signs", () => {
    const result = evaluate(input([]));
    const metricIndicators = new Set(rules.metrics.map((metric) => metric.indicator_id));

    for (const item of result.indicators) {
      if (metricIndicators.has(item.indicator_id)) {
        expect(item.status).toBe("no_data");
        expect(item.escalation).toBeNull();
      }
    }
    expect(indicator(result, "immune_signs").status).toBe("green");
    expect(result.overall_status).toBe("green");
  });

  it("criterion 17: rejects an unknown metric in a trigger", () => {
    const copy = JSON.parse(JSON.stringify(rulesJson));
    const broken = findRuleJson(copy, "glu_r_low");
    broken.trigger.metric = "sugar";

    expect(() => loadRules(copy)).toThrow(RulesFileError);
    expect(() => loadRules(copy)).toThrow(/glu_r_low/);
    expect(() => loadRules(copy)).toThrow(/sugar/);
  });

  it("criterion 18: rejects enabled rules with null values", () => {
    const copy = JSON.parse(JSON.stringify(rulesJson));
    const rule = findRuleJson(copy, "hr_y_baseline");
    rule.enabled = true;
    rule.trigger.amount = null;

    expect(() => loadRules(copy)).toThrow(RulesFileError);
    expect(() => loadRules(copy)).toThrow(/hr_y_baseline/);
  });

  it("criterion 19: is deterministic and does not mutate input", () => {
    const testInput = input(
      [
        reading(day(1), "heart_rate", 76),
        reading(day(0), "heart_rate", 80),
        reading(day(1), "sleep_hours", 6),
        reading(day(0), "sleep_hours", 6.5),
      ],
      ["cough"],
      { heart_rate: baseline({ preflight_mean: 62, preflight_sd: 5 }) },
    );
    const before = JSON.stringify(testInput);

    const first = evaluate(testInput);
    const second = evaluate(testInput);

    expect(second).toEqual(first);
    expect(JSON.stringify(testInput)).toBe(before);
  });

  it("criterion 20: loads the shipped file (51 rules in shipped data)", () => {
    const shipped = loadRules(rulesJson);
    const ruleCount = shipped.indicators.reduce(
      (count, indicatorEntry) => count + indicatorEntry.rules.length,
      0,
    );

    expect(shipped.indicators).toHaveLength(10);
    expect(shipped.flags).toHaveLength(42);
    expect(ruleCount).toBe(51);
  });
});
