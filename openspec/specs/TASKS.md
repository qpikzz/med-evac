# TASKS.md — Master Implementation Plan & Milestones (ORBITA)

> **Scope:** Phased implementation roadmap for **ORBITA** (*Onboard Remote Biometric & Integrated Telemetry Assistant*) (NASA Space Apps Challenge 2026). Tasks are grouped into cohesive, single-concern blocks (**Core/Logic** vs. **Frontend/UI** — never mixed within the same block).
> **Workflow Rules (`RULES.md`):**
> - Create `openspec/tasks/TASK-[DD]-[MM]-[YY]-[N]-[two-word-description].md` for every task.
> - Log every newly added dependency, font, icon set, or dataset in `SOURCES.md`.
> - Run the block verification checkpoint (unit tests + TypeScript check / build) upon completing each block.

---

## Phase 1: MVP Core (Day-40 Critical Path)

### Block 1: Project Setup, Compliance & Static Data Wiring [Core / Data]
*Goal: Configure Tauri/Vite environment, connect pre-built medical data files, and generate deterministic synthetic mission data.*

- [ ] **Task 1.1 — Environment, Test Runner & CSP Setup:** Configure Vitest for unit testing, configure Tauri v2 CSP (`connect-src 'self' http://127.0.0.1:11434`), verify zero default starter icons/NASA logos remain, and log dev dependencies in `SOURCES.md`.
- [ ] **Task 1.2 — Connect Pre-Built Medical Rules & Knowledge Base:** Wire the provided `src/data/rules.json` (applying the `plausible_min`/`plausible_max` ranges from `input-check.md` §5.3) and `src/data/knowledge_base.json` into the repository and log `openpyxl` / data sources in `SOURCES.md`.
- [ ] **Task 1.3 — Deterministic Synthetic Dataset Generator:** Implement `scripts/generate-synthetic.mjs` (zero external dependencies) and generate `src/data/synthetic_history.json` (7 preflight days + mission days 1–39 + scripted Day-40 check-up) per `synthetic-data.md` §4.1–4.2.
- [ ] **Task 1.4 — Mission Clock & In-Memory History Store:** Implement `src/features/synthetic-data/missionClock.ts`, `historyStore.ts`, `index.ts`, and `synthetic.test.ts` (acceptance criteria 1–10).
- **Block 1 Checkpoint:** Run `vitest` on `synthetic.test.ts` and verify deterministic JSON generation.

---

### Block 2: Core Validation, Personal Baseline & Rules Engine [Core / Logic]
*Goal: Implement the deterministic clinical evaluation pipeline with zero UI dependencies.*

- [ ] **Task 2.1 — Rules Loader & Core Domain Types:** Implement `src/rules/types.ts` and `src/rules/loadRules.ts` with strict schema/ID validation (`RulesFileError`) per `rules-engine.md` §4–5.1.
- [ ] **Task 2.2 — Deterministic Rules Engine:** Implement `src/rules/engine.ts` (`evaluate()`) supporting `threshold`, `baseline_delta`, `window_average`, `flag`, `persistence`, and `requires_flags`, plus `src/rules/engine.test.ts` (acceptance criteria 1–20).
- [ ] **Task 2.3 — Input Plausibility Check:** Implement `src/features/input-check/inputCheck.ts` (`checkEntry()`, `checkCheckup()` including blood pressure order validation) and `inputCheck.test.ts` (acceptance criteria 1–15).
- [ ] **Task 2.4 — Personal Baseline & Reference Lines:** Implement `src/features/personal-baseline/baseline.ts` (`computeBaselines()`, `describeDeviation()`, `getReferenceLines()`) and `baseline.test.ts` (acceptance criteria 1–15).
- **Block 2 Checkpoint:** Run full `vitest` suite across `rules/`, `input-check/`, `personal-baseline/`, and `synthetic-data/` (all ~60 unit tests passing).

---

### Block 3: Design System Foundation & Shared App Shell [Frontend / UI]
*Goal: Establish the dark space visual system (`DESIGN.md` v2.0), global layout shell, and role switcher.*

- [x] **Task 3.1 — Design Tokens, Typography & UI Packages:** CSS tokens in `src/styles/theme.css` (no Tailwind), `lucide-react`, `motion`, `recharts`; libraries logged in `SOURCE.md`.
- [ ] **Task 3.2 — Persistent Top Navigation Header & Role Switcher:** Implement the glass top bar displaying `ORBITA`, Mission Day (`Day 40`), date (`2026-11-14`), `OFFLINE · AUTONOMOUS` badge, `Main` / `Comms` tab switcher, and top-right avatar switcher (`Astronaut` vs. `Ground Operator`).
- [ ] **Task 3.3 — App State Context & Pipeline Binding:** Connect `historyStore`, `missionClock`, `checkCheckup`, `computeBaselines`, and `evaluate` in a centralized reactive store provider (marking temporary UI session helpers with `#TODO` per `FRONTEND.md` §4).
- **Block 3 Checkpoint:** Verify TypeScript compilation (`tsc --noEmit`) and visual rendering of the header and role switcher.

---

### Block 4: Main Screen — Two-State Check-up & Body Map Dashboard [Frontend / UI]
*Goal: Build the complete Day-40 astronaut workflow from daily check-up entry to the layered 2D body map health summary.*

