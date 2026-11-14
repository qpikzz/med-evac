# TASK-14-11-26-8 — Personal Baseline & Reference Lines

## 1. Solution Idea
Implement the baseline module as pure functions over stored readings. Only valid, finite, rest-context readings count, with the last reading per date winning. Preflight statistics use the full preflight set; rolling statistics use the previous `rolling_baseline_days` calendar days with today excluded and do not apply the engine's minimum-readings gate. Deviation lookup follows the first enabled `baseline_delta` rule, and reference lines come only from enabled rest-context rules in file order, with the module defining no thresholds of its own.

## 2. ToDo Plan
- [x] Implement reading filtering and last-reading-per-date selection.
- [x] Compute preflight mean/sample SD and rolling mean/sample SD/count.
- [x] Implement deviation source, mean and delta calculations.
- [x] Build baseline, threshold, window-average and baseline-delta reference lines.
- [x] Exclude disabled, flagged and exercise-context rules and deduplicate lines.
- [x] Write `baseline.test.ts` criteria 1–15, including synthetic Day-40 integration.
- [x] Run TypeScript, Vitest and production build checks.

## 3. Task Report
Added `src/features/personal-baseline/baseline.ts` with `computeBaselines`, `describeDeviation` and `getReferenceLines`. The module returns one baseline entry for every metric, applies rest/valid/finite filtering with last-reading-per-date semantics, computes sample standard deviations, resolves preflight versus rolling sources from the rules file, and builds chart lines from thresholds, window averages and baseline deltas without inventing any numbers. `baseline.test.ts` covers all 15 acceptance criteria and confirms the synthetic Day-40 preflight/rolling values; the complete suite passes with 61 tests, and `tsc --noEmit` plus `npm run build` succeed.
