import type { MeasurementContext, Reading, RulesFile } from "../../rules/types";

export interface RawEntry {
  metric: string;
  raw: string | number;
  context?: MeasurementContext;
}

export type CheckErrorCode =
  | "empty"
  | "not_a_number"
  | "out_of_range"
  | "bp_order"
  | "unknown_metric";

export type CheckResult =
  | { ok: true; metric: string; reading: Reading }
  | {
      ok: false;
      metric: string;
      code: CheckErrorCode;
      message: string;
      raw: string;
      range?: { min: number | null; max: number | null; unit: string };
    };

export interface CheckupCheck {
  results: CheckResult[];
  skipped: string[];
  readings: Reading[];
  allOk: boolean;
}

interface Candidate {
  entry: RawEntry;
  context: MeasurementContext;
  result: CheckResult;
}

const BP_ORDER_MESSAGE =
  "The upper (systolic) value must be higher than the lower (diastolic) value. Please measure again.";
const OUT_OF_RANGE_MESSAGE = "Looks like a measurement error. Please measure again.";
// Glucose is entered in mg/dL. A value of 2–33 is almost always mmol/L (normal ≈ 4–7 mmol/L).
const GLUCOSE_MMOL_MESSAGE =
  "This looks like mmol/L. Please enter mg/dL (mmol/L × 18, e.g. 5.4 mmol/L = 97 mg/dL).";
const NOT_A_NUMBER_MESSAGE = "Please enter a number, for example 72 or 36.8.";

export function checkEntry(entry: RawEntry, date: string, rules: RulesFile): CheckResult {
  const raw = String(entry.raw);
  const metric = rules.metrics.find((item) => item.id === entry.metric);
  if (!metric) {
    return {
      ok: false,
      metric: entry.metric,
      code: "unknown_metric",
      message: "Unknown measurement.",
      raw,
    };
  }

  const trimmed = raw.trim();
  if (trimmed === "") {
    return {
      ok: false,
      metric: metric.id,
      code: "empty",
      message: "No value entered.",
      raw,
    };
  }

  const normalized = trimmed.replace(",", ".");
  if (!/^[+-]?\d+(\.\d+)?$/.test(normalized)) {
    return {
      ok: false,
      metric: metric.id,
      code: "not_a_number",
      message: NOT_A_NUMBER_MESSAGE,
      raw,
    };
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return {
      ok: false,
      metric: metric.id,
      code: "not_a_number",
      message: NOT_A_NUMBER_MESSAGE,
      raw,
    };
  }

  if (
    (metric.plausible_min !== null && value < metric.plausible_min) ||
    (metric.plausible_max !== null && value > metric.plausible_max)
  ) {
    return {
      ok: false,
      metric: metric.id,
      code: "out_of_range",
      message:
        metric.id === "glucose" && value >= 2 && value <= 33 ? GLUCOSE_MMOL_MESSAGE : OUT_OF_RANGE_MESSAGE,
      raw,
      range: { min: metric.plausible_min, max: metric.plausible_max, unit: metric.unit },
    };
  }

  return {
    ok: true,
    metric: metric.id,
    reading: {
      date,
      metric: metric.id,
      value,
      context: entry.context ?? "rest",
      valid: true,
    },
  };
}

export function checkCheckup(
  entries: RawEntry[],
  date: string,
  rules: RulesFile,
): CheckupCheck {
  const skipped: string[] = [];
  const candidatesByKey = new Map<string, Candidate>();

  for (const entry of entries) {
    if (String(entry.raw).trim() === "") {
      skipped.push(entry.metric);
      continue;
    }
    const context = entry.context ?? "rest";
    const result = checkEntry(entry, date, rules);
    candidatesByKey.set(`${entry.metric}\u0000${context}`, { entry, context, result });
  }

  const candidates = Array.from(candidatesByKey.values());
  const systolic = candidates.find(
    (candidate) => candidate.result.ok && candidate.result.metric === "bp_systolic",
  );
  const diastolic = candidates.find(
    (candidate) => candidate.result.ok && candidate.result.metric === "bp_diastolic",
  );

  if (systolic && diastolic) {
    const systolicResult = systolic.result;
    const diastolicResult = diastolic.result;
    if (
      systolicResult.ok &&
      diastolicResult.ok &&
      systolicResult.reading.value <= diastolicResult.reading.value
    ) {
      systolic.result = {
        ok: false,
        metric: systolicResult.metric,
        code: "bp_order",
        message: BP_ORDER_MESSAGE,
        raw: String(systolic.entry.raw),
      };
      diastolic.result = {
        ok: false,
        metric: diastolicResult.metric,
        code: "bp_order",
        message: BP_ORDER_MESSAGE,
        raw: String(diastolic.entry.raw),
      };
    }
  }

  const results = candidates.map((candidate) => candidate.result);
  const allOk = results.every((result) => result.ok);
  const readings = allOk
    ? results.reduce<Reading[]>((readingsList, result) => {
        if (result.ok) {
          readingsList.push(result.reading);
        }
        return readingsList;
      }, [])
    : [];

  return { results, skipped, readings, allOk };
}
