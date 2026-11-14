# API_CONTRACT.md — Internal Module Contracts & Local HTTP APIs (MED-EVAC)

> **Scope:** Single source of truth for all TypeScript data structures, module interfaces, static JSON schemas, and local Ollama HTTP endpoints across `MED-EVAC`. All frontend components and domain modules must strictly adhere to these contracts without redefining types.

---

## 1. End-to-End Data Flow Pipeline

```text
CheckupForm (UI)
  │ RawEntry[] + string[] (flags) + freeTextNote
  ▼
InputCheck (`src/features/input-check/inputCheck.ts`) ──[allOk === false]──► Inline UI Field Errors (Block Save)
  │ CheckupCheck { allOk: true, readings: Reading[] }
  ▼
HistoryStore (`src/features/synthetic-data/historyStore.ts`) ◄── MissionClock (`getToday() -> "2026-11-14"`)
  │ getPreflight(), getReadings(), getFlags(today)
  ▼
PersonalBaseline (`src/features/personal-baseline/baseline.ts`)
  │ Record<metric_id, Baseline> + Deviation + ReferenceLine[]
  ▼
RulesEngine (`src/rules/engine.ts`) ◄── `src/data/rules.json`
  │ EvaluationResult (deterministic statuses, triggered rules, escalation)
  ├──► UI Dashboard (`Main` view: Status cards, Sparklines, 3D SVG Body Map)
  ├──► AIHelper (`src/features/ai-helper/`) ──HTTP──► Ollama `http://127.0.0.1:11434` (`granite3.3:8b`)
  └──► EarthLink (`src/features/earth-link/`) ──► `Comms` Ground Operator Channel
```

---

## 2. Core Domain Types (`src/rules/types.ts`)

All modules MUST import these base types from `src/rules/types.ts`. Never duplicate or redefine them.

```ts
export type Level = "green" | "yellow" | "red";
export type Status = Level | "no_data";
export type Escalation = "self" | "crew_medical_officer" | "ground_flight_surgeon";
export type Op = "<" | "<=" | ">" | ">=";
export type MeasurementContext = "rest" | "exercise";

export interface Reading {
  date: string;                 // Local mission date "YYYY-MM-DD"
  metric: string;               // Metric ID from rules.json (see §2.1)
  value: number;                // Finite number in the metric's canonical unit
  context?: MeasurementContext; // Default "rest"; only "body_temp" uses "exercise" in v1
  valid: boolean;               // Must be true when stored in HistoryStore
}

export interface Baseline {
  preflight_mean: number | null;
  preflight_sd: number | null;
  rolling_mean: number | null;   // Mean of previous N days (today EXCLUDED)
  rolling_sd: number | null;
  rolling_n: number;
}

export interface EvaluationInput {
  today: string;
  readings: Reading[];
  flags: string[];
  baselines: Record<string, Baseline>;
  rules: RulesFile;
}

export interface TriggeredRule {
  rule_id: string;
  level: "yellow" | "red";
  source: string;
  title: string;
  explanation: string;
  actions: string[];
  recheck: string;
  observed?: {
    metric?: string;
    value?: number;
    baseline?: number;
    delta?: number;
    flags?: string[];
  };
}

export type SkipReason =
  | "rule_disabled"
  | "no_reading_today"
  | "no_baseline"
  | "insufficient_history"
  | "missing_flags";

export interface SkippedRule {
  rule_id: string;
  reason: SkipReason;
}

export interface IndicatorResult {
  indicator_id: string;
  status: Status;
  escalation: Escalation | null;
  triggered: TriggeredRule[];
  skipped: SkippedRule[];
  baseline_forming: boolean;
}

