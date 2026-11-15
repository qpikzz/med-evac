# TASK-15-11-26-18 — Radiation Limits & Dose Budget (Mars transit)

## Solution Idea

The app models only the Earth→Mars transit. Close Q-RAD for the demo with illustrative, sourced mission settings and show the dose against NASA's real career limit, so the radiation numbers mean something on screen. Approved by the design owner on 15 Nov 2026; Lana + Ayesha to confirm the values.

## ToDo Plan

- [x] `rules.json`: `rad_y_rate` > 150 µSv/h (2 × MSL/RAD cruise ≈ 75 µSv/h); `rad_y_accum` ≥ 480 mSv (80 % of 600); `rad_r_accum` ≥ 600 mSv (NASA-STD-3001 Vol. 1 Rev. C); all enabled, sources marked "ILLUSTRATIVE MISSION SETTING"; `radiation_accumulated.plausible_max` 100 → 1000 mSv.
- [x] `TRANSIT_DAYS = 180` (`missionClock.ts`, `synthetic_history.json` `mission.transit_days`).
- [x] `doseBudget()` (display only) + tests: Day 40 → 72 mSv = 12 %, ≈ 324 mSv (54 %) at arrival.
- [x] `DoseBudgetMeter` in the radiation card; threshold ticks read from `rules.json`.
- [x] Engine tests: nominal values → no alert; 160 µSv/h → yellow; 480 mSv → yellow; 600 mSv → red.
- [x] `SOURCE.md` §4 sources (NASA-STD-3001 Rev. C, OCHMO brief, SwRI release, Zeitlin 2013 (paywalled, abstract only), NASA DRA 5.0); specs synced.

## Task Report

Verification: `tsc --noEmit` clean, Vitest all passing, `npm run build` OK; browser: radiation card shows the dose budget (72 / 600 mSv, ≈ 324 mSv at arrival); entering 610 mSv in the check-up raises the red "Accumulated dose at the emergency limit" alert.
