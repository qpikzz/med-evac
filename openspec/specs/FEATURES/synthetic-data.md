# SPEC: Synthetic data, history store & mission clock  ·  v1.0  ·  14 Nov 2026, 17:05 (Baku)

## 0\. Простыми словами (на русском)

У нас нет и не должно быть реальных медицинских данных, поэтому мы создаём одного вымышленного астронавта и его 40 дней полёта к Марсу. Данные лежат в одном файле `synthetic_history.json` с крупной пометкой SYNTHETIC. Чтобы не было «случайных» сюрпризов, файл строит маленький скрипт по фиксированным повторяющимся узорам, без генератора случайных чисел: при каждом запуске получается одно и то же.

Сюжет:

- дни 1–33 спокойные и зелёные;  
- с 34-го дня сон проседает;  
- на 39-й и 40-й день пульс поднимается до 76 и 80 при личной норме 62\.

Это ровно история 40-го дня из брифа. День 40 в историю не записан: его вводят вживую на демо. Сначала вводят 920 (ошибка), потом 80\.

Здесь же описаны две вещи, без которых всё не стыкуется:

- **«хранилище»** — простая память приложения, куда загружается файл и добавляются новые измерения, без базы данных;  
- **«часы миссии»** — в приложении всегда день 40 \= 14 ноября 2026, а день 1 \= 6 октября.

Числа в файле — иллюстрация, а не медицинские пороги \[BRIEF §4\]. Ayesha проверяет, что они правдоподобны.

## 1\. Goal

Provide one deterministic, clearly labelled synthetic dataset (7 preflight days \+ mission days 1–39 \+ a scripted day-40 check-up) for one fictional astronaut, an in-memory `HistoryStore` that the app reads and writes, and a mission clock that fixes "today".

## 2\. Context

```
scripts/generate-synthetic.mjs ──writes──► src/data/synthetic_history.json (committed)
                                                   │ import at build time
                                                   ▼
          missionClock.getToday() ──► HistoryStore (in memory) ◄── Input check (addReadings)
                                                   │
                       Personal baseline ◄─────────┼─────────► Rules engine, Chart, Earth link
```

Contract constraints from the rules engine \[rules-engine §4, A9; Context from Lana 16:08\]:

- each measurement is a `Reading` (`src/rules/types.ts`); metric ids exactly as in rules-engine §4.3;  
- preflight means required at least for `heart_rate`, `bp_systolic`, `bp_diastolic`, `mood`, `body_mass`;  
- day 39 and day 40 heart rate ≥ 12 bpm above preflight mean, inside 60–100; preflight HR ≥ 60;  
- sleep 7-day average on day 40 \< 7 h;  
- one JSON file, labelled SYNTHETIC, local, no network.

## 3\. User scenarios

**S1 — App start.** The app imports the JSON, builds the store with days 1–39, sets today \= mission day 40 (2026-11-14). The chart already shows 39 days. A small badge "Synthetic data" is visible on the main screen.

**S2 — Day-40 demo.** The presenter enters the values from `day40_checkup` (first the `demo_invalid_entry` 920, rejected by input check, then 80). After saving, heart and sleep turn yellow \[BRIEF §4, steps 1–4\].

**S3 — Tests / skip demo.** `createHistoryStore(data, { includeDay40: true })` loads day 40 too, so the full story can be evaluated without typing.

## 4\. Data contract

### 4.1 File `src/data/synthetic_history.json`

```ts
import type { Reading } from "../rules/types";

export interface SyntheticDataset {
  synthetic: true;                         // MUST be literally true
  label: string;                           // "SYNTHETIC DATA - fictional astronaut. Not real medical data."
  schema_version: "1.0";
  generator: "scripts/generate-synthetic.mjs";
  astronaut: { id: "SYN-01"; display_name: "Astronaut A (synthetic)" };
  mission: {
    name: "Mars transit (synthetic)";
    day1_date: "2026-10-06";
    demo_day: 40;
  };
  preflight: { readings: Reading[] };      // 7 days: 2026-09-22 .. 2026-09-28
  history: {
    readings: Reading[];                   // mission days 1..39 (2026-10-06 .. 2026-11-13)
    flags_by_date: Record<string, string[]>; // every date 1..39 present, value [] in v1
  };
  day40_checkup: {
    date: "2026-11-14";
    readings: Reading[];                   // the values the presenter types
    flags: string[];                       // [] in v1
    demo_invalid_entry: { metric: "heart_rate"; raw: "920" };
  };
}
```

