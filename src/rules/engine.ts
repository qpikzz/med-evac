import type {
  Baseline,
  EvaluationInput,
  EvaluationResult,
  IndicatorResult,
  PendingRule,
  Op,
  Reading,
  Rule,
  SkipReason,
  SkippedRule,
  Status,
  Trigger,
  TriggeredRule,
} from "./types";
import { addDays } from "./dateMath";

type BaselineSource = "preflight" | "rolling";

type TriggerOutcome =
  | { kind: "met"; observed?: TriggeredRule["observed"] }
  | { kind: "not_met" }
  | { kind: "skipped"; reason: SkipReason };

type SeriesResult =
  | { ok: true; readings: Reading[] }
  | { ok: false; reason: SkipReason };

const STATUS_RANK: Record<Status, number> = {
  no_data: 0,
  green: 1,
  yellow: 2,
  red: 3,
};

function worstStatus(left: Status, right: Status): Status {
  return STATUS_RANK[right] > STATUS_RANK[left] ? right : left;
}

function compare(value: number, op: Op, threshold: number): boolean {
  switch (op) {
    case "<":
      return value < threshold;
    case "<=":
      return value <= threshold;
    case ">":
      return value > threshold;
    case ">=":
      return value >= threshold;
  }
}

function readingKey(metric: string, date: string, context: string): string {
  return `${metric}\u0000${date}\u0000${context}`;
}

function prepareReadings(
  readings: Reading[],
  today: string,
  knownMetrics: Set<string>,
): { lookup: Map<string, Reading>; todayMetrics: Set<string> } {
  const lookup = new Map<string, Reading>();
  const todayMetrics = new Set<string>();

  for (const reading of readings) {
    if (reading.valid !== true) {
      continue;
    }
    if (!Number.isFinite(reading.value)) {
      continue;
    }
    if (reading.date > today) {
      continue;
    }
    if (!knownMetrics.has(reading.metric)) {
      continue;
    }
    const context = reading.context ?? "rest";
    lookup.set(readingKey(reading.metric, reading.date, context), reading);
    if (reading.date === today) {
      todayMetrics.add(reading.metric);
    }
  }

  return { lookup, todayMetrics };
}

function collectDailyReadings(
  lookup: Map<string, Reading>,
  metric: string,
  context: string,
  today: string,
  days: number,
): SeriesResult {
  const readings: Reading[] = [];
  for (let k = 0; k < days; k += 1) {
    const reading = lookup.get(readingKey(metric, addDays(today, -k), context));
    if (!reading) {
      return {
        ok: false,
        reason: k === 0 ? "no_reading_today" : "insufficient_history",
      };
    }
    readings.push(reading);
  }
  return { ok: true, readings };
}

function baselineStats(
  baseline: Baseline | undefined,
  source: BaselineSource,
  minimumRollingReadings: number,
): { mean: number; sd: number | null } | null {
  if (!baseline) {
    return null;
  }
  if (source === "preflight") {
    if (baseline.preflight_mean === null || !Number.isFinite(baseline.preflight_mean)) {
      return null;
    }
    return { mean: baseline.preflight_mean, sd: baseline.preflight_sd };
  }
  if (baseline.rolling_n < minimumRollingReadings) {
    return null;
  }
  if (baseline.rolling_mean === null || !Number.isFinite(baseline.rolling_mean)) {
    return null;
  }
  return { mean: baseline.rolling_mean, sd: baseline.rolling_sd };
}

function deltaMatches(
  delta: number,
  direction: "above" | "below" | "either",
  amount: number,
): boolean {
  if (direction === "above") {
    return delta >= amount;
  }
  if (direction === "below") {
    return -delta >= amount;
  }
  return Math.abs(delta) >= amount;
}

