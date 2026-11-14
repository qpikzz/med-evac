# SPEC: AI helper (overall picture + free text)  ·  v1.0  ·  14 Nov 2026, 17:50 (Baku)

## 0. Простыми словами (на русском)

Помощник собирает общую картину, когда пожелтели сразу несколько показателей. Он устроен в два слоя.

1. **Проверенные сочетания (обычный код, без нейросети).** Ayesha составила список сочетаний симптомов с источниками (`combinations.json`). Код сверяет сегодняшние результаты правил с этим списком и показывает совпавшие сочетания: «возможные объяснения для обсуждения с медиком» и на что это опирается. Если пожелтело два показателя и больше, а сочетания в списке нет, появляется надпись «Unverified picture — discuss with your crew medical officer». Этот слой работает всегда.
2. **Локальная модель Granite 3.3 через Ollama.** Она пересказывает найденное простыми словами и отвечает, если астронаут что-то пишет. Модель работает на ноутбуке, данные никуда не уходят. Модель не меняет цвет и срочность и не ставит диагноз. Если Ollama не запущена, остаётся первый слой и вежливая надпись.

Если в тексте астронавта есть слова о самоповреждении, код сам, без модели, показывает карточку поддержки из красного правила настроения и не отправляет этот текст модели. Помощник в разделе «желательно», а не MVP [BRIEF §4]. Делаем после основной истории.

## 1. Goal

Show which verified symptom combinations match today's rules-engine result (deterministic, with sources) and, when the local model is available, explain them and answer free-text questions in plain language, without ever changing colour, urgency or escalation.

## 2. Context

```
EvaluationResult + today's flags ──► matchCombinations() ◄── src/data/combinations.json (Ayesha)
            │                               │ MatchedCombination[] + unverified notice
            │                               ▼
            └──────────────► buildPrompt() ──HTTP localhost──► Ollama (granite3.3) ──► plain text
                                    ▲
                     astronaut free text ──► safety check (deterministic) ──► support card (no LLM)
```

- Inputs: `EvaluationResult` [rules-engine §4.1], today's flags, `rules.json`, `combinations.json`, optional `knowledge_base.json` [rules-engine §2.1].
- Rules for the helper [BRIEF §6]: only rules decide colour/urgency/whom to call; main job = overall picture → "possible explanations to discuss with the medic", not a diagnosis; relies on Ayesha's verified combinations and shows what it relies on; unlisted combination → "unverified picture, discuss with the crew medical officer"; listens privately, does not call itself a psychologist or doctor; suggests the crew medical officer on worrying signs; plain words.
- No cloud AI APIs [BRIEF §5].
- Model: Granite 3.3 [ANSWER: Lana, Q7]. In the Ollama library it is `granite3.3` with sizes `2b` and `8b` and the Apache 2.0 license (checked on ollama.com, 14 Nov).

## 3. User scenarios

**S1 — Day-40 picture** [BRIEF §4, step 7]. Heart and sleep are yellow. The helper panel shows immediately (layer 1): either matched combinations from Ayesha's list with "Based on: {source}", or "Unverified picture: heart rate and sleep changed together. Discuss with your crew medical officer." A few seconds later (layer 2) a short plain-language explanation from the model appears under the label "AI explanation - not a diagnosis".

**S2 — Free text.** "I feel tired and my heart feels fast, what should I watch?" → model answer grounded in today's rules and combinations, ending with whom to talk to.

**S3 — Safety.** "I want to hurt myself" → no model call; the support card from `mood_r_flags` (title, explanation, actions) appears, with a button "Open today's check-up" so the astronaut can tick the flag themselves.

**S4 — Ollama off.** Layer 1 only + "The local AI assistant is not running. Showing verified combinations only."

## 4. Data contract

Files in `src/features/ai-helper/`: `combinations.ts`, `safety.ts`, `ollama.ts`, `prompt.ts`, `aiHelper.test.ts`, `__fixtures__/combinations.test.json`.

### 4.1 `src/data/combinations.json` (content from Ayesha's list in the "Rules" chat)

