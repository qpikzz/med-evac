# TASK-14-11-26-17 — Earth Link

## 1. Solution Idea
Keep Earth messages transient in the app, construct the astronaut draft from the existing deterministic evaluation and valid history, then use the existing Earth-link domain functions and transport for send and side-specific countdown views. Show the Ground Operator role exclusively in the Earth console.

## 2. ToDo Plan
- [x] Add the red auto-draft banner to the Main and Comms views when the current evaluation is red.
- [x] Implement the astronaut Earth draft preview, note validation, private badge, and explicit send action using the Earth-link domain.
- [x] Implement the accelerated countdown, Ground Operator arrival-gated telemetry, and visible MVP sync/reply TODO.
- [x] Verify the full Block 6 exit criteria with Vitest, `tsc --noEmit`, `npm run build`, and the Day-40 UI demo.

## 3. Task Report
Implemented the red-only unsent auto-draft flow, complete astronaut review/send panel, validated notes, accelerated Earth arrival/receipt views, and the single-window Ground Operator console. Updated daily readings on check-up edits instead of duplicating date/metric rows. All 88 Vitest tests passed, `tsc --noEmit` and the production build passed, and the browser Day-40 walkthrough confirmed 920 bpm is blocked, 80 bpm saves to a Yellow dashboard, `irregular_heartbeat` creates the Red draft, sending starts the countdown, and Ground Operator sees hidden pre-arrival content followed by delivered telemetry.
