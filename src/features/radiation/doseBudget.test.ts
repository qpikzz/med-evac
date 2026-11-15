import { describe, expect, it } from "vitest";
import synthetic from "../../data/synthetic_history.json";
import type { Reading } from "../../rules/types";
import { CAREER_LIMIT_MSV, doseBudget } from "./doseBudget";

const readings = [
  ...(synthetic.history.readings as Reading[]),
  ...(synthetic.day40_checkup.readings as Reading[]),
];

describe("dose budget (display only)", () => {
  it("Day 40 of a 180-day transit: 72 mSv = 12 % of 600; ≈ 324 mSv at arrival", () => {
    const budget = doseBudget(readings, "2026-11-14", 40, 180);
    expect(CAREER_LIMIT_MSV).toBe(600);
    expect(budget?.todayMsv).toBe(72);
    expect(budget?.percentOfLimit).toBeCloseTo(12, 5);
    expect(budget?.rateMsvPerDay).toBeCloseTo(1.8, 5);
    expect(budget?.daysLeft).toBe(140);
    expect(budget?.projectedArrivalMsv).toBeCloseTo(324, 5);
    expect(budget?.projectedPercent).toBeCloseTo(54, 5);
  });

  it("no accumulated-dose reading today → nothing to show", () => {
    expect(doseBudget(readings, "2026-11-15", 41, 180)).toBeNull();
    expect(doseBudget([], "2026-11-14", 40, 180)).toBeNull();
  });
});
