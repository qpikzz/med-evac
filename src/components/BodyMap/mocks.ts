// Mock data for the body map (acceptance criteria in specs/body-map). Synthetic, not real crew data.
import rulesJson from "../../data/rules.json";
import { loadRules } from "../../rules/loadRules";
import type {
  Escalation,
  EvaluationResult,
  IndicatorResult,
  RulesFile,
  Status,
} from "../../rules/types";

export const mockRules: RulesFile = loadRules(rulesJson);

/** Same rules, but every radiation_dose rule disabled → radiation becomes monitoring-only. */
export const mockRulesRadiationMonitoringOnly: RulesFile = {
  ...mockRules,
  indicators: mockRules.indicators.map((ind) =>
    ind.id === "radiation_dose"
      ? { ...ind, rules: ind.rules.map((rule) => ({ ...rule, enabled: false })) }
      : ind,
  ),
};

const ESCALATION: Record<Status, Escalation | null> = {
  green: "self",
  yellow: "crew_medical_officer",
  red: "ground_flight_surgeon",
  no_data: null,
};

const ALL_INDICATORS = [
  "blood_pressure",
  "heart_rate",
  "blood_sugar",
  "body_temperature",
  "sleep_hours",
  "mood",
  "body_mass",
  "immune_signs",
  "radiation_dose",
  "skin_health",
];

function indicator(id: string, status: Status): IndicatorResult {
  return {
    indicator_id: id,
    status,
    escalation: ESCALATION[status],
    triggered: [],
    skipped: [],
    baseline_forming: false,
  };
}

function result(overrides: Record<string, Status>, overall: Status): EvaluationResult {
  return {
    today: "2026-11-14",
    overall_status: overall,
    overall_escalation: ESCALATION[overall],
    indicators: ALL_INDICATORS.map((id) => indicator(id, overrides[id] ?? "green")),
    rules_version: mockRules.schema_version,
  };
}

/** S1 / AC1: Day 40 — heart_rate and sleep_hours yellow, rest green. Use with mockRulesRadiationMonitoringOnly. */
export const mockDay40: EvaluationResult = result(
  { heart_rate: "yellow", sleep_hours: "yellow" },
  "yellow",
);

/** S2 / AC2: red on a hidden layer — immune_signs red (Organs) and skin_health red (Skin). */
export const mockRedHiddenLayer: EvaluationResult = result(
  { immune_signs: "red", skin_health: "red" },
  "red",
);

/** S3 / AC5: before the first check-up. */
export const mockNoResult: EvaluationResult | null = null;
