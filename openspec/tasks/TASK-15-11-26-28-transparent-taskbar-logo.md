# TASK-15-11-26-28 — Transparent Taskbar Logo

## Solution Idea

Remove opaque SVG layers, crop the artwork tightly while preserving its original geometry, enlarge the UI logo, and regenerate Tauri icons from the transparent SVG.

## ToDo Plan

- [x] Inspect the logo component, SVG favicon, UI sizing styles, Tauri icon configuration, and icon-generation CLI.
- [ ] Make the React logo and favicon transparent with a tight viewBox; resize the login and header emblems.
- [x] Regenerate the native Tauri icon assets from the transparent SVG.
- [ ] Run TypeScript, Vite build, and `cargo check` verification.

## Task Report

Pending implementation and verification.
