# TASK-15-11-26-4 — Auth Unit Tests & Full Verification

## Solution Idea

Add a focused Vitest suite for the authentication domain that exercises all six `login.md` acceptance criteria: demo PIN login, Profile HistoryStore isolation, fixed 30-second lockout windows, seamless enrollment, session persistence/watchdog behavior, and the header/access-gate UI contracts via server-rendered markup. Finish with the full TypeScript check, Vitest suite, and production Vite build.

## ToDo Checklist

- [x] Test seed logins and salted SHA-256 PIN storage for all three demo profiles.
- [x] Test `astro-01` synthetic history versus `astro-02` empty, isolated writes.
- [x] Test three-failure fixed 30-second lockout and a second lockout window.
- [x] Test unknown-badge enrollment with an isolated empty profile.
- [x] Test ephemeral 300,000 ms inactivity timeout and persistent session behavior.
- [x] Test header chevron/account actions and the ORBITA scan screen markup.
- [x] Run `tsc --noEmit`, the full Vitest suite, and `npm run build`.

## Task Report

Added `src/features/auth/auth.test.ts` with 13 tests covering all six `login.md` acceptance criteria, including seed authentication, hash-only PIN storage, profile history isolation, the Ground Operator Earth landing, both 30-second lockout windows, unknown-badge enrollment, the 300,000 ms ephemeral watchdog, and server-rendered header/access-gate contracts. Verification passed cleanly: `tsc --noEmit` reported zero errors, the full Vitest suite passed 101 tests across 7 files, and `npm run build` produced the production Vite bundle successfully.
