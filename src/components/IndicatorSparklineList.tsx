import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { motion } from "motion/react";
import { describeDeviation, getReferenceLines } from "../features/personal-baseline/baseline";
import { useAppState } from "../features/app-state/AppStateContext";
import type { IndicatorResult, Reading, Status, TriggeredRule } from "../rules/types";
import TrendSparkline, { type TrendPoint } from "./charts/TrendSparkline";
import { IndicatorIcon } from "./indicatorIcons";
import DoseBudgetMeter from "./charts/DoseBudgetMeter";
import { doseBudget } from "../features/radiation/doseBudget";
import { MISSION_DAY1, TRANSIT_DAYS } from "../features/synthetic-data";

interface IndicatorSparklineListProps {
  selectedIndicator: string | null;
  onSelectIndicator: (indicatorId: string) => void;
  onAskLocalAI: (indicatorLabel: string, rule?: TriggeredRule) => void;
}

function statusLabel(status: Status): string {
  switch (status) {
    case "green":
      return "Green";
    case "yellow":
      return "Yellow";
    case "red":
      return "Red";
    default:
      return "No Data";
  }
}

function formatValue(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value);
}

function getTrend(readings: Reading[], metric: string, days: number | "mission" = 7): TrendPoint[] {
  const byDate = new Map<string, number>();
  for (const reading of readings) {
    if (reading.metric === metric && reading.valid && Number.isFinite(reading.value)) {
      byDate.set(reading.date, reading.value);
    }
  }
  const sorted = Array.from(byDate, ([date, value]) => ({ date, value })).sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  // "mission": every in-flight day (preflight days are left out so the x-axis is the mission itself).
  return days === "mission" ? sorted.filter((point) => point.date >= MISSION_DAY1) : sorted.slice(-days);
}

