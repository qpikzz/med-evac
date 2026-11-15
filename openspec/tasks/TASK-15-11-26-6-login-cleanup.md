# TASK-15-11-26-6 — Login Cleanup

## Solution Idea

Replace the mixed Russian/English Mission Access Gate copy with the approved English UI, remove the WebAuthn / Windows Hello fallback entirely so Factor 1 is an NFC badge tap only, and expose the seeded demo PINs directly on the badge cards. Keep the existing salted SHA-256 PIN verification, fixed three-attempt 30-second lockout, seamless enrollment, profile-isolated history, and five-minute ephemeral session watchdog intact. Update the approved `login.md`, delete `webauthn.ts`, remove its unused timeout constant, extend the auth tests for every required flow, and finish with `tsc --noEmit`, Vitest, and `npm run build`.

## ToDo Plan

- [x] Read the governing specs and current auth, login, header, seed, and test files.
- [ ] Update `openspec/specs/FEATURES/login.md` to English NFC-only copy and visible demo PIN hints.
- [ ] Add shared demo badge metadata for roles, history state, and test PIN labels.
- [ ] Replace `copy.ts` with the exact English scan, PIN, enrollment, session, and header strings.
- [ ] Remove the Windows Hello button, WebAuthn handler, and related state from `LoginScreen.tsx`.
- [ ] Render the NFC reader, demo badge cards with PIN pills, and the dashed new-badge action.
- [ ] Delete `webauthn.ts` and remove `WEBAUTHN_TIMEOUT_MS` from `constants.ts`.
- [ ] Update `auth.test.ts` for English copy, NFC-only UI, and required auth flows.
- [ ] Run `tsc --noEmit`, the full Vitest suite, and `npm run build`; fix any failures.

## Task Report

Pending.
