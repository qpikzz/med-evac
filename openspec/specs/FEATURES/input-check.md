# SPEC: Input check (plausibility)  ·  v1.0  ·  14 Nov 2026, 16:30 (Baku)

## 0\. In simple terms 

The module catches invalid values before they are saved to the history. An astronaut enters “920” in the heart rate field, and the module responds: “Looks like a measurement error. Please measure again.” The checkup cannot be saved until the error is corrected or the field is cleared. The module does not assign a color or make any medical determinations. It checks only three things: whether the number is within physically possible limits, and whether the systolic pressure is higher than the diastolic pressure.The boundaries are stored in `rules.json` (the `plausible_min` and `plausible_max` fields); Lana named them on November 14. Ayesha adds the sources for them. Without this module, step 2 of the Day 40 story (“pulse 920 → check again”) does not work.

## 1\. Goal

Turn raw check-up field values into `Reading` objects with `valid: true`, or into a readable error, using only the plausibility ranges in `src/data/rules.json`; impossible values never reach storage.

## 2\. Context

```
Check-up form ──raw strings──► INPUT CHECK ──Reading[] (valid:true)──► HistoryStore ──► Baseline / Rules engine
                                    │ reads rules.json → metrics[].plausible_min / plausible_max
                                    └──errors──► form shows message next to the field
```

