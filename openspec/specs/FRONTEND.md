# FRONTEND.md — Frontend Architecture, Layout & Component Implementation (ORBITA)

> **Scope:** Frontend architecture, component hierarchy, routing/role switching, state management, and UI implementation rules for **ORBITA** (*Onboard Remote Biometric & Integrated Telemetry Assistant*) (Tauri v2 + React 19 + TypeScript + Vite). Must be read alongside `DESIGN.md`, `RULES.md`, and `rules-engine.md`.

---

## 1. Tech Stack & Library Rules

- **Core Runtime:** Tauri v2, React 19, TypeScript (strict mode), Vite.
- **Approved UI Libraries (OSI-compliant, offline-capable):**
  - **Styling:** Tailwind CSS (or CSS Modules + CSS custom properties matching `DESIGN.md` tokens).
  - **Charts & Sparklines:** `recharts@3.10.1` (MIT) — used for the indicator sparklines (`src/components/charts/TrendSparkline.tsx`); bundled locally, zero CDN calls.
  - **Animations:** `motion@14.9.0` (MIT, formerly Framer Motion) for the `Pre-Checkup` $\rightarrow$ `Post-Checkup` transition, card entrance and the radiation alert; app wrapped in `<MotionConfig reducedMotion="user">`.
  - **Icons:** `lucide-react` (ISC) or `phosphor-react` (MIT).
  - **Typography:** Self-hosted `Fira Sans` / `Overpass` / `Inter` (SIL OFL-1.1) or system UI fallback stack.
- **Compliance Rule (`RULES.md`):** Any newly installed npm package, icon set, or font **MUST** be immediately recorded in `SOURCES.md` with its version, repository URL, and OSI license.

---

## 2. Role & Navigation Architecture

### 2.1 Profile Switcher (Top-Right Header Avatar)
Clicking the circular profile avatar in the top-right header opens a clean dropdown menu allowing instant switching between two user roles:
1. **`Astronaut` (Default):** Full access to `Main` (`Pre-Checkup` / `Post-Checkup` Dashboard) and `Comms` (Chat with Local AI & Ground Operator).
2. **`Ground Operator`:** Restricted view — navigation tabs (`Main`) are hidden/locked; the user sees **only** the `Comms` chat interface representing the Flight Surgeon / Mission Control console communicating with the astronaut.

### 2.2 Top Navigation Bar (`Header`)
- **Left:** ORBITA logo/title, Mission Day counter (`Day 40`), and mission date (`2026-11-14` / `YYYY-MM-DD`). Do not display the `Synthetic data` or `OFFLINE · AUTONOMOUS` badges in the header.
- **Center (Astronaut role only):** Segmented pill navigation switching between:
  - `Main` (Dashboard)
  - `Comms` (Chat & Ground Link)
- **Right:** Profile avatar button (`Astronaut` / `Ground Operator` switcher) with role indicator badge.

---

## 3. View Specifications & Component Hierarchy

### 3.1 `Main` View — Two-State Flow (Astronaut Role)

#### State A: `Pre-Checkup` (Initial State Before Today's Submission)
- **Top Panel (`CheckupFormCard`):**
  - **Left Column — Metric Inputs:** Clean numeric inputs with unit labels (`bpm`, `mmHg`, `°C`, `mg/dL`, `h`, `0–10`, `kg`, `µSv/h`, `mSv`) mapped strictly to `metric` IDs in `rules.json`. Includes a `Rest` / `Exercise` segmented toggle for `body_temp`. Inline client-side validation highlights out-of-range values (`plausible_min` / `plausible_max`) without blocking submission (invalid values are flagged `valid: false`).
  - **Right Column — Symptoms & Free Text:**
    - Interactive multi-select **Symptom Tag Pills** mapped to the 42 flag IDs in `rules.json` (grouped or searchable, highlighting high-severity flags).
    - Free-text textarea (*"Tell us if anything else is bothering you..."*): any free-text input that does not match a structured tag is preserved and passed as context to the Local AI (Ollama) helper.
  - **Action Buttons:**
    - Primary button: **`Submit Check-up`** $\rightarrow$ validates inputs, stores today's readings/flags, runs `evaluate()` from `src/rules/engine.ts`, and animates transition into `Post-Checkup` state.
    - Secondary button: **`Contact Earth`** $\rightarrow$ switches to `Comms` tab with Ground Operator selected.
- **Bottom Placeholder (`WaitingSummaryBanner`):**
  - Centered muted clinical card: *"Waiting for your daily check-up to generate your health summary."*

