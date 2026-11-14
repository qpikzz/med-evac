import { useState } from "react";
import { describeDeviation, getReferenceLines } from "../features/personal-baseline/baseline";
import { useAppState } from "../features/app-state/AppStateContext";
import type { IndicatorResult, Reading, Status, TriggeredRule } from "../rules/types";

interface IndicatorSparklineListProps {
  selectedIndicator: string | null;
  onSelectIndicator: (indicatorId: string) => void;
  onAskLocalAI: (indicatorLabel: string, rule?: TriggeredRule) => void;
}

interface TrendPoint {
  date: string;
  value: number;
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

function getTrend(readings: Reading[], metric: string): TrendPoint[] {
  const byDate = new Map<string, number>();
  for (const reading of readings) {
    if (reading.metric === metric && reading.valid && Number.isFinite(reading.value)) {
      byDate.set(reading.date, reading.value);
    }
  }
  return Array.from(byDate, ([date, value]) => ({ date, value }))
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-7);
}

function IndicatorSparkline({
  points,
  status,
  referenceLines,
  label,
}: {
  points: TrendPoint[];
  status: Status;
  referenceLines: ReturnType<typeof getReferenceLines>;
  label: string;
}) {
  if (points.length < 2) {
    return (
      <div className="sparkline-empty" aria-label={`${label} trend unavailable`}>
        Trend appears as more readings are recorded.
      </div>
    );
  }

  const width = 220;
  const height = 48;
  const padding = 4;
  const values = [
    ...points.map((point) => point.value),
    ...referenceLines.map((line) => line.value).filter((value) =>
      Number.isFinite(value),
    ),
  ];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const yFor = (value: number): number =>
    height - padding - ((value - min) / span) * (height - padding * 2);
  const xFor = (index: number): number =>
    padding + (index / (points.length - 1)) * (width - padding * 2);
  const polyline = points
    .map((point, index) => `${xFor(index)},${yFor(point.value)}`)
    .join(" ");

  return (
    <svg
      className={`indicator-sparkline status-stroke-${status}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Seven-day ${label} trend`}
    >
      {referenceLines.map((line, index) => (
        <line
          key={`${line.rule_id ?? line.kind}-${line.value}-${index}`}
          x1={padding}
          x2={width - padding}
          y1={yFor(line.value)}
          y2={yFor(line.value)}
          className={`sparkline-reference reference-${line.kind} reference-${line.level}`}
        >
          <title>{line.label}</title>
        </line>
      ))}
      <polyline points={polyline} className="sparkline-trend" />
      {points.map((point, index) => (
        <circle
          key={point.date}
          cx={xFor(index)}
          cy={yFor(point.value)}
          r={index === points.length - 1 ? 2.7 : 1.8}
          className="sparkline-point"
        />
      ))}
    </svg>
  );
}

function IndicatorCard({
  indicator,
  selected,
  onSelect,
  onAskLocalAI,
}: {
  indicator: IndicatorResult;
  selected: boolean;
  onSelect: () => void;
  onAskLocalAI: (indicatorLabel: string, rule?: TriggeredRule) => void;
}) {
  const { rules, readings, baselines, today } = useAppState();
  const [expanded, setExpanded] = useState(false);
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
  const referenceLines = trendMetric ? getReferenceLines(trendMetric, baselines, rules) : [];
  const sourceLines = Array.from(new Set(definition.rules.map((rule) => rule.source)));
  const statusClass = `status-${indicator.status}`;

  return (
    <article
      id={`indicator-${indicator.indicator_id}`}
      className={`indicator-card dashboard-card ${statusClass}${selected ? " is-focused" : ""}`}
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
        <IndicatorSparkline
          points={trendPoints}
          status={indicator.status}
          referenceLines={referenceLines}
          label={definition.label.toLowerCase()}
        />
      ) : (
        <div className="sparkline-empty">Symptom flags are checked by the rules engine.</div>
      )}

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
            {sourceLines.map((source) => <p key={source}>{source}</p>)}
          </div>
        </details>
      </div>

      {expanded && (
        <div className="indicator-rule-details">
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
          <button
            className="button button-secondary ask-ai-button"
            type="button"
            onClick={() => onAskLocalAI(definition.label, indicator.triggered[0])}
          >
            Ask Local AI
          </button>
        </div>
      )}
    </article>
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
        {evaluation.indicators.map((indicator) => (
          <IndicatorCard
            key={indicator.indicator_id}
            indicator={indicator}
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
