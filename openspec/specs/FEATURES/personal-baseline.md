# SPEC: Personal baseline & deviation  ·  v1.0  ·  14 Nov 2026, 16:45 (Baku)

## 0. Простыми словами (на русском)

Модуль считает личную норму астронавта: какой у него обычно пульс, давление, настроение и так далее. Норм две.
- **Предполётная.** Среднее за 7 дней измерений на Земле до старта. По ней сравниваются пульс, давление, настроение и масса тела.
- **Скользящая.** Среднее за 7 предыдущих дней полёта, без сегодняшнего. По ней сравнивается температура.

Модуль только считает средние и разброс и отдаёт их движку правил. Цвет он не ставит. Вторая его работа — подготовить для графика линию «твоя норма» и линии порогов, взятые из `rules.json`. Например, для пульса это линия 62 и границы 50 и 74 (62 ± 12). Своих чисел модуль не придумывает. В истории 40-го дня это шаг 3: обычный пульс этого астронавта 62, а сегодня 80.

## 1. Goal

Compute, for every metric, the preflight and rolling personal baseline in the exact `Baseline` shape the rules engine expects, and derive display-only deviation values and chart reference lines from `rules.json`.

## 2. Context

```
HistoryStore ──preflight + history──► PERSONAL BASELINE ──Record<metric, Baseline>──► Rules engine
                                            │                                     
                                            └──deviation + reference lines──► Indicator card, chart (UI)
```

- Inputs: `HistoryStore.getPreflight()` and `getReadings()` [specs/synthetic-data.md §4.3]; `rules.json`.
- Output contract is fixed by [specs/rules-engine.md §4.1 `Baseline`]: `rolling` = previous `settings.rolling_baseline_days` (7) calendar days, today excluded; the engine itself checks `rolling_n >= settings.min_rolling_baseline_readings` (7) [rules-engine A3].
- Which baseline each rule uses is written in `rules.json` (`trigger.baseline`): preflight for heart rate, BP, mood, body mass; rolling for body temperature [rules-engine A9].
- Challenge link: core differentiator "personal norm, not only general thresholds" [BRIEF §4].

## 3. User scenarios

**S1 — Day-40 heart** [BRIEF §4, step 3]. Preflight heart rate 62,63,61,62,63,61,62 → `preflight_mean` 62. The card shows "Your normal: 62 bpm (before flight). Today: 80 (+18)." The chart shows the 62 line and dashed yellow lines at 50 and 74 (from `hr_y_baseline`, ±12) and at 60 and 100 (from `hr_y_abs_low/high`).

**S2 — First week.** Mission day 3, body temperature has 2 rolling readings → `rolling_n: 2`. The engine skips the baseline rule (`no_baseline`), the UI shows "baseline forming".

**S3 — Exercise reading.** A body temperature taken after exercise does not enter any baseline (rest only).

## 4. Inputs and outputs

Language: TypeScript. Files: `src/features/personal-baseline/baseline.ts`, `baseline.test.ts`.

```ts
import type { Reading, Baseline, RulesFile, Level } from "../../rules/types";

export interface BaselineInput {
  today: string;          // "YYYY-MM-DD", mission clock
  preflight: Reading[];   // preflight readings (dates before mission day 1)
  history: Reading[];     // in-flight readings, may include today and any order
  rules: RulesFile;
}

/** One entry for EVERY metric id in rules.metrics (even when all values are null). */
export function computeBaselines(input: BaselineInput): Record<string, Baseline>;

export interface Deviation {
  metric: string;
  source: "preflight" | "rolling";
  mean: number | null;
  value: number;
  delta_abs: number | null;      // value - mean
  delta_percent: number | null;  // (value - mean) / mean * 100; null if mean null or 0
}
/** Display only. Never used to decide colour. */
export function describeDeviation(metric: string, value: number, baseline: Baseline | undefined, rules: RulesFile): Deviation;

export interface ReferenceLine {
  value: number;
  kind: "baseline" | "threshold" | "baseline_delta" | "window_average";
  level: Level;            // "green" for the baseline line
  rule_id: string | null;  // null for the baseline line
  label: string;           // see §5.4
}
export function getReferenceLines(metric: string, baselines: Record<string, Baseline>, rules: RulesFile): ReferenceLine[];
```

