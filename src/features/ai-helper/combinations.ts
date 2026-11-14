import type { EvaluationResult, RulesFile, Status } from "../../rules/types";

export type Condition =
  | { type: "indicator"; indicator_id: string; min_level: "yellow" | "red" }
  | { type: "rule"; rule_id: string }
  | { type: "flag"; flag_id: string };

export interface Combination {
  id: string;
  title: string;
  all_of: Condition[];
  possible_explanations: string[];
  actions: string[];
  discuss_with: "crew_medical_officer" | "ground_flight_surgeon";
  source: string;
  confidence: "verified" | "needs check";
}

export interface CombinationsFile {
  schema_version: "1.0";
  combinations: Combination[];
}

export interface MatchedCombination {
  combination: Combination;
  matched: Condition[];
}

export interface PictureResult {
  matched: MatchedCombination[];
  non_green_indicators: string[];
  unverified: boolean;
}

export class CombinationsFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CombinationsFileError";
  }
}

const STATUS_RANK: Record<Status, number> = {
  no_data: 0,
  green: 1,
  yellow: 2,
  red: 3,
};

function fail(message: string): never {
  throw new CombinationsFileError(message);
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
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${path} must be a non-empty string`);
  }
  return value;
}

function strArray(value: unknown, path: string, allowEmpty: boolean): string[] {
  const entries = array(value, path);
  if (!allowEmpty && entries.length === 0) {
    fail(`${path} must not be empty`);
  }
  return entries.map((entry, index) => str(entry, `${path}[${index}]`));
}

function uniqueRuleIds(rules: RulesFile): Set<string> {
  const ids = new Set<string>();
  for (const indicator of rules.indicators) {
    for (const rule of indicator.rules) {
      ids.add(rule.id);
    }
  }
  return ids;
}

function validateCondition(
  value: unknown,
  combinationId: string,
  path: string,
  indicators: Set<string>,
  rules: Set<string>,
  flags: Set<string>,
): void {
  const condition = record(value, path);
  const type = str(condition.type, `${path}.type`);

  switch (type) {
    case "indicator": {
      const indicatorId = str(condition.indicator_id, `${path}.indicator_id`);
      if (!indicators.has(indicatorId)) {
        fail(
          `Combination "${combinationId}" references unknown indicator "${indicatorId}"`,
        );
      }
      if (condition.min_level !== "yellow" && condition.min_level !== "red") {
        fail(
          `Combination "${combinationId}" has invalid min_level "${String(
            condition.min_level,
          )}"`,
        );
      }
      return;
    }
    case "rule": {
      const ruleId = str(condition.rule_id, `${path}.rule_id`);
      if (!rules.has(ruleId)) {
        fail(`Combination "${combinationId}" references unknown rule "${ruleId}"`);
      }
      return;
    }
    case "flag": {
      const flagId = str(condition.flag_id, `${path}.flag_id`);
      if (!flags.has(flagId)) {
        fail(`Combination "${combinationId}" references unknown flag "${flagId}"`);
      }
      return;
    }
    default:
      fail(`Combination "${combinationId}" has unknown condition type "${type}"`);
  }
}

function validateCombination(
  value: unknown,
  index: number,
  indicators: Set<string>,
  rules: Set<string>,
  flags: Set<string>,
): Combination {
  const path = `combinations[${index}]`;
  const entry = record(value, path);
  const id = str(entry.id, `${path}.id`);

  str(entry.title, `${path}.title`);
  const allOf = array(entry.all_of, `${path}.all_of`);
  if (allOf.length < 2) {
    fail(`Combination "${id}" all_of must contain at least 2 conditions`);
  }
  allOf.forEach((condition, conditionIndex) => {
    validateCondition(
      condition,
      id,
      `${path}.all_of[${conditionIndex}]`,
      indicators,
      rules,
      flags,
    );
  });

  strArray(entry.possible_explanations, `${path}.possible_explanations`, false);
  strArray(entry.actions, `${path}.actions`, true);
  str(entry.source, `${path}.source`);

  if (
    entry.discuss_with !== "crew_medical_officer" &&
    entry.discuss_with !== "ground_flight_surgeon"
  ) {
    fail(`Combination "${id}" has invalid discuss_with "${String(entry.discuss_with)}"`);
  }
  if (entry.confidence !== "verified" && entry.confidence !== "needs check") {
    fail(`Combination "${id}" has invalid confidence "${String(entry.confidence)}"`);
  }

  return entry as unknown as Combination;
}

export function loadCombinations(json: unknown, rules: RulesFile): CombinationsFile {
  const root = record(json, "combinations file");
  if (root.schema_version !== "1.0") {
    fail(
      `combinations file schema_version must be "1.0", got "${String(
        root.schema_version,
      )}"`,
    );
  }

  const indicatorIds = new Set(rules.indicators.map((indicator) => indicator.id));
  const ruleIds = uniqueRuleIds(rules);
  const flagIds = new Set(rules.flags.map((flag) => flag.id));
  const seen = new Set<string>();
  const combinations = array(root.combinations, "combinations").map((entry, index) => {
    const combination = validateCombination(entry, index, indicatorIds, ruleIds, flagIds);
    if (seen.has(combination.id)) {
      fail(`Duplicate combination id "${combination.id}"`);
    }
    seen.add(combination.id);
    return combination;
  });

  return { schema_version: "1.0", combinations };
}

function conditionHolds(
  condition: Condition,
  ev: EvaluationResult,
  flagsToday: string[],
): boolean {
  switch (condition.type) {
    case "indicator": {
      const indicator = ev.indicators.find(
        (entry) => entry.indicator_id === condition.indicator_id,
      );
      if (!indicator) {
        return false;
      }
      return STATUS_RANK[indicator.status] >= STATUS_RANK[condition.min_level];
    }
    case "rule":
      return ev.indicators.some((indicator) =>
        indicator.triggered.some((rule) => rule.rule_id === condition.rule_id),
      );
    case "flag":
      return flagsToday.includes(condition.flag_id);
  }
}

export function matchCombinations(
  ev: EvaluationResult,
  flagsToday: string[],
  file: CombinationsFile,
): PictureResult {
  const matched: MatchedCombination[] = [];

  for (const combination of file.combinations) {
    if (combination.all_of.every((condition) => conditionHolds(condition, ev, flagsToday))) {
      matched.push({ combination, matched: [...combination.all_of] });
    }
  }

  const nonGreenIndicators = ev.indicators
    .filter((indicator) => indicator.status === "yellow" || indicator.status === "red")
    .map((indicator) => indicator.indicator_id);

  return {
    matched,
    non_green_indicators: nonGreenIndicators,
    unverified: matched.length === 0 && nonGreenIndicators.length >= 2,
  };
}
