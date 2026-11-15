# DESIGN.md — Design System & UI/UX Specification (ORBITA)

> **Version:** 3.0 · 15 Nov 2026 — "Orbit Control" look; earlier: 2.3 — dark space theme, layered 2D body map (`FEATURES/body-map.md`), Recharts sparklines, Motion animations, daily radiation check + animated radiation alert.
>
> **Scope:** Visual design system, color tokens, typography, layout architecture, and screen specifications for **ORBITA** (*Onboard Remote Biometric & Integrated Telemetry Assistant*) (NASA Space Apps Challenge 2026, ORBITA project team). All UI text rendered in the application must be in **English** per `RULES.md`.

---

## 1. Visual Direction & Aesthetic Philosophy

* **Style (v3.0, "Orbit Control"):** Mission-Control precision — teal/amber/coral status colours, monospace technical labels, corner brackets on alerts, a faint grid — combined with Deep-Orbit depth — deep navy (never pure black), blue nebula glows, soft gradients and glowing illustrations. Dark theme only.
* **Atmosphere:** calm, expensive, technical. A fixed animated space backdrop (`SpaceBackdrop`) sits behind every screen: faint teal grid fading to the edges, drifting blue/violet/teal nebulae, ~110 twinkling stars, a slowly turning orbit with a satellite and six shooting stars in different parts of the sky (own position, direction, length, 11–23 s period and start delay). Pure SVG/CSS, no images.
* **Key Principles:**
  1. **Readable first:** 16 px base text, 20–28 px titles, large numbers; nothing below 11 px.
  2. **Deterministic Status Clarity:** colours (`green`, `yellow`, `red`, `no_data`) only reflect the `Rules Engine`; the UI never computes, softens or recomputes a status.
  3. **Never colour-only:** every status also shows a word (`OK` / `Watch` / `Alert` / `No data` / `Monitoring`) and an icon (`✓` / `!` / `!!` / `–` / `◌`).
  4. **Big, meaningful motion:** each alert has its own large animated illustration; every animation stops with `prefers-reduced-motion`.
  5. **Fully offline:** fonts bundled locally, no CDN, no remote images.

---

## 2. Color Tokens

Source of truth: `src/styles/theme.css` (CSS variables, applied app-wide, imported last in `src/main.tsx`). Change colours there, not in component CSS.

### 2.1 Core Palette
| Token | Value | Usage |
| :--- | :--- | :--- |
| `--bg` | `#060B18` | App background under the space backdrop |
| `--surface` | `rgba(12,20,40,.86)` (+ 6 px backdrop blur) | Cards, panels, header |
| `--surface-solid` | `#0C1428` | Opaque surfaces (inputs, menus) |
| `--surface-2` | `#13203C` | Secondary containers, active tabs, tooltips |
| `--border` / `--border-strong` | `rgba(120,160,255,.16)` / `.32` | 1 px hairlines |
| `--text` / `--text-muted` | `#E8EFFF` / `#98A8C8` | Primary / secondary text |
| `--accent` | `#7FA8FF` (blue) | Primary buttons (dark text on it), active nav, links, focus rings, dose meter |
| `--accent-2` | `#4FE3D0` (teal) | Technical highlights: grid, satellite, gate tag |
| `--shadow-card` | `0 24px 60px -32px rgba(60,100,255,.35)` | Soft blue lift under cards |

### 2.2 Semantic Status Colours (strictly bound to the `Rules Engine`)
| Status | Token | Hex | Word · Icon |
| :--- | :--- | :--- | :--- |
| `green` | `--status-green` | `#3FE0B0` | `OK` · `✓` |
| `yellow` | `--status-yellow` | `#FFB84D` | `Watch` · `!` |
| `red` | `--status-red` | `#FF5C6C` | `Alert` · `!!` |
| `no_data` | `--status-none` | `#63739A` | `No data` · `–` |
| monitoring-only | `--text-muted` + dashed outline | `#98A8C8` | `Monitoring` · `◌` |

Status pill backgrounds use the status colour at 12–14 % opacity.

### 2.3 Legacy Token Mapping
The older tokens used across `App.css` / `Dashboard.css` / `LoginScreen.css` (`--bg-canvas`, `--bg-surface`, `--bg-surface-subtle`, `--border-hairline`, `--accent-primary`, `--accent-soft`, `--text-primary`, `--text-secondary`, `--status-*-bg`, `--status-*-border`, `--radius-card`, …) are kept and **remapped** in `theme.css` onto the palette above. New code should use the new tokens directly.

---

## 3. Typography & Spacing

