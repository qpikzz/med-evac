# TASK-15-11-26-24 — Deduplicate SI Briefing and Precise Deltas

## Solution Idea

Group triggered rules by their configured metric, prefer the most severe rule, and carry the exact rounded baseline deviation into deterministic briefings and serialized AI context. Simplify the Local AI header and make session option labels concise and grammatically correct.

## ToDo Plan

- [x] Inspect clinical summary, prompt serialization, relevant rules, session labels, and current header styling.
- [x] Consolidate same-metric triggered rules and dynamically format signed baseline deviations in briefing and AI context.
- [x] Deduplicate triggered metric chips, compact the top context strip, and correct session option labels.
- [x] Add tests for consolidated rules, exact signed deviations, and selector label grammar.
- [x] Run TypeScript, full Vitest, and production build verification.

## Task Report

Consolidated same-metric triggers, replaced static baseline wording with exact signed deviations in briefings and AI context, simplified the top context strip, and corrected session labels. Verified with `npx tsc --noEmit`, `npx vitest run` (165 tests), and `npm run build`. Vite reports its advisory that the main JavaScript chunk exceeds 500 kB.
