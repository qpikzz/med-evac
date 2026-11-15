# TASK-15-11-26-11 — Avatars and Forget Account

## Solution Idea

Replace the crew portraits with compact mission emblems and add a persisted profile-removal flow that clears isolated history, logs out a removed active profile, and offers an explicit demo reset only when no profiles remain.

## ToDo Plan

- [x] Create this task log with the requested scope and checklist.
- [x] Replace the three crew avatar variants with geometric mission emblems and deterministic custom mapping.
- [x] Make a saved profile registry authoritative so forgotten demo profiles stay deleted on reload.
- [x] Implement profile forgetting with isolated history cleanup and an explicit demo-profile reset action.
- [x] Show the Reset Demo Badges link on LoginScreen only when no profiles remain.
- [x] Connect forgetting the active profile to session logout and LoginScreen routing.
- [x] Add an accessible per-profile Forget account action to the Header dropdown.
- [x] Update the approved login feature specification for avatars and profile removal.
- [x] Add focused auth tests for profile removal, history cleanup, registry persistence, and logout.
- [x] Run TypeScript, Vitest, and production build checks; record results.

## Task Report

Replaced crew portraits with compact gradient emblems, added deterministic custom-profile mapping, and implemented profile forgetting with history cleanup, active-session logout, persistent deletion, and an explicit demo reset shown only for an empty registry. Added accessible Header forget controls, updated the approved login spec, and added focused auth tests. Validation passed: `npx tsc --noEmit`, Vitest (9 files, 128 tests), and `npm run build`.
