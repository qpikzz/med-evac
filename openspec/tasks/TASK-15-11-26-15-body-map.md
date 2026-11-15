# TASK-15-11-26-15 — Body Map (2D, layered) + Dark Space Theme

## Solution Idea

Replace the light "3D" body map with the layered 2D `BodyMap` from `FEATURES/body-map.md`: zone config in `zones.ts`, pure worst-status helpers in `status.ts`, mocks and tests, an SVG hotspot layer over optional local art (placeholder silhouette when missing). Keep `InteractiveBody3DMap` as a wrapper so the dashboard does not change. Add an app-wide dark space theme in `src/styles/theme.css` that remaps the existing tokens, and update the design specs so they match the new UI.

## ToDo Plan

- [x] `src/components/BodyMap/` — `BodyMap.tsx`, `BodyMap.css`, `zones.ts`, `status.ts`, `mocks.ts`, `bodyMap.test.ts`.
- [x] Wrap the new component in `InteractiveBody3DMap.tsx`; 2-column dashboard grid.
- [x] `src/styles/theme.css` imported last in `src/main.tsx`; replace hard-coded light colours in `App.css` / `Dashboard.css`.
- [x] Header: `Day N · Mars transit` + `SYNTHETIC DATA` badge.
- [x] Rebase onto the ORBITA rebrand + login pages; resolve conflicts.
- [x] Update `DESIGN.md` (v2.0), `FRONTEND.md`, `TASKS.md`; add `FEATURES/body-map.md`.
- [x] `tsc --noEmit`, Vitest, `vite build`, browser walkthrough.

## Task Report

Body map and dark theme shipped in qpikzz/med-evac#1. Verification: `tsc --noEmit` clean, `npm test` 9 files / 129 tests passing, `npm run build` OK; browser walkthrough (login as Alex Vance → Day-40 check-up) shows heart and brain `Watch`, other zones `OK`, tabs/zones reachable by keyboard, no external network requests. Radiation follow-up resolved in `TASK-15-11-26-16-charts-motion-radiation.md`.
