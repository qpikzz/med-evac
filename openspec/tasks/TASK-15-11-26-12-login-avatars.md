# TASK-15-11-26-12 — Login Avatars

## Solution Idea

Use the shared `CrewAvatar` emblem component throughout LoginScreen so saved badges, PIN entry, and completed enrollment show consistent profile identity.

## ToDo Plan

- [x] Create this task log with the requested scope and checklist.
- [x] Replace demo badge initials with 40px CrewAvatar emblems.
- [x] Replace recognized and verified profile initials with 48px CrewAvatar emblems.
- [x] Remove the unused LoginScreen initials import and update avatar sizing styles.
- [x] Run TypeScript, Vitest, and production build checks; record results.

## Task Report

Replaced LoginScreen initials with the shared `CrewAvatar` component: 40px on demo badge cards and 48px in recognized and verified profile headers. Removed the initials helper import and updated avatar sizing styles. Validation passed: `npx tsc --noEmit`, Vitest (9 files, 128 tests), and `npm run build`.
