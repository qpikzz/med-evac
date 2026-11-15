# TASK-15-11-26-28 — Transparent Taskbar Logo

## Solution Idea

Remove opaque SVG layers, crop the artwork tightly while preserving its original geometry, enlarge the UI logo, and regenerate Tauri icons from the transparent SVG.

## ToDo Plan

- [x] Inspect the logo component, SVG favicon, UI sizing styles, Tauri icon configuration, and icon-generation CLI.
- [x] Make the React logo and favicon transparent with a tight viewBox; resize the login and header emblems.
- [x] Regenerate the native Tauri icon assets from the transparent SVG.
- [x] Run TypeScript, Vite build, and `cargo check` verification.

## Task Report

Removed the dark SVG background and mask fills, cropped the transparent emblem to its artwork bounds, increased the login and header sizes, and regenerated Tauri icons from the transparent SVG. `npx tsc --noEmit`, `npm run build`, and `cargo check` passed; the build retains Vite's advisory about the large JavaScript chunk.
