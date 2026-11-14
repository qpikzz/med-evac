# TASK-14-11-26-3 — Deterministic Synthetic Dataset Generator

## 1. Solution Idea
Implement `scripts/generate-synthetic.mjs` as a dependency-free Node ESM script with fixed patterns and overrides from `openspec/specs/FEATURES/synthetic-data.md` §4.1–4.2. The script exports a pure builder for tests and writes `src/data/synthetic_history.json` as `JSON.stringify(data, null, 2) + "\n"`. No randomness; repeated runs must be byte-identical.

## 2. ToDo Plan
- [x] Implement UTC date arithmetic and fixed metric patterns/overrides.
- [x] Build 35 preflight readings (7 days × 5 metrics).
- [x] Build 351 mission readings (39 days × 9 metrics) and 39 `flags_by_date` keys.
- [x] Build the scripted Day-40 check-up including `demo_invalid_entry`.
- [x] Write the generated JSON to `src/data/synthetic_history.json`.
- [x] Run the generator twice and verify identical output.

## 3. Task Report
Implemented dependency-free `scripts/generate-synthetic.mjs` with UTC date arithmetic, fixed 7-day patterns/overrides, and a pure `buildSyntheticDataset()` export; generated `src/data/synthetic_history.json`. Verified two consecutive runs produce the same SHA-256 (`D30EBFA6…CDCA91`), with 35 preflight readings, 351 history readings, 39 empty `flags_by_date` keys, and 9 Day-40 readings; story values match (heart 62/76/80 on days 38/39/40, sleep 7.0/6.5/6.5/7.0/6.5/6.0 on days 34–39, body mass 70.0/69.1).
