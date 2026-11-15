# TASK-15-11-26-10 — Header Polish

## Solution Idea

Simplify the header to a compact icon, live mission date, flat navigation tabs, and a profile switcher using deterministic crew SVG avatars.

## ToDo Plan

- [x] Create this task log with the requested scope and checklist.
- [x] Simplify the header brand and update the local mission date.
- [x] Flatten header navigation styling and reduce the outer radius.
- [x] Add reusable crew SVG avatars and use them in both profile surfaces.
- [x] Run TypeScript, Vitest, and production build checks; record results.

## Task Report

Replaced the header wordmark with a 36px logo, added the live local date and muted separator, simplified the tab styling and outer radius, and added three deterministic crew SVG avatars for seeded and custom profiles. Validation passed: `npx tsc --noEmit`, Vitest (9 files, 124 tests), and `npm run build`.