All readings: `context: "rest"`, `valid: true`. Readings sorted by date, then by metric order: `heart_rate, bp_systolic, bp_diastolic, glucose, body_temp, sleep_hours, mood, body_mass, skin_symptom_score`. Radiation metrics are **not** generated (OPEN QUESTION Q-RAD in rules-engine; their rules are disabled).

### 4.2 Values (exact, no randomness)

**Preflight (7 days, 2026-09-22..28), only these 5 metrics:**

| metric | 7 values in date order | mean |
| :---- | :---- | :---- |
| heart\_rate | 62, 63, 61, 62, 63, 61, 62 | 62 |
| bp\_systolic | 115, 117, 113, 115, 116, 114, 115 | 115 |
| bp\_diastolic | 75, 76, 74, 75, 77, 73, 75 | 75 |
| mood | 8, 8, 7, 8, 8, 7, 8 | 7.714 |
| body\_mass | 70.0, 70.2, 69.8, 70.0, 70.1, 69.9, 70.0 | 70.0 |

**Mission day d (1..40): value \= `pattern[(d − 1) % 7]` unless an override exists.**

| metric | pattern (7 values) | overrides |
| :---- | :---- | :---- |
| heart\_rate | 63, 64, 62, 63, 64, 62, 63 | d39 \= 76, d40 \= 80 |
| bp\_systolic | 116, 118, 114, 116, 117, 115, 116 | — |
| bp\_diastolic | 76, 77, 75, 76, 78, 74, 76 | — |
| glucose | 92, 95, 90, 94, 97, 91, 93 | — |
| body\_temp | 36.8, 36.9, 36.7, 36.8, 37.0, 36.8, 36.9 | — |
| sleep\_hours | 7.5, 7.0, 8.0, 7.5, 7.5, 7.0, 8.0 | d34 \= 7.0, d35 \= 6.5, d36 \= 6.5, d37 \= 7.0, d38 \= 6.5, d39 \= 6.0, d40 \= 6.5 |
| mood | 8, 7, 7, 8, 7, 7, 8 | d37–d40 \= 6 |
| skin\_symptom\_score | 1, 0, 1, 1, 0, 1, 0 | — |
| body\_mass | formula: `(700 − Math.floor((d − 1) / 4)) / 10` → 70.0 on d1, 69.1 on d40 | — |

Days 1–39 go to `history`; day 40 goes to `day40_checkup` (same rule). Day 40 therefore \= heart\_rate 80, bp 117/78, glucose 97, body\_temp 37.0, sleep 6.5, mood 6, body\_mass 69.1, skin 0\.

**Why these numbers (checked against shipped `rules.json`):**

- heart: preflight 62 ≥ 60 (Q-HR-LOW); in-flight 62–64 (\|Δ\| ≤ 2); d39 76 (Δ 14), d40 80 (Δ 18), both in 60–100 → `hr_y_baseline` fires only on day 40 (persistence 2\) \[Context 6\].  
- sleep 7-day average: d37 7.14 (green), d38 6.93, d39 6.71, d40 6.57 → yellow from day 38; never 7 nights ≤ 6 → no `sleep_r_streak` \[Context 6\].  
- mood 6 vs preflight 7.714 → drop 1.71 \< 2 → stays green (a lower mood is visible on the chart, but no false alarm).  
- BP 114–118 / 74–78 → inside 90–130 / 60–80, \|Δ\| ≤ 3 vs preflight.  
- body mass d40 69.1 → −1.29 % (\< 2 %), green; a slow downward trend is visible on the chart.  
- body temp rolling mean at day 40 ≈ 36.84, today 37.0 → Δ 0.16 (\< 1 °C), green; above 36.0.  
- glucose 90–97 (inside 70–180); skin 0–1 (\< 4).

