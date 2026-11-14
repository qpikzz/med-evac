# DESIGN.md — Design System & UI/UX Specification (MED-EVAC)

> **Scope:** Visual design system, color tokens, typography, layout architecture, and screen specifications for **MED-EVAC** (NASA Space Apps Challenge 2026, Team CyberAstro). All UI text rendered in the application must be in **English** per `RULES.md`.

---

## 1. Visual Direction & Aesthetic Philosophy

* **Style:** Clinical Light-Tech & Minimalist 3D/Flat Glassmorphism (inspired by modern medical telemetry suites).
* **Atmosphere:** Calm, high-trust, breathable aerospace medical interface. Uses an icy light-blue canvas with crisp translucent white cards, soft ambient elevation shadows, fine hairline borders, and high-contrast semantic status pills.
* **Key Principles:**
  1. **Zero Visual Clutter:** Progressive disclosure — the dashboard remains clean until the daily check-up is submitted, or reveals details on hover/click.
  2. **Deterministic Status Clarity:** Color coding (`Green`, `Amber-Yellow`, `Coral-Red`, `Neutral Gray`) strictly reflects the deterministic output of `Rules Engine` (`src/rules/engine.ts`).
  3. **Tactile & Interactive Anatomy:** The central human body figure is **opaque** (solid stylized 3D-shaded flat vector/render) with an interactive layer switcher (`Skin`, `Muscles`, `Organs`) and floating callout pins linked to active indicators.

---

## 2. Color Tokens

### 2.1 Surfaces & Backgrounds
| Token | Hex / RGBA | Usage |
| :--- | :--- | :--- |
| `--bg-canvas` | `#EEF4FA` (radial gradient to `#F8FAFC`) | Main application window background |
| `--bg-surface` | `rgba(255, 255, 255, 0.86)` (`backdrop-filter: blur(16px)`) | Primary cards, panels, and floating callouts |
| `--bg-surface-solid` | `#FFFFFF` | Active inputs, dropdowns, modal dialogs |
| `--bg-surface-subtle` | `#F1F5F9` | Secondary containers, inactive tab pills, table headers |
| `--border-hairline` | `rgba(148, 163, 184, 0.24)` | Card borders and subtle dividers (`1px solid`) |

### 2.2 Brand & Interactive Accents
| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--accent-primary` | `#2563EB` | Primary CTA buttons, active navigation underline, active layer button |
| `--accent-primary-hover` | `#1D4ED8` | Primary button hover state |
| `--accent-soft` | `#EFF6FF` | Active pill background, selected metric highlight |
| `--accent-cyan` | `#0EA5E9` | Telemetry sparkline accents, anatomical highlight glow |

### 2.3 Typography Colors
| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--text-primary` | `#0F172A` | Headings, metric values, primary labels (contrast > 14:1) |
| `--text-secondary` | `#475569` | Subtitles, units, explanations, timestamps |
| `--text-muted` | `#94A3B8` | Placeholders, disabled controls, `no_data` labels |

### 2.4 Semantic Status Colors (Strictly Bound to `Rules Engine`)
| Status | Text / Icon Hex | Pill Background Hex | Border / Pin Glow Hex |
| :--- | :--- | :--- | :--- |
| **`green` (Normal / Optimal)** | `#15803D` | `#DCFCE7` | `#22C55E` |
| **`yellow` (Caution / Crew)** | `#B45309` | `#FEF3C7` | `#F59E0B` |
| **`red` (Critical / Earth)** | `#B91C1C` | `#FEE2E2` | `#EF4444` |
| **`no_data` (Unmeasured)** | `#475569` | `#F1F5F9` | `#CBD5E1` |

---

## 3. Typography & Spacing

* **Font Family:**
  * Primary UI: `'Inter', 'Overpass', -apple-system, BlinkMacSystemFont, sans-serif` (referenced via CSS; if bundled locally, use SIL OFL `Inter` or `Overpass` and log in `SOURCES.md`).
  * Numeric Telemetry: `font-variant-numeric: tabular-nums` on all vitals, dates, and sparkline values to prevent layout jitter.
* **Type Scale:**
  * **Page / Status Title:** `20px` / `600` (SemiBold), line-height `1.3`
  * **Card Title:** `15px` / `600` (SemiBold), line-height `1.4`
  * **Metric Hero Value:** `22px` / `700` (Bold), tabular-nums
  * **Body / Protocol Text:** `13.5px` / `400` (Regular), line-height `1.5`
  * **Micro / Badge / Unit:** `11.5px` / `500` (Medium), letter-spacing `+0.02em`
