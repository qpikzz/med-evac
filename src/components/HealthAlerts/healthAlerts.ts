// Pure helper: which indicators need an alert card, using only the engine's result (never its own logic).
import type { EvaluationResult, IndicatorResult, RulesFile, TriggeredRule } from "../../rules/types";

export interface AlertView {
  indicatorId: string;
  label: string;
  level: "yellow" | "red";
  rules: TriggeredRule[];
  escalationText: string;
  reportedFlags: string[];
}

function toView(indicator: IndicatorResult, rules: RulesFile): AlertView | null {
  if (indicator.status !== "yellow" && indicator.status !== "red") return null;
  const definition = rules.indicators.find((ind) => ind.id === indicator.indicator_id);
  const triggered = [...indicator.triggered].sort((a, b) =>
    a.level === b.level ? 0 : a.level === "red" ? -1 : 1,
  );
  const flagIds = new Set(triggered.flatMap((rule) => rule.observed?.flags ?? []));
  const escalationKey = indicator.escalation ? `escalation_${indicator.escalation}` : "";
  return {
    indicatorId: indicator.indicator_id,
    label: definition?.label ?? indicator.indicator_id,
    level: indicator.status,
    rules: triggered,
    escalationText: rules.ui_text[escalationKey] ?? "",
    reportedFlags: rules.flags.filter((flag) => flagIds.has(flag.id)).map((flag) => flag.label),
  };
}

/** All yellow/red indicators, red first; the engine's indicator order is kept within a level. */
export function alertViews(result: EvaluationResult | null, rules: RulesFile): AlertView[] {
  if (!result) return [];
  const views = result.indicators
    .map((indicator) => toView(indicator, rules))
    .filter((view): view is AlertView => view !== null);
  return [...views.filter((v) => v.level === "red"), ...views.filter((v) => v.level === "yellow")];
}
