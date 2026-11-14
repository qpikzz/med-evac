# TASK-14-11-26-4 — Mission Clock, History Store & Tests

## 1. Solution Idea
Implement the deterministic mission clock (`missionClock.ts`), the in-memory `HistoryStore` (`historyStore.ts`), the shared store export (`index.ts`), and `synthetic.test.ts` criteria 1–10. Because the store imports `Reading` from `src/rules/types.ts` and the type contract is defined in `openspec/specs/rules-engine.md` §4.1, add only that shared type file as a Block 1 prerequisite; `loadRules` and `evaluate` remain Block 2 work. Criteria 6–7 (rules engine + baseline integration) are deferred to Block 2, and the input-check half of criterion 10 is deferred to Block 2 Task 2.3.

## 2. ToDo Plan
- [x] Add `src/rules/types.ts` exactly per `rules-engine.md` §4.1.
- [x] Implement `missionClock.ts` with UTC date math.
- [x] Implement `loadSyntheticDataset`, `createHistoryStore`, and `SyntheticDataError`.
- [x] Export one shared `historyStore` from `index.ts`.
- [x] Write `synthetic.test.ts` criteria 1–5, 8–10 (data-only part of 10).
- [x] Mark criteria 6–7 and input-check rejection as `todo` pending Block 2.
- [x] Run Vitest and TypeScript checks.

## 3. Task Report
Added the shared `src/rules/types.ts` contract (prerequisite for `Reading`), implemented UTC `missionClock.ts`, `loadSyntheticDataset`/`createHistoryStore`/`SyntheticDataError` in `historyStore.ts`, and a shared `historyStore` export in `index.ts`. `synthetic.test.ts` covers criteria 1–5, 8, 9, and the data half of 10 (8 passing, 3 todo); criteria 6–7 and the input-check half of 10 are explicitly deferred to Block 2 because they require `evaluate`, `computeBaselines`, and `checkEntry`. Vitest (`8 passed, 3 todo`), `tsc --noEmit`, and `npm run build` all pass.