* **Layout & Radii:**
  * Outer window padding: `20px`
  * Grid gap between cards: `16px`
  * Card border radius: `18px`
  * Inner container / input radius: `12px`
  * Pill / status badge radius: `9999px`
  * Card shadow: `0 8px 24px -4px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)`

---

## 4. Persistent Top Navigation Bar (Header)

Displayed across all screens (`height: 64px`, transparent/glass bar):
1. **Left — Mission Context & Brand:**
   * Minimalist **MED-EVAC** emblem + Mission Day badge (`Day 40`) + Mission Date (`2026-11-21` / `YYYY-MM-DD`).
   * Offline autonomous badge (`OFFLINE READY` subtle indicator).
2. **Center — Primary Navigation Tabs (Pill / Underline Switcher):**
   * **`Main`** (`Главная` — Check-up & Health Summary Dashboard)
   * **`Comms`** (`Связь` — Local AI Assistant & Ground Operator Chat)
3. **Right — Astronaut Profile Avatar:**
   * Circular astronaut avatar (`38px × 38px`) with subtle blue ring (`#2563EB`) and crew member name/ID tooltip or popover (e.g., `Cmdr. Alex Vance · Mission Specialist`, preflight baseline summary).

---

## 5. Screen 1: Main (`Главная`) — Two-State Flow

The `Main` screen implements a progressive two-state layout so the astronaut completes their daily check-up before reviewing the full diagnostic summary (while allowing quick edits afterward).

### 5.1 State A: Pre-Checkup (Awaiting Daily Entry)
1. **Top Check-up Card (Full Width):**
   * **Left Column — Vitals Input List:**
     * Clean numeric inputs with inline units and real-time plausibility validation feedback (`plausible_min` / `plausible_max` from `rules.json`):
       * Blood Pressure (`bp_systolic` / `bp_diastolic` mmHg)
       * Heart Rate (`heart_rate` bpm)
       * Blood Glucose (`glucose` mg/dL)
       * Body Temperature (`body_temp` °C + segmented toggle `Rest` / `Exercise`)
       * Sleep Duration (`sleep_hours` h)
       * Subjective Mood (`mood` 0–10 slider/stepper)
       * Body Mass (`body_mass` kg)
       * Skin Symptom Score (`skin_symptom_score` 0–10)
       * Radiation (`radiation_dose_rate` µSv/h & `radiation_accumulated` mSv)
   * **Right Column — Symptoms, Tags & Free-Text Notes:**
     * **Quick Symptom Tags (42 Flags from `rules.json`):** Searchable/categorized compact multi-select pill tags (e.g., `Dizziness`, `Fainting`, `Face/Throat Swelling`, `Skin Rash`, `Fatigue`). Selected tags turn highlighted blue/amber and pass directly to `EvaluationInput.flags`.
     * **Free-Text Concern Box:** Textarea (`"Tell us if anything else is bothering you..."`). Any free-text notes not covered by structured tags are forwarded as context to the **Local AI Helper (Ollama)** for personalized explanation alongside triggered rules.
   * **Action Buttons (Bottom Right of Card):**
     * Primary Button: **`Submit Check-up`** (runs `Input validation` → `Storage` → `Rules Engine` and transitions smoothly to **State B**).
     * Secondary Button: **`Contact Earth`** (navigates directly to the `Comms` screen).
2. **Bottom Empty-State Placeholder Card:**
   * Centered calm card with subtle pulse icon and message: *"Waiting for your daily check-up to generate your health summary."* (Includes a discrete demo preset selector in the corner for hackathon judging: e.g., `Load Day-40 Demo`).

### 5.2 State B: Post-Checkup Health Dashboard
Once the check-up is submitted, the top form collapses into a compact confirmation banner, revealing the 3-column diagnostic workspace:

1. **Top Confirmation Banner:**
   * Full-width sleek pill banner: *"Thank you for taking care of yourself!"* with a secondary action button **`Edit Check-up`** (re-expands State A form if needed).
2. **Summary Status Row (Two Equal Cards):**
   * **Card 1 — Overall Status (`overall_status`):** Large semantic badge (`Green — Normal`, `Yellow — Attention Needed`, `Red — Critical Alert`).
   * **Card 2 — Escalation Level (`overall_escalation`):** Clear action directive (`Self-Care`, `Crew Medical Officer`, `Ground Flight Surgeon`) with dynamic accent border matching `overall_status`.