```ts
export type Condition =
  | { type: "indicator"; indicator_id: string; min_level: "yellow" | "red" }
  | { type: "rule"; rule_id: string }
  | { type: "flag"; flag_id: string };

export interface Combination {
  id: string;                         // "combo_sleep_hr"
  title: string;                      // short, EN
  all_of: Condition[];                // at least 2 conditions, all must hold
  possible_explanations: string[];    // phrased "may be related to…", never a diagnosis
  actions: string[];                  // plain steps; may be []
  discuss_with: "crew_medical_officer" | "ground_flight_surgeon";
  source: string;                     // e.g. "PubMed: …" / "NASA HRP: …"
  confidence: "verified" | "needs check";
}
export interface CombinationsFile { schema_version: "1.0"; combinations: Combination[] }
```

If the list in the other chat has a different shape, it is converted to this one (field meaning must not change). The content is **not** written by the agent.

### 4.2 Functions

```ts
export function loadCombinations(json: unknown, rules: RulesFile): CombinationsFile; // throws CombinationsFileError

export interface MatchedCombination { combination: Combination; matched: Condition[] }
export interface PictureResult {
  matched: MatchedCombination[];          // file order
  non_green_indicators: string[];         // yellow/red indicator ids, EvaluationResult order
  unverified: boolean;                    // matched.length === 0 && non_green_indicators.length >= 2
}
export function matchCombinations(ev: EvaluationResult, flagsToday: string[], file: CombinationsFile): PictureResult;

export interface SafetyHit { hit: true; phrase: string } 
export function checkSafety(text: string): SafetyHit | { hit: false };

export interface HelperSettings {
  ollama_url: "http://127.0.0.1:11434";
  model: string;            // default "granite3.3:2b"  (A-AI1)
  timeout_ms: 60000;        // A-AI2
  temperature: 0.2;         // A-AI3
  max_user_chars: 1000;
  max_turns_sent: 10;       // last 10 chat turns go to the model
}

export type LlmResult =
  | { status: "ok"; text: string }
  | { status: "unavailable" }      // fetch failed / connection refused
  | { status: "model_missing" }    // model not in /api/tags
  | { status: "timeout" }
  | { status: "error"; detail: string };

export function buildMessages(args: {
  mode: "explain_today" | "chat";
  ev: EvaluationResult; picture: PictureResult; rules: RulesFile;
  chat: { role: "user" | "assistant"; content: string }[]; // for mode "chat", last item = new user text
}): { role: "system" | "user" | "assistant"; content: string }[];

export async function askModel(messages: ReturnType<typeof buildMessages>, s: HelperSettings,
                               fetchImpl?: typeof fetch): Promise<LlmResult>;
```

### 4.3 Ollama HTTP (local only)
- Availability: `GET {ollama_url}/api/tags` → JSON `{ models: [{ name: string, ... }] }`; model is present if some `name === s.model`. Connection error → `unavailable`; absent → `model_missing`.
- Chat: `POST {ollama_url}/api/chat` with body `{ model, messages, stream: false, options: { temperature } }`; answer text = `response.message.content`.
- Timeout with `AbortController` after `timeout_ms` → `timeout`.
- Any non-2xx → `error` with the status code.

## 5. Logic

### 5.1 `loadCombinations` validation
Throw `CombinationsFileError` (message names the combination id and the bad value) if: `all_of.length < 2`; unknown `indicator_id` / `rule_id` / `flag_id` (checked against `rules.json`); duplicate ids; empty `possible_explanations` or `source`.

### 5.2 `matchCombinations`
- `indicator` condition holds if that indicator's status ≥ `min_level` (red > yellow).
- `rule` holds if the rule id is in any indicator's `triggered`.
- `flag` holds if the flag id is in `flagsToday`.
- A combination matches if **all** conditions hold. The function never reads or changes statuses beyond reading.

### 5.3 Safety check (deterministic, runs before any model call on user text)
`checkSafety` lower-cases the text and looks for any phrase in `SAFETY_PHRASES`:
`["hurt myself", "harm myself", "kill myself", "suicide", "end my life", "don't want to live", "do not want to live", "self-harm"]` (A-AI4).
On a hit: do **not** call the model with that message; show the support card built from `rules.json` rule `mood_r_flags` (`title`, `explanation`, `actions`), plus the button "Open today's check-up". The helper never ticks flags itself; only the astronaut does, through the check-up, so only the rules engine can turn mood red [BRIEF §6].

