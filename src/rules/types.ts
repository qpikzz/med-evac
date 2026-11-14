export type Level = "green" | "yellow" | "red";
export type Status = Level | "no_data";
export type Escalation = "self" | "crew_medical_officer" | "ground_flight_surgeon";
export type Op = "<" | "<=" | ">" | ">=";
export type MeasurementContext = "rest" | "exercise";

export interface Reading {
  date: string;
  metric: string;
  value: number;
  context?: MeasurementContext;
  valid: boolean;
}

export interface Baseline {
  preflight_mean: number | null;
  preflight_sd: number | null;
  rolling_mean: number | null;
  rolling_sd: number | null;
  rolling_n: number;
}

export interface EvaluationInput {
  today: string;
  readings: Reading[];
  flags: string[];
  baselines: Record<string, Baseline>;
  rules: RulesFile;
}

export interface TriggeredRule {
  rule_id: string;
  level: "yellow" | "red";
  source: string;
  title: string;
  explanation: string;
  actions: string[];
  recheck: string;
  observed?: {
    metric?: string;
    value?: number;
    baseline?: number;
    delta?: number;
    flags?: string[];
  };
}

export type SkipReason =
  | "rule_disabled"
  | "no_reading_today"
  | "no_baseline"
  | "insufficient_history"
  | "missing_flags";

export interface SkippedRule {
  rule_id: string;
  reason: SkipReason;
}

export interface IndicatorResult {
  indicator_id: string;
  status: Status;
  escalation: Escalation | null;
  triggered: TriggeredRule[];
  skipped: SkippedRule[];
  baseline_forming: boolean;
}

export interface EvaluationResult {
  today: string;
  overall_status: Status;
  overall_escalation: Escalation | null;
  indicators: IndicatorResult[];
  rules_version: string;
}

export interface RulesFile {
  schema_version: string;
  settings: {
    rolling_baseline_days: number;
    min_rolling_baseline_readings: number;
  };
  escalation: {
    green: Escalation;
    yellow: Escalation;
    red: Escalation;
  };
  ui_text: Record<string, string>;
  metrics: {
    id: string;
    indicator_id: string;
    label: string;
    unit: string;
    plausible_min: number | null;
    plausible_max: number | null;
  }[];
  flags: {
    id: string;
    kind: "symptom" | "event";
    indicator_ids: string[];
    label: string;
  }[];
  indicators: {
    id: string;
    label: string;
    table_confidence: string;
    rules: Rule[];
  }[];
}

export type Trigger =
  | {
      type: "threshold";
      metric: string;
      op: Op;
      value: number | null;
      context?: MeasurementContext;
    }
  | {
      type: "baseline_delta";
      metric: string;
      baseline: "preflight" | "rolling";
      direction: "above" | "below" | "either";
      unit: "abs" | "percent" | "sd";
      amount: number | null;
      context?: MeasurementContext;
    }
  | {
      type: "window_average";
      metric: string;
      days: number;
      op: Op;
      value: number;
    }
  | {
      type: "flag";
      flags: string[];
    };

export interface Rule {
  id: string;
  level: "yellow" | "red";
  enabled: boolean;
  trigger: Trigger;
  persistence: number | null;
  requires_flags: string[];
  source: string;
  title: string;
  explanation: string;
  actions: string[];
  recheck: string;
}
