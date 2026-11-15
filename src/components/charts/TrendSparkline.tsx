// 7-day trend sparkline (Recharts). Decoration of engine data only — no status logic here.
import { useId } from "react";
import { useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
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
  no_data: "var(--status-none)",
};

const LEVEL_STROKE: Record<string, string> = {
  green: "var(--status-green)",
  yellow: "var(--status-yellow)",
  red: "var(--status-red)",
};

function formatValue(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value);
}

function shortDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}.${month}`;
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

function TrendSparkline({ points, status, referenceLines, label, unit }: TrendSparklineProps) {
  const gradientId = `trend-${useId().replace(/:/g, "")}`;
  const reduceMotion = useReducedMotion() ?? false;

  if (points.length < 2) {
    return (
      <div className="sparkline-empty" aria-label={`${label} trend unavailable`}>
        Trend appears as more readings are recorded.
      </div>
    );
  }

  const values = [
    ...points.map((p) => p.value),
    ...referenceLines.map((l) => l.value).filter((v) => Number.isFinite(v)),
  ];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min || 1) * 0.12;
  const stroke = STATUS_STROKE[status];
  const last = points[points.length - 1];

  return (
    <div
      className="trend-sparkline"
      role="img"
      aria-label={`Seven-day ${label} trend, latest ${formatValue(last.value)} ${unit}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 6, right: 6, bottom: 2, left: 6 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={[min - pad, max + pad]} />
          {referenceLines.map((line, index) => (
            <ReferenceLine
              key={`${line.rule_id ?? line.kind}-${line.value}-${index}`}
              y={line.value}
              stroke={LEVEL_STROKE[line.level] ?? "var(--text-muted)"}
              strokeOpacity={line.kind === "baseline" ? 0.55 : 0.7}
              strokeDasharray={line.kind === "baseline" ? undefined : "3 3"}
              ifOverflow="extendDomain"
            />
          ))}
          <Tooltip
            content={(props) => <TrendTooltip active={props.active} payload={props.payload} unit={unit} />}
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 3.5, fill: stroke, stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={!reduceMotion}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TrendSparkline;