### 5.4 Prompts (fixed English text, in `prompt.ts`)

System message (verbatim):
```
You are the onboard health explainer of a fictional Mars mission app. The data is SYNTHETIC.
You explain; you do not decide. Colours, urgency and whom to contact are set only by the app's health rules. Never change, soften or question them.
Never give a diagnosis or name a disease as a conclusion. Use "may be related to" and "worth discussing with your crew medical officer".
Use only the facts in the CONTEXT message. If something is not there, say you do not know.
When you mention a combination from the verified list, name its source. If the picture is marked UNVERIFIED, say so.
You are not a doctor or a psychologist. If the astronaut seems distressed, encourage them to talk to the crew medical officer.
Use short, plain sentences. Maximum 120 words.
```
Second message (role `user`, prefix `CONTEXT:`) = JSON-like plain text built by code:
- today's date, overall status and escalation;
- for each non-green indicator: label, status, each triggered rule `title`, `explanation`, `source`, `observed.value`, `observed.baseline`;
- matched combinations: `title`, `possible_explanations`, `actions`, `discuss_with`, `source`; or the line `UNVERIFIED PICTURE: no verified combination matches {labels}`.
Mode `explain_today`: then one user message "Explain today's picture to me in plain words."
Mode `chat`: then the last `max_turns_sent` chat turns, last = the new user text (≤ `max_user_chars`).

No readings history, no other days, no knowledge_base text in v1 (keeps prompts short for a small model).

### 5.5 Status protection
The helper receives `EvaluationResult` as read-only data and returns only text. Its output is never parsed or fed back into the rules engine, the store or the Earth link.

## 6. UI behaviour

| Situation | Text (EN) |
|---|---|
| Panel header | "Overall picture" |
| Matched combination | title + "Possible explanations to discuss with your crew medical officer:" + list + "Based on: {source}" |
| Unverified | "Unverified picture: {labels} changed together. Discuss with your crew medical officer." |
| Nothing non-green | "No combined changes today." |
| Model text label | "AI explanation - not a diagnosis. Colours and urgency come from the health rules." |
| unavailable | "The local AI assistant is not running. Showing verified combinations only." |
| model_missing | "The local AI model is not installed (run: ollama pull {model}). Showing verified combinations only." |
| timeout / error | "The AI assistant did not answer. Showing verified combinations only." |
| Input placeholder | "Ask about today's results or tell me how you feel. Stays on this device." |
| Input too long | "Please keep it under 1000 characters." |

Layer 1 renders immediately; layer 2 shows a small "thinking…" state, never blocks the rest of the app.

## 7. Security and privacy

- Model runs locally through Ollama on `127.0.0.1`; no cloud API, no keys, no secrets [BRIEF §5].
- Chat text lives only in component state: not written to the store, disk, logs or the Earth message [specs/earth-link.md §5.2]. Cleared when the app closes.
- Model output rendered as plain text, never as HTML/Markdown-to-HTML.
- Tauri webview → `http://127.0.0.1:11434`: if the app has a Content Security Policy, `connect-src` must allow exactly this origin. Ollama may reject the webview origin (CORS); if so, start Ollama with `OLLAMA_ORIGINS` set to the app origin. VERIFY: Nikita on the demo laptop.
- Licenses for SOURCES.md and the "Use of AI" section: Granite 3.3 (IBM, Apache 2.0), Ollama (verify license on its GitHub repo before listing).
- No `eval`; no tool/function calling enabled for the model.

## 8. Acceptance criteria

Fixture `__fixtures__/combinations.test.json` (TEST ONLY, labelled not medical):
`combo_test_hr_sleep`: all_of `[{indicator heart_rate ≥ yellow}, {indicator sleep_hours ≥ yellow}]`; `combo_test_flag`: all_of `[{rule hr_y_baseline}, {flag cough}]`.

