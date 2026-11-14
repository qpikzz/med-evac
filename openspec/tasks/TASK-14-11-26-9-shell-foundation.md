# TASK-14-11-26-9 — Shell Foundation

## 1. Solution Idea
Use local CSS custom properties for the Veridia clinical light-tech design tokens, build the shared header and role-aware navigation with React state, and add a context provider that derives check-up validation, baselines, and deterministic evaluation from the existing mission clock and history store.

## 2. ToDo Plan
- [x] Add design tokens and global typography/surface foundations without third-party UI packages.
- [x] Build the mission header, Main/Comms navigation, and Astronaut/Ground Operator profile switcher.
- [x] Add the reactive app-state provider and bind validation, history, baselines, and rules evaluation.
- [x] Run the production build and standalone TypeScript check.
- [ ] Run existing unit tests (not run; permission was denied).

## 3. Task Report
Added the clinical light-tech CSS tokens, responsive mission header and role-aware navigation, and a reactive context provider that connects mission time, check-up validation, the history store, baselines, and deterministic evaluation. The Ground Operator switch correctly opens Comms, and the Astronaut profile restores Main navigation. `npm run build` and `npx tsc --noEmit` pass; browser rendering and role switching were verified. No UI dependencies were added. `npm test` was not run because permission was denied.