export interface EvaluationResult {
  today: string;
  overall_status: Status;
  overall_escalation: Escalation | null;
  indicators: IndicatorResult[];
  rules_version: string;
}
```

### 2.1 Canonical Metric IDs & Units (`rules.json`)

| Metric ID | Unit | Indicator ID | Plausible Range (v1.1) |
| :--- | :--- | :--- | :--- |
| `bp_systolic` | `mmHg` | `blood_pressure` | `40` – `300` (must be `> bp_diastolic`) |
| `bp_diastolic` | `mmHg` | `blood_pressure` | `20` – `200` (must be `< bp_systolic`) |
| `heart_rate` | `bpm` | `heart_rate` | `20` – `250` |
| `glucose` | `mg/dL` | `blood_sugar` | `0` – `600` |
| `body_temp` | `°C` | `body_temperature` | `25` – `45` |
| `sleep_hours` | `h` | `sleep_hours` | `0` – `24` |
| `mood` | `0–10` | `mood` | `0` – `10` |
| `body_mass` | `kg` | `body_mass` | `0` – `null` |
| `skin_symptom_score` | `0–10` | `skin_health` | `0` – `10` |
| `radiation_dose_rate` | `µSv/h` | `radiation_dose` | `0` – `null` |
| `radiation_accumulated` | `mSv` | `radiation_dose` | `0` – `100` |

*(Note: `immune_signs` has no numeric metric; it is evaluated exclusively via symptom flags.)*

---

## 3. Feature Module Contracts

### 3.1 Input Validation (`src/features/input-check/inputCheck.ts`)

* **Rule:** If `allOk === false`, the UI **MUST** disable submission and **NEVER** write invalid readings (`valid: false`) to `HistoryStore`.

```ts
export interface RawEntry {
  metric: string;
  raw: string | number;
  context?: MeasurementContext; // default "rest"
}

export type CheckErrorCode =
  | "empty" | "not_a_number" | "out_of_range" | "bp_order" | "unknown_metric";

export type CheckResult =
  | { ok: true; metric: string; reading: Reading }
  | { ok: false; metric: string; code: CheckErrorCode; message: string;
      raw: string; range?: { min: number | null; max: number | null; unit: string } };

export interface CheckupCheck {
  results: CheckResult[];
  skipped: string[];
  readings: Reading[]; // Populated ONLY when allOk === true, otherwise []
  allOk: boolean;
}

export function checkEntry(entry: RawEntry, date: string, rules: RulesFile): CheckResult;
export function checkCheckup(entries: RawEntry[], date: string, rules: RulesFile): CheckupCheck;
```

### 3.2 Synthetic Data, Store & Mission Clock (`src/features/synthetic-data/`)

* **In-Memory Store (`historyStore.ts`):** Seeded at startup from bundled `src/data/synthetic_history.json` (7 preflight days + mission days 1–39; Day 40 `2026-11-14` is entered live during demo unless `{ includeDay40: true }` is passed in tests).

```ts
export interface HistoryStore {
  getPreflight(): Reading[];
  getReadings(): Reading[];
  getReadingsByMetric(metric: string): Reading[];
  addReadings(readings: Reading[]): void; // Throws if any reading.valid !== true
  getFlags(date: string): string[];
  setFlags(date: string, flags: string[]): void;
  hasCheckup(date: string): boolean;
  subscribe(listener: () => void): () => void;
  reset(): void;
}
```

* **Mission Clock (`missionClock.ts`):** Fixed UTC date arithmetic; never uses system clock.
  * `MISSION_DAY1 = "2026-10-06"`, `DEMO_DAY = 40`, `getToday() === "2026-11-14"`.

### 3.3 Personal Baseline & Chart Reference Lines (`src/features/personal-baseline/baseline.ts`)

```ts
export interface BaselineInput {
  today: string;
  preflight: Reading[];
  history: Reading[];
  rules: RulesFile;
}

export interface Deviation {
  metric: string;
  source: "preflight" | "rolling";
  mean: number | null;
  value: number;
  delta_abs: number | null;
  delta_percent: number | null;
}

export interface ReferenceLine {
  value: number;
  kind: "baseline" | "threshold" | "baseline_delta" | "window_average";
  level: Level;
  rule_id: string | null;
  label: string;
}

