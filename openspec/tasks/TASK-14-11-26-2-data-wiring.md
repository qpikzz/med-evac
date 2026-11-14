# TASK-14-11-26-2 — Medical Rules & Knowledge Base Wiring

## 1. Solution Idea
Move the provided `rules.json` from `src/assets/` to the contract path `src/data/rules.json`, and apply only the plausibility ranges mandated by `openspec/specs/FEATURES/input-check.md` §5.3 (`plausible_min` / `plausible_max`). Keep the provided `src/data/knowledge_base.json` as the AI-reference-only dataset. Do not alter medical thresholds or rule logic. Record the build-time `openpyxl` dependency and the data provenance in `SOURCE.md`.

## 2. ToDo Plan
- [x] Move `src/assets/rules.json` to `src/data/rules.json`.
- [x] Apply §5.3 plausible ranges for heart rate, blood pressure, glucose, body temperature, body mass, radiation, sleep, mood, skin.
- [x] Validate that `rules.json` and `knowledge_base.json` parse as valid JSON.
- [x] Log `openpyxl` (MIT, build-time only) and data sources in `SOURCE.md`.
- [x] Do not change any medical thresholds or rule definitions.

## 3. Task Report
Moved the provided rules file to `src/data/rules.json` and applied only the input-check v1.1 plausibility ranges: heart_rate 20–250, bp_systolic 40–300, bp_diastolic 20–200, glucose 0–600, body_temp 25–45, body_mass 0–null, radiation_accumulated 0–100, radiation_dose_rate 0–null, while sleep/mood/skin already matched. Verified both `rules.json` (11 metrics, 42 flags, 10 indicators) and the provided `knowledge_base.json` (16 indicators) parse correctly, and logged `openpyxl` (MIT, build-time only) plus the indicator workbook and NASA/PubMed citation sources in `SOURCE.md`. No medical thresholds or rule logic were changed.
