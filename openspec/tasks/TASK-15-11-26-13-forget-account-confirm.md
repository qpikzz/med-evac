# TASK-15-11-26-13 — Forget Account Confirmation

## Solution Idea

Require an explicit confirmation before removing a profile from the visible registry, preserve its isolated history, and document the revised behavior.

## ToDo Plan

- [x] Create this task log with the requested scope and checklist.
- [x] Preserve forgotten profile history and avoid reusing IDs that still own history.
- [x] Add the confirmation dialog, exact copy, cancel/confirm actions, and Escape handling.
- [x] Update the approved login specification and history-preservation tests.
- [x] Run TypeScript, Vitest, and production build checks; record results.

## Task Report

Implemented confirmation-gated profile forgetting while preserving orphaned history and preventing profile-ID reuse. Updated the approved login specification and tests.

Validation passed:
- `npx tsc --noEmit`
- `npm test` — 9 test files, 129 tests
- `npm run build`