## 5. Logic and formulas

### 5.1 Reading filter (used everywhere in this module)
A reading counts only if: `valid === true`, `Number.isFinite(value)`, `(context ?? "rest") === "rest"`. If one metric has several counting readings on the same date, keep the **last one in array order** (same rule as rules-engine §5.2).

### 5.2 Preflight
For metric `m`: values = counting preflight readings of `m` (one per date).
- `preflight_mean` = arithmetic mean if n ≥ 1, else `null`.
- `preflight_sd` = **sample** standard deviation `sqrt(Σ(x−mean)² / (n−1))` if n ≥ 2, else `null` [ANSWER: Lana, Q5].

### 5.3 Rolling
`N = rules.settings.rolling_baseline_days` (7). Window = dates `day(1)..day(N)` where `day(k)` = `today` minus k calendar days (UTC date arithmetic; today excluded) [rules-engine §4.1].
- values = counting history readings of `m` whose date is in the window (one per date).
- `rolling_n` = number of values.
- `rolling_mean` = mean if `rolling_n ≥ 1`, else `null`.
- `rolling_sd` = sample SD if `rolling_n ≥ 2`, else `null`.
- The module does NOT apply `min_rolling_baseline_readings`; the engine does.

### 5.4 `describeDeviation`
- `source` = `trigger.baseline` of the first **enabled** rule in `rules.json` (file order) with `trigger.type === "baseline_delta"` and `trigger.metric === metric`; if none, `"rolling"`.
- `mean` = `preflight_mean` or `rolling_mean` of that source; `rolling_mean` counts only if `rolling_n >= settings.min_rolling_baseline_readings`, else `mean = null`.
- `delta_abs`, `delta_percent` per the interface; no rounding (UI rounds for display).

### 5.5 `getReferenceLines(metric)`
Build lines in this order, then remove duplicates with the same `value` and `level` (keep the first):
1. **Baseline line** (if `describeDeviation` mean is not null): `kind:"baseline"`, `level:"green"`, `rule_id:null`, label `"Your normal (before flight)"` for preflight or `"Your normal (last 7 days)"` for rolling.
2. For each rule in `rules.json` (file order) that is `enabled`, has `requires_flags.length === 0`, has `trigger.metric === metric` and `(trigger.context ?? "rest") === "rest"`:
   - `threshold` → line at `trigger.value`; `kind:"threshold"`.
   - `window_average` → line at `trigger.value`; `kind:"window_average"`.
   - `baseline_delta` → only if that baseline's mean is available (same availability as §5.4, using `trigger.baseline`):
     - `abs`: `mean + amount` (above), `mean − amount` (below), both (either);
     - `percent`: `mean × (1 + amount/100)` / `mean × (1 − amount/100)`;
     - `sd`: `mean ± amount × sd` (skip if sd null or 0).
     - `kind:"baseline_delta"`.
   - label = `"{Level} limit: {rule.title}"`, e.g. `"Yellow limit: Heart rate differs from your normal"`.
3. Rules with `requires_flags` are excluded because they are not a plain line (they need symptoms too).

All numbers come from `rules.json` or from the astronaut's own data. **The module defines no thresholds of its own** (no ±SD band) [ANSWER: Lana, Q5].

### 5.6 Edge cases
| Case | Behaviour |
|---|---|
| No preflight readings for a metric | preflight_mean/sd `null` |
| Metric never measured | all null, `rolling_n: 0` |
| Reading dated today or later in history | not in rolling window |
| Preflight readings with valid=false or exercise | ignored |
| Unknown metric id in readings | ignored |

## 6. UI behaviour

The indicator card shows (when `describeDeviation.mean` is not null):
`"Your normal: {mean} {unit} ({before flight | last 7 days}). Today: {value} ({+/-delta_abs})."` with mean and delta rounded to 1 decimal for display. If mean is null: the rules-engine text `ui_text.baseline_forming`. The chart draws `getReferenceLines` (baseline solid, limits dashed in their level colour).

## 7. Security

