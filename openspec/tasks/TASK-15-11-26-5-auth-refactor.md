# TASK-15-11-26-5 — Auth Refactor & Spec-Compliance Audit

## Solution Idea

Refactor the ORBITA Mission Access Gate into small, typed modules: centralized domain constants and Russian UI copy, a salted SHA-256 PIN crypto module, a store/timer split, shared identity helpers, and presentational keypad components. Then audit profile-scoped `HistoryStore` isolation, fixed 30-second lockouts, seamless enrollment, ephemeral-session cleanup, and the far-right header profile dropdown against `login.md` v1.0. Expand `auth.test.ts` to cover the extracted modules and edge cases, then verify with `tsc --noEmit`, Vitest, and `npm run build`.

## ToDo Checklist

- [x] Read specs and existing auth/header/app-state code; establish baseline `tsc`, Vitest, and build gates.
- [x] Centralize `PIN_LENGTH`, `MAX_FAILED_ATTEMPTS`, `LOCKOUT_SECONDS`, `EPHEMERAL_TIMEOUT_MS`, storage keys, role labels, and Russian UI copy.
- [x] Extract shared identity helpers and presentational `PinKeypad` / `PinDots` components from `LoginScreen.tsx`.
- [x] Extract salted SHA-256 PIN crypto into `pinCrypto.ts` with no plain-text PIN storage.
- [x] Refactor `authStore.ts` to consume centralized constants and keep the fixed 30-second lockout.
- [x] Split the inactivity watchdog into `sessionTimer.ts` with clean start/poke/stop semantics.
- [x] Refactor `LoginScreen.tsx` to use the extracted modules without duplicated state or magic numbers.
- [x] Harden profile-scoped history isolation and account-switch resets in `AppStateProvider` / `App.tsx`.
- [x] Polish `Header.tsx` far-right anchoring, centered chevron rotation, dropdown separation, outside-click, and Escape dismissal.
- [x] Expand `auth.test.ts` for crypto, constants, lockout, enrollment, isolation, timer cleanup, and header/gate contracts.
- [x] Run `tsc --noEmit`, the full Vitest suite, and `npm run build`; fix any failures.

## Task Report

Refactored the Mission Access Gate into focused modules: `constants.ts` centralizes `PIN_LENGTH`, `MAX_FAILED_ATTEMPTS`, `LOCKOUT_SECONDS`/`LOCKOUT_MS`, `EPHEMERAL_TIMEOUT_MS`, storage keys, role labels, and UI timing limits; `copy.ts` holds all Russian prompts and error strings; `identity.ts`, `pinCrypto.ts`, `sessionTimer.ts`, `PinDots.tsx`, and `PinKeypad.tsx` now provide reusable pure/presentational logic; `authStore.ts` keeps salted SHA-256 verification and a fixed 30-second lockout with no plain-text PINs; and `LoginScreen.tsx` consumes those modules without duplicated constants or strings. Profile isolation was verified across `astro-01`’s 40-day synthetic dataset, `astro-02`/`ground-01`’s empty stores, per-profile `orbita_history_<profile_id>` keys, corrupted-flag rejection, and account-switch UI reset via a profile-keyed shell plus explicit message/error cleanup. The header profile switcher remains far-right in both roles, uses a fixed 14×14 centered rotating `ChevronDown`, and separates saved profiles from `"Добавить аккаунт"`/`"Выйти из аккаунта"` with divider and outside-click/Escape dismissal. Final verification passed cleanly: `tsc --noEmit` reported zero errors, Vitest passed 119 tests across 7 files, and `npm run build` completed with zero errors.
