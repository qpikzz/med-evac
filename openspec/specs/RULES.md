# RULES.md — Agent Operational Rules & Guardrails (ORBITA)

> **Scope:** Mandatory operational rules for all AI coding agents working in the **ORBITA** (*Onboard Remote Biometric & Integrated Telemetry Assistant*) repository (NASA Space Apps Challenge 2026, Team CyberAstro). You MUST read and obey this file before executing any task.

---

## 1. Specification Index (`openspec/specs/`)

Before writing or modifying any code, always consult the relevant specifications in `openspec/specs/`:
- `RULES.md` — Agent operational rules, workflow, and hard prohibitions (this file).
- `FEATURES.md` — Functional scope, screens, personal baseline logic, and synthetic/test data scenarios.
- `API_CONTRACT.md` — Strict data contracts and IPC/HTTP schemas between frontend, rules engine, storage, and backend/SI.
- `FRONTEND.md` — Frontend architecture, state management, and component implementation details.
- `DESIGN.md` — Design system, color tokens, typography, and layout guidelines.
- `SI.md` — Super Intelligence (local LLM + RAG) architecture, prompts, and strict boundaries.
- `TASKS.md` — Master task breakdown, milestones, and verification checkpoints.
- `rules-engine.md` — Detailed deterministic Rules Engine specification (`src/rules/`).

---

## 2. Mandatory Workflow (Every Task)

1. **Read Specs First:** Read the applicable files in `openspec/specs/` before taking any action. Never guess field names, contracts, or thresholds.
2. **Task Logging (`openspec/tasks/`):**
   - For every task you execute, create a dedicated log file in `openspec/tasks/` using the exact naming format:
     `TASK-[DD]-[MM]-[YY]-[N]-[two-word-description].md`
     *(Example: `TASK-14-11-26-1-rules-engine.md`, where `[N]` is the sequential task number for that day and `[two-word-description]` is in English).*
   - Every task log file MUST contain:
     1. **Solution Idea:** A brief summary of the intended technical approach.
     2. **ToDo Plan:** A concise checklist of implementation steps.
     3. **Task Report:** A short final report upon completion (**strictly no more than 1 paragraph**).
3. **Stop & Ask on Ambiguity:**
   - Whenever you encounter missing specifications, `null` thresholds, `OPEN QUESTION` items, or conflicting requirements, **STOP immediately and ask the human user** for clarification. Never invent medical thresholds, API fields, or silent workarounds.
4. **Attribution & License Tracking (`SOURCES.md`):**
   - Whenever you install, import, download, or use any third-party resource (npm package, Rust crate, Python library, font, icon set, dataset, scientific reference, or AI model), you **MUST** immediately document it in `SOURCES.md` in the repository root (name, version/URL, OSI/permissive license, and role).
   - Never add unused dependencies.
5. **Verification at Milestone Completion:**
   - Running full build and test suites (`npm run build`, `vitest`, etc.) is not required after every minor edit, **unless** you are completing a milestone block defined in `TASKS.md` (where full verification is mandatory).

---

## 3. Hard Prohibitions (NEVER Do This)

1. **NEVER Edit Specs Without Explicit Approval:**
   - You are strictly forbidden from creating, modifying, or deleting any file inside `openspec/specs/` unless the human user gives **explicit consent** for that specific change.
2. **NEVER Use Git:**
   - You are strictly forbidden from running any `git` commands (`git init`, `git add`, `git commit`, `git checkout`, `git reset`, `git status`, `git diff`, etc.) or modifying `.git/`. Version control is handled exclusively by the human user.
3. **SI (Super Intelligence) Boundaries:**
   - **NEVER** allow Super Intelligence (LLM / Ollama / Granite) to compute, override, or lower medical indicator colors (`green`, `yellow`, `red`, `no_data`) or escalation levels (`self`, `crew_medical_officer`, `ground_flight_surgeon`). Status and urgency belong **exclusively** to the deterministic Rules Engine (`src/rules/engine.ts`) reading `src/data/rules.json`.
   - **NEVER** generate disease diagnoses. The system outputs risk statuses, physiological context, and self-care/escalation protocols only.
4. **Offline-First & Network Rules:**
   - **NEVER** fetch `rules.json`, `knowledge_base.json`, fonts, icons, or CDN scripts over the internet at runtime. All assets and rule files must be bundled locally at build time.
   - Localhost API calls are permitted **only** to the local backend / Ollama runtime (`127.0.0.1` / `localhost`).
5. **NASA Space Apps 2026 Compliance & Legal:**
   - **NEVER** use the official NASA insignia ("meatball") or NASA logotype anywhere in the UI, app icons, or repository assets.
   - **NEVER** ship default Tauri starter icons (`CC-BY-NC-ND`) or unattributed third-party logos (`vite.svg`, `tauri.svg`, `react.svg`).
   - **NEVER** include non-OSI/proprietary libraries, bundled proprietary font binaries, or dependencies/entities affiliated with China (including Hong Kong and Macau).
   - **NEVER** hardcode real personal data (PII), real patient records, or names/likenesses of individuals under 18.
6. **Code Safety & Security:**
   - **NEVER** use `eval()`, `new Function()`, or `dangerouslySetInnerHTML` when rendering rules, protocols, or SI outputs.
   - **NEVER** mutate input objects inside pure functions (such as `evaluate()`).
   - **NEVER** log health telemetry values to the console in production builds.
   - **NEVER** display internal metadata fields like `table_confidence` in the UI.

---

## 4. Language & Code Standards

- **Strict English:** All specifications, task logs (`TASK-...`), code, comments, UI text, and documentation must be written in **English**.
- **Stack:** Tauri v2 + React 19 + TypeScript (strict mode) + Vite.