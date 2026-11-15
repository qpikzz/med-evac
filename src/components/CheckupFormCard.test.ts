import { describe, expect, it } from "vitest";
import rulesJson from "../data/rules.json";
import { loadRules } from "../rules/loadRules";
import {
  getSegmentsFromSavedNotes,
  getAutocompleteQuery,
  getSymptomSuggestions,
  removeAutocompleteQuery,
  removeSymptomSegment,
  serializeSegments,
} from "./SymptomNotesComposer";
import {
  getCanonicalMetricValue,
  getDisplayedMetricUnit,
  getDisplayedMetricValue,
  getThresholdFeedback,
} from "./CheckupFormCard";

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

  it("converts display units while keeping threshold checks in canonical units", () => {
    expect(getDisplayedMetricValue("body_temp", "37", "imperial")).toBe("98.6");
    expect(getCanonicalMetricValue("body_temp", "102.2", "imperial")).toBe("39");
    expect(getDisplayedMetricUnit("body_temp", "°C", "imperial")).toBe("°F");
    expect(getDisplayedMetricValue("body_mass", "69.1", "imperial")).toBe("152.3");
    expect(getDisplayedMetricUnit("body_mass", "kg", "imperial")).toBe("lbs");
    expect(getDisplayedMetricUnit("glucose", "mg/dL", "metric")).toBe("mg/dL");

    const canonicalTemperature = getCanonicalMetricValue("body_temp", "102.2", "imperial");
    expect(getThresholdFeedback(rules, "body_temp", canonicalTemperature, "rest", [])).toBe("alert");
  });

  it("restores selected symptom pills inline while keeping their serialized notes readable", () => {
    const segments = getSegmentsFromSavedNotes(
      "I have dizziness since morning.",
      ["dizziness"],
      rules.flags,
    );
    expect(segments).toEqual([
      { kind: "text", text: "I have " },
      { kind: "symptom", id: "dizziness", label: "Dizziness" },
      { kind: "text", text: " since morning." },
    ]);
    expect(serializeSegments(segments)).toBe("I have Dizziness since morning.");
    expect(serializeSegments(removeSymptomSegment(segments, "dizziness"))).toBe(
      "I have since morning.",
    );
  });
});
