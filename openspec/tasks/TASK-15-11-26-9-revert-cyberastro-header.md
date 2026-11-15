# TASK-15-11-26-9 — Restore ORBITA UI Branding and Align Login Header

## Solution Idea

Keep the desktop/window title as configured while restoring ORBITA's full expansion everywhere else, and make the LoginScreen header a responsive, full-width flex row with the brand at left and access-gate badge at right.

## ToDo Plan

- [x] Create this task log with the requested scope and checklist.
- [x] Restore ORBITA branding and expansion in all non-window-title files.
- [x] Align the LoginScreen logo, wordmark, tagline, and badge as specified.
- [x] Verify the workspace search and run TypeScript, Vitest, and production build checks.

## Task Report

The workspace search found the retained title string only in `index.html` and `src-tauri/tauri.conf.json`. Validation passed: `npx tsc --noEmit`, Vitest (8 files, 122 tests), and `npm run build`.
