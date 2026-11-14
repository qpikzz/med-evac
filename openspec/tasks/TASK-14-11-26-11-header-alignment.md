# TASK-14-11-26-11 — Header Alignment

## 1. Solution Idea
Assign the header brand, optional navigation, and profile switcher to explicit grid columns so hiding navigation cannot change the profile switcher's alignment.

## 2. ToDo Plan
- [x] Pin the profile switcher to the third grid column at desktop and responsive breakpoints.
- [x] Run `npm run build` and `npx tsc --noEmit`.

## 3. Task Report
Pinned the brand, optional navigation, and profile switcher to explicit header grid columns; the profile remains in column three when Ground Operator mode hides navigation, including at responsive breakpoints. `npm run build` and `npx tsc --noEmit` both pass.
