# TASK-15-11-26-17 — Readable Sparklines & Synthetic Radiation History

## Solution Idea

The first Recharts version was hard to read: the y-scale stretched to far-away rule thresholds (flat line) and many dashed threshold lines filled the background. Redraw each sparkline as a small stat-tile chart: data-fitted scale with a minimum span, one glowing line in the status colour, gradient volume fill, a haloed "today" dot, a single solid "your normal" hairline named under the chart, and dates. Add illustrative synthetic radiation readings so the radiation card has a trend too.

## ToDo Plan

- [x] `TrendSparkline`: data-fitted domain (min span 10 % of level), glow, gradient fill, end-dot halo, no threshold/dashed lines, date + "your normal" row, tooltip.
- [x] Generator: `radiation_dose_rate` pattern 74–77 µSv/h and `radiation_accumulated = round(1.8 × day, 1)` mSv (MSL/RAD cruise ≈ 1.8 mSv/day; Zeitlin et al., Science 2013). Regenerate `synthetic_history.json`.
- [x] Update synthetic tests (429 history readings, 11 day-40 readings, radiation `green` on Day 40) and `synthetic-data.md` v1.1.
- [x] Sync `DESIGN.md` 2.2, `body-map.md`, `personal-baseline.md`, `rules-engine.md` (Q-RAD), `TASKS.md`.
- [x] `tsc --noEmit`, Vitest, `vite build`, screenshots.

## Task Report

No rule thresholds were added or changed; `rules.json` is untouched (Q-RAD stays open). Day-40 demo: radiation shows `OK` (77 µSv/h, 72.0 mSv) with a 7-day trend. Verification: see commit.