function evaluateThreshold(
  rule: Rule,
  trigger: Extract<Trigger, { type: "threshold" }>,
  today: string,
  lookup: Map<string, Reading>,
): TriggerOutcome {
  const threshold = trigger.value;
  if (threshold === null) {
    return { kind: "not_met" };
  }
  const persistence = rule.persistence ?? 1;
  if (persistence < 1) {
    return { kind: "not_met" };
  }
  const series = collectDailyReadings(
    lookup,
    trigger.metric,
    trigger.context ?? "rest",
    today,
    persistence,
  );
  if (!series.ok) {
    return { kind: "skipped", reason: series.reason };
  }
  if (
    !series.readings.every((reading) => compare(reading.value, trigger.op, threshold))
  ) {
    return { kind: "not_met" };
  }
  return {
    kind: "met",
    observed: { metric: trigger.metric, value: series.readings[0].value },
  };
}

function evaluateBaselineDelta(
  rule: Rule,
  trigger: Extract<Trigger, { type: "baseline_delta" }>,
  input: EvaluationInput,
  lookup: Map<string, Reading>,
): TriggerOutcome {
  const stats = baselineStats(
    input.baselines[trigger.metric],
    trigger.baseline,
    input.rules.settings.min_rolling_baseline_readings,
  );
  if (!stats) {
    return { kind: "skipped", reason: "no_baseline" };
  }
  if (trigger.unit === "percent" && stats.mean === 0) {
    return { kind: "skipped", reason: "no_baseline" };
  }
  const amount = trigger.amount;
  if (amount === null) {
    return { kind: "not_met" };
  }
  const persistence = rule.persistence ?? 1;
  if (persistence < 1) {
    return { kind: "not_met" };
  }
  const series = collectDailyReadings(
    lookup,
    trigger.metric,
    trigger.context ?? "rest",
    input.today,
    persistence,
  );
  if (!series.ok) {
    return { kind: "skipped", reason: series.reason };
  }

  let deltas: number[];
  if (trigger.unit === "abs") {
    deltas = series.readings.map((reading) => reading.value - stats.mean);
  } else if (trigger.unit === "percent") {
    deltas = series.readings.map(
      (reading) => ((reading.value - stats.mean) / stats.mean) * 100,
    );
  } else {
    const sd = stats.sd;
    if (sd === null || !Number.isFinite(sd) || sd === 0) {
      return { kind: "skipped", reason: "no_baseline" };
    }
    deltas = series.readings.map((reading) => (reading.value - stats.mean) / sd);
  }

  if (!deltas.every((delta) => deltaMatches(delta, trigger.direction, amount))) {
    return { kind: "not_met" };
  }
  return {
    kind: "met",
    observed: {
      metric: trigger.metric,
      value: series.readings[0].value,
      baseline: stats.mean,
      delta: deltas[0],
    },
  };
}

function evaluateWindowAverage(
  trigger: Extract<Trigger, { type: "window_average" }>,
  today: string,
  lookup: Map<string, Reading>,
): TriggerOutcome {
  if (!Number.isFinite(trigger.days) || trigger.days < 1) {
    return { kind: "not_met" };
  }
  const series = collectDailyReadings(lookup, trigger.metric, "rest", today, trigger.days);
  if (!series.ok) {
    return { kind: "skipped", reason: series.reason };
  }
  const average =
    series.readings.reduce((sum, reading) => sum + reading.value, 0) /
    series.readings.length;
  if (!compare(average, trigger.op, trigger.value)) {
    return { kind: "not_met" };
  }
  return {
    kind: "met",
    observed: { metric: trigger.metric, value: average },
  };
}

function evaluateFlag(
  trigger: Extract<Trigger, { type: "flag" }>,
  flags: string[],
): TriggerOutcome {
  const matched = trigger.flags.filter((flag) => flags.includes(flag));
  if (matched.length === 0) {
    return { kind: "not_met" };
  }
  return { kind: "met", observed: { flags: matched } };
}