function IndicatorCard({
  indicator,
  index,
  selected,
  onSelect,
  onAskLocalAI,
}: {
  indicator: IndicatorResult;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onAskLocalAI: (indicatorLabel: string, rule?: TriggeredRule) => void;
}) {
  const { rules, readings, baselines, today, missionDay } = useAppState();
  const [expanded, setExpanded] = useState(false);
  // Selecting the indicator elsewhere (body map, alert) opens its details.
  useEffect(() => {
    if (selected) {
      setExpanded(true);
    }
  }, [selected]);
  const definition = rules.indicators.find((item) => item.id === indicator.indicator_id);
  if (!definition) {
    return null;
  }

  const metricDefinitions = rules.metrics.filter(
    (metric) => metric.indicator_id === indicator.indicator_id,
  );
  const todayReadings = readings.filter(
    (reading) => reading.date === today && metricDefinitions.some((metric) => metric.id === reading.metric),
  );
  const currentByMetric = new Map<string, Reading>();
  for (const reading of todayReadings) {
    currentByMetric.set(reading.metric, reading);
  }
  const primaryMetric = metricDefinitions.find((metric) => currentByMetric.has(metric.id))
    ?? metricDefinitions[0];
  const currentValue = primaryMetric ? currentByMetric.get(primaryMetric.id) : undefined;
  const isBloodPressure = indicator.indicator_id === "blood_pressure";
  const systolic = currentByMetric.get("bp_systolic");
  const diastolic = currentByMetric.get("bp_diastolic");
  const valueText = isBloodPressure && systolic && diastolic
    ? `${formatValue(systolic.value)}/${formatValue(diastolic.value)} mmHg`
    : currentValue && primaryMetric
      ? `${formatValue(currentValue.value)} ${primaryMetric.unit}`
      : metricDefinitions.length === 0
        ? "Symptoms only"
        : "No reading today";
  const deviation = currentValue && primaryMetric
    ? describeDeviation(primaryMetric.id, currentValue.value, baselines[primaryMetric.id], rules)
    : null;
  const deviationText = deviation && deviation.mean !== null && deviation.delta_abs !== null
    ? `Your normal: ${formatValue(deviation.mean)} ${primaryMetric?.unit ?? ""} (${deviation.source === "preflight" ? "before flight" : "last 7 days"}); today ${formatValue(deviation.value)} (${deviation.delta_abs > 0 ? "+" : ""}${formatValue(deviation.delta_abs)}).`
    : null;
  const trendMetric = primaryMetric?.id;
  const trendPoints = trendMetric ? getTrend(readings, trendMetric) : [];
  const missionPoints = trendMetric ? getTrend(readings, trendMetric, "mission") : [];
  const escalationText = indicator.escalation ? rules.ui_text[`escalation_${indicator.escalation}`] : undefined;
  const referenceLines = trendMetric ? getReferenceLines(trendMetric, baselines, rules) : [];
  // Rule provenance for display: the table quote (internal chat references tidied) + one list of links.
  const sourceQuotes = Array.from(
    new Set(
      definition.rules.map((rule) =>
        rule.source
          .split(" | ")[0]
          .replace(/\s*\[ANSWER:[^\]]*\]/g, " (team decision)")
          .replace(/\(A(\d+)\)/g, "(assumption A$1)")
          .trim(),
      ),
    ),
  );
  const sourceLinks = Array.from(
    new Set(
      definition.rules.flatMap((rule) =>
        (rule.source.split(" | ")[1] ?? "")
          .replace(/^[^:]*:\s*/, "")
          .split(";")
          .map((url) => url.trim())
          .filter((url) => url.startsWith("http")),
      ),
    ),
  );
  const statusClass = `status-${indicator.status}`;

  return (
    <motion.article
      id={`indicator-${indicator.indicator_id}`}
      className={`indicator-card dashboard-card ${statusClass}${selected ? " is-focused" : ""}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.15 + index * 0.05 }}
    >
      <button
        className="indicator-select"
        type="button"
        aria-pressed={selected}
        onClick={() => {
          onSelect();
          setExpanded((open) => !open);
        }}
      >
        <span className="indicator-title-row">
          <span className={`indicator-icon indicator-icon-${indicator.status}`}>
            <IndicatorIcon id={indicator.indicator_id} />
          </span>
          <span className="indicator-title">{definition.label}</span>
          <span className={`status-badge status-badge-${indicator.status}`}>
            {statusLabel(indicator.status)}
          </span>
        </span>
        <span className="indicator-current-value">{valueText}</span>
      </button>

      {deviationText ? (
        <p className="indicator-deviation">{deviationText}</p>
      ) : indicator.baseline_forming ? (
        <span className="baseline-forming-badge">Baseline forming</span>
      ) : (
        <p className="indicator-deviation">
          {metricDefinitions.length === 0 ? "Symptom-based indicator" : currentValue ? "Personal baseline unavailable" : "No reading today"}
        </p>
      )}

      {trendMetric ? (
        <TrendSparkline
          points={trendPoints}
          status={indicator.status}
          referenceLines={referenceLines}
          label={definition.label.toLowerCase()}
          unit={primaryMetric?.unit ?? ""}
        />
      ) : (
        <div className="sparkline-empty">Symptom flags are checked by the rules engine.</div>
      )}

      {indicator.indicator_id === "radiation_dose" && (() => {
        const budget = doseBudget(readings, today, missionDay, TRANSIT_DAYS);
        return budget ? <DoseBudgetMeter budget={budget} rules={rules} /> : null;
      })()}

      <div className="indicator-actions-row">
        <button
          className="text-button"
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? "Hide details" : "View details"}
        </button>
        <details className="source-disclosure">
          <summary aria-label={`Show sources for ${definition.label}`} title="Show rule sources">
            i
          </summary>
          <div className="source-popover">
            <strong>Rule sources</strong>
            {sourceQuotes.map((source) => <p key={source}>{source}</p>)}
            {sourceLinks.length > 0 && (
              <ul className="source-links">
                {sourceLinks.map((url) => (
                  <li key={url}>{url}</li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </div>

      {indicator.pending && indicator.pending.length > 0 && (
        <p className="pending-note">
          <Clock size={16} aria-hidden="true" />
          <span>
            Today is outside the range of “{indicator.pending[0].title}”. The rules count it only if it repeats
            for {indicator.pending[0].days_needed} days in a row — measure again tomorrow.
          </span>
        </p>
      )}

      {expanded && (
        <div className="indicator-rule-details">
          {missionPoints.length > 7 && (
            <div className="mission-trend">
              <p className="mission-trend-title">Whole mission · {missionPoints.length} days</p>
              <TrendSparkline
                points={missionPoints}
                status={indicator.status}
                referenceLines={referenceLines}
                label={`${definition.label.toLowerCase()} mission`}
                unit={primaryMetric?.unit ?? ""}
              />
            </div>
          )}
          {indicator.triggered.length > 0 ? (
            indicator.triggered.map((rule) => (
              <section className="triggered-rule" key={rule.rule_id}>
                <h4>{rule.title}</h4>
                <p>{rule.explanation}</p>
                <ul>
                  {rule.actions.map((action) => <li key={action}>{action}</li>)}
                </ul>
                <p className="recheck-text">Recheck: {rule.recheck}</p>
              </section>
            ))
          ) : (
            <p>No rules were triggered for this indicator today.</p>
          )}
          {escalationText && <p className="escalation-text">{escalationText}</p>}
          <button
            className="button button-secondary ask-ai-button"
            type="button"
            onClick={() => onAskLocalAI(definition.label, indicator.triggered[0])}
          >
            Ask Local AI
          </button>
        </div>
      )}
    </motion.article>
  );
}

function IndicatorSparklineList({
  selectedIndicator,
  onSelectIndicator,
  onAskLocalAI,
}: IndicatorSparklineListProps) {
  const { evaluation } = useAppState();

  return (
    <section className="indicator-column" aria-label="Health indicators">
      <div className="column-heading">
        <h2>Indicators</h2>
        <span>Today · 7-day trend</span>
      </div>
      <div className="indicator-list">
        {evaluation.indicators.map((indicator, index) => (
          <IndicatorCard
            key={indicator.indicator_id}
            indicator={indicator}
            index={index}
            selected={selectedIndicator === indicator.indicator_id}
            onSelect={() => onSelectIndicator(indicator.indicator_id)}
            onAskLocalAI={onAskLocalAI}
          />
        ))}
      </div>
    </section>
  );
}

export default IndicatorSparklineList;