- Input: raw field values from the check-up form (Nikita's UI).  
- Output: `Reading[]` for `HistoryStore.addReadings()` \[specs/synthetic-data.md §4.3\]; error objects for the form.  
- `Reading`, `MeasurementContext`, `RulesFile` types are imported from `src/rules/types.ts` \[specs/rules-engine.md §4.1\]. Do not redefine them.  
- Challenge link: Q1 "which measurements can be performed in space" is covered by the form; this module protects data quality, so colours are never computed from typos \[BRIEF §4, story step 2\].

## 3\. User scenarios

**S1 — Day-40 demo typo** \[BRIEF §4, step 2\]. The astronaut types `920` in Heart rate and presses Save. The field shows "Looks like a measurement error. Please measure again. Expected 20–250 bpm." Nothing is saved. They type `80` → saved as `{ metric: "heart_rate", value: 80, valid: true, context: "rest" }`.

**S2 — Comma decimal.** The astronaut types `36,8` in Body temperature → saved as 36.8.

**S3 — Swapped blood pressure.** Systolic `80`, diastolic `120` → both fields show "The upper (systolic) value must be higher than the lower (diastolic) value. Please measure again." Nothing saved.

**S4 — Skipped field.** Glucose left empty → not an error; glucose is simply not measured today (the rules engine shows `no_data`).

## 4\. Inputs and outputs (data contract)

Language: TypeScript. Files: `src/features/input-check/inputCheck.ts`, `src/features/input-check/inputCheck.test.ts`.

```ts
import type { Reading, MeasurementContext, RulesFile } from "../../rules/types";

export interface RawEntry {
  metric: string;               // metric id from rules.json, e.g. "heart_rate"
  raw: string | number;         // exactly what the form field contains
  context?: MeasurementContext; // default "rest"
}

export type CheckErrorCode =
  | "empty" | "not_a_number" | "out_of_range" | "bp_order" | "unknown_metric";

export type CheckResult =
  | { ok: true;  metric: string; reading: Reading }
  | { ok: false; metric: string; code: CheckErrorCode; message: string;
      raw: string; range?: { min: number | null; max: number | null; unit: string } };

export function checkEntry(entry: RawEntry, date: string, rules: RulesFile): CheckResult;

export interface CheckupCheck {
  results: CheckResult[];   // one per NON-empty entry, same order as input
  skipped: string[];        // metric ids of empty entries
  readings: Reading[];      // only from ok results; empty array if allOk = false
  allOk: boolean;           // true if no result has ok = false
}
export function checkCheckup(entries: RawEntry[], date: string, rules: RulesFile): CheckupCheck;
```

`date` is the mission date `YYYY-MM-DD` from the mission clock \[specs/synthetic-data.md §4.4\].

## 5\. Logic and rules

### 5.1 `checkEntry`

1. Find `m = rules.metrics.find(x => x.id === entry.metric)`. Not found → `unknown_metric`, message `"Unknown measurement."`.  
2. `s = String(entry.raw).trim()`. If `s === ""` → `empty`, message `"No value entered."`.  
3. Replace one comma with a dot: `s = s.replace(",", ".")`.  
4. `s` must match `/^[+-]?\d+(\.\d+)?$/`. Otherwise → `not_a_number`, message `"Please enter a number, for example 72 or 36.8."`. (So `"1e3"`, `"72 bpm"`, `"7..5"` are rejected.)  
5. `v = Number(s)`. If `!Number.isFinite(v)` → `not_a_number`.  
6. Range, **inclusive**: if `m.plausible_min !== null && v < m.plausible_min` or `m.plausible_max !== null && v > m.plausible_max` → `out_of_range`, message `"Looks like a measurement error. Please measure again."`, plus `range = { min, max, unit: m.unit }`. The UI adds `"Expected {min}–{max} {unit}."` when both bounds exist.  
7. Otherwise → `ok: true`, `reading = { date, metric: m.id, value: v, context: entry.context ?? "rest", valid: true }`. No rounding.

### 5.2 `checkCheckup`

1. Entries whose raw value is empty after trim go to `skipped` (no result).  
2. Run `checkEntry` for the rest.  
3. **Blood-pressure order:** if both `bp_systolic` and `bp_diastolic` results are `ok` and `systolic <= diastolic`, replace BOTH results with `ok: false`, code `bp_order`, message `"The upper (systolic) value must be higher than the lower (diastolic) value. Please measure again."`. This is a physical consistency check, not a medical threshold.  
4. If an entry for the same metric and context appears twice, keep only the last one.  
5. `allOk = results.every(r => r.ok)`. `readings` \= ok readings only when `allOk`, else `[]`.

### 5.3 Plausibility ranges — data change in `src/data/rules.json`

The agent must set these values in `rules.json → metrics`. They are "physically impossible" limits for catching typos, **not** medical thresholds, and never change a colour.

| metric | plausible\_min | plausible\_max | Source |
| :---- | :---- | :---- | :---- |
| heart\_rate | 20 | 250 | \[ANSWER: Lana, 16:08\] |
| bp\_systolic | 40 | 300 | \[ANSWER: Lana, 16:08\] "20 на 200 до 40 на 300" — ASSUMPTION A-IC1 |
| bp\_diastolic | 20 | 200 | \[ANSWER: Lana, 16:08\] — ASSUMPTION A-IC1 |
| glucose | 0 | 600 | \[ANSWER: Lana, 16:08\] |
| body\_temp | 25 | 45 | \[ANSWER: Lana, 16:08\] |
| radiation\_dose\_rate | 0 | 100 | \[ANSWER: Lana, 16:08\] "радиация 0–100" — ASSUMPTION A-IC2 |
| radiation\_accumulated | 0 | 100 | \[ANSWER: Lana, 16:08\] — ASSUMPTION A-IC2 |
| body\_mass | 0 | null | ASSUMPTION A-IC3; max \= OPEN QUESTION Q-IC-MASS |
| sleep\_hours | 0 | 24 | already in rules.json |
| mood | 0 | 10 | already in rules.json |
| skin\_symptom\_score | 0 | 10 | already in rules.json |

## 6\. UI behaviour

The form (Nikita) must:

- show each error message under its own field, in plain text;  
- disable "Save check-up" while `allOk === false`;  
- never save a failed value (no `valid: false` readings are written in v1);  
- keep the user's typed text in the field after an error, so they can correct it.

| Situation | Text (EN) |
| :---- | :---- |
| out\_of\_range | "Looks like a measurement error. Please measure again. Expected {min}–{max} {unit}." |
| not\_a\_number | "Please enter a number, for example 72 or 36.8." |
| bp\_order | "The upper (systolic) value must be higher than the lower (diastolic) value. Please measure again." |
| empty | nothing (field is optional) |

## 7\. Security

- This module is the app's input validation layer \[project instructions, security\]. Every number that reaches storage passes through it.  
- Regex-based parsing only: no `eval`, no `Function`, no `parseFloat` leniency (`parseFloat("72abc")` \= 72 would hide typos).  
- Error messages render as plain text (React default); the raw input is never inserted as HTML.  
- No logging of entered values in production builds.  
- No dependencies outside the TypeScript standard library. No network.

## 8\. Acceptance criteria

`date = "2026-11-14"`, `rules` \= shipped `rules.json` after the §5.3 change.

1. **Day-40 typo.** `checkEntry({metric:"heart_rate", raw:"920"})` → `ok:false`, `code:"out_of_range"`, `range:{min:20,max:250,unit:"bpm"}`.  
2. **Correct value.** `raw:"80"` → `ok:true`, `reading` deep-equals `{date:"2026-11-14", metric:"heart_rate", value:80, context:"rest", valid:true}`.  
3. **Comma.** body\_temp `"36,8"` → value 36.8.  
4. **Bad text.** `"abc"`, `"72 bpm"`, `"1e3"`, `"7..5"` → `not_a_number`. `" 72 "` → ok, 72\.  
5. **Inclusive bounds.** heart\_rate 20 → ok; 250 → ok; 19.9 → out\_of\_range; 250.1 → out\_of\_range.  
6. **BP order.** systolic 80 \+ diastolic 120 → both results `bp_order`, `allOk:false`, `readings:[]`. 120 \+ 80 → both ok. 300 \+ 200 → ok. Systolic 301 → out\_of\_range.  
7. **Glucose.** 0 → ok; 600 → ok; 601 and −1 → out\_of\_range.  
8. **Existing ranges.** sleep\_hours 25 → out\_of\_range; mood 11 → out\_of\_range.  
9. **Body mass.** 70.4 → ok; −5 → out\_of\_range (A-IC3); 500 → ok (no max yet, Q-IC-MASS).  
10. **Unknown metric.** `metric:"sugar"` → `unknown_metric`.  
11. **Mixed check-up.** entries heart\_rate "920", sleep\_hours "6.5", glucose "" → results length 2, `skipped:["glucose"]`, `allOk:false`, `readings:[]`. After fixing heart\_rate to "80" → `allOk:true`, 2 readings.  
12. **Exercise context.** body\_temp "39.3" with context "exercise" → reading.context "exercise".  
13. **Duplicate field.** two heart\_rate entries "70" then "72" → one result, value 72\.  
14. **No mutation, determinism.** Input arrays and `rules` are deep-equal before and after; two calls give deep-equal output.  
15. **Data file.** In shipped `rules.json`, `heart_rate.plausible_max === 250` and `bp_diastolic.plausible_min === 20`; `loadRules` (rules-engine spec) still succeeds.

## 9\. Out of scope

- Colours, thresholds, baselines (rules engine, baseline module).  
- "Suspicious but possible" checks such as a big jump from yesterday: not in MVP, because they need thresholds we do not have \[ANSWER: Lana, Q4\].  
- Unit conversion (e.g. mmol/L → mg/dL). The form uses the units in `rules.json`.  
- Camera or device import. Measurement instructions text (UI).

## 10\. Files

| Path | Owner |
| :---- | :---- |
| `src/features/input-check/inputCheck.ts` | AI agent |
| `src/features/input-check/inputCheck.test.ts` (criteria 1–15) | AI agent |
| `src/data/rules.json` (§5.3 values only) | AI agent, Ayesha reviews |

## 11\. Estimate and priority

MVP, critical path (story step 2). Agent \~40 min, Nikita review \~20 min.

## 12\. Assumptions and open questions

| ID | Item | Who |
| :---- | :---- | :---- |
| A-IC1 | ASSUMPTION: "давление 20 на 200 до 40 на 300" read as diastolic 20–200, systolic 40–300 (the only reading where each pair is min–max of one value). | Lana confirms |
| A-IC2 | ASSUMPTION: "радиация 0–100" applied to both radiation metrics, although units differ (µSv/h vs mSv). Radiation is not used in MVP data, so the risk is low. | Lana \+ Ayesha |
| A-IC3 | ASSUMPTION: body mass cannot be negative → min 0\. Physical fact, not a medical threshold. | — |
| Q-IC-MASS | OPEN QUESTION: plausible max for body\_mass (kg). | Ayesha |
| Q-IC-SRC | OPEN QUESTION: a source line for the Lana ranges in SOURCES.md (e.g. device measuring range or physiology reference). | Ayesha |

## 13\. Self-check

| Check |  |
| :---- | :---- |
| Agent can code without questions | ✓ |
| No invented numbers / libraries | ✓ all ranges from Lana or rules.json; min 0 for mass is physics (A-IC3) |
| Medical thresholds from the table or open | ✓ module has no medical thresholds |
| Inputs/outputs match neighbours | ✓ `Reading` from rules-engine §4.1; output to `HistoryStore.addReadings` |
| Testable criteria with examples | ✓ 15, incl. error and edge cases |
| Security | ✓ |
| MVP and time | ✓ |

&nbsp;

&nbsp;

&nbsp;

&nbsp;

—--------------------------------------------

# **SPEC: Input check (plausibility) · v1.1 · 14 Nov 2026, 16:40 (Baku)**

> **v1.1:** BP ranges confirmed; radiation 0–100 applies to `radiation_accumulated` (mSv) only; body mass has no max (not in the mandatory daily check-up).

## **0\. Простыми словами (на русском)**

Модуль ловит невозможные значения до того, как они попадут в историю. Астронавт вводит «920» в поле пульса, а модуль отвечает: «Looks like a measurement error. Please measure again.» Сохранить чек-ап нельзя, пока ошибка не исправлена или поле не очищено. Модуль не ставит цвет и не решает ничего медицинского. Он проверяет только три вещи: это число, оно в физически возможных границах, верхнее давление больше нижнего. Границы хранятся в `rules.json` (поля `plausible_min` / `plausible_max`), их назвала Лана 14 ноября. Источники к ним добавляет Ayesha. Без этого модуля шаг 2 истории 40-го дня («пульс 920 → перемерьте») не работает.

## **1\. Goal**

Turn raw check-up field values into `Reading` objects with `valid: true`, or into a readable error, using only the plausibility ranges in `src/data/rules.json`; impossible values never reach storage.

## **2\. Context**

```
Check-up form ──raw strings──► INPUT CHECK ──Reading[] (valid:true)──► HistoryStore ──► Baseline / Rules engine
                                    │ reads rules.json → metrics[].plausible_min / plausible_max
                                    └──errors──► form shows message next to the field
```

* Input: raw field values from the check-up form (Nikita's UI).  
* Output: `Reading[]` for `HistoryStore.addReadings()` \[specs/synthetic-data.md §4.3\]; error objects for the form.  
* `Reading`, `MeasurementContext`, `RulesFile` types are imported from `src/rules/types.ts` \[specs/rules-engine.md §4.1\]. Do not redefine them.  
* Challenge link: Q1 "which measurements can be performed in space" is covered by the form; this module protects data quality, so colours are never computed from typos \[BRIEF §4, story step 2\].

## **3\. User scenarios**

**S1 — Day-40 demo typo** \[BRIEF §4, step 2\]. The astronaut types `920` in Heart rate and presses Save. The field shows "Looks like a measurement error. Please measure again. Expected 20–250 bpm." Nothing is saved. They type `80` → saved as `{ metric: "heart_rate", value: 80, valid: true, context: "rest" }`.

**S2 — Comma decimal.** The astronaut types `36,8` in Body temperature → saved as 36.8.

**S3 — Swapped blood pressure.** Systolic `80`, diastolic `120` → both fields show "The upper (systolic) value must be higher than the lower (diastolic) value. Please measure again." Nothing saved.

**S4 — Skipped field.** Glucose left empty → not an error; glucose is simply not measured today (the rules engine shows `no_data`).

## **4\. Inputs and outputs (data contract)**

Language: TypeScript. Files: `src/features/input-check/inputCheck.ts`, `src/features/input-check/inputCheck.test.ts`.

```ts
import type { Reading, MeasurementContext, RulesFile } from "../../rules/types";

export interface RawEntry {
  metric: string;               // metric id from rules.json, e.g. "heart_rate"
  raw: string | number;         // exactly what the form field contains
  context?: MeasurementContext; // default "rest"
}

export type CheckErrorCode =
  | "empty" | "not_a_number" | "out_of_range" | "bp_order" | "unknown_metric";

export type CheckResult =
  | { ok: true;  metric: string; reading: Reading }
  | { ok: false; metric: string; code: CheckErrorCode; message: string;
      raw: string; range?: { min: number | null; max: number | null; unit: string } };

export function checkEntry(entry: RawEntry, date: string, rules: RulesFile): CheckResult;

export interface CheckupCheck {
  results: CheckResult[];   // one per NON-empty entry, same order as input
  skipped: string[];        // metric ids of empty entries
  readings: Reading[];      // only from ok results; empty array if allOk = false
  allOk: boolean;           // true if no result has ok = false
}
export function checkCheckup(entries: RawEntry[], date: string, rules: RulesFile): CheckupCheck;
```

`date` is the mission date `YYYY-MM-DD` from the mission clock \[specs/synthetic-data.md §4.4\].

## **5\. Logic and rules**

### **5.1 `checkEntry`**

1. Find `m = rules.metrics.find(x => x.id === entry.metric)`. Not found → `unknown_metric`, message `"Unknown measurement."`.  
2. `s = String(entry.raw).trim()`. If `s === ""` → `empty`, message `"No value entered."`.  
3. Replace one comma with a dot: `s = s.replace(",", ".")`.  
4. `s` must match `/^[+-]?\d+(\.\d+)?$/`. Otherwise → `not_a_number`, message `"Please enter a number, for example 72 or 36.8."`. (So `"1e3"`, `"72 bpm"`, `"7..5"` are rejected.)  
5. `v = Number(s)`. If `!Number.isFinite(v)` → `not_a_number`.  
6. Range, **inclusive**: if `m.plausible_min !== null && v < m.plausible_min` or `m.plausible_max !== null && v > m.plausible_max` → `out_of_range`, message `"Looks like a measurement error. Please measure again."`, plus `range = { min, max, unit: m.unit }`. The UI adds `"Expected {min}–{max} {unit}."` when both bounds exist.  
7. Otherwise → `ok: true`, `reading = { date, metric: m.id, value: v, context: entry.context ?? "rest", valid: true }`. No rounding.

### **5.2 `checkCheckup`**

1. Entries whose raw value is empty after trim go to `skipped` (no result).  
2. Run `checkEntry` for the rest.  
3. **Blood-pressure order:** if both `bp_systolic` and `bp_diastolic` results are `ok` and `systolic <= diastolic`, replace BOTH results with `ok: false`, code `bp_order`, message `"The upper (systolic) value must be higher than the lower (diastolic) value. Please measure again."`. This is a physical consistency check, not a medical threshold.  
4. If an entry for the same metric and context appears twice, keep only the last one.  
5. `allOk = results.every(r => r.ok)`. `readings` \= ok readings only when `allOk`, else `[]`.

### **5.3 Plausibility ranges — data change in `src/data/rules.json`**

The agent must set these values in `rules.json → metrics`. They are "physically impossible" limits for catching typos, **not**medical thresholds, and never change a colour.

| metric | plausible\_min | plausible\_max | Source |
| :---- | :---- | :---- | :---- |
| heart\_rate | 20 | 250 | \[ANSWER: Lana, 16:08\] |
| bp\_systolic | 40 | 300 | \[ANSWER: Lana, 16:34\] |
| bp\_diastolic | 20 | 200 | \[ANSWER: Lana, 16:34\] |
| glucose | 0 | 600 | \[ANSWER: Lana, 16:08\] |
| body\_temp | 25 | 45 | \[ANSWER: Lana, 16:08\] |
| radiation\_dose\_rate | 0 | 100000 | was null (no max) → **set 15 Nov 2026 to 100 000 µSv/h** (100 mSv/h) as an input sanity limit: far above any expected solar-particle-event peak inside the spacecraft, so it only catches typing errors |
| radiation\_accumulated | 0 | 1000 | \[ANSWER: Lana, 16:34: 0–100 is in mSv\] → **changed 15 Nov 2026 to 0–1000 mSv**: a 180-day Mars transit at ≈ 1.8 mSv/day reaches ≈ 324 mSv, so 100 would reject real readings from day 55 (see rules-engine Q-RAD). |
| body\_mass | 0 | null | ASSUMPTION A-IC3; no max needed: body mass is not part of the mandatory daily check-up \[ANSWER: Lana, 16:34\] |
| sleep\_hours | 0 | 24 | already in rules.json |
| mood | 0 | 10 | already in rules.json |
| skin\_symptom\_score | 0 | 10 | already in rules.json |

## **6\. UI behaviour**

The form (Nikita) must:

* show each error message under its own field, in plain text;  
* disable "Save check-up" while `allOk === false`;  
* never save a failed value (no `valid: false` readings are written in v1);  
* keep the user's typed text in the field after an error, so they can correct it.

| Situation | Text (EN) |
| :---- | :---- |
| out\_of\_range | "Looks like a measurement error. Please measure again. Expected {min}–{max} {unit}." |
| not\_a\_number | "Please enter a number, for example 72 or 36.8." |
| bp\_order | "The upper (systolic) value must be higher than the lower (diastolic) value. Please measure again." |
| empty | nothing (field is optional) |

## **7\. Security**

* This module is the app's input validation layer \[project instructions, security\]. Every number that reaches storage passes through it.  
* Regex-based parsing only: no `eval`, no `Function`, no `parseFloat` leniency (`parseFloat("72abc")` \= 72 would hide typos).  
* Error messages render as plain text (React default); the raw input is never inserted as HTML.  
* No logging of entered values in production builds.  
* No dependencies outside the TypeScript standard library. No network.

## **8\. Acceptance criteria**

`date = "2026-11-14"`, `rules` \= shipped `rules.json` after the §5.3 change.

1. **Day-40 typo.** `checkEntry({metric:"heart_rate", raw:"920"})` → `ok:false`, `code:"out_of_range"`, `range:{min:20,max:250,unit:"bpm"}`.  
2. **Correct value.** `raw:"80"` → `ok:true`, `reading` deep-equals `{date:"2026-11-14", metric:"heart_rate", value:80, context:"rest", valid:true}`.  
3. **Comma.** body\_temp `"36,8"` → value 36.8.  
4. **Bad text.** `"abc"`, `"72 bpm"`, `"1e3"`, `"7..5"` → `not_a_number`. `" 72 "` → ok, 72\.  
5. **Inclusive bounds.** heart\_rate 20 → ok; 250 → ok; 19.9 → out\_of\_range; 250.1 → out\_of\_range.  
6. **BP order.** systolic 80 \+ diastolic 120 → both results `bp_order`, `allOk:false`, `readings:[]`. 120 \+ 80 → both ok. 300 \+ 200 → ok. Systolic 301 → out\_of\_range.  
7. **Glucose.** 0 → ok; 600 → ok; 601 and −1 → out\_of\_range.  
8. **Existing ranges.** sleep\_hours 25 → out\_of\_range; mood 11 → out\_of\_range.  
9. **Body mass and radiation.** body\_mass 70.4 → ok; −5 → out\_of\_range (A-IC3); 500 → ok (no max by decision). radiation\_accumulated 1000 → ok, 1000.1 → out\_of\_range (was 100 / 100.1 before the 15 Nov 2026 change); radiation\_dose\_rate 150 → ok; 100000 → ok, 100001 → out\_of\_range (max added 15 Nov 2026).  
10. **Unknown metric.** `metric:"sugar"` → `unknown_metric`.  
11. **Mixed check-up.** entries heart\_rate "920", sleep\_hours "6.5", glucose "" → results length 2, `skipped:["glucose"]`, `allOk:false`, `readings:[]`. After fixing heart\_rate to "80" → `allOk:true`, 2 readings.  
12. **Exercise context.** body\_temp "39.3" with context "exercise" → reading.context "exercise".  
13. **Duplicate field.** two heart\_rate entries "70" then "72" → one result, value 72\.  
14. **No mutation, determinism.** Input arrays and `rules` are deep-equal before and after; two calls give deep-equal output.  
15. **Data file.** In shipped `rules.json`, `heart_rate.plausible_max === 250` and `bp_diastolic.plausible_min === 20`; `loadRules` (rules-engine spec) still succeeds.

## **9\. Out of scope**

* Colours, thresholds, baselines (rules engine, baseline module).  
* "Suspicious but possible" checks such as a big jump from yesterday: not in MVP, because they need thresholds we do not have \[ANSWER: Lana, Q4\].  
* Unit conversion (e.g. mmol/L → mg/dL). The form uses the units in `rules.json`.  
* Camera or device import. Measurement instructions text (UI).

## **10\. Files**

| Path | Owner |
| :---- | :---- |
| `src/features/input-check/inputCheck.ts` | AI agent |
| `src/features/input-check/inputCheck.test.ts` (criteria 1–15) | AI agent |
| `src/data/rules.json` (§5.3 values only) | AI agent, Ayesha reviews |

## **11\. Estimate and priority**

MVP, critical path (story step 2). Agent \~40 min, Nikita review \~20 min.

## **12\. Assumptions and open questions**

| ID | Item | Who |
| :---- | :---- | :---- |
| A-IC3 | ASSUMPTION: body mass cannot be negative → min 0\. Physical fact, not a medical threshold. | — |
| Q-IC-SRC | OPEN QUESTION: a source line for the Lana ranges in SOURCES.md (e.g. device measuring range or physiology reference). | Ayesha |

## **13\. Self-check**

| Check |  |
| :---- | :---- |
| Agent can code without questions | ✓ |
| No invented numbers / libraries | ✓ all ranges from Lana or rules.json; min 0 for mass is physics (A-IC3) |
| Medical thresholds from the table or open | ✓ module has no medical thresholds |
| Inputs/outputs match neighbours | ✓ `Reading` from rules-engine §4.1; output to `HistoryStore.addReadings` |
| Testable criteria with examples | ✓ 15, incl. error and edge cases |
| Security | ✓ |
| MVP and time | ✓ |

&nbsp;

## Audit update — 15 Nov 2026

| metric | min | max | why |
| :--- | :--- | :--- | :--- |
| glucose | **20** (was 0) | 600 | 5.4 typed as mmol/L was accepted as 5.4 mg/dL and raised a false RED (hypoglycaemia). Values 2–33 now get "This looks like mmol/L. Please enter mg/dL (mmol/L × 18, e.g. 5.4 mmol/L = 97 mg/dL)." |
| body_mass | **30** (was 0) | none (team decision) | 0 kg was accepted. |

Tests: criterion 7 updated (0 → out_of_range, 20 → ok); new test for the mmol/L hint and body mass 0.
