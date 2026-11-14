# TASK-14-11-26-16 — Local AI

## 1. Solution Idea
Render deterministic combination matching immediately, then call only the local Ollama client for explain-only responses. Keep chat transient in component state, run the safety check before each model request, and present all model text as escaped React text.

## 2. ToDo Plan
- [x] Render the Layer 1 overall picture from `matchCombinations()` with the exact matched, unverified, and empty states.
- [x] Add automatic explain-today and bounded free-text chat through `checkSafety()`, `buildMessages()`, and `askModel()`.
- [x] Add safety support, exact fallback notices, prompt chips, and plain-text AI explanations.
- [x] Verify Block 6.1 with the targeted tests and type-check/build.

## 3. Task Report
Implemented the Local AI Comms channel with deterministic combination matching, safety-gated local model requests, bounded transient chat, and the specified fallback and support states. The focused AI-helper suite passed (14 tests), and the TypeScript/Vite production build completed successfully.