1. **Day-40 match.** Day-40 evaluation [synthetic-data #6] → `matched` = [combo_test_hr_sleep], `unverified:false`, `non_green_indicators` = ["heart_rate","sleep_hours"].
2. **Unverified.** Same evaluation with an empty combinations list → `unverified:true`.
3. **Single change.** Only sleep yellow → `unverified:false`, `matched:[]`.
4. **Rule + flag.** Day-40 + flags ["cough"] → combo_test_flag matched; without the flag → not matched.
5. **Validation.** combination with `indicator_id:"heart"` → `CombinationsFileError` mentioning the combo id and "heart"; `all_of` of length 1 → error.
6. **Ollama down.** `fetchImpl` rejects → `{status:"unavailable"}`; panel shows layer 1 + unavailable text.
7. **Model missing.** `/api/tags` returns `{models:[{name:"llama3:8b"}]}` → `{status:"model_missing"}`.
8. **Request shape.** For `explain_today`, the POST body has `model` = settings model, `stream:false`, `options.temperature:0.2`; `messages[0]` is the exact system text; `messages[1]` starts with "CONTEXT:" and contains "Heart rate differs from your normal" and "TABLE: Sleep hours, YELLOW".
9. **Answer.** Mock returns `{message:{content:"<b>Rest</b>"}}` → `{status:"ok", text:"<b>Rest</b>"}`, rendered literally.
10. **Safety.** `checkSafety("I want to HURT MYSELF")` → hit; in chat flow `fetchImpl` is **not** called and the card shows the `mood_r_flags` title "You deserve support right now".
11. **Timeout.** mock never resolves, `timeout_ms` 50 in test → `{status:"timeout"}`.
12. **Limits.** 1001-char input rejected; chat with 15 turns sends only the last 10 (+ system + context).
13. **No status change.** `ev` deep-equal before/after `matchCombinations`, `buildMessages`, `askModel`.
14. **Shipped combinations.** When Ayesha's file is added: `loadCombinations(combinations.json)` succeeds. (Skipped test until the file exists.)

## 9. Out of scope

Diagnosis; changing colours; cloud models; voice; images; memory between sessions; a "therapist" persona; tool calling; streaming tokens (optional polish later); writing the medical content of combinations.

## 10. Files

| Path | Status | Owner |
|---|---|---|
| `src/data/combinations.json` | content exists in the "Rules" chat → convert to §4.1 | Lana + Ayesha |
| `src/features/ai-helper/*.ts` + tests (criteria 1–13) | to write | AI agent |
| Helper panel UI, Ollama setup on the demo laptop | to do | Nikita |

## 11. Estimate and priority

Desirable, not MVP [BRIEF §4]. Layer 1 (matcher + panel): ~45 min agent + 30 min Nikita, worth doing because it closes story step 7 without the model. Layer 2 (Ollama): ~1 h agent + 1 h Nikita. Start only after the Day-40 core (input check → baseline → rules → body map) is merged.

## 12. Assumptions and open questions

| ID | Item | Who |
|---|---|---|
| A-AI1 | ASSUMPTION: default size `granite3.3:2b` (faster on a laptop without a GPU); switch to `granite3.3:8b` if answers are weak and speed is fine. | Nikita |
| A-AI2 | ASSUMPTION: 60 s timeout (engineering value, not medical). | Nikita |
| A-AI3 | ASSUMPTION: temperature 0.2 to keep answers close to the context. | Nikita |
| A-AI4 | ASSUMPTION: the safety phrase list is a UI safeguard written by Claude, not a clinical tool. | Ayesha + Lana review wording |
| Q-AI-COMBO | OPEN QUESTION: paste Ayesha's combination list (from the "Rules" chat) into `combinations.json` in the §4.1 shape. | Lana |
| Q-AI-CORS | VERIFY: Tauri CSP and Ollama origins on the demo laptop. | Nikita |

## 13. Self-check

| Check | |
|---|---|
| Agent can code without questions | ✓ (fixture lets tests run before the real list exists) |
| No invented numbers / libraries | ✓ Granite 3.3 tags and Apache 2.0 checked on ollama.com; Ollama `/api/tags` and `/api/chat` are its documented local endpoints; engineering values marked ASSUMPTION |
| Medical content from Ayesha | ✓ combinations come only from her list; the fixture is test-only |
| Matches neighbours | ✓ EvaluationResult, rules.json, Earth link excludes chat |
| Testable criteria | ✓ 14 |
| Security | ✓ |
| MVP and time | ✓ marked desirable, layer 1 cheap |