Pure functions, no I/O, no network, no logging of values, no dependencies outside the TS standard library. Input objects are not mutated.

## 8. Acceptance criteria

`rules` = shipped `rules.json`; readings `context:"rest", valid:true` unless stated.

1. **Preflight heart.** preflight heart_rate 62,63,61,62,63,61,62 → `preflight_mean` 62, `preflight_sd` ≈ 0.8165 (±0.001).
2. **Preflight mood.** 8,8,7,8,8,7,8 → mean ≈ 7.7143, sd ≈ 0.4880.
3. **Rolling full.** today 2026-11-14; body_temp on 2026-11-07..2026-11-13 = 37.0,36.8,36.9,36.8,36.9,36.7,36.8 and 39.0 on 2026-11-14 → `rolling_n` 7, `rolling_mean` ≈ 36.8429 (today excluded).
4. **Rolling partial.** only 2026-11-12 and 2026-11-13 present → `rolling_n` 2, mean present, sd present; with only one → sd `null`.
5. **Exclusions.** a valid=false reading, an exercise reading and a reading dated 2026-11-15 inside the data → none counted.
6. **Duplicates.** two heart_rate readings on the same date, 70 then 72 → 72 used.
7. **Every metric present.** `Object.keys(result)` equals all 11 metric ids from rules.json; `radiation_accumulated` → all null, `rolling_n` 0.
8. **Deviation, day-40 heart.** preflight_mean 62, value 80 → `source:"preflight"`, `delta_abs` 18, `delta_percent` ≈ 29.03.
9. **Deviation, temperature.** source `"rolling"`; with `rolling_n` 6 → `mean:null`, deltas null.
10. **Reference lines, heart** (preflight_mean 62) → values exactly {62 (baseline), 50, 74 (hr_y_baseline), 100 (hr_y_abs_high), 60 (hr_y_abs_low)}; no line from `hr_r_baseline_symptoms` (has requires_flags).
11. **Reference lines, body mass** (preflight_mean 70) → baseline 70 and 68.6 (bm_y_drop, −2 %); nothing from `bm_r_drop_symptoms`.
12. **Reference lines, sleep** → 7 (window_average, sleep_y_avg7) and 6 (sleep_r_streak); no baseline line (no preflight, rolling not formed if <7 readings).
13. **Reference lines, body_temp** → no line from disabled `temp_y_abs`; exercise-context rules excluded.
14. **Integration with synthetic data.** With the shipped synthetic file at day 40 [specs/synthetic-data.md]: heart_rate preflight_mean 62; bp_systolic 115; bp_diastolic 75; body_mass ≈ 70.0; mood ≈ 7.714; body_temp rolling_n 7.
15. **Purity.** same input twice → deep-equal; inputs unchanged.

## 9. Out of scope

Colours and rule evaluation (rules engine); storage; drawing the chart; baselines from exercise readings; seasonal/trend models.

## 10. Files

| Path | Owner |
|---|---|
| `src/features/personal-baseline/baseline.ts` | AI agent |
| `src/features/personal-baseline/baseline.test.ts` (criteria 1–15) | AI agent |

## 11. Estimate and priority

MVP, critical path (story step 3). Agent ~45 min, Nikita ~20 min.

## 12. Assumptions and open questions

| ID | Item | Who |
|---|---|---|
| A-PB1 | Preflight baseline = 7 preflight days in the synthetic data (same length as the rolling window, A3). | Lana [ANSWER Q5] |
| A-PB2 | Sample SD (n−1). The engine uses SD only for `unit:"sd"` rules; none exist in v1, so this does not change any colour today. | Lana [ANSWER Q5] |
| A-PB3 | Only rest readings form baselines. | Lana [ANSWER Q5] |

## 13. Self-check

| Check | |
|---|---|
| Agent can code without questions | ✓ |
| No invented numbers | ✓ all lines come from rules.json or the astronaut's data |
| Medical thresholds from the table | ✓ none defined here |
| Matches neighbours | ✓ `Baseline` = rules-engine §4.1; inputs = HistoryStore |
| Testable criteria | ✓ 15 |
| Security | ✓ |
| MVP and time | ✓ |
