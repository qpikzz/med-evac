export const MISSION_DAY1 = "2026-10-06";
export const DEMO_DAY = 40;
/** Illustrative Mars transit length (one way): ≈ 180 days crew transit Earth→Mars in
 *  NASA's Mars Design Reference Architecture 5.0 (NASA/SP-2009-566). */
export const TRANSIT_DAYS = 180;

const MS_PER_DAY = 86_400_000;

function toUtcTimestamp(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function addDays(date: string, delta: number): string {
  return new Date(toUtcTimestamp(date) + delta * MS_PER_DAY).toISOString().slice(0, 10);
}

export function missionDateForDay(day: number): string {
  return addDays(MISSION_DAY1, day - 1);
}

export function missionDayForDate(date: string): number {
  return Math.round((toUtcTimestamp(date) - toUtcTimestamp(MISSION_DAY1)) / MS_PER_DAY) + 1;
}

export function getToday(): string {
  return missionDateForDay(DEMO_DAY);
}
