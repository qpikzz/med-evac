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