### 4.3 History store (`src/features/synthetic-data/historyStore.ts`)

In memory only. No database in MVP \[ANSWER: Lana, Q1\]. Data is lost on app restart; it is re-seeded from the JSON.

```ts
export interface HistoryStore {
  getPreflight(): Reading[];                       // copy
  getReadings(): Reading[];                        // copy, sorted by date asc (stable)
  getReadingsByMetric(metric: string): Reading[];  // copy, sorted by date asc
  addReadings(readings: Reading[]): void;          // appends; throws Error if any reading has valid !== true
  getFlags(date: string): string[];                // [] if none
  setFlags(date: string, flags: string[]): void;   // replaces that date's flags; removes duplicates
  hasCheckup(date: string): boolean;               // true if ≥1 reading on that date OR setFlags was called for it
  subscribe(listener: () => void): () => void;     // called after every change; returns unsubscribe
  reset(): void;                                   // back to the seed state
}

export function loadSyntheticDataset(json: unknown): SyntheticDataset; // throws SyntheticDataError
export function createHistoryStore(data: SyntheticDataset, opts?: { includeDay40?: boolean }): HistoryStore;
```

- `loadSyntheticDataset` throws `SyntheticDataError` if `synthetic !== true`, `schema_version !== "1.0"`, or any reading lacks `date`/`metric`/finite `value`/`valid`.  
- `includeDay40: true` adds `day40_checkup.readings` and `setFlags("2026-11-14", day40_checkup.flags)`.  
- Duplicate readings for the same date/metric are allowed; consumers apply "last wins" \[rules-engine §5.2\].  
- One shared store instance per window, exported from `src/features/synthetic-data/index.ts` as `historyStore`. (The Earth window does not use it; see specs/earth-link.md.)

### 4.4 Mission clock (`src/features/synthetic-data/missionClock.ts`)

```ts
export const MISSION_DAY1 = "2026-10-06";
export const DEMO_DAY = 40;
export function missionDateForDay(day: number): string;  // 1 → "2026-10-06", 40 → "2026-11-14"
export function missionDayForDate(date: string): number; // inverse
export function getToday(): string;                      // v1: missionDateForDay(DEMO_DAY)
export function addDays(date: string, delta: number): string;
```

Date math in UTC (`Date.UTC`) on `YYYY-MM-DD` strings so the local time zone cannot shift a day. The app never uses the system date as "today" \[ANSWER: Lana, Q2\].

### 4.5 Generator `scripts/generate-synthetic.mjs`

Plain Node.js ES module, **no dependencies**. Run: `node scripts/generate-synthetic.mjs`. It builds the object from §4.1–4.2 and writes `src/data/synthetic_history.json` with `JSON.stringify(data, null, 2) + "\n"`. Values with decimals are written as numbers (36.8, not "36.8"). The generated file is committed. Patterns live only in the generator.

## 5\. Rules

- No randomness. Running the generator twice gives byte-identical files.  
- The word SYNTHETIC appears in `label`; `synthetic: true` is mandatory and checked by the loader.  
- No real names, no personal data \[BRIEF §2\]. Astronaut is "Astronaut A (synthetic)", id SYN-01.

## 6\. UI behaviour

- Main screen shows a small permanent badge: "Synthetic data".  
- Demo helper (optional, dev-only button "Fill day-40 check-up") may fill the form from `day40_checkup`; it is hidden in the recorded demo if Lana wants live typing.

## 7\. Security

- Data bundled at build time; no network, no file system writes at runtime.  
- No personal data, no secrets.  
- Generator writes one fixed path only.

## 8\. Acceptance criteria

