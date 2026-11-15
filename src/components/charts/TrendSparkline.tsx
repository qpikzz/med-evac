// 7-day trend sparkline (Recharts). Decoration of engine/baseline data only — no status logic here.
// Design (DESIGN.md §5.2): one smooth 2.5px line in the indicator's status colour with a soft glow,
// a gradient "volume" fill, a haloed end dot for today, and a single solid hairline for "your normal".
// No threshold lines in the background; the y-scale fits the data so the shape is readable.
import { useId } from "react";
import { useReducedMotion } from "motion/react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import type { ReferenceLine as BaselineReference } from "../../features/personal-baseline/baseline";
import type { Status } from "../../rules/types";
import "./TrendSparkline.css";

export interface TrendPoint {
  date: string;
  value: number;
}

interface TrendSparklineProps {
  points: TrendPoint[];
  status: Status;
  referenceLines: BaselineReference[];
  label: string;
  unit: string;
}

const STATUS_STROKE: Record<Status, string> = {
  green: "var(--status-green)",
  yellow: "var(--status-yellow)",
  red: "var(--status-red)",
  no_data: "var(--accent)",
};

function formatValue(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value);
}

function shortDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  unit: string;
}

function TrendTooltip({ active, payload, unit }: TrendTooltipProps) {
  const point = active && payload && payload.length > 0 ? (payload[0].payload as TrendPoint | undefined) : null;
  if (!point) return null;
  return (
    <div className="trend-tooltip">
      <span className="trend-tooltip-date">{shortDate(point.date)}</span>
      <strong>
        {formatValue(point.value)} {unit}
      </strong>
    </div>
  );
}

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
}

function TrendSparkline({ points, status, referenceLines, label, unit }: TrendSparklineProps) {
  const uid = useId().replace(/:/g, "");
  const reduceMotion = useReducedMotion() ?? false;

  if (points.length < 2) {
    return (
      <div className="sparkline-empty" aria-label={`${label} trend unavailable`}>
        Trend appears as more readings are recorded.
      </div>
    );
  }

  const baseline = referenceLines.find((line) => line.kind === "baseline" && Number.isFinite(line.value));
  const values = [...points.map((p) => p.value), ...(baseline ? [baseline.value] : [])];
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Minimum visual span (10 % of the level) so day-to-day noise is not drawn as a dramatic swing.
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const minSpan = Math.max(Math.abs(mean) * 0.1, 0.5);
  const rawSpan = max - min;
  const span = Math.max(rawSpan, minSpan);
  const mid = (max + min) / 2;
  const domain: [number, number] = [mid - span * 0.85, mid + span * 0.8];
  const stroke = STATUS_STROKE[status];
  const lastIndex = points.length - 1;
  const last = points[lastIndex];

  function renderDot({ cx, cy, index }: DotProps) {
    if (index !== lastIndex || cx === undefined || cy === undefined) {
      return <g key={`dot-${index}`} />;
    }
    return (
      <g key="dot-last" className="trend-end">
        <circle className="trend-end-halo" cx={cx} cy={cy} r={9} fill={stroke} />
        <circle cx={cx} cy={cy} r={4.5} fill={stroke} stroke="var(--surface)" strokeWidth={2} />
      </g>
    );
  }

  return (
    <figure className={`trend-sparkline trend-${status}`}>
      <div
        className="trend-plot"
        role="img"
        aria-label={`Seven-day ${label} trend: from ${formatValue(points[0].value)} to ${formatValue(last.value)} ${unit}${
          baseline ? `, your normal ${formatValue(baseline.value)} ${unit}` : ""
        }`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
                <stop offset="70%" stopColor={stroke} stopOpacity={0.06} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={domain} />
            {baseline && (
              <ReferenceLine
                y={baseline.value}
                stroke="var(--text-muted)"
                strokeOpacity={0.45}
                strokeWidth={1}
              />
            )}
            <Tooltip
              content={(props) => <TrendTooltip active={props.active} payload={props.payload} unit={unit} />}
              cursor={{ stroke: "var(--text-muted)", strokeOpacity: 0.4, strokeWidth: 1 }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={stroke}
              strokeWidth={2.5}
              strokeLinecap="round"
              fill={`url(#fill-${uid})`}
              dot={renderDot}
              activeDot={{ r: 4.5, fill: stroke, stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={!reduceMotion}
              animationDuration={1100}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="trend-axis" aria-hidden="true">
        <span>{shortDate(points[0].date)}</span>
        {baseline && (
          <span className="trend-key">
            <i aria-hidden="true" /> your normal {formatValue(baseline.value)} {unit}
          </span>
        )}
        <span>Today</span>
      </figcaption>
    </figure>
  );
}

export default TrendSparkline;
