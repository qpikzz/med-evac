import type { Baseline, Level, Reading, RulesFile } from "../../rules/types";
import { addDays } from "../../rules/dateMath";

export interface BaselineInput {
  today: string;
  preflight: Reading[];
  history: Reading[];
  rules: RulesFile;
}

export interface Deviation {
  metric: string;
  source: "preflight" | "rolling";
  mean: number | null;
  value: number;
  delta_abs: number | null;
  delta_percent: number | null;
}

export interface ReferenceLine {
  value: number;
  kind: "baseline" | "threshold" | "baseline_delta" | "window_average";
  level: Level;
  rule_id: string | null;
  label: string;
}

type BaselineSource = "preflight" | "rolling";

function isCountingRestReading(reading: Reading): boolean {
  return (
    reading.valid === true &&
    Number.isFinite(reading.value) &&
    (reading.context ?? "rest") === "rest"
  );
}

function lastReadingPerDate(readings: Reading[], metric: string): Reading[] {
  const byDate = new Map<string, Reading>();
  for (const reading of readings) {
    if (reading.metric !== metric || !isCountingRestReading(reading)) {
      continue;
    }
    byDate.set(reading.date, reading);
  }
  return Array.from(byDate.values());
}

function arithmeticMean(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleSd(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }
  const mean = arithmeticMean(values);
  if (mean === null) {
    return null;
  }
  const squaredDifferences = values.reduce(
    (sum, value) => sum + (value - mean) * (value - mean),
    0,
  );
  return Math.sqrt(squaredDifferences / (values.length - 1));
}

function firstBaselineSource(metric: string, rules: RulesFile): BaselineSource {
  for (const indicator of rules.indicators) {
    for (const rule of indicator.rules) {
      if (
        rule.enabled &&
        rule.trigger.type === "baseline_delta" &&
        rule.trigger.metric === metric
      ) {
        return rule.trigger.baseline;
      }
    }
  }
  return "rolling";
}

function availableStats(
  baseline: Baseline | undefined,
  source: BaselineSource,
  rules: RulesFile,
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
  if (baseline.rolling_n < rules.settings.min_rolling_baseline_readings) {
    return null;
  }
  if (baseline.rolling_mean === null || !Number.isFinite(baseline.rolling_mean)) {
    return null;
  }
  return { mean: baseline.rolling_mean, sd: baseline.rolling_sd };
}

function limitLabel(level: Level, title: string): string {
  return `${level === "red" ? "Red" : "Yellow"} limit: ${title}`;
}

function baselineDeltaValues(
  mean: number,
  sd: number | null,
  direction: "above" | "below" | "either",
  unit: "abs" | "percent" | "sd",
  amount: number,
): number[] {
  const values: number[] = [];
  const add = (sign: number): void => {
    if (unit === "abs") {
      values.push(mean + sign * amount);
      return;
    }
    if (unit === "percent") {
      values.push(mean * (1 + (sign * amount) / 100));
      return;
    }
    if (sd === null || !Number.isFinite(sd) || sd === 0) {
      return;
    }
    values.push(mean + sign * amount * sd);
  };

  if (direction === "above") {
    add(1);
  } else if (direction === "below") {
    add(-1);
  } else {
    add(1);
    add(-1);
  }
  return values;
}

export function computeBaselines(input: BaselineInput): Record<string, Baseline> {
  const { today, preflight, history, rules } = input;
  const windowDates = new Set<string>();
  for (let day = 1; day <= rules.settings.rolling_baseline_days; day += 1) {
    windowDates.add(addDays(today, -day));
  }

  const baselines: Record<string, Baseline> = {};
  for (const metric of rules.metrics) {
    const preflightValues = lastReadingPerDate(preflight, metric.id).map(
      (reading) => reading.value,
    );
    const rollingValues = lastReadingPerDate(history, metric.id)
      .filter((reading) => windowDates.has(reading.date))
      .map((reading) => reading.value);

    baselines[metric.id] = {
      preflight_mean: arithmeticMean(preflightValues),
      preflight_sd: sampleSd(preflightValues),
      rolling_mean: arithmeticMean(rollingValues),
      rolling_sd: sampleSd(rollingValues),
      rolling_n: rollingValues.length,
    };
  }

  return baselines;
}

export function describeDeviation(
  metric: string,
  value: number,
  baseline: Baseline | undefined,
  rules: RulesFile,
): Deviation {
  const source = firstBaselineSource(metric, rules);
  const stats = availableStats(baseline, source, rules);
  const mean = stats ? stats.mean : null;

  return {
    metric,
    source,
    mean,
    value,
    delta_abs: mean === null ? null : value - mean,
    delta_percent: mean === null || mean === 0 ? null : ((value - mean) / mean) * 100,
  };
}

export function getReferenceLines(
  metric: string,
  baselines: Record<string, Baseline>,
  rules: RulesFile,
): ReferenceLine[] {
  const lines: ReferenceLine[] = [];
  const source = firstBaselineSource(metric, rules);
  const mainStats = availableStats(baselines[metric], source, rules);

  if (mainStats) {
    lines.push({
      value: mainStats.mean,
      kind: "baseline",
      level: "green",
      rule_id: null,
      label:
        source === "preflight"
          ? "Your normal (before flight)"
          : "Your normal (last 7 days)",
    });
  }

  for (const indicator of rules.indicators) {
    for (const rule of indicator.rules) {
      if (!rule.enabled || rule.requires_flags.length > 0) {
        continue;
      }
      const trigger = rule.trigger;
      if (trigger.type === "flag" || trigger.metric !== metric) {
        continue;
      }
      if (trigger.type !== "window_average" && (trigger.context ?? "rest") !== "rest") {
        continue;
      }

      if (trigger.type === "threshold") {
        if (trigger.value === null) {
          continue;
        }
        lines.push({
          value: trigger.value,
          kind: "threshold",
          level: rule.level,
          rule_id: rule.id,
          label: limitLabel(rule.level, rule.title),
        });
      } else if (trigger.type === "window_average") {
        lines.push({
          value: trigger.value,
          kind: "window_average",
          level: rule.level,
          rule_id: rule.id,
          label: limitLabel(rule.level, rule.title),
        });
      } else if (trigger.type === "baseline_delta") {
        const stats = availableStats(baselines[metric], trigger.baseline, rules);
        if (!stats || trigger.amount === null) {
          continue;
        }
        for (const value of baselineDeltaValues(
          stats.mean,
          stats.sd,
          trigger.direction,
          trigger.unit,
          trigger.amount,
        )) {
          lines.push({
            value,
            kind: "baseline_delta",
            level: rule.level,
            rule_id: rule.id,
            label: limitLabel(rule.level, rule.title),
          });
        }
      }
    }
  }

  const deduped: ReferenceLine[] = [];
  for (const line of lines) {
    if (
      !deduped.some(
        (existing) => existing.value === line.value && existing.level === line.level,
      )
    ) {
      deduped.push(line);
    }
  }
  return deduped;
}
