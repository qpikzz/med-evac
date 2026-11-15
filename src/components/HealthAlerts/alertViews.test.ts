import { describe, expect, it } from "vitest";
import rulesJson from "../../data/rules.json";
import { evaluate } from "../../rules/engine";
import { loadRules } from "../../rules/loadRules";
import { alertViews } from "./alertViews";

const rules = loadRules(rulesJson);
const run = (flags: string[]) => evaluate({ today: "2026-11-14", readings: [], flags, baselines: {}, rules });

describe("health alerts (driven only by the rules engine)", () => {
  it("no result or nothing flagged → no alerts", () => {
    expect(alertViews(null, rules)).toEqual([]);
    expect(alertViews(run([]), rules)).toEqual([]);
  });

  it("red alerts come first, then yellow", () => {
    const views = alertViews(run(["spe_warning", "chest_pain"]), rules);
    expect(views.length).toBeGreaterThan(1);
    const levels = views.map((v) => v.level);
    expect(levels.indexOf("yellow")).toBeGreaterThan(levels.lastIndexOf("red"));
    expect(views.find((v) => v.indicatorId === "radiation_dose")?.level).toBe("yellow");
  });
});