#### State B: `Post-Checkup` (Active Health Summary Dashboard)
- **Top Acknowledgment Banner (`CheckupCompleteBar`):**
  - Compact glass card displaying *"Thank you for taking care of yourself!"* alongside a secondary **`Edit Check-up`** button (reopens the form for today's check-up).
- **Health Alerts (`HealthAlerts`, `src/components/HealthAlerts/`):** shown above the summary row when the engine reports any indicator `yellow` or `red`. `alertViews()` (pure, tested) orders them red → yellow; the first is a large card with its rules' `title`, `explanation`, `actions`, `recheck`, reported flags, escalation text and a per-indicator animated illustration (`AlertArt`); the rest are compact rows. `Show on body map` selects the indicator's zone (the map switches layer). No own logic. Replaces the earlier radiation-only alert.
- **Radiation Dose Budget:** the radiation indicator card shows `DoseBudgetMeter` (`src/components/charts/`), fed by `doseBudget()` (`src/features/radiation/doseBudget.ts`): accumulated dose vs the 600 mSv NASA career limit and a projection to Mars arrival (`TRANSIT_DAYS = 180`). Display only.
- **Status Summary Row (2 Equal Cards):**
  - **Card 1 — `Overall Status`:** Displays `overall_status` (`Green` / `Yellow` / `Red` / `No Data`) with semantic pill styling and status subtitle.
  - **Card 2 — `Escalation Level`:** Displays `overall_escalation` (`Self` / `Crew Medical Officer` / `Flight Surgeon on Earth`) with clear action priority indicator.
- **Main Workspace Grid (2-Column Layout):**
  - **Left Column (`IndicatorSparklineList` — ~42% width):**
    - Vertical stack of compact cards for each indicator from `EvaluationResult.indicators`.
    - Each card displays: indicator label, today's value + unit, status dot/badge, mini time-series sparkline (last 7–14 days), and an info icon `(i)` revealing `source` attribution on hover/click.
    - Clicking a card highlights the corresponding anatomical zone on the Body Map and expands triggered rules (`title`, `explanation`, `actions`, `recheck`) plus an **`Ask Local AI`** shortcut button.
    - *Strict Rule:* Never display `table_confidence` in the UI.
  - **Right Column (`BodyMap` — ~58% width):** layered 2D body map, full spec in `FEATURES/body-map.md`.
    - Component: `src/components/BodyMap/BodyMap.tsx` (`BodyMapProps { result, rules, selectedZone?, onSelect }`). It never imports or calls the engine; the parent passes `EvaluationResult` in. `InteractiveBody3DMap.tsx` stays at its path as a thin wrapper so `MainDashboard` did not change; its old `LayerSwitcher` export now renders nothing.
    - Flat 2D line-art figure with three layers switched by tabs **`Skin` · `Organs` · `Skeleton`** (default `Organs`), 200 ms cross-fade. Optional art from `src/assets/body/`, placeholder silhouette if missing.
    - Zones (`src/components/BodyMap/zones.ts`): brain → `sleep_hours`, `mood`; heart → `heart_rate`, `blood_pressure`; blood → `blood_sugar`; immune → `immune_signs` (Organs); skin → `skin_health`, `body_temperature`; radiation → `radiation_dose`, whole-body aura (Skin); musculoskeletal → `body_mass` (Skeleton).
    - Zone status = worst of its indicators (`red` > `yellow` > `green` > `no_data`). Indicators whose rules are **all** `enabled: false` are monitoring-only: excluded from the colour and shown as *"Monitoring only — limits are set by mission flight surgeons."* Layer tab badge = worst zone on that layer.
    - Every status shows a word + icon (`OK ✓` / `Watch !` / `Alert !!` / `No data –` / `Monitoring ◌`). Clicking a zone highlights and scrolls to its indicator card.

### 3.2 `Comms` View — Dual-Channel Chat Interface
Accessible via the top `Comms` tab (for `Astronaut`) or as the sole view (for `Ground Operator`).
- **Channel Selector (Top of Chat Panel):**
  - Segmented toggle between **`Local AI (Offline SI)`** and **`Ground Operator (Earth)`**.
- **Mode 1: `Local AI (Offline SI)`:**
  - Connects to the local backend / Ollama endpoint (`IBM Granite 3.3 8B` + RAG over `knowledge_base.json`).
  - Automatically attaches today's `EvaluationResult` (triggered rules, baseline deltas, and any unmatched free-text notes from the check-up) as read-only clinical context.
  - Displays a collapsible **`Clinical Reasoning`** block above the final structured explanation.
  - *Guardrail:* UI explicitly notes that Local AI explains triggered rules and protocols but cannot alter deterministic status colors.
- **Mode 2: `Ground Operator (Earth)`:**
  - Displays a mission signal latency indicator badge (e.g., `LEO: ~0s` / `Lunar: 1.3s` / `Mars: 12m`).
  - **Implementation Marker (`#TODO`):** Sending messages to or syncing state with the Ground Operator is **not yet implemented** in MVP. Render a clean chat UI with a visible `#TODO: Ground relay sync not implemented in offline MVP` banner/stub when sending a message in this mode.

---

## 4. State Management & Temporary Data Stub (`#TODO`)

- **Current MVP Storage (`#TODO` — Replace Later):**
  - Until the dedicated Storage and Baseline modules are specified and implemented, manage check-up state, reading history, and preflight baselines in a centralized React Context / hook backed by `localStorage`.
  - Pre-seed `localStorage` on first boot with deterministic synthetic mission history (Days 1–39, plus Day-40 demo baseline) so sparklines, 7-day rolling baselines, and `evaluate()` work immediately out of the box.
  - **Mark clearly in code:** Add `// #TODO(storage): Replace localStorage mock history & preflight baselines with persistent Storage & Baseline modules` at the top of the state provider file.

---

## 5. UX, Accessibility & Security Rules

- **Plain Text Escaping:** Render all strings from `rules.json`, `knowledge_base.json`, free-text check-up notes, and LLM chat responses using standard React text nodes. **Never** use `dangerouslySetInnerHTML`.
- **Contrast & Legibility:** Maintain $\ge 4.5:1$ contrast ratio on all dark-surface cards and status badges (`DESIGN.md` §2). Status is never colour-only.
- **Responsive Desktop Layout:** Optimize for `1280×800` and `1440×900` Tauri desktop viewports without horizontal scrollbars.
- **Zero Production Console Leaks:** Do not `console.log` raw health telemetry or user free-text notes in production builds.