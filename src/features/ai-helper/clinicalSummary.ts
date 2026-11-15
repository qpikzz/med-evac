import type {
  EvaluationResult,
  RulesFile,
  Rule,
  Status,
  TriggeredRule,
} from "../../rules/types";

type RuleCandidate = {
  triggered: TriggeredRule;
  definition: Rule | undefined;
};

export interface TriggeredMetricSummary {
  metricKey: string;
  indicatorId: string;
  label: string;
  status: "red" | "yellow";
  primary: RuleCandidate;
  baseline: RuleCandidate | undefined;
}

export interface BaselineDeviationText {
  explanation: string;
  comparison: string;
}

function statusLabel(status: Status): string {
  return status === "no_data"
    ? "No Data"
    : `${status[0].toUpperCase()}${status.slice(1)}`;
}

function precisionForUnit(unit: string): number {
  switch (unit) {
    case "bpm":
    case "mmHg":
    case "mg/dL":
      return 0;
    case "°C":
    case "h":
    case "kg":
    case "µSv/h":
    case "mSv":
    case "0-10":
    case "0–10":
      return 1;
    default:
      return 2;
  }
}

function rulePriority(candidate: RuleCandidate): number {
  const severity = candidate.triggered.level === "red" ? 0 : 1;
  const typePriority =
    candidate.definition?.trigger.type === "threshold"
      ? 0
      : candidate.definition?.trigger.type === "baseline_delta"
        ? 1
        : candidate.definition?.trigger.type === "window_average"
          ? 2
          : 3;
  return severity * 10 + typePriority;
}

function metricForCandidate(candidate: RuleCandidate): string | undefined {
  const trigger = candidate.definition?.trigger;
  return trigger && trigger.type !== "flag"
    ? trigger.metric
    : candidate.triggered.observed?.metric;
}

export function getTriggeredMetricSummaries(
  evaluation: EvaluationResult,
  rules: RulesFile,
): TriggeredMetricSummary[] {
  const ruleDefinitions = new Map(
    rules.indicators.flatMap((indicator) =>
      indicator.rules.map((rule) => [rule.id, rule] as const),
    ),
  );
  const grouped = new Map<
    string,
    { indicatorId: string; candidates: RuleCandidate[] }
  >();

  for (const indicator of evaluation.indicators) {
    for (const triggered of indicator.triggered) {
      const candidate = {
        triggered,
        definition: ruleDefinitions.get(triggered.rule_id),
      };
      const metricKey =
        metricForCandidate(candidate) ?? `category:${indicator.indicator_id}`;
      const existing = grouped.get(metricKey);
      if (existing) {
        existing.candidates.push(candidate);
      } else {
        grouped.set(metricKey, {
          indicatorId: indicator.indicator_id,
          candidates: [candidate],
        });
      }
    }
  }

  const metricLabels = new Map(rules.metrics.map((metric) => [metric.id, metric.label]));
  const indicatorLabels = new Map(rules.indicators.map((indicator) => [indicator.id, indicator.label]));
  return Array.from(grouped, ([metricKey, group]) => {
    const candidates = [...group.candidates].sort(
      (left, right) => rulePriority(left) - rulePriority(right),
    );
    const primary = candidates[0];
    const baseline = candidates.find(
      (candidate) =>
        candidate.definition?.trigger.type === "baseline_delta" &&
        typeof candidate.triggered.observed?.value === "number" &&
        typeof candidate.triggered.observed.baseline === "number" &&
        typeof candidate.triggered.observed.delta === "number",
    );
    return {
      metricKey,
      indicatorId: group.indicatorId,
      label:
        metricLabels.get(metricKey) ??
        indicatorLabels.get(group.indicatorId) ??
        group.indicatorId,
      status: candidates.some((candidate) => candidate.triggered.level === "red")
        ? ("red" as const)
        : ("yellow" as const),
      primary,
      baseline,
    };
  }).sort((left, right) => (left.status === "red" ? 0 : 1) - (right.status === "red" ? 0 : 1));
}

function formatMetricValue(value: number, metricKey: string, rules: RulesFile): string {
  const metric = rules.metrics.find((entry) => entry.id === metricKey);
  const unit = metric?.unit ?? "";
  const formatted = value.toFixed(precisionForUnit(unit));
  return `${formatted}${unit ? ` ${unit}` : ""}`;
}