* **Fonts (bundled, SIL OFL 1.1, `@fontsource`):** `Inter` for body (`--font-sans`), `Space Grotesk` for headings, values and large numbers (`--font-display`), `JetBrains Mono` for technical labels — section eyebrows, status words, mission day/date (`--font-mono`).
* **Scale:** base 16 px. All legacy sizes were scaled once (9→12, 10→13, 11→14, 12→15, 13→16, 14→17, 15→18, 16→19, 17→21, 20→24, 22→28, 25→32 px). New components use `--fs-lg` 20 / `--fs-md` 16 / `--fs-sm` 13 px; alert titles 26 px; login brand 52 px.
* **Spacing & radii:** 8 px scale; card radius 18 px (`--radius`), controls 12 px, pills 9999 px; grid gaps 20 px.

---

## 4. Persistent Top Navigation Bar (Header)

* Comms channel emblems (Onboard SI, Earth Mission Control) are 84 px tiles with a teal glow, so the Earth and AI icons read on their own.
* Login (Mission Access Gate): centred 52 px `ORBITA` wordmark (Space Grotesk, white→blue gradient), tagline, teal mono gate tag, and a large planet with a glowing atmosphere rising behind the card.


Displayed across all screens after login (`height: 64px`, `--surface` card, compact):
1. **Left — Brand & Mission Context:** 36 px ORBITA logo, `Day 40`, muted `·` separator, live local date (`YYYY-MM-DD`).
2. **Center — Primary Navigation Tabs:** flat `Main` · `Comms` tabs (hidden for Ground Operator).
3. **Right — Profile Switcher:** crew SVG avatar, name and role; dropdown with saved accounts, add account, forget account, log out (see `FEATURES/login.md`).
* The `SYNTHETIC DATA` badge is shown on the daily check-up card (not in the header since the header-polish task).

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
       * **Radiation telemetry** — the last measurement group of the check-up (team layout, 15 Nov 2026): a one-line hint *"Read your personal dosimeter every day. The rules check the dose rate, your total dose and any radiation event you mark here."*, the `radiation_dose_rate` (µSv/h) and `radiation_accumulated` (mSv) fields in a highlighted strip, and the three radiation event toggles from `rules.json` (`spe_warning`, `dosimeter_unexpected_high`, `acute_radiation_event`) styled as quick-pick chips (selected = yellow). The same flags remain available in the Symptoms & Clinical Notes composer.
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
2. **Health Alerts (`HealthAlerts`, only when the engine reports any indicator yellow or red):**
   * The most serious alert (red before yellow, then the engine's indicator order) is one **large card**: corner brackets and border in the status colour, a soft status wash from the left; left column (max 68ch): eyebrow `!! ALERT · <INDICATOR>` / `! WATCH · <INDICATOR>` (mono), then for every triggered rule its `title` (26 px), `explanation`, `actions`, `recheck` — straight from `rules.json`; reported flags; escalation text; buttons `Show on body map` and, for red, `Contact Earth`.
   * Right column: a **300 px animated illustration** for that indicator (`AlertArt`): breathing halo, three expanding rings (faster for red), a slowly turning dashed orbit, a 150 px glowing disc with the indicator's icon and its own motion — heart beats + ECG line (heart rate), gauge sways + ECG (blood pressure), droplet drips (glucose), thermometer rises (temperature), moon floats with stars and "z z" (sleep), face floats (mood), scale sways (body mass), shield pulses (immune), hand pulses (skin), radiation trefoil spins (radiation).
   * Every other alert is a **compact row** below: icon tile, indicator name, first rule title, `! WATCH` / `!! ALERT`; clicking selects it on the body map.
3. **Summary Status Row (Two Equal Cards):** (20 px gap)
   * **Card 1 — Overall Status (`overall_status`):** Large semantic badge (`Green — Normal`, `Yellow — Attention Needed`, `Red — Critical Alert`).
   * **Card 2 — Escalation Level (`overall_escalation`):** Clear action directive (`Self-Care`, `Crew Medical Officer`, `Ground Flight Surgeon`) with dynamic accent border matching `overall_status`.
4. **2-Column Main Diagnostic Grid (two equal columns, 20 px gap):**
   * **Left Column (50 %) — Indicator Cards Stack:** the list fills exactly the height of the body map and scrolls inside, so both columns end on the same line.
     * Vertical scrollable list of the 10 tracked indicators (`rules.json`).
     * Each card displays:
       * A 36 px icon tile in the status colour (`indicatorIcons.tsx`), indicator name, current value + unit (e.g., `Heart rate · 80 bpm`).
       * **7-day trend sparkline (Recharts `AreaChart`, 76 px plot + date row):** one smooth 2.5 px line in the indicator's status colour with a soft glow under it, a gradient "volume" fill (≈32 % → 0 %), and a haloed end dot for today (halo breathes slowly; off with reduced motion). The y-scale fits the data with a minimum span of 10 % of the level, so day-to-day noise is not drawn as a dramatic swing. Only one reference is drawn: "your normal" as a solid faint 1 px hairline, named in the row under the chart (`Nov 8 · — your normal 62 bpm · Today`). **No threshold or dashed lines in the background** — `getReferenceLines()` still returns them, but the sparkline does not draw them; the status badge and rule details carry the thresholds. Hover → crosshair + tooltip (date, value, unit). Line draws in over 1.1 s.
       * **Radiation card only — Dose budget meter** (`DoseBudgetMeter`, display only, never changes a colour): `72 / 600 mSv · 12%` header; a 10 px rounded meter on a 600 mSv scale (NASA-STD-3001 Rev. C career limit) with the accent fill for today's accumulated dose and a hatched lighter extension for the projection at Mars arrival (day 180, at the current mSv/day rate); yellow and red ticks at the enabled `rules.json` thresholds (480 / 600 mSv); rows: Today, At Mars arrival (≈ mSv · %), Rule thresholds, Current rate; a one-line source note.
       * Semantic status pill (`Green` / `Yellow` / `Red` / `No Data`) + `baseline_forming` subtle badge if applicable.
       * Clicking a card expands its triggered rule details: `title`, `explanation`, `actions` checklist, `recheck` timer, an `(i)` info icon revealing `Source: TABLE: ...`, and an **`Ask AI Helper`** button that opens `Comms` pre-loaded with that rule.
   * **Right Column (50 %, sticky) — Layered 2D Body Map (`BodyMap`, full spec in `FEATURES/body-map.md`):**
     * Header: small `BODY MAP` label, caption `Check-up · YYYY-MM-DD` (or `No check-up yet today`), and the **layer tabs `Skin · Muscles · Organs · Skeleton`** (default `Organs`). Each tab shows a badge with the worst zone status on that layer (icon + word), so a red status on a hidden layer is never invisible.
     * Stylised **coloured vector anatomy** (`AnatomyArt.tsx`, SVG viewBox `0 0 400 800`): skin (blue-lit body with rim light), muscles (coral muscle groups), organs (pink brain, blue lungs, red heart, liver, stomach, violet spleen, orange pancreas, kidneys, intestines, red/blue vessels, teal lymph nodes), skeleton (ivory bones). Optional art files in `src/assets/body/` still override a layer. Layers cross-fade in `200ms`.
     * **Zones (hotspots, placed on the organ itself):** brain → sleep & mood; heart → heart rate & blood pressure; pancreas → glucose; spleen → immune (Organs layer); forearm skin → skin & temperature; whole-body aura → radiation (Skin layer); thigh muscles → body mass (Muscles layer); pelvis → body mass (Skeleton layer). Positions live in `src/components/BodyMap/zones.ts` and can be moved without touching code.
     * Hotspot = status-coloured circle with icon. Yellow pulses slowly (2.5 s), red faster (1.2 s), green static, `no_data` dim, monitoring-only = neutral dashed outline. The radiation aura additionally sends out expanding waves when yellow/red.
     * The radiation zone carries a note: *"Read your dosimeter at every check-up. Alerts come from radiation events you report and from the dose-rate and total-dose limits in the rules."*
     * Hover/focus → tooltip (label, status word, hazard line). Click / Enter / Space → selects the zone (white 2 px ring) and highlights + scrolls to the matching indicator card on the left.
     * Below the figure: a list of **all 7 zones** with status word, so every zone is reachable without switching layers.

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

* **Target Resolution:** Optimized for Tauri desktop window (`1280 × 800` minimum, fluid scaling up to `1920 × 1080` and `2560 × 1440`). Also runs in a normal browser via `npm run dev`.
* **Motion & Transitions:** `motion` (Motion for React) for screen-level animation, CSS for small loops:
  * check-up form ↔ "Thank you" bar: cross-fade + 12 px slide (250 ms), check mark springs in;
  * summary row and dashboard grid fade up (300–350 ms), indicator cards appear one after another (50 ms stagger);
  * radiation alert: spring entrance, expanding rings, rotating trefoil; body-map layer cross-fade (200 ms, CSS), hotspot pulse and aura waves (CSS).
  * `<MotionConfig reducedMotion="user">` wraps the app; looping animations are skipped and CSS animations disabled when `prefers-reduced-motion: reduce`.
* **Accessibility:** hotspots are `role="button"`, `tabIndex=0`, with `aria-label` like `Heart: Watch — tell your crew medical officer`; layer tabs and zone list are keyboard-reachable buttons; visible focus rings in `--accent`.
* **Branding & Assets:** no NASA logo or NASA branding in art or UI (Space Apps branding only). Images must be own drawings or CC0 / CC-BY and logged in `SOURCE.md`; AI-generated images need a visible "AI-generated illustration" note in About/Credits.
