# TASK-14-11-26-14 — Prompt Builder & Local Ollama Client

## 1. Solution Idea
Build the Layer 2 prompt and the Layer 3 local HTTP client. `prompt.ts` exports the verbatim system prompt, a deterministic `CONTEXT:` serializer for the read-only `EvaluationResult` and matched combinations, and applies `max_user_chars` (1000) plus `max_turns_sent` (10). `ollama.ts` exports `HelperSettings`/`LlmResult`, targets `http://127.0.0.1:11434`, checks `GET /api/tags` for `granite3.3:8b`, and calls `POST /api/chat` with `stream:false`, `temperature:0.2` and a race-based `60000 ms` timeout. A single `aiHelper.test.ts` covers acceptance criteria 1–14 using the test-only fixture.

## 2. ToDo Plan
- [x] Implement `src/features/ai-helper/prompt.ts` (`SYSTEM_PROMPT`, `buildMessages`) with the fixed English prompt and context serialization.
- [x] Implement `src/features/ai-helper/ollama.ts` (`HelperSettings`, defaults, `askModel`) for `granite3.3:8b`.
- [x] Write `src/features/ai-helper/aiHelper.test.ts` (criteria 1–14) with injected `fetchImpl` and a Day-40 evaluation.
- [x] Run `vitest` on `aiHelper.test.ts` and confirm every criterion passes.

## 3. Task Report
Implemented the verbatim system prompt, deterministic `CONTEXT:` serialization, `max_user_chars`/`max_turns_sent` enforcement, and the local Ollama client pinned to `granite3.3:8b` with `temperature: 0.2`, `stream: false` and a race-based `60000 ms` timeout against `http://127.0.0.1:11434`. `aiHelper.test.ts` covers all 14 acceptance criteria with an injected `fetchImpl`; the suite passes 14/14 and `tsc --noEmit` is clean.