function formatDelta(
  delta: number,
  unit: string,
  precision: number,
): string {
  const sign = delta < 0 ? "-" : "+";
  const value = Math.abs(delta).toFixed(precision);
  return `${sign}${value}${unit === "%" ? "%" : unit ? ` ${unit}` : ""}`;
}

function metricSubject(metricKey: string, trigger: Extract<Rule["trigger"], { type: "baseline_delta" }>, rules: RulesFile): string {
  if (metricKey === "body_temp" && trigger.context === "rest") {
    return "resting temperature";
  }
  if (metricKey === "heart_rate") {
    return "resting heart rate";
  }
  return (
    rules.metrics.find((metric) => metric.id === metricKey)?.label.toLowerCase() ??
    metricKey.replace(/_/g, " ")
  );
}

export function formatBaselineDeviation(
  summary: TriggeredMetricSummary,
  rules: RulesFile,
): BaselineDeviationText | null {
  const candidate = summary.baseline;
  const trigger = candidate?.definition?.trigger;
  const observed = candidate?.triggered.observed;
  if (
    !candidate ||
    trigger?.type !== "baseline_delta" ||
    !observed ||
    typeof observed.value !== "number" ||
    typeof observed.baseline !== "number" ||
    typeof observed.delta !== "number"
  ) {
    return null;
  }

  const metric = rules.metrics.find((entry) => entry.id === trigger.metric);
  const metricUnit = metric?.unit ?? "";
  const deltaUnit =
    trigger.unit === "abs" ? metricUnit : trigger.unit === "percent" ? "%" : "SD";
  const deltaPrecision =
    trigger.unit === "abs" ? precisionForUnit(metricUnit) : 2;
  const signedDelta = formatDelta(observed.delta, deltaUnit, deltaPrecision);
  const baselineName =
    trigger.baseline === "rolling"
      ? `${rules.settings.rolling_baseline_days}-day baseline`
      : "preflight baseline";
  const unitSuffix = deltaUnit === "%" ? "%" : deltaUnit ? ` ${deltaUnit}` : "";
  const threshold =
    trigger.amount === null
      ? ""
      : ` (alert threshold: ${
          trigger.direction === "either"
            ? "±"
            : trigger.direction === "below"
              ? "-"
              : "+"
        }${trigger.amount.toFixed(deltaPrecision)}${unitSuffix})`;
  const currentValue = formatMetricValue(observed.value, trigger.metric, rules);
  const baselineValue = formatMetricValue(observed.baseline, trigger.metric, rules);
  const comparison =
    `Observed ${currentValue} · ${baselineName} ${baselineValue} · deviation ${signedDelta}`;
  const explanation =
    `Your ${metricSubject(trigger.metric, trigger, rules)} (${currentValue}) is ${signedDelta} ` +
    `${observed.delta < 0 ? "below" : "above"} your ${baselineName} of ${baselineValue}${threshold}.`;
  return { explanation, comparison };
}

function explanationForSummary(
  summary: TriggeredMetricSummary,
  baseline: BaselineDeviationText | null,
): string {
  if (baseline) {
    return baseline.explanation;
  }
  return summary.primary.triggered.explanation;
}

function groupBullet(
  summary: TriggeredMetricSummary,
  rules: RulesFile,
): string {
  const baseline = formatBaselineDeviation(summary, rules);
  const observed = summary.primary.triggered.observed;
  const value =
    !baseline && observed && typeof observed.value === "number" && observed.metric
      ? ` Observed ${formatMetricValue(observed.value, observed.metric, rules)}.`
      : "";
  return `- ${summary.label}: ${summary.primary.triggered.title}. ${explanationForSummary(summary, baseline)}${value}`;
}

export function buildDeterministicClinicalSummary(
  evaluation: EvaluationResult,
  rules: RulesFile,
  missionDay: number,
): string {
  const summaries = getTriggeredMetricSummaries(evaluation, rules);
  const red = summaries.filter((summary) => summary.status === "red");
  const yellow = summaries.filter((summary) => summary.status === "yellow");
  const lines = [
    `Day ${missionDay} · ${statusLabel(evaluation.overall_status)}`,
    "CRITICAL / RED alerts:",
    ...(red.length > 0 ? red.map((summary) => groupBullet(summary, rules)) : ["- None."]),
    "ELEVATED / YELLOW warnings:",
    ...(yellow.length > 0
      ? yellow.map((summary) => groupBullet(summary, rules))
      : ["- None."]),
  ];
  return lines.join("\n");
}
