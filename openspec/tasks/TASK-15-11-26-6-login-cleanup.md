# TASK-15-11-26-6 — Login Cleanup

## Solution Idea

Replace the mixed Russian/English Mission Access Gate copy with the approved English UI, remove the WebAuthn / Windows Hello fallback entirely so Factor 1 is an NFC badge tap only, and expose the seeded demo PINs directly on the badge cards. Keep the existing salted SHA-256 PIN verification, fixed three-attempt 30-second lockout, seamless enrollment, profile-isolated history, and five-minute ephemeral session watchdog intact. Update the approved `login.md`, delete `webauthn.ts`, remove its unused timeout constant, extend the auth tests for every required flow, and finish with `tsc --noEmit`, Vitest, and `npm run build`.

## ToDo Plan

- [x] Read the governing specs and current auth, login, header, seed, and test files.
- [x] Update `openspec/specs/FEATURES/login.md` to English NFC-only copy and visible demo PIN hints.
- [x] Add shared demo badge metadata for roles, history state, and test PIN labels.
- [x] Replace `copy.ts` with the exact English scan, PIN, enrollment, session, and header strings.
- [x] Remove the Windows Hello button, WebAuthn handler, and related state from `LoginScreen.tsx`.
- [x] Render the NFC reader, demo badge cards with PIN pills, and the dashed new-badge action.
- [x] Delete `webauthn.ts` and remove `WEBAUTHN_TIMEOUT_MS` from `constants.ts`.
- [x] Update `auth.test.ts` for English copy, NFC-only UI, and required auth flows.
- [x] Run `tsc --noEmit`, the full Vitest suite, and `npm run build`; fix any failures.

## Task Report

Updated the approved `login.md` to English NFC-only copy and removed the WebAuthn / Windows Hello fallback from the gate, deleting `webauthn.ts` and its unused timeout constant. All scan, PIN, lockout, enrollment, session, and header strings now use the exact English copy; the scan step renders a centered contactless NFC pulse reader, seeded badge cards show role, history state, and visible `NFC · PIN` pills (`111111`, `222222`, `333333`), and unknown tags use the dashed `+ Tap New Unregistered Badge` action. Auth coverage now verifies English copy, demo badge metadata, badge selection, PIN verification, the fixed three-attempt 30-second lockout, seamless enrollment, `astro-01`/`astro-02` history isolation, and five-minute ephemeral logout. Final verification passed: `tsc --noEmit` reported zero errors, Vitest passed 119 tests across 7 files, and `npm run build` completed successfully.