- [ ] **Task 4.1 — State A: Pre-Checkup Form & Symptom Tag Selector:** Build `CheckupFormCard` with numeric metric inputs, `Rest`/`Exercise` toggle, inline plausibility error messages (`allOk === false` disables Save), searchable 42-flag symptom pills, free-text concern box, `Submit Check-up` / `Contact Earth` actions, and the bottom waiting placeholder (`DESIGN.md` §5.1).
- [ ] **Task 4.2 — State B: Top Confirmation & Status Summary Cards:** Build the post-checkup collapse transition (`"Thank you for taking care of yourself!"` + `Edit Check-up`), `Overall Status` card, and `Escalation Level` card.
- [ ] **Task 4.3 — Indicator Cards Stack with Sparklines & Source Popovers:** Build the left column (`IndicatorSparklineList`) showing the 10 tracked indicators, 7-day trend sparklines (Recharts area chart with "your normal" line, `DESIGN.md` §5.2), expandable rule protocols (`title`, `explanation`, `actions`, `recheck`), `(i)` source attribution tooltips (hiding `table_confidence`), and `Ask Local AI` buttons.
- [x] **Task 4.4 — Layered 2D Body Map & Dark Space Theme:** Build `BodyMap` (`Skin` · `Organs` · `Skeleton` tabs with worst-status badges, status hotspots, radiation aura, monitoring-only style, tooltips, keyboard access, zone list) and `src/styles/theme.css`, per `FEATURES/body-map.md`. Logs: `openspec/tasks/TASK-15-11-26-15-body-map.md`, `TASK-15-11-26-16-charts-motion-radiation.md`.
- [x] **Task 4.5 — Daily Radiation Check & Radiation Alert:** "Radiation check" block in the check-up form (dose rate, accumulated dose, 3 radiation event toggles) and the animated `RadiationAlert` on the dashboard, driven only by the engine's `radiation_dose` result.
- [x] **Task 4.6 — Radiation Limits & Dose Budget (Mars transit):** illustrative Q-RAD thresholds in `rules.json`, 180-day transit, Dose budget meter vs NASA 600 mSv career limit, sources in `SOURCE.md` §4. Log: `TASK-15-11-26-18-radiation-limits.md`.
- **Block 4 Checkpoint:** Run `npm run build` and end-to-end manual walkthrough of the Day-40 demo story (enter `920` $\rightarrow$ validation error $\rightarrow$ enter `80` + sleep `6.5` $\rightarrow$ yellow Heart & Sleep on cards and body map).

---

## Phase 2: Secondary Features (Post-Core Enhancements)

### Block 5: AI Helper & Earth Link Domain Modules [Core / Logic]
*Goal: Implement deterministic symptom combination matching, safety guardrails, local Ollama HTTP client, and delayed Earth message packaging.*

- [ ] **Task 5.1 — Verified Combinations Matcher & Safety Filter:** Connect pre-built `src/data/combinations.json`, implement `src/features/ai-helper/combinations.ts` (`loadCombinations`, `matchCombinations`) and `safety.ts` (`checkSafety` triggering `mood_r_flags` support card without LLM call).
- [ ] **Task 5.2 — Prompt Builder & Local Ollama Client (`granite3.3:8b`):** Implement `src/features/ai-helper/prompt.ts` and `ollama.ts` (`GET /api/tags`, `POST /api/chat` targeting `http://127.0.0.1:11434` with `granite3.3:8b`, `temperature: 0.2`, `60000ms` timeout), plus `aiHelper.test.ts` (criteria 1–14).
- [ ] **Task 5.3 — Earth Link Message Packaging & Delay View Logic:** Implement `src/features/earth-link/settings.ts`, `message.ts` (`buildDraft`, `validateNote`, `send`, `viewMessage` with `×60` demo time scale and privacy flag for `mood` red), `transport.ts` (`createInMemoryTransport`), and `earthLink.test.ts` (criteria 1–13).
- **Block 5 Checkpoint:** Run `vitest` on `aiHelper.test.ts` and `earthLink.test.ts`.

---

### Block 6: Comms View — Local AI Chat & Ground Operator Console [Frontend / UI]
*Goal: Build the dual-channel `Comms` screen supporting local LLM reasoning and Ground Operator mode.*

- [ ] **Task 6.1 — Local Neural Network (`granite3.3:8b`) Chat Interface:** Build the `Comms` AI channel showing Layer 1 deterministic matched combinations immediately, Layer 2 Ollama response with collapsible `Clinical Reasoning`, quick prompt chips, safety support card rendering, and graceful fallback when Ollama is offline.
- [ ] **Task 6.2 — Ground Operator Channel & Role Console (`#TODO` Sync Stub):** Build the `Ground Operator (Earth)` channel view (and single-screen console when `Ground Operator` profile is selected in the header), displaying `EarthMessage` delayed transit/acknowledgment status and a `#TODO` stub banner for live cross-instance reply sync (`FRONTEND.md` §3.2).
- **Block 6 Checkpoint:** Run full `vitest` suite + `npm run build` and verify complete offline demo flow (Day-40 yellow evaluation $\rightarrow$ AI explanation $\rightarrow$ red flag auto-draft $\rightarrow$ delayed Earth delivery).
```