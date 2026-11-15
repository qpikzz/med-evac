import { describe, expect, it } from "vitest";
import rulesJson from "../data/rules.json";
import { loadRules } from "../rules/loadRules";
import {
  getAutocompleteQuery,
  getSymptomSuggestions,
  removeAutocompleteQuery,
} from "./SymptomNotesComposer";
import { getThresholdFeedback } from "./CheckupFormCard";

const rules = loadRules(rulesJson);

describe("check-up form helpers", () => {
  it("uses enabled rules and measurement context for inline threshold feedback", () => {
    expect(getThresholdFeedback(rules, "bp_systolic", "130", "rest", [])).toBe("elevated");
    expect(getThresholdFeedback(rules, "bp_systolic", "180", "rest", [])).toBe("alert");
    expect(getThresholdFeedback(rules, "heart_rate", "101", "rest", [])).toBe("elevated");

    expect(getThresholdFeedback(rules, "body_temp", "37.8", "rest", [])).toBeNull();
    expect(getThresholdFeedback(rules, "body_temp", "39", "rest", [])).toBe("alert");
    expect(getThresholdFeedback(rules, "body_temp", "39", "exercise", [])).toBe("elevated");
    expect(getThresholdFeedback(rules, "body_temp", "40", "exercise", [])).toBe("alert");
  });

  it("requires a matching warning flag for flag-gated low blood pressure alerts", () => {
    expect(getThresholdFeedback(rules, "bp_systolic", "85", "rest", [])).toBe("elevated");
    expect(
      getThresholdFeedback(rules, "bp_systolic", "85", "rest", ["fainting"]),
    ).toBe("alert");
  });

  it("matches catalog symptoms from the trailing note word and removes that trigger", () => {
    expect(getAutocompleteQuery("I feel dizz")).toBe("dizz");
    const dizzinessMatches = getSymptomSuggestions(rules.flags, "dizz", []);
    expect(dizzinessMatches.map((flag) => flag.id)).toEqual(
      expect.arrayContaining(["severe_dizziness", "dizziness"]),
    );
    expect(
      getSymptomSuggestions(rules.flags, "dizz", ["dizziness"]).map((flag) => flag.id),
    ).not.toContain("dizziness");
    expect(removeAutocompleteQuery("I feel dizz", "dizz")).toBe("I feel ");
    expect(removeAutocompleteQuery("head", "head")).toBe("");
  });
});
