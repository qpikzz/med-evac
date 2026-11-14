# TASK-14-11-26-7 — Input Plausibility Check

## 1. Solution Idea
Implement `checkEntry` and `checkCheckup` using only the plausibility bounds in `rules.json`. Parsing is regex-based (one comma normalized to a dot, no `parseFloat` leniency), bounds are inclusive, and errors carry a stable code plus the original raw text. Check-up processing skips empty fields, deduplicates metric/context pairs by keeping the last entry, applies the systolic-greater-than-diastolic consistency check to both fields, and returns readings only when every result is valid.

## 2. ToDo Plan
- [x] Implement raw parsing, comma normalization and inclusive range checks.
- [x] Return typed errors for empty, non-numeric, out-of-range and unknown metrics.
- [x] Apply blood-pressure ordering to both fields.
- [x] Deduplicate repeated metric/context entries and gate readings on `allOk`.
- [x] Write `inputCheck.test.ts` criteria 1–15.
- [x] Run TypeScript and Vitest checks.

## 3. Task Report
Added `src/features/input-check/inputCheck.ts` with `checkEntry`, `checkCheckup`, typed `RawEntry`/`CheckResult` contracts and the five error codes. The implementation covers comma decimals, whitespace trimming, inclusive bounds, blood-pressure ordering, skipped fields, duplicate last-wins handling, unknown metrics and the rule that readings are returned only when the whole check-up is valid. `inputCheck.test.ts` covers all 15 acceptance criteria, including body mass and radiation limits, and the full Vitest suite plus `tsc --noEmit` pass.
