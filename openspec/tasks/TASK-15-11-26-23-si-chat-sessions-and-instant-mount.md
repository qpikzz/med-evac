# TASK-15-11-26-23 — SI Chat Sessions and Instant Mount

## Solution Idea

Remove automatic model calls on mount and use a synchronous deterministic clinical briefing. Persist each profile's SI sessions and active session in dedicated localStorage keys; append user and assistant turns as they occur, falling back to the deterministic briefing when Ollama cannot respond.

## ToDo Plan

- [x] Read operational rules and applicable frontend, design, and API specifications; inspect existing AI, profile, persistence, and test patterns.
- [x] Add validated per-profile chat-session persistence and deterministic initial/reply briefings.
- [x] Replace mount-time AI requests with persisted session UI and explicit user-triggered requests with guaranteed replies.
- [x] Test instant mount, session CRUD, message persistence, remounting, and profile isolation.
- [x] Run TypeScript, full Vitest, and production build verification.

## Task Report

Removed mount-time Ollama requests, added synchronous deterministic briefings, and implemented isolated per-profile SI chat sessions with active-session persistence, switch/create/delete controls, immediate message persistence, and deterministic replies when Ollama cannot respond. Verified with `npx tsc --noEmit`, `npx vitest run` (165 tests), and `npm run build`.
