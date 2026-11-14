# TASK-14-11-26-5 — Rules Loader & Validation

## 1. Solution Idea
Implement `loadRules(json: unknown): RulesFile` as a dependency-free validator for the bundled rules file. The loader walks the document by hand, collects metric/flag/rule/indicator ids, rejects duplicate ids and unknown trigger references, and throws `RulesFileError` with a readable message. Disabled rules may keep `null` values for open questions, while enabled rules must have non-null `value`, `amount` and `persistence`. The validated object is returned unchanged so the rest of the pipeline reads only bundled data.

## 2. ToDo Plan
- [x] Add `RulesFileError` and reusable primitive validators.
- [x] Validate settings, escalation, UI text, metrics, flags and indicators.
- [x] Validate all trigger variants and reject unknown metric/flag references.
- [x] Reject duplicate rule ids and null fields on enabled rules.
- [x] Verify the shipped `rules.json` loads successfully.
- [x] Run TypeScript and Vitest checks.

## 3. Task Report
Added `src/rules/loadRules.ts` with `RulesFileError` and manual structural validation covering settings, escalation mappings, UI text, metrics, flags, indicators, all four trigger types, duplicate rule/metric/flag/indicator ids, unknown metric or flag references, and null `value`/`amount`/`persistence` on enabled rules. The shipped `rules.json` loads through the new function, and the loader is exercised by engine acceptance criteria 17–20; `tsc --noEmit` and the full Vitest suite pass.