1. **Determinism.** Running the generator twice → identical file (compare strings).  
2. **Label.** `synthetic === true`, `label` contains "SYNTHETIC"; loader rejects a copy with `synthetic: false`.  
3. **Counts.** preflight \= 35 readings (7 × 5); history \= 39 days × 9 metrics \= 351 readings; `flags_by_date` has 39 keys, all `[]`; day40\_checkup has 9 readings.  
4. **Dates.** history first date 2026-10-06, last 2026-11-13; `missionDateForDay(40) === "2026-11-14"`; `missionDayForDate("2026-10-06") === 1`; `getToday() === "2026-11-14"`.  
5. **Story values.** heart\_rate d38 \= 62, d39 \= 76, day40 \= 80; sleep d34..d39 \= 7.0, 6.5, 6.5, 7.0, 6.5, 6.0, day40 \= 6.5; body\_mass d1 \= 70.0, d40 \= 69.1.  
6. **Day-40 evaluation (integration with rules engine \+ baseline).** Store with `includeDay40:true`, today 2026-11-14, baselines from `computeBaselines`, flags \[\] → heart\_rate `yellow` via `hr_y_baseline` (observed.delta 18); sleep\_hours `yellow` via `sleep_y_avg7`; blood\_pressure, blood\_sugar, body\_temperature, mood, body\_mass, skin\_health `green`; immune\_signs `green`; radiation\_dose `no_data`; overall `yellow`, escalation `crew_medical_officer`.  
7. **No hidden alarms.** For every day 8..39 evaluated with history up to that day: no indicator is `red`; heart\_rate is never yellow; only sleep\_hours may be yellow (days 38–39).  
8. **Store rules.** `addReadings([{...valid:false}])` throws; `getReadings()` returns a copy (mutating it does not change the store); `setFlags("2026-11-14", ["cough","cough"])` → `getFlags` \= `["cough"]`; `reset()` restores 351 history readings; `subscribe` listener is called once per `addReadings`.  
9. **includeDay40 false (default).** `hasCheckup("2026-11-14") === false`.  
10. **Demo entry.** `day40_checkup.demo_invalid_entry` \= `{metric:"heart_rate", raw:"920"}` and input check rejects it \[specs/input-check.md \#1\].

## 9\. Out of scope

Persistent database, multiple astronauts, radiation data (until Q-RAD), random noise, importing real devices, editing past days.

## 10\. Files

| Path | Owner |
| :---- | :---- |
| `scripts/generate-synthetic.mjs` | AI agent |
| `src/data/synthetic_history.json` (generated, committed) | AI agent |
| `src/features/synthetic-data/historyStore.ts`, `missionClock.ts`, `index.ts` | AI agent |
| `src/features/synthetic-data/synthetic.test.ts` (criteria 1–10) | AI agent |

## 11\. Estimate and priority

MVP, critical path (no data → no story). Agent \~1 h, Nikita \~20 min, Ayesha review of §4.2 \~15 min.

## 12\. Assumptions and open questions

| ID | Item | Who |
| :---- | :---- | :---- |
| A-SD1 | Plot written by Claude, because no ready scenario existed \[ANSWER: Lana, Q6\]. All values are illustrative, not thresholds. | Ayesha reviews §4.2 |
| A-SD2 | Preflight \= 7 days, 2026-09-22..28 (L−14..L−8). Dates are fictional. | Lana |
| A-SD3 | Glucose, body temp, sleep and skin have no preflight values (not required by rules). | — |
| Q-SD-TEMP | OPEN QUESTION for Ayesha: resting temperature 36.7–37.0 °C used. The table says in-flight resting core temperature may settle near 38 °C \[TABLE: Body temperature, Normal\]. Raise the pattern (e.g. \+1 °C) if she prefers; colours stay green either way, because only the rolling baseline and 36.0/39.0 limits apply. | Ayesha |
| Q-SD-RED | OPEN QUESTION: do we want a scripted red example for the Earth-link demo (e.g. a flag)? v1 has none; the demo can show "Send to Earth" from yellow. | Lana |

## 13\. Self-check

| Check |  |
| :---- | :---- |
| Agent can code without questions | ✓ every value is listed |
| No invented thresholds | ✓ values are illustrative data; every colour comes from rules.json |
| Medical thresholds from the table | ✓ none defined here |
| Matches neighbours | ✓ Reading, metric ids, preflight means, Day-40 constraints from rules-engine |
| Testable criteria | ✓ 10, incl. full story integration |
| Security | ✓ |
| MVP and time | ✓ |

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

—---------------------

# **SPEC: Synthetic data, history store & mission clock · v1.0 · 14 Nov 2026, 17:05 (Baku)**

## **0\. Простыми словами (на русском)**

У нас нет и не должно быть реальных медицинских данных, поэтому мы создаём одного вымышленного астронавта и его 40 дней полёта к Марсу. Данные лежат в одном файле `synthetic_history.json` с крупной пометкой SYNTHETIC. Чтобы не было «случайных» сюрпризов, файл строит маленький скрипт по фиксированным повторяющимся узорам, без генератора случайных чисел: при каждом запуске получается одно и то же.

Сюжет:

* дни 1–33 спокойные и зелёные;  
* с 34-го дня сон проседает;  
* на 39-й и 40-й день пульс поднимается до 76 и 80 при личной норме 62\.

Это ровно история 40-го дня из брифа. День 40 в историю не записан: его вводят вживую на демо. Сначала вводят 920 (ошибка), потом 80\.

Здесь же описаны две вещи, без которых всё не стыкуется:

* **«хранилище»** — простая память приложения, куда загружается файл и добавляются новые измерения, без базы данных;  
* **«часы миссии»** — в приложении всегда день 40 \= 14 ноября 2026, а день 1 \= 6 октября.

Числа в файле — иллюстрация, а не медицинские пороги \[BRIEF §4\]. Ayesha проверяет, что они правдоподобны.

## **1\. Goal**

Provide one deterministic, clearly labelled synthetic dataset (7 preflight days \+ mission days 1–39 \+ a scripted day-40 check-up) for one fictional astronaut, an in-memory `HistoryStore` that the app reads and writes, and a mission clock that fixes "today".

## **2\. Context**

```
scripts/generate-synthetic.mjs ──writes──► src/data/synthetic_history.json (committed)
                                                   │ import at build time
                                                   ▼
          missionClock.getToday() ──► HistoryStore (in memory) ◄── Input check (addReadings)
                                                   │
                       Personal baseline ◄─────────┼─────────► Rules engine, Chart, Earth link
```

Contract constraints from the rules engine \[rules-engine §4, A9; Context from Lana 16:08\]:

* each measurement is a `Reading` (`src/rules/types.ts`); metric ids exactly as in rules-engine §4.3;  
* preflight means required at least for `heart_rate`, `bp_systolic`, `bp_diastolic`, `mood`, `body_mass`;  
* day 39 and day 40 heart rate ≥ 12 bpm above preflight mean, inside 60–100; preflight HR ≥ 60;  
* sleep 7-day average on day 40 \< 7 h;  
* one JSON file, labelled SYNTHETIC, local, no network.

## **3\. User scenarios**

**S1 — App start.** The app imports the JSON, builds the store with days 1–39, sets today \= mission day 40 (2026-11-14). The chart already shows 39 days. A small badge "Synthetic data" is visible on the main screen.

**S2 — Day-40 demo.** The presenter enters the values from `day40_checkup` (first the `demo_invalid_entry` 920, rejected by input check, then 80). After saving, heart and sleep turn yellow \[BRIEF §4, steps 1–4\].

**S3 — Tests / skip demo.** `createHistoryStore(data, { includeDay40: true })` loads day 40 too, so the full story can be evaluated without typing.

## **4\. Data contract**

### **4.1 File `src/data/synthetic_history.json`**

```ts
import type { Reading } from "../rules/types";

export interface SyntheticDataset {
  synthetic: true;                         // MUST be literally true
  label: string;                           // "SYNTHETIC DATA - fictional astronaut. Not real medical data."
  schema_version: "1.0";
  generator: "scripts/generate-synthetic.mjs";
  astronaut: { id: "SYN-01"; display_name: "Astronaut A (synthetic)" };
  mission: {
    name: "Mars transit (synthetic)";
    day1_date: "2026-10-06";
    demo_day: 40;
  };
  preflight: { readings: Reading[] };      // 7 days: 2026-09-22 .. 2026-09-28
  history: {
    readings: Reading[];                   // mission days 1..39 (2026-10-06 .. 2026-11-13)
    flags_by_date: Record<string, string[]>; // every date 1..39 present, value [] in v1
  };
  day40_checkup: {
    date: "2026-11-14";
    readings: Reading[];                   // the values the presenter types
    flags: string[];                       // [] in v1
    demo_invalid_entry: { metric: "heart_rate"; raw: "920" };
  };
}
```

All readings: `context: "rest"`, `valid: true`. Readings sorted by date, then by metric order: `heart_rate, bp_systolic, bp_diastolic, glucose, body_temp, sleep_hours, mood, body_mass, skin_symptom_score`. Radiation metrics are **not** generated (OPEN QUESTION Q-RAD in rules-engine; their rules are disabled).

### **4.2 Values (exact, no randomness)**

**Preflight (7 days, 2026-09-22..28), only these 5 metrics:**

| metric | 7 values in date order | mean |
| :---- | :---- | :---- |
| heart\_rate | 62, 63, 61, 62, 63, 61, 62 | 62 |
| bp\_systolic | 115, 117, 113, 115, 116, 114, 115 | 115 |
| bp\_diastolic | 75, 76, 74, 75, 77, 73, 75 | 75 |
| mood | 8, 8, 7, 8, 8, 7, 8 | 7.714 |
| body\_mass | 70.0, 70.2, 69.8, 70.0, 70.1, 69.9, 70.0 | 70.0 |

**Mission day d (1..40): value \= `pattern[(d − 1) % 7]` unless an override exists.**

| metric | pattern (7 values) | overrides |
| :---- | :---- | :---- |
| heart\_rate | 63, 64, 62, 63, 64, 62, 63 | d39 \= 76, d40 \= 80 |
| bp\_systolic | 116, 118, 114, 116, 117, 115, 116 | — |
| bp\_diastolic | 76, 77, 75, 76, 78, 74, 76 | — |
| glucose | 92, 95, 90, 94, 97, 91, 93 | — |
| body\_temp | 36.8, 36.9, 36.7, 36.8, 37.0, 36.8, 36.9 | — |
| sleep\_hours | 7.5, 7.0, 8.0, 7.5, 7.5, 7.0, 8.0 | d34 \= 7.0, d35 \= 6.5, d36 \= 6.5, d37 \= 7.0, d38 \= 6.5, d39 \= 6.0, d40 \= 6.5 |
| mood | 8, 7, 7, 8, 7, 7, 8 | d37–d40 \= 6 |
| skin\_symptom\_score | 1, 0, 1, 1, 0, 1, 0 | — |
| body\_mass | formula: `(700 − Math.floor((d − 1) / 4)) / 10` → 70.0 on d1, 69.1 on d40 | — |

Days 1–39 go to `history`; day 40 goes to `day40_checkup` (same rule). Day 40 therefore \= heart\_rate 80, bp 117/78, glucose 97, body\_temp 37.0, sleep 6.5, mood 6, body\_mass 69.1, skin 0\.

**Why these numbers (checked against shipped `rules.json`):**

* heart: preflight 62 ≥ 60 (Q-HR-LOW); in-flight 62–64 (\|Δ\| ≤ 2); d39 76 (Δ 14), d40 80 (Δ 18), both in 60–100 → `hr_y_baseline` fires only on day 40 (persistence 2\) \[Context 6\].  
* sleep 7-day average: d37 7.14 (green), d38 6.93, d39 6.71, d40 6.57 → yellow from day 38; never 7 nights ≤ 6 → no `sleep_r_streak` \[Context 6\].  
* mood 6 vs preflight 7.714 → drop 1.71 \< 2 → stays green (a lower mood is visible on the chart, but no false alarm).  
* BP 114–118 / 74–78 → inside 90–130 / 60–80, \|Δ\| ≤ 3 vs preflight.  
* body mass d40 69.1 → −1.29 % (\< 2 %), green; a slow downward trend is visible on the chart.  
* body temp rolling mean at day 40 ≈ 36.84, today 37.0 → Δ 0.16 (\< 1 °C), green; above 36.0.  
* glucose 90–97 (inside 70–180); skin 0–1 (\< 4).

### **4.3 History store (`src/features/synthetic-data/historyStore.ts`)**

In memory only. No database in MVP \[ANSWER: Lana, Q1\]. Data is lost on app restart; it is re-seeded from the JSON.

```ts
export interface HistoryStore {
  getPreflight(): Reading[];                       // copy
  getReadings(): Reading[];                        // copy, sorted by date asc (stable)
  getReadingsByMetric(metric: string): Reading[];  // copy, sorted by date asc
  addReadings(readings: Reading[]): void;          // appends; throws Error if any reading has valid !== true
  getFlags(date: string): string[];                // [] if none
  setFlags(date: string, flags: string[]): void;   // replaces that date's flags; removes duplicates
  hasCheckup(date: string): boolean;               // true if ≥1 reading on that date OR setFlags was called for it
  subscribe(listener: () => void): () => void;     // called after every change; returns unsubscribe
  reset(): void;                                   // back to the seed state
}

export function loadSyntheticDataset(json: unknown): SyntheticDataset; // throws SyntheticDataError
export function createHistoryStore(data: SyntheticDataset, opts?: { includeDay40?: boolean }): HistoryStore;
```

* `loadSyntheticDataset` throws `SyntheticDataError` if `synthetic !== true`, `schema_version !== "1.0"`, or any reading lacks `date`/`metric`/finite `value`/`valid`.  
* `includeDay40: true` adds `day40_checkup.readings` and `setFlags("2026-11-14", day40_checkup.flags)`.  
* Duplicate readings for the same date/metric are allowed; consumers apply "last wins" \[rules-engine §5.2\].  
* One shared store instance per window, exported from `src/features/synthetic-data/index.ts` as `historyStore`. (The Earth window does not use it; see specs/earth-link.md.)

### **4.4 Mission clock (`src/features/synthetic-data/missionClock.ts`)**

```ts
export const MISSION_DAY1 = "2026-10-06";
export const DEMO_DAY = 40;
export function missionDateForDay(day: number): string;  // 1 → "2026-10-06", 40 → "2026-11-14"
export function missionDayForDate(date: string): number; // inverse
export function getToday(): string;                      // v1: missionDateForDay(DEMO_DAY)
export function addDays(date: string, delta: number): string;
```

Date math in UTC (`Date.UTC`) on `YYYY-MM-DD` strings so the local time zone cannot shift a day. The app never uses the system date as "today" \[ANSWER: Lana, Q2\].

### **4.5 Generator `scripts/generate-synthetic.mjs`**

Plain Node.js ES module, **no dependencies**. Run: `node scripts/generate-synthetic.mjs`. It builds the object from §4.1–4.2 and writes `src/data/synthetic_history.json` with `JSON.stringify(data, null, 2) + "\n"`. Values with decimals are written as numbers (36.8, not "36.8"). The generated file is committed. Patterns live only in the generator.

## **5\. Rules**

* No randomness. Running the generator twice gives byte-identical files.  
* The word SYNTHETIC appears in `label`; `synthetic: true` is mandatory and checked by the loader.  
* No real names, no personal data \[BRIEF §2\]. Astronaut is "Astronaut A (synthetic)", id SYN-01.

## **6\. UI behaviour**

* Main screen shows a small permanent badge: "Synthetic data".  
* Demo helper (optional, dev-only button "Fill day-40 check-up") may fill the form from `day40_checkup`; it is hidden in the recorded demo if Lana wants live typing.

## **7\. Security**

* Data bundled at build time; no network, no file system writes at runtime.  
* No personal data, no secrets.  
* Generator writes one fixed path only.

## **8\. Acceptance criteria**

1. **Determinism.** Running the generator twice → identical file (compare strings).  
2. **Label.** `synthetic === true`, `label` contains "SYNTHETIC"; loader rejects a copy with `synthetic: false`.  
3. **Counts.** preflight \= 35 readings (7 × 5); history \= 39 days × 9 metrics \= 351 readings; `flags_by_date` has 39 keys, all `[]`; day40\_checkup has 9 readings.  
4. **Dates.** history first date 2026-10-06, last 2026-11-13; `missionDateForDay(40) === "2026-11-14"`; `missionDayForDate("2026-10-06") === 1`; `getToday() === "2026-11-14"`.  
5. **Story values.** heart\_rate d38 \= 62, d39 \= 76, day40 \= 80; sleep d34..d39 \= 7.0, 6.5, 6.5, 7.0, 6.5, 6.0, day40 \= 6.5; body\_mass d1 \= 70.0, d40 \= 69.1.  
6. **Day-40 evaluation (integration with rules engine \+ baseline).** Store with `includeDay40:true`, today 2026-11-14, baselines from `computeBaselines`, flags \[\] → heart\_rate `yellow` via `hr_y_baseline` (observed.delta 18); sleep\_hours `yellow`via `sleep_y_avg7`; blood\_pressure, blood\_sugar, body\_temperature, mood, body\_mass, skin\_health `green`; immune\_signs `green`; radiation\_dose `no_data`; overall `yellow`, escalation `crew_medical_officer`.  
7. **No hidden alarms.** For every day 8..39 evaluated with history up to that day: no indicator is `red`; heart\_rate is never yellow; only sleep\_hours may be yellow (days 38–39).  
8. **Store rules.** `addReadings([{...valid:false}])` throws; `getReadings()` returns a copy (mutating it does not change the store); `setFlags("2026-11-14", ["cough","cough"])` → `getFlags` \= `["cough"]`; `reset()` restores 351 history readings; `subscribe` listener is called once per `addReadings`.  
9. **includeDay40 false (default).** `hasCheckup("2026-11-14") === false`.  
10. **Demo entry.** `day40_checkup.demo_invalid_entry` \= `{metric:"heart_rate", raw:"920"}` and input check rejects it \[specs/input-check.md \#1\].

## **9\. Out of scope**

Persistent database, multiple astronauts, radiation data (until Q-RAD), random noise, importing real devices, editing past days.

## **10\. Files**

| Path | Owner |
| :---- | :---- |
| `scripts/generate-synthetic.mjs` | AI agent |
| `src/data/synthetic_history.json` (generated, committed) | AI agent |
| `src/features/synthetic-data/historyStore.ts`, `missionClock.ts`, `index.ts` | AI agent |
| `src/features/synthetic-data/synthetic.test.ts` (criteria 1–10) | AI agent |

## **11\. Estimate and priority**

MVP, critical path (no data → no story). Agent \~1 h, Nikita \~20 min, Ayesha review of §4.2 \~15 min.

## **12\. Assumptions and open questions**

| ID | Item | Who |
| :---- | :---- | :---- |
| A-SD1 | Plot written by Claude, because no ready scenario existed \[ANSWER: Lana, Q6\]. All values are illustrative, not thresholds. | Ayesha reviews §4.2 |
| A-SD2 | Preflight \= 7 days, 2026-09-22..28 (L−14..L−8). Dates are fictional. | Lana |
| A-SD3 | Glucose, body temp, sleep and skin have no preflight values (not required by rules). | — |
| Q-SD-TEMP | OPEN QUESTION for Ayesha: resting temperature 36.7–37.0 °C used. The table says in-flight resting core temperature may settle near 38 °C \[TABLE: Body temperature, Normal\]. Raise the pattern (e.g. \+1 °C) if she prefers; colours stay green either way, because only the rolling baseline and 36.0/39.0 limits apply. | Ayesha |
| D-SD-RED | DECIDED: no red day in the data. The red example in the demo is created live: after the day-40 check-up the presenter ticks the flag `irregular_heartbeat` → heart red → auto-draft → Send to Earth \[specs/earth-link.md S1, criterion 5\] \[ANSWER: Lana, 16:34 "do what is needed"\]. | Lana |

## **13\. Self-check**

| Check |  |
| :---- | :---- |
| Agent can code without questions | ✓ every value is listed |
| No invented thresholds | ✓ values are illustrative data; every colour comes from rules.json |
| Medical thresholds from the table | ✓ none defined here |
| Matches neighbours | ✓ Reading, metric ids, preflight means, Day-40 constraints from rules-engine |
| Testable criteria | ✓ 10, incl. full story integration |
| Security | ✓ |
| MVP and time | ✓ |

&nbsp;