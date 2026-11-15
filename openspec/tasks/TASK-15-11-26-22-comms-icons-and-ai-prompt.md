# TASK-15-11-26-22 — Comms Icons and AI Prompt

## Solution Idea

Replace the channel glyphs with layered local SVG emblems. Reorder clinical context and summary pills by deterministic status severity, and round computed numeric values at prompt and response presentation boundaries without changing Rules Engine calculations.

## ToDo Plan

- [x] Inspect channel icons, AI prompt/context serialization, baseline data flow, and related tests.
- [x] Create premium layered neural-core and Earth telemetry SVG emblems.
- [x] Prioritize red before yellow in pills and prompt context; add explicit response ordering and numeric rounding.
- [x] Add focused tests for severity ordering, context ordering, and rounded prompt/response values.
- [x] Run TypeScript, full Vitest, and production build verification.

## Task Report

Implemented layered neural-core and Earth telemetry SVG emblems; red-first clinical context and summary ordering; and metric-aware rounding for prompt observations and displayed AI responses. Added focused severity and rounding tests.

Verification passed: `npx tsc --noEmit`, `npx vitest run` (161 tests), and `npm run build`. Vite reports the existing advisory that the main JavaScript chunk exceeds 500 kB.
