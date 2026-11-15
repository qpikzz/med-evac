# TASK-15-11-26-25 — Briefing Advice

## Solution Idea

Include concise rule-backed actions in every generated clinical briefing and refresh the cached auto-generated opening briefing when current check-up data changes.

## ToDo Plan

- [x] Read operational and applicable specifications; inspect the briefing builder, session store, rules, and tests.
- [x] Add an actionable `Next:` line for each triggered metric and a positive maintenance tip when there are no alerts.
- [x] Refresh only auto-generated opening briefings in saved current-day sessions when advice or check-up data is stale.
- [x] Add focused tests for rule-backed advice, the green maintenance tip, and cached briefing refresh.
- [x] Run TypeScript, unit-test, and production-build verification.

## Task Report

Added rule-backed `Next:` recommendations to each triggered metric, a green-status maintenance tip, and synchronous refresh of generated current-day opening briefings in saved sessions. Added focused coverage and verified with `npx tsc --noEmit`, `npx vitest run` (167 tests), and `npm run build`; Vite retains its advisory that the main JavaScript chunk exceeds 500 kB.
