# TASK-14-11-26-10 — Header Cleanup

## 1. Solution Idea
Remove the two status badges from the header and update the approved frontend specification so the rendered shell and documented header agree.

## 2. ToDo Plan
- [x] Remove `Synthetic data` and `OFFLINE · AUTONOMOUS` from the header and its styles.
- [x] Update `FRONTEND.md` §2.2 to document the approved header content.
- [x] Run `npm run build` and `npx tsc --noEmit`.

## 3. Task Report
Removed both status badges and their unused styles, leaving the MED-EVAC mark, Day 40, and mission date on the header’s left. Updated FRONTEND §2.2 to match. `npm run build` and `npx tsc --noEmit` both pass.
