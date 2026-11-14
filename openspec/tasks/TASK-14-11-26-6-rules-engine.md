# TASK-14-11-26-6 — Deterministic Rules Engine

## 1. Solution Idea
Implement `evaluate(input)` as a pure, deterministic interpreter of the validated rules file. Preprocess readings by dropping invalid, non-finite, future and unknown-metric entries; keep the last reading per metric/date/context; then evaluate `threshold`, `baseline_delta`, `window_average` and `flag` triggers with persistence and `requires_flags`. Derive per-indicator status, escalation, ordered triggered rules, skip reasons and baseline-forming flag, then aggregate the overall status. Also complete the deferred synthetic integration checks for the Day-40 story and days 8–39.

## 2. ToDo Plan
- [x] Add shared UTC date arithmetic for mission-day windows.
- [x] Implement trigger evaluation, persistence and skip reasons.
- [x] Implement indicator statuses, escalation, ordering and overall aggregation.
- [x] Write `engine.test.ts` criteria 1–20 against the shipped rules file.
- [x] Replace synthetic test todos with Day-40 and no-hidden-alarm integration tests.
- [x] Run the full Vitest suite, TypeScript check and production build.

## 3. Task Report
Added `src/rules/dateMath.ts` and `src/rules/engine.ts`, implementing all four trigger types, persistence, `requires_flags`, ordered triggered rules, skip reasons, baseline-forming detection, per-indicator and overall status/escalation. `engine.test.ts` covers criteria 1–20, and `synthetic.test.ts` now verifies the Day-40 yellow heart/sleep story plus the absence of red or unexpected yellow statuses on days 8–39. Two shipped-data deviations are documented in the tests: `rules.json` contains 51 rules rather than the spec's 48, and `hr_y_baseline` is enabled (matching the newer synthetic-data criterion 6), so criterion 14 tests the shipped yellow result and additionally verifies `rule_disabled` behavior with a temporary in-memory copy; no specs or data files were edited. The full suite passes with 61 tests, and `tsc --noEmit` plus `npm run build` succeed.
