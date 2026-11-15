# TASK-15-11-26-19 — "Orbit Control" Visual Pass

## Solution Idea

The design owner picked a hybrid of two explored directions: Mission-Control precision (teal/amber status, mono labels, corner brackets) with Deep-Orbit depth (deep navy, blue glow, glowing heart illustration). Make the whole interface larger and calmer, fill the empty space with a living space backdrop, give every indicator an icon and every alert its own big animation, balance the Main layout, and replace the body-map placeholder with a coloured four-layer anatomy.

## ToDo Plan

- [x] Bundle Inter, Space Grotesk, JetBrains Mono (`@fontsource`, OFL-1.1); log in `SOURCE.md`.
- [x] Theme v3 tokens (`theme.css`); scale all legacy font sizes (base 16 px).
- [x] `SpaceBackdrop`: grid, nebulae, twinkling stars, orbit, shooting star (reduced-motion aware).
- [x] Main: two equal columns, indicator list matches body-map height, sticky map.
- [x] Indicator icons (`indicatorIcons.tsx`, lucide).
- [x] `HealthAlerts` + `AlertArt`: largest alert as a big card with a per-indicator animation, others compact; replaces `RadiationAlert`.
- [x] Comms: 84 px channel emblems. Login: 52 px centred wordmark + rising planet.
- [x] Body map: `AnatomyArt` (skin, muscles, organs, skeleton), hotspots on organs, new `muscles` layer/zone.
- [x] Specs: DESIGN.md 3.0, FRONTEND.md, body-map.md §12, TASKS.md.

## Task Report

Verification: `tsc --noEmit` clean, Vitest all passing, `npm run build` OK; screenshots of login, Main (yellow and red alerts), Comms and all four body-map layers checked.