export function computeBaselines(input: BaselineInput): Record<string, Baseline>;
export function describeDeviation(metric: string, value: number, baseline: Baseline | undefined, rules: RulesFile): Deviation;
export function getReferenceLines(metric: string, baselines: Record<string, Baseline>, rules: RulesFile): ReferenceLine[];
```

### 3.4 Rules Engine (`src/rules/`)

* `loadRules(json: unknown): RulesFile` — validates `src/data/rules.json` at startup, throwing `RulesFileError` on invalid schema, duplicate IDs, unknown metrics/flags, or `null` thresholds on enabled rules.
* `evaluate(input: EvaluationInput): EvaluationResult` — pure, deterministic function.

### 3.5 AI Helper (`src/features/ai-helper/`)

* **Layer 1 (Deterministic Matcher — `combinations.ts`):** Matches `EvaluationResult` and `flagsToday` against `src/data/combinations.json`.
* **Layer 2 (Deterministic Safety Filter — `safety.ts`):** Scans free-text input before any LLM call; if self-harm phrases match, blocks the LLM call and renders the `mood_r_flags` support card.
* **Layer 3 (Local LLM Client — `ollama.ts`):** Communicates directly with local Ollama over HTTP (`127.0.0.1:11434`). Model is strictly **`granite3.3:8b`**.

```ts
export interface HelperSettings {
  ollama_url: "http://127.0.0.1:11434";
  model: "granite3.3:8b";
  timeout_ms: 60000;
  temperature: 0.2;
  max_user_chars: 1000;
  max_turns_sent: 10;
}

export type LlmResult =
  | { status: "ok"; text: string }
  | { status: "unavailable" }
  | { status: "model_missing" }
  | { status: "timeout" }
  | { status: "error"; detail: string };
```

### 3.6 Earth Link & Ground Operator Channel (`src/features/earth-link/` & `Comms` View)

* **Role Architecture (`FRONTEND.md`):** Switching the top-right profile avatar to `Ground Operator` (or running a second app instance in `Ground Operator` mode) displays the `Comms` view in Ground Operator console mode.
* **Message Contract (`message.ts`):**

```ts
export const EARTH_LINK = {
  one_way_delay_minutes: 20, // Simulated delay
  demo_time_scale: 60,       // 1 simulated min = 1 real sec (20s transit)
  note_max_chars: 500,
} as const;

export type MessageKind = "medical" | "private_behavioral";
export type MessageState = "draft" | "in_transit" | "acknowledged";
```

* **Transport & Sync (`#TODO`):**
  * `buildDraft()`, `validateNote()`, `send()`, and `viewMessage()` provide deterministic delayed telemetry packaging (`EarthMessage`) with zero leakage of AI chat history or free-text check-up notes (only explicit `astronaut_note` ≤ 500 chars is included).
  * Cross-instance / live Ground Operator reply sync is marked `#TODO` in MVP (`createInMemoryTransport()` used within the single app session; Tauri multi-instance sync deferred).

---

## 4. Local HTTP API Contract (Ollama Runtime)

All requests target `http://127.0.0.1:11434` (requires `connect-src 'self' http://127.0.0.1:11434` in `tauri.conf.json` CSP).

### 4.1 Model Availability Check

* **Request:** `GET http://127.0.0.1:11434/api/tags`
* **Response (`200 OK`):**

```json
{
  "models": [
    { "name": "granite3.3:8b", "model": "granite3.3:8b" }
  ]
}
```

* **Handling:** If fetch fails $\rightarrow$ `unavailable`. If `"granite3.3:8b"` is not in `models[].name` $\rightarrow$ `model_missing`.

### 4.2 Chat & Explanation Inference

* **Request:** `POST http://127.0.0.1:11434/api/chat`
* **Headers:** `Content-Type: application/json`
* **Body:**

```json
{
  "model": "granite3.3:8b",
  "stream": false,
  "options": {
    "temperature": 0.2
  },
  "messages": [
    { "role": "system", "content": "<verbatim system prompt from prompt.ts>" },
    { "role": "user", "content": "CONTEXT: <serialized EvaluationResult + MatchedCombinations + unmatched free-text>" },
    { "role": "user", "content": "Explain today's picture to me in plain words." }
  ]
}
```

* **Response (`200 OK`):**

```json
{
  "model": "granite3.3:8b",
  "message": {
    "role": "assistant",
    "content": "Your heart rate is 18 bpm above your preflight baseline..."
  },
  "done": true
}
```

* **Error Handling:** Abort after `60000 ms` (`timeout`). Non-2xx status $\rightarrow$ `error` with HTTP code. On any failure, UI gracefully falls back to Layer 1 (deterministic matched combinations).