// Pure helpers: pick the worst status the Rules engine already produced. Never compute or soften a status.
import type { EvaluationResult, IndicatorResult, RulesFile, Status } from "../../rules/types";
import { LAYERS, ZONES, type LayerId, type ZoneConfig, type ZoneId } from "./zones";

export type ZoneStyle = Status | "monitoring";

export const MONITORING_TEXT = "Monitoring only — limits are set by mission flight surgeons.";

export const STATUS_WORD: Record<ZoneStyle, string> = {
  green: "OK",
  yellow: "Watch",
  red: "Alert",
  no_data: "No data",
  monitoring: "Monitoring",
};

export const STATUS_ICON: Record<ZoneStyle, string> = {
  green: "✓",
  yellow: "!",
  red: "!!",
  no_data: "–",
  monitoring: "◌",
};

const RANK: Record<Status, number> = { red: 3, yellow: 2, green: 1, no_data: 0 };

export function worstStatus(statuses: Status[]): Status {
  return statuses.reduce<Status>((worst, s) => (RANK[s] > RANK[worst] ? s : worst), "no_data");
}

/** Indicators whose rules in rules.json are ALL `enabled: false`. */
export function monitoringOnlyIds(rules: RulesFile): Set<string> {
  return new Set(
    rules.indicators
      .filter((ind) => ind.rules.length > 0 && ind.rules.every((rule) => !rule.enabled))
      .map((ind) => ind.id),
  );
}

export interface ZoneView {
  zone: ZoneConfig;
  style: ZoneStyle;
  /** Indicator results counted in the colour (monitoring-only excluded). */
  counted: IndicatorResult[];
  monitoringIds: string[];
  /** Engine's escalation of the worst counted indicator, if any. */
  escalation: IndicatorResult["escalation"];
}

export function zoneView(
  zone: ZoneConfig,
  result: EvaluationResult | null,
  monitoring: Set<string>,
): ZoneView {
  const monitoringIds = zone.indicatorIds.filter((id) => monitoring.has(id));
  const countedIds = zone.indicatorIds.filter((id) => !monitoring.has(id));

  if (countedIds.length === 0) {
    return { zone, style: "monitoring", counted: [], monitoringIds, escalation: null };
  }
  if (result === null) {
    return { zone, style: "no_data", counted: [], monitoringIds, escalation: null };
  }

  const counted = countedIds
    .map((id) => result.indicators.find((ind) => ind.indicator_id === id))
    .filter((ind): ind is IndicatorResult => ind !== undefined);
  // An indicator missing from the result counts as no_data.
  const style = worstStatus(counted.map((ind) => ind.status));
  const worst = counted.find((ind) => ind.status === style) ?? null;
  return { zone, style, counted, monitoringIds, escalation: worst?.escalation ?? null };
}

export function allZoneViews(
  result: EvaluationResult | null,
  rules: RulesFile,
): Record<ZoneId, ZoneView> {
  const monitoring = monitoringOnlyIds(rules);
  return Object.fromEntries(
    ZONES.map((zone) => [zone.id, zoneView(zone, result, monitoring)]),
  ) as Record<ZoneId, ZoneView>;
}

/** Worst zone status on a layer; monitoring-only zones do not count. */
export function layerBadge(layer: LayerId, views: Record<ZoneId, ZoneView>): ZoneStyle {
  const onLayer = ZONES.filter((z) => z.layer === layer).map((z) => views[z.id].style);
  const real = onLayer.filter((s): s is Status => s !== "monitoring");
  if (real.length === 0) return onLayer.length > 0 ? "monitoring" : "no_data";
  return worstStatus(real);
}

export function allLayerBadges(views: Record<ZoneId, ZoneView>): Record<LayerId, ZoneStyle> {
  return Object.fromEntries(LAYERS.map((l) => [l.id, layerBadge(l.id, views)])) as Record<
    LayerId,
    ZoneStyle
  >;
}

/** "tell your crew medical officer" — taken from rules.json ui_text for the engine's escalation. */
export function escalationPhrase(view: ZoneView, rules: RulesFile): string {
  if (view.style === "monitoring") return "limits are set by mission flight surgeons";
  if (view.style === "no_data") return lowerFirst(rules.ui_text.no_data ?? "No measurement today.");
  const key = view.escalation ? `escalation_${view.escalation}` : null;
  const text = key ? rules.ui_text[key] : undefined;
  return text ? lowerFirst(text) : "";
}

function lowerFirst(text: string): string {
  const trimmed = text.trim().replace(/\.$/, "");
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

export function zoneAriaLabel(view: ZoneView, rules: RulesFile): string {
  const phrase = escalationPhrase(view, rules);
  const base = `${view.zone.shortLabel}: ${STATUS_WORD[view.style]}`;
  return phrase ? `${base} — ${phrase}` : base;
}
