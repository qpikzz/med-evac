import { describe, expect, it } from "vitest";
import rulesJson from "../../data/rules.json";
import { evaluate } from "../../rules/engine";
import { loadRules } from "../../rules/loadRules";
import { radiationAlertView } from "./radiationAlert";

const rules = loadRules(rulesJson);

function run(flags: string[]) {
  return evaluate({ today: "2026-11-14", readings: [], flags, baselines: {}, rules });
}

describe("radiation alert (driven only by the rules engine)", () => {
  it("no radiation event → no alert", () => {
    expect(radiationAlertView(run([]), rules)).toBeNull();
    expect(radiationAlertView(null, rules)).toBeNull();
  });

  it("solar particle event warning → yellow warning with the engine's rule text", () => {
    const view = radiationAlertView(run(["spe_warning"]), rules);
    expect(view?.level).toBe("yellow");
    expect(view?.heading).toBe("Radiation warning");
    expect(view?.rules.map((r) => r.rule_id)).toContain("rad_y_spe");
    expect(view?.escalationText).toBe(rules.ui_text.escalation_crew_medical_officer);
  });

  it("dosimeter unexpectedly high → red alert, red rule listed first", () => {
    const view = radiationAlertView(run(["spe_warning", "dosimeter_unexpected_high"]), rules);
    expect(view?.level).toBe("red");
    expect(view?.heading).toBe("Radiation alert");
    expect(view?.rules[0].rule_id).toBe("rad_r_event");
    expect(view?.reportedFlags.length).toBeGreaterThan(0);
  });
});

describe("radiation thresholds (illustrative mission settings, Q-RAD)", () => {
  function withReadings(readings: { metric: string; value: number }[]) {
    return evaluate({
      today: "2026-11-14",
      readings: readings.map((r) => ({ date: "2026-11-14", context: "rest" as const, valid: true, ...r })),
      flags: [],
      baselines: {},
      rules,
    });
  }

  it("nominal transit values (77 µSv/h, 72 mSv) → no alert", () => {
    const result = withReadings([
      { metric: "radiation_dose_rate", value: 77 },
      { metric: "radiation_accumulated", value: 72 },
    ]);
    expect(radiationAlertView(result, rules)).toBeNull();
  });

  it("dose rate above 150 µSv/h → yellow (rad_y_rate)", () => {
    const view = radiationAlertView(withReadings([{ metric: "radiation_dose_rate", value: 160 }]), rules);
    expect(view?.level).toBe("yellow");
    expect(view?.rules.map((r) => r.rule_id)).toContain("rad_y_rate");
  });

  it("accumulated ≥ 480 mSv → yellow, ≥ 600 mSv → red", () => {
    expect(radiationAlertView(withReadings([{ metric: "radiation_accumulated", value: 480 }]), rules)?.level).toBe("yellow");
    const red = radiationAlertView(withReadings([{ metric: "radiation_accumulated", value: 600 }]), rules);
    expect(red?.level).toBe("red");
    expect(red?.rules[0].rule_id).toBe("rad_r_accum");
  });
});

describe("radiation dose-rate red threshold (rad_r_rate, illustrative)", () => {
  function rate(value: number) {
    return evaluate({
      today: "2026-11-14",
      readings: [{ date: "2026-11-14", metric: "radiation_dose_rate", value, context: "rest", valid: true }],
      flags: [],
      baselines: {},
      rules,
    });
  }

  it("150 µSv/h → no alert, 151–999 → yellow, ≥ 1000 → red", () => {
    expect(radiationAlertView(rate(150), rules)).toBeNull();
    expect(radiationAlertView(rate(500), rules)?.level).toBe("yellow");
    const red = radiationAlertView(rate(5000), rules);
    expect(red?.level).toBe("red");
    expect(red?.rules[0].rule_id).toBe("rad_r_rate");
  });
});
