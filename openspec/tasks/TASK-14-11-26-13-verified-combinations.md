# TASK-14-11-26-13 — Verified Combinations & Safety Filter

## 1. Solution Idea
Implement the deterministic Layer 1 of the AI helper. `loadCombinations()` validates the combinations file against `rules.json` (indicator/rule/flag ids, at least two conditions per combination, duplicate ids, non-empty explanations/source). `matchCombinations()` reads an `EvaluationResult` plus today's flags without mutating them, computes matched combinations in file order, ordered non-green indicators and the `unverified` notice. `safety.ts` provides a case-insensitive `SAFETY_PHRASES` scan and a support-card reader for the `mood_r_flags` rule so the UI can block the LLM call. A clean empty `combinations.json` placeholder plus a default loader keeps tests and the app running until Ayesha's medical content is added (#TODO).

## 2. ToDo Plan
- [x] Implement `src/features/ai-helper/combinations.ts` (`CombinationsFileError`, types, `loadCombinations`, `matchCombinations`).
- [x] Implement `src/features/ai-helper/safety.ts` (`SAFETY_PHRASES`, `checkSafety`, `buildSafetySupportCard`).
- [x] Add `src/features/ai-helper/__fixtures__/combinations.test.json` (test-only, labelled not medical).
- [x] Wire `src/data/combinations.json` fallback and default loader with a `#TODO` for Ayesha's verified content.
- [x] Verify compilation with the AI-helper test suite.

## 3. Task Report
Implemented deterministic Layer 1 combination matching and Layer 2 safety scanning. `loadCombinations()` validates the `1.0` schema against `rules.json` (known indicator/rule/flag ids, at least two conditions, duplicate ids, non-empty explanations/source), and `matchCombinations()` returns matched combinations in file order, ordered non-green indicators and the `unverified` notice without mutating the `EvaluationResult`. `checkSafety()` performs the case-insensitive phrase scan and `buildSafetySupportCard()` reads the `mood_r_flags` support card so the UI can block the LLM call. A test-only fixture and a valid empty `combinations.json` placeholder with `#TODO(Q-AI-COMBO)` keep the app runnable until Ayesha's verified list is added.
