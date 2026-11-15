# TASK-15-11-26-18 — Check-up Footer Buttons

## Solution Idea

Redesign the Daily Check-up action bar with a space-themed Earth contact control and a larger clinical-blue submit button while preserving the existing contact and submit flows.

## ToDo Plan

- [x] Remove the day-40 demo button from the Daily Check-up UI.
- [x] Add the animated Earth contact button with inline SVG artwork and a drifting starfield.
- [x] Upgrade the Submit Check-up button without changing check-up submission behavior.
- [x] Run TypeScript, Vitest, and production build checks; record results.

## Task Report

Vitest passed all 145 tests. `npx tsc --noEmit` and both production build commands remain blocked by the existing case-insensitive `RadiationAlert` import collision in `MainDashboard.tsx`: it resolves to the helper `.ts` file instead of the component `.tsx` file.
