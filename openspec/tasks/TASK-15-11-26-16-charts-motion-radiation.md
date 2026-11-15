# TASK-15-11-26-16 — Recharts Sparklines, Motion Animations, Daily Radiation Check

## Solution Idea

Make the dashboard livelier without touching any status logic: replace the hand-drawn SVG sparklines with Recharts area charts, add Motion transitions, and close the radiation question. Radiation keeps its enabled event rules (a solar particle event or a high dosimeter reading must never be hidden), gets its own "Radiation check" block in the daily check-up, and an animated alert on the dashboard that shows only what the engine triggered.

## ToDo Plan

- [x] Add `recharts@3.10.1` and `motion@14.9.0` (MIT, pinned, versions older than two weeks for Motion); log in `SOURCE.md`.
- [x] `src/components/charts/TrendSparkline.tsx` — area chart in status colour, gradient, baseline/threshold reference lines, tooltip.
- [x] Motion: `MotionConfig reducedMotion="user"`, check-up ↔ dashboard transition, summary/grid fade-up, staggered indicator cards.
- [x] Check-up form: "Radiation check" block (dose rate, accumulated dose, 3 radiation event toggles).
- [x] `src/components/RadiationAlert/` — pure `radiationAlertView()` + animated card; tests with the real engine.
- [x] Body map: radiation zone note, aura waves on yellow/red, map follows a selected zone's layer.
- [x] Update `DESIGN.md` (2.1), `FRONTEND.md`, `TASKS.md`, `FEATURES/body-map.md`.
- [x] `tsc --noEmit`, Vitest, `vite build`, browser walkthrough.

## Task Report

Verification: `tsc --noEmit` clean, `npm test` 11 files / 139 tests passing, `npm run build` OK (Vite warns that the main chunk is over 500 kB because of Recharts — fine for an offline desktop app). Browser walkthrough as Alex Vance: dose 18 µSv/h + "Solar particle event warning" → yellow radiation warning card, Skin tab `Watch`, aura waves; adding "My dosimeter shows unexpectedly high exposure" → red alert with `Contact Earth`; `Show on body map` switches to the Skin layer and selects the aura; no external network requests. Synthetic history still has no radiation readings (out of scope until Q-RAD), so the Day-40 demo shows radiation `No data` until a dose is entered.
