# TASK-15-11-26-26 — Dynamic Prompts

## Solution Idea

Build the first Local AI quick prompt from the highest-priority deduplicated triggered metric while keeping the self-care plan and analysis prompts consistent.

## ToDo Plan

- [x] Inspect the Local AI prompt chips, triggered-metric ordering, and existing view tests.
- [x] Replace the static prompt list with severity-aware context prompts and the Green-state baseline prompt.
- [x] Add focused coverage for Red/Yellow ordering, Green fallback, and the remaining prompt labels.
- [x] Run TypeScript and targeted tests.

## Task Report

Replaced the static first prompt with the highest-severity deduplicated telemetry prompt, added the Green-state baseline comparison prompt, and updated the self-care plan chip. Red, Yellow, Green, and static-render cases are covered; `npx tsc --noEmit` and the focused Comms view tests passed.
