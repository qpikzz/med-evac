import type { Escalation, MeasurementContext, Op, RulesFile } from "./types";

export class RulesFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RulesFileError";
  }
}

const ESCALATIONS: readonly Escalation[] = [
  "self",
  "crew_medical_officer",
  "ground_flight_surgeon",
];
const OPS: readonly Op[] = ["<", "<=", ">", ">="];
const CONTEXTS: readonly MeasurementContext[] = ["rest", "exercise"];
const LEVELS = ["yellow", "red"] as const;

function fail(message: string): never {
  throw new RulesFileError(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    fail(`${path} must be an object`);
  }
  return value;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    fail(`${path} must be an array`);
  }
  return value;
}

function str(value: unknown, path: string): string {
  if (typeof value !== "string") {
    fail(`${path} must be a string`);
  }
  return value;
}

function bool(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    fail(`${path} must be a boolean`);
  }
  return value;
}

function num(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(`${path} must be a finite number`);
  }
  return value;
}

function nullableNum(value: unknown, path: string): number | null {
  if (value === null) {
    return null;
  }
  return num(value, path);
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail(`${path} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function validateSettings(value: unknown): void {
  const settings = record(value, "rules.settings");
  num(settings.rolling_baseline_days, "rules.settings.rolling_baseline_days");
  num(
    settings.min_rolling_baseline_readings,
    "rules.settings.min_rolling_baseline_readings",
  );
}

function validateEscalation(value: unknown): void {
  const escalation = record(value, "rules.escalation");
  enumValue(escalation.green, ESCALATIONS, "rules.escalation.green");
  enumValue(escalation.yellow, ESCALATIONS, "rules.escalation.yellow");
  enumValue(escalation.red, ESCALATIONS, "rules.escalation.red");
}

function validateUiText(value: unknown): void {
  const uiText = record(value, "rules.ui_text");
  for (const [key, entry] of Object.entries(uiText)) {
    if (typeof entry !== "string") {
      fail(`rules.ui_text.${key} must be a string`);
    }
  }
}

function validateMetrics(value: unknown): Set<string> {
  const metrics = array(value, "rules.metrics");
  const ids = new Set<string>();

  metrics.forEach((metric, index) => {
    const path = `rules.metrics[${index}]`;
    const entry = record(metric, path);
    const id = str(entry.id, `${path}.id`);
    if (ids.has(id)) {
      fail(`Duplicate metric id "${id}"`);
    }
    ids.add(id);
    str(entry.indicator_id, `${path}.indicator_id`);
    str(entry.label, `${path}.label`);
    str(entry.unit, `${path}.unit`);
    nullableNum(entry.plausible_min, `${path}.plausible_min`);
    nullableNum(entry.plausible_max, `${path}.plausible_max`);
  });

  return ids;
}

function validateFlags(value: unknown): Set<string> {
  const flags = array(value, "rules.flags");
  const ids = new Set<string>();

  flags.forEach((flag, index) => {
    const path = `rules.flags[${index}]`;
    const entry = record(flag, path);
    const id = str(entry.id, `${path}.id`);
    if (ids.has(id)) {
      fail(`Duplicate flag id "${id}"`);
    }
    ids.add(id);
    enumValue(entry.kind, ["symptom", "event"] as const, `${path}.kind`);
    str(entry.label, `${path}.label`);
    array(entry.indicator_ids, `${path}.indicator_ids`).forEach(
      (indicatorId, indicatorIndex) => {
        str(indicatorId, `${path}.indicator_ids[${indicatorIndex}]`);
      },
    );
  });

  return ids;
}

function validateTrigger(
  value: unknown,
  ruleId: string,
  metricIds: Set<string>,
  flagIds: Set<string>,
): void {
  const path = `rule "${ruleId}" trigger`;
  const trigger = record(value, path);
  const type = str(trigger.type, `${path}.type`);

  switch (type) {
    case "threshold": {
      const metric = str(trigger.metric, `${path}.metric`);
      if (!metricIds.has(metric)) {
        fail(`Rule "${ruleId}" references unknown metric "${metric}"`);
      }
      enumValue(trigger.op, OPS, `${path}.op`);
      nullableNum(trigger.value, `${path}.value`);
      if (trigger.context !== undefined) {
        enumValue(trigger.context, CONTEXTS, `${path}.context`);
      }
      return;
    }
    case "baseline_delta": {
      const metric = str(trigger.metric, `${path}.metric`);
      if (!metricIds.has(metric)) {
        fail(`Rule "${ruleId}" references unknown metric "${metric}"`);
      }
      enumValue(trigger.baseline, ["preflight", "rolling"] as const, `${path}.baseline`);
      enumValue(trigger.direction, ["above", "below", "either"] as const, `${path}.direction`);
      enumValue(trigger.unit, ["abs", "percent", "sd"] as const, `${path}.unit`);
      nullableNum(trigger.amount, `${path}.amount`);
      if (trigger.context !== undefined) {
        enumValue(trigger.context, CONTEXTS, `${path}.context`);
      }
      return;
    }
    case "window_average": {
      const metric = str(trigger.metric, `${path}.metric`);
      if (!metricIds.has(metric)) {
        fail(`Rule "${ruleId}" references unknown metric "${metric}"`);
      }
      num(trigger.days, `${path}.days`);
      enumValue(trigger.op, OPS, `${path}.op`);
      num(trigger.value, `${path}.value`);
      return;
    }
    case "flag": {
      array(trigger.flags, `${path}.flags`).forEach((flagValue, index) => {
        const flag = str(flagValue, `${path}.flags[${index}]`);
        if (!flagIds.has(flag)) {
          fail(`Rule "${ruleId}" references unknown flag "${flag}"`);
        }
      });
      return;
    }
    default:
      fail(`Rule "${ruleId}" has unknown trigger type "${type}"`);
  }
}

function validateRule(
  value: unknown,
  path: string,
  metricIds: Set<string>,
  flagIds: Set<string>,
  ruleIds: Set<string>,
): void {
  const rule = record(value, path);
  const id = str(rule.id, `${path}.id`);
  if (ruleIds.has(id)) {
    fail(`Duplicate rule id "${id}"`);
  }
  ruleIds.add(id);

  enumValue(rule.level, LEVELS, `${path}.level`);
  const enabled = bool(rule.enabled, `${path}.enabled`);
  const persistence = nullableNum(rule.persistence, `${path}.persistence`);

  array(rule.requires_flags, `${path}.requires_flags`).forEach((flagValue, index) => {
    const flag = str(flagValue, `${path}.requires_flags[${index}]`);
    if (!flagIds.has(flag)) {
      fail(`Rule "${id}" references unknown flag "${flag}"`);
    }
  });

  str(rule.source, `${path}.source`);
  str(rule.title, `${path}.title`);
  str(rule.explanation, `${path}.explanation`);
  array(rule.actions, `${path}.actions`).forEach((action, index) => {
    str(action, `${path}.actions[${index}]`);
  });
  str(rule.recheck, `${path}.recheck`);

  const trigger = record(rule.trigger, `${path}.trigger`);
  validateTrigger(trigger, id, metricIds, flagIds);

  if (enabled) {
    if (persistence === null) {
      fail(`Rule "${id}" is enabled but persistence is null`);
    }
    if (trigger.type === "threshold" && trigger.value === null) {
      fail(`Rule "${id}" is enabled but trigger.value is null`);
    }
    if (trigger.type === "baseline_delta" && trigger.amount === null) {
      fail(`Rule "${id}" is enabled but trigger.amount is null`);
    }
  }
}

function validateIndicators(
  value: unknown,
  metricIds: Set<string>,
  flagIds: Set<string>,
): void {
  const indicators = array(value, "rules.indicators");
  const indicatorIds = new Set<string>();
  const ruleIds = new Set<string>();

  indicators.forEach((indicator, index) => {
    const path = `rules.indicators[${index}]`;
    const entry = record(indicator, path);
    const id = str(entry.id, `${path}.id`);
    if (indicatorIds.has(id)) {
      fail(`Duplicate indicator id "${id}"`);
    }
    indicatorIds.add(id);
    str(entry.label, `${path}.label`);
    str(entry.table_confidence, `${path}.table_confidence`);
    array(entry.rules, `${path}.rules`).forEach((rule, ruleIndex) => {
      validateRule(rule, `${path}.rules[${ruleIndex}]`, metricIds, flagIds, ruleIds);
    });
  });
}

export function loadRules(json: unknown): RulesFile {
  const root = record(json, "rules");
  str(root.schema_version, "rules.schema_version");
  validateSettings(root.settings);
  validateEscalation(root.escalation);
  validateUiText(root.ui_text);
  const metricIds = validateMetrics(root.metrics);
  const flagIds = validateFlags(root.flags);
  validateIndicators(root.indicators, metricIds, flagIds);
  return root as unknown as RulesFile;
}
