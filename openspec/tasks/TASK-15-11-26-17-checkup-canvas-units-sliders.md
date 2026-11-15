# TASK-15-11-26-17 — Check-up Canvas and Controls

## Solution Idea

Refine the check-up canvas, add a persistent display-unit preference, and replace score buttons and the separate symptom tray with accessible native controls while preserving canonical check-up data.

## ToDo Plan

- [x] Create this task log and read `RULES.md` and the applicable design guidance.
- [x] Remove the outer check-up card treatment and widen the centered layout without changing the dark palette.
- [x] Add persistent Metric/Imperial display conversion while keeping rules and saved readings in canonical units.
- [x] Replace score button rows with range sliders and move symptom tags into safe inline editor nodes.
- [x] Preserve daily notes, symptom IDs, autocomplete, quick-picks, browse-all, and Local AI context.
- [x] Run TypeScript, Vitest, and production build checks; record results.

## Task Report

Removed the outer form card, widened the centered layout, added a persisted Metric/Imperial switch that keeps validation and stored readings canonical, replaced score buttons with range sliders, and moved symptom pills into a safe inline editor that serializes readable notes. `npx tsc --noEmit`, all 142 Vitest tests, and `npm run build` passed; browser checks confirmed conversions, thresholds, autofill, autocomplete, and responsive layout.
