# TASK-14-11-26-15 — Earth Link Message Packaging

## 1. Solution Idea
Implement the deterministic Earth-link domain layer. `settings.ts` fixes the 20-minute one-way delay, the ×60 demo time scale and the 500-character note limit. `message.ts` builds a minimal, privacy-safe `EarthMessage` draft from the read-only `EvaluationResult` and `HistoryStore`, decides medical vs. private behavioral routing from the mood red rule, and derives transit/arrival/acknowledgment state from injected timestamps. `transport.ts` provides the in-memory transport used by tests and browser dev, plus a lazy Tauri event transport. `earthLink.test.ts` covers acceptance criteria 1–13.

## 2. ToDo Plan
- [x] Implement `src/features/earth-link/settings.ts` (`EARTH_LINK`).
- [x] Implement `src/features/earth-link/message.ts` (types, `delayMs`, `shouldAutoDraft`, `buildDraft`, `validateNote`, `send`, `viewMessage`).
- [x] Implement `src/features/earth-link/transport.ts` (`createInMemoryTransport`, `createTauriTransport`).
- [x] Write `src/features/earth-link/earthLink.test.ts` (criteria 1–13).
- [x] Run `vitest` on `earthLink.test.ts` and confirm every criterion passes.
- [x] Block 5 checkpoint — run the full `vitest` suite and `npm run build`.

## 3. Task Report
Implemented the Earth-link domain layer: fixed delay/demo settings, privacy-safe `buildDraft()` from a read-only evaluation and store, exact 11-field content, medical vs. private behavioral routing from the mood red rule, timestamp-derived transit/arrival/acknowledgment views, and in-memory plus lazy Tauri transports. `earthLink.test.ts` covers all 13 acceptance criteria; the Block 5 checkpoint passes with the full suite at 88/88 tests and `npm run build` (`tsc` + Vite) succeeding.
