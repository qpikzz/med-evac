# FRONTEND.md — Frontend Architecture, Layout & Component Implementation (ORBITA)

> **Scope:** Frontend architecture, component hierarchy, routing/role switching, state management, and UI implementation rules for **ORBITA** (*Onboard Remote Biometric & Integrated Telemetry Assistant*) (Tauri v2 + React 19 + TypeScript + Vite). Must be read alongside `DESIGN.md`, `RULES.md`, and `rules-engine.md`.

---

## 1. Tech Stack & Library Rules

- **Core Runtime:** Tauri v2, React 19, TypeScript (strict mode), Vite.
- **Approved UI Libraries (OSI-compliant, offline-capable):**
  - **Styling:** Tailwind CSS (or CSS Modules + CSS custom properties matching `DESIGN.md` tokens).
  - **Charts & Sparklines:** `Recharts` (MIT) or `Apache ECharts` (Apache-2.0) — bundled locally, zero CDN calls.
  - **Animations:** `motion` (MIT, formerly Framer Motion) for smooth layout transitions (`Pre-Checkup` $\rightarrow$ `Post-Checkup`) and drawer animations.
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
- **Status Summary Row (2 Equal Cards):**
  - **Card 1 — `Overall Status`:** Displays `overall_status` (`Green` / `Yellow` / `Red` / `No Data`) with semantic pill styling and status subtitle.
  - **Card 2 — `Escalation Level`:** Displays `overall_escalation` (`Self` / `Crew Medical Officer` / `Flight Surgeon on Earth`) with clear action priority indicator.
- **Main Workspace Grid (3-Column Asymmetric Layout):**
  - **Left Column (`IndicatorSparklineList` — ~32% width):**
    - Vertical stack of compact cards for each indicator from `EvaluationResult.indicators`.
    - Each card displays: indicator label, today's value + unit, status dot/badge, mini time-series sparkline (last 7–14 days), and an info icon `(i)` revealing `source` attribution on hover/click.
    - Clicking a card highlights the corresponding anatomical zone on the Body Map and expands triggered rules (`title`, `explanation`, `actions`, `recheck`) plus an **`Ask Local AI`** shortcut button.
    - *Strict Rule:* Never display `table_confidence` in the UI.
  - **Center Stage (`InteractiveBody3DMap` — ~53% width):**
    - Custom, high-detail **opaque 3D-styled anatomical SVG component** (layered gradients, specular highlights, anatomical shading, and depth shadows to achieve a pseudo-3D clinical look matching `DESIGN.md`).
    - **Clickable Hotspots & Floating Callout Cards:** Anatomical regions map to `indicator_id`s (e.g., brain/head $\rightarrow$ `sleep_hours`, `mood`; heart $\rightarrow$ `heart_rate`, `blood_pressure`; torso/core $\rightarrow$ `body_temp`, `blood_sugar`, `body_mass`, `immune_signs`; skin surface $\rightarrow$ `skin_health`; full-body aura $\rightarrow$ `radiation_dose`).
    - Regions dynamically tint/glow according to their `IndicatorResult.status` (`green`, `yellow`, `red`, `no_data`).
    - Floating callout cards connect via thin leader lines to active/triggered hotspots (showing metric name, value, and status pill).
  - **Right Edge (`LayerSwitcher` — ~15% width):**
    - Vertical stack of 3 tactile toggle cards switching the active anatomical layer of the opaque body model:
      1. **`Skin`** (surface layer: `skin_health`, `body_temp`, `radiation_dose`)
      2. **`Muscles`** (musculoskeletal layer: `body_mass`, `sleep_hours`, physical fatigue flags)
      3. **`Organs`** (internal organs layer: `heart_rate`, `blood_pressure`, `blood_sugar`, `immune_signs`, `mood`)

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
- **Contrast & Legibility:** Maintain $\ge 4.5:1$ contrast ratio on all light-surface cards and status badges.
- **Responsive Desktop Layout:** Optimize for `1280×800` and `1440×900` Tauri desktop viewports without horizontal scrollbars.
- **Zero Production Console Leaks:** Do not `console.log` raw health telemetry or user free-text notes in production builds.