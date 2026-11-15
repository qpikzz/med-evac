# TASK-15-11-26-8 — Tauri Icons and Application Title

## Solution Idea

Keep the ORBITA brand expansion in application content while setting the HTML and desktop window titles, regenerate all native Tauri icon assets from the current OrbitaLogo design, and ensure Cargo rebuilds the Windows resource embedding.

## ToDo Plan

- [x] Create this task log with the scope and implementation checklist.
- [x] Update the HTML title, desktop window title, and visible UI brand subtitles.
- [x] Render the OrbitaLogo design into a 1024x1024 PNG and regenerate native Tauri icons.
- [x] Confirm Tauri icon paths and trigger Cargo resource rebuilds for the updated title and icon.
- [x] Run focused validation and record the results.

## Task Report

Updated the HTML and Tauri window titles, visible Comms/login branding, outbound Earth-Link branding, AI identity prompt, package/Cargo descriptions, and README tagline. Rendered the existing orbital logo as `src-tauri/app-icon.png` (1024x1024) and regenerated the desktop, Store, Android, and iOS icons with Tauri. Confirmed all five configured desktop icon paths and added Cargo rerun tracking for the Tauri config and Windows ICO. Validation passed: the PNG has transparent rounded corners; `npm test` passed (122 tests), `npm run build` passed, and `cargo check` passed.