3. **3-Column Main Diagnostic Grid:**
   * **Left Column (~32% width) — Indicator Cards Stack:**
     * Vertical scrollable list of the 10 tracked indicators (`rules.json`).
     * Each card displays:
       * Indicator name & current measured value + unit (e.g., `Heart Rate · 84 bpm`).
       * Compact **7-day trend sparkline** (using `Recharts` or `Apache ECharts`) showing daily trajectory and baseline reference band.
       * Semantic status pill (`Green` / `Yellow` / `Red` / `No Data`) + `baseline_forming` subtle badge if applicable.
       * Clicking a card expands its triggered rule details: `title`, `explanation`, `actions` checklist, `recheck` timer, an `(i)` info icon revealing `Source: TABLE: ...`, and an **`Ask AI Helper`** button that opens `Comms` pre-loaded with that rule.
   * **Center Column (~48% width) — Opaque Interactive Human Body Figure:**
     * High-craft **opaque** anatomical figure centered on a subtle circular pedestal grid.
     * **Interactive Callout Pins:** Floating glass cards connected via thin leader lines to relevant body zones (similar to *Veridia* callouts — e.g., `Cardiac`, `Sleep / CNS`, `Skin`, `Immune`). Pins pulse softly in `Yellow` or `Red` when a rule triggers for that region; clicking a pin highlights and scrolls to the corresponding indicator card on the left.
   * **Right Column (~20% width) — Anatomical Layer Switcher (`Layers`):**
     * Vertical stack of 3 large, tactile toggle cards:
       1. **`Skin`** (highlights dermatological & radiation surface indicators)
       2. **`Muscles`** (highlights musculoskeletal, body mass, and physical strain indicators)
       3. **`Organs`** (highlights cardiovascular, metabolic/glucose, thermoregulation, sleep/CNS, and immune systems)
     * Switching layers updates the opaque body visual layer and filters/highlights the matching callout pins.

---

## 6. Screen 2: Comms (`Связь`) — Dual-Channel Communication & AI Chat

Accessible from the top navigation bar (`Comms`) or via `Contact Earth` / `Ask AI Helper` actions.

1. **Channel Switcher (Top Segmented Control):**
   * **`Local Neural Network (Ollama)`** — Active offline clinical reasoning assistant.
   * **`Ground Operator (Flight Surgeon)`** — Earth Mission Control link (`#TODO` stub).
2. **Mode A: Local Neural Network (`IBM Granite 3.3` via Ollama):**
   * **Context Header:** Displays active mission day (`Day 40`), current `overall_status`, and chips for triggered rules + any free-text notes entered during the daily check-up. Includes a clear badge: *"AI explains rules & NASA protocols; status levels are strictly determined by the deterministic Rules Engine."*
   * **Chat Stream:** Clean message bubbles (user messages in `--accent-soft` / `--accent-primary`; assistant responses in `--bg-surface-solid` with collapsible **`Clinical Reasoning`** accordion, structured protocol steps, and clickable `knowledge_base.json` source citations).
   * **Quick Prompt Chips:** Suggested 1-click questions above the input bar (e.g., *"Why is my heart rate yellow?"*, *"Explain today's self-care steps"*, *"Analyze my check-up notes"*).
   * **Input Composer:** Text input + `Send` button (`POST` to local backend / Ollama endpoint).
3. **Mode B: Ground Operator (`#TODO` Placeholder):**
   * Displays simulated orbital/deep-space telemetry uplink status (e.g., `Signal Delay: ~1.3s Lunar / Offline Store-and-Forward`) and a read-only preview of the emergency telemetry packet generated when `overall_status === "red"`.
   * **Message Composer (`#TODO`):** Input box and `Send to Ground` button marked as `#TODO` in code — submitting displays a clean non-blocking status toast/banner (*"Ground uplink transmission is queued for future implementation [#TODO]. Use Local Neural Network for immediate autonomous guidance."*).

---

## 7. Responsive & Desktop Window Constraints

* **Target Resolution:** Optimized for Tauri desktop window (`1280 × 800` minimum, fluid scaling up to `1920 × 1080` and `2560 × 1440`).
* **Motion & Transitions:** Subtle, purposeful transitions (`150ms–250ms ease-out` via `Motion` / CSS transitions) for state collapse (Pre-Checkup → Post-Checkup), layer switching (`Skin` / `Muscles` / `Organs`), and callout pin focus. Avoid heavy continuous GPU animations to preserve battery in offline spaceflight scenarios.