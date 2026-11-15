// Display-only radiation dose budget. It never sets a status colour — that is the Rules engine's job.
import type { Reading } from "../../rules/types";

/** NASA career effective dose limit — NASA-STD-3001 Vol. 1 Rev. C (2023). Reference value for display. */
export const CAREER_LIMIT_MSV = 600;

export interface DoseBudget {
  todayMsv: number;
  percentOfLimit: number;
  /** mSv per day from the last ~7 days of accumulated-dose readings; null if not enough data. */
  rateMsvPerDay: number | null;
  arrivalDay: number;
  daysLeft: number;
  projectedArrivalMsv: number | null;
  projectedPercent: number | null;
}

function dayIndex(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function doseBudget(
  readings: Reading[],
  today: string,
  missionDay: number,
  transitDays: number,
  limitMsv = CAREER_LIMIT_MSV,
): DoseBudget | null {
  const series = readings
    .filter((r) => r.metric === "radiation_accumulated" && r.valid && Number.isFinite(r.value) && r.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = series[series.length - 1];
  if (!latest || latest.date !== today) return null;

  const latestDay = dayIndex(latest.date);
  const earlier = [...series].reverse().find((r) => latestDay - dayIndex(r.date) >= 7)
    ?? (series.length > 1 ? series[0] : undefined);
  const span = earlier ? latestDay - dayIndex(earlier.date) : 0;
  const rate = earlier && span > 0 ? Math.max((latest.value - earlier.value) / span, 0) : null;

  const daysLeft = Math.max(transitDays - missionDay, 0);
  const projected = rate === null ? null : latest.value + rate * daysLeft;
  return {
    todayMsv: latest.value,
    percentOfLimit: (latest.value / limitMsv) * 100,
    rateMsvPerDay: rate,
    arrivalDay: transitDays,
    daysLeft,
    projectedArrivalMsv: projected,
    projectedPercent: projected === null ? null : (projected / limitMsv) * 100,
  };
}