function evaluateRule(
  rule: Rule,
  input: EvaluationInput,
  lookup: Map<string, Reading>,
): TriggerOutcome {
  const trigger = rule.trigger;
  switch (trigger.type) {
    case "threshold":
      return evaluateThreshold(rule, trigger, input.today, lookup);
    case "baseline_delta":
      return evaluateBaselineDelta(rule, trigger, input, lookup);
    case "window_average":
      return evaluateWindowAverage(trigger, input.today, lookup);
    case "flag":
      return evaluateFlag(trigger, input.flags);
    default:
      return { kind: "not_met" };
  }
}

export function evaluate(input: EvaluationInput): EvaluationResult {
  const { rules } = input;
  const knownMetrics = new Set(rules.metrics.map((metric) => metric.id));
  const { lookup, todayMetrics } = prepareReadings(input.readings, input.today, knownMetrics);

  const indicatorMetrics = new Map<string, string[]>();
  for (const metric of rules.metrics) {
    const metricIds = indicatorMetrics.get(metric.indicator_id) ?? [];
    metricIds.push(metric.id);
    indicatorMetrics.set(metric.indicator_id, metricIds);
  }

  const indicators: IndicatorResult[] = rules.indicators.map((indicator) => {
    const triggered: TriggeredRule[] = [];
    const skipped: SkippedRule[] = [];
    const pending: PendingRule[] = [];

    for (const rule of indicator.rules) {
      if (!rule.enabled) {
        skipped.push({ rule_id: rule.id, reason: "rule_disabled" });
        continue;
      }

      const outcome = evaluateRule(rule, input, lookup);
      const persistence = rule.persistence ?? 1;
      const flagsOk =
        rule.requires_flags.length === 0 ||
        rule.requires_flags.some((flag) => input.flags.includes(flag));
      if (
        outcome.kind !== "met" &&
        persistence > 1 &&
        flagsOk &&
        (outcome.kind === "not_met" || outcome.reason === "insufficient_history") &&
        evaluateRule({ ...rule, persistence: 1 }, input, lookup).kind === "met"
      ) {
        pending.push({ rule_id: rule.id, level: rule.level, title: rule.title, days_needed: persistence });
      }
      if (outcome.kind === "skipped") {
        skipped.push({ rule_id: rule.id, reason: outcome.reason });
        continue;
      }
      if (outcome.kind === "not_met") {
        continue;
      }
      if (
        rule.requires_flags.length > 0 &&
        !rule.requires_flags.some((flag) => input.flags.includes(flag))
      ) {
        continue;
      }

      const triggeredRule: TriggeredRule = {
        rule_id: rule.id,
        level: rule.level,
        source: rule.source,
        title: rule.title,
        explanation: rule.explanation,
        actions: [...rule.actions],
        recheck: rule.recheck,
      };
      if (outcome.observed) {
        triggeredRule.observed = outcome.observed;
      }
      triggered.push(triggeredRule);
    }

    const ordered = [
      ...triggered.filter((rule) => rule.level === "red"),
      ...triggered.filter((rule) => rule.level === "yellow"),
    ];
    const metricIds = indicatorMetrics.get(indicator.id) ?? [];

    let status: Status;
    if (ordered.length > 0) {
      status = ordered.some((rule) => rule.level === "red") ? "red" : "yellow";
    } else if (metricIds.length > 0) {
      status = metricIds.some((metric) => todayMetrics.has(metric)) ? "green" : "no_data";
    } else {
      status = "green";
    }

    return {
      indicator_id: indicator.id,
      status,
      escalation: status === "no_data" ? null : rules.escalation[status],
      triggered: ordered,
      skipped,
      baseline_forming: skipped.some((entry) => entry.reason === "no_baseline"),
      ...(pending.length > 0 ? { pending } : {}),
    };
  });

  const overall_status = indicators.reduce<Status>(
    (worst, indicator) => worstStatus(worst, indicator.status),
    "no_data",
  );

  return {
    today: input.today,
    overall_status,
    overall_escalation:
      overall_status === "no_data" ? null : rules.escalation[overall_status],
    indicators,
    rules_version: rules.schema_version,
  };
}
