// Pure helper: decide whether to show the radiation alert, using only the engine's result.
import type { EvaluationResult, IndicatorResult, RulesFile, TriggeredRule } from "../../rules/types";

export const RADIATION_INDICATOR = "radiation_dose";

export interface RadiationAlertView {
  level: "yellow" | "red";
  heading: string;
  rules: TriggeredRule[];
  escalationText: string;
  reportedFlags: string[];
}

export function radiationAlertView(
  result: EvaluationResult | null,
  rules: RulesFile,
): RadiationAlertView | null {
  const indicator: IndicatorResult | undefined = result?.indicators.find(
    (item) => item.indicator_id === RADIATION_INDICATOR,
  );
  if (!indicator || (indicator.status !== "yellow" && indicator.status !== "red")) {
    return null;
  }
  const level = indicator.status;
  // Show the rules at the indicator's level first (red before yellow).
  const triggered = [...indicator.triggered].sort((a, b) =>
    a.level === b.level ? 0 : a.level === "red" ? -1 : 1,
  );
  const flagIds = new Set(triggered.flatMap((rule) => rule.observed?.flags ?? []));
  const reportedFlags = rules.flags.filter((flag) => flagIds.has(flag.id)).map((flag) => flag.label);
  const escalationKey = indicator.escalation ? `escalation_${indicator.escalation}` : "";
  return {
    level,
    heading: level === "red" ? "Radiation alert" : "Radiation warning",
    rules: triggered,
    escalationText: rules.ui_text[escalationKey] ?? "",
    reportedFlags,
  };
}
