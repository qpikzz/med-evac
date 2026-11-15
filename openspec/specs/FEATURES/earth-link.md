# SPEC: Earth link (delayed message to the flight surgeon)  ·  v1.0  ·  14 Nov 2026, 17:25 (Baku)

## 0. In simple terms 

On the way to Mars, you can’t call a doctor: the signal takes up to ~20 minutes to travel one way [BRIEF §4]. Therefore, communication with Earth is like sending a letter with a delay. The module compiles a draft message based on the results of the rules: what turned yellow or red, which rules were triggered and from which sources, measurements from the past 7 days, and the astronaut’s note. Only the astronaut sends it, after reviewing it.

When the status is red, the draft is generated automatically but is not sent. In the app’s second window, “Earth,” you can see that the message is on its way and when it will arrive. The content appears only after it “arrives.” Earth then automatically replies with “Received, under review (simulated),” and this reply is also delayed. To keep the demo within 30 seconds, time has been sped up 60 times, and this is clearly stated on the screen. The diary and conversations with the AI are not included in the message at all. If the mood turns red, the message is marked as private.

## 1. Goal

Build a reviewable message from the rules-engine result, let the astronaut send it, and simulate its one-way delay to a second "Earth" window and a delayed simulated receipt back, without any network.

## 2. Context

```
EvaluationResult + HistoryStore ──► buildDraft() ──► Send panel (astronaut reviews, edits note, presses Send)
                                                           │ EarthLinkTransport.send(message)
                                                           ▼
                                     Earth window (second Tauri window, label "earth")
                                     shows "in transit" → content after arrival
                                                           │ auto receipt "Received, under review (simulated)"
                                                           ▼
                                     Main window shows "acknowledged" after the return delay
```

- Inputs: `EvaluationResult` [specs/rules-engine.md §4.1]; `HistoryStore` [specs/synthetic-data.md §4.3]; `rules.json` (labels); mission clock.
- Escalation levels: self → crew medical officer → flight surgeon on Earth, a delayed message, not a live call [BRIEF §4]. Not live telemedicine [BRIEF §4, "Не делаем"].
- Challenge link: Q4 "when does a result need the crew or flight surgeons on the ground" → red = ground [rules.json escalation]; hazard "distance from Earth" is shown by the delay [Project Details].

## 3. User scenarios

**S1 — Red status.** A flag `irregular_heartbeat` makes heart red. A banner appears: "A message for the flight surgeon is ready. Review and send." The panel shows the draft. The astronaut adds a note and presses Send. The main window shows "In transit to Earth — arrives in 20 min (simulated)". The Earth window shows an incoming message with a countdown; at arrival the content becomes visible. 20 simulated minutes later the main window shows "Received, under review (simulated)".

**S2 — Day-40 yellow.** No auto-draft. The astronaut can still press "Send to Earth" on any screen; the draft contains heart and sleep.

**S3 — Mood red.** `self_harm_thoughts` → the message is marked private, recipient "Flight surgeon and behavioral health support (private)".

**S4 — Green.** Send is available; the draft says all indicators are within the normal range.

## 4. Data contract

Files in `src/features/earth-link/`: `settings.ts`, `message.ts` (types + pure functions), `transport.ts`, `earthLink.test.ts`.

### 4.1 Settings

```ts
export const EARTH_LINK = {
  one_way_delay_minutes: 20,   // illustrative upper bound [BRIEF §4 "до ~20 минут"]; source link: OPEN Q-EL-SRC
  demo_time_scale: 60,         // 1 simulated minute = 1 real second [ANSWER: Lana, Q8]
  note_max_chars: 500,
} as const;
```

### 4.2 Types

```ts
import type { EvaluationResult, Status, Escalation, Reading } from "../../rules/types";

export type MessageKind = "medical" | "private_behavioral";
export type MessageState = "draft" | "in_transit" | "acknowledged";

export interface EarthMessageContent {
  synthetic: true;
  astronaut_id: string;                    // "SYN-01"
  mission_date: string;                    // "2026-11-14"
  mission_day: number;                     // 40
  overall_status: Status;
  overall_escalation: Escalation | null;
  indicators: {                            // only status yellow or red, in EvaluationResult order
    indicator_id: string;
    label: string;                         // from rules.json indicators[].label
    status: "yellow" | "red";
    triggered: { rule_id: string; level: "yellow" | "red"; title: string; source: string;
                 observed?: EvaluationResult["indicators"][number]["triggered"][number]["observed"] }[];
  }[];
  flags_today: { id: string; label: string }[]; // ticked flags whose indicator_ids include a listed indicator
  recent_readings: Reading[];              // §5.2
  astronaut_note: string | null;
  rules_version: string;
}

export interface EarthMessage {
  id: string;                              // `msg-${mission_date}-${n}`, n = 1,2,... per date
  kind: MessageKind;
  recipient_label: string;                 // §5.3
  content: EarthMessageContent;
  state: MessageState;
  sent_at_ms: number | null;               // real epoch ms when Send pressed
  arrives_at_ms: number | null;            // sent_at_ms + delayMs()
  receipt_at_ms: number | null;            // arrives_at_ms + delayMs()
  receipt_text: "Received, under review (simulated)" | null;
}
```

### 4.3 Functions (pure unless noted)

```ts
export function delayMs(): number; // one_way_delay_minutes * 60_000 / demo_time_scale  → 20_000
export function shouldAutoDraft(ev: EvaluationResult): boolean;           // ev.overall_status === "red"
export function buildDraft(args: {
  evaluation: EvaluationResult; store: HistoryStore; rules: RulesFile;
  flagsToday: string[]; missionDay: number; note?: string; existingIdsToday: number;
}): EarthMessage;                                                          // state "draft"
export function validateNote(note: string): { ok: true } | { ok: false; message: string };
export function send(msg: EarthMessage, nowMs: number): EarthMessage;     // draft → in_transit, sets times
export interface MessageView {
  side: "astronaut" | "earth";
  state: "draft" | "in_transit" | "delivered" | "acknowledged";
  simulated_minutes_left: number | null;  // ceil, for countdown
  content_visible: boolean;               // earth side: only after arrival
  text: string;                           // §6
}
export function viewMessage(msg: EarthMessage, side: "astronaut" | "earth", nowMs: number): MessageView;
```

### 4.4 Transport (`transport.ts`)

```ts
export interface EarthLinkTransport {
  send(msg: EarthMessage): Promise<void>;
  onMessage(cb: (msg: EarthMessage) => void): () => void; // returns unsubscribe
}
export function createInMemoryTransport(): EarthLinkTransport; // tests and browser dev
export function createTauriTransport(): EarthLinkTransport;    // Tauri event "earth-link:message"
```
- Tauri implementation uses `emit` / `listen` from `@tauri-apps/api/event` (Tauri v2 JS API), event name `earth-link:message`, payload = the `EarthMessage` JSON.
- Both windows keep their own in-memory message list keyed by `id` (a newer copy replaces an older one). The **receipt is not a separate event**: both sides compute it from `receipt_at_ms` (see §5.4), so no Earth → astronaut event is needed.
- Choose the transport once at start: Tauri if running inside Tauri, else in-memory. Detection: Nikita uses the check available in the installed `@tauri-apps/api` version (e.g. `isTauri()` from `@tauri-apps/api/core` if present). VERIFY: Nikita.

## 5. Logic

### 5.1 Auto-draft
When a new `EvaluationResult` arrives and `shouldAutoDraft` is true, and there is no draft or in-transit message for today, the app creates a draft with `buildDraft` and shows the banner. **Nothing is ever sent automatically** [ANSWER: Lana, Q9].

### 5.2 Draft content
- `indicators`: every indicator with status yellow or red, with its `triggered` rules (copy `rule_id, level, title, source, observed`).
- `recent_readings`: from `store.getReadings()`, readings with date in `day(6)..day(0)` (7 calendar days ending today) whose metric's `indicator_id` is in `indicators`. Sorted by date, then metric order of `rules.metrics`. Green → `[]`.
- `flags_today`: ticked flags whose `indicator_ids` intersect the listed indicators, with labels from `rules.json`.
- `astronaut_note`: trimmed note or `null` if empty. Must pass `validateNote` (≤ 500 chars).
- **Never included:** diary, AI-helper chat, free text other than the note, data of other days, raw invalid entries. There are no fields for them.

### 5.3 Kind and recipient
- `private_behavioral` if any triggered rule of indicator `mood` has level red; else `medical`.
- `recipient_label`: medical → `"Flight surgeon (Earth)"`; private → `"Flight surgeon and behavioral health support (Earth) - private"` (wording from rules.json action of `mood_r_flags`).

### 5.4 Times and states
- `send`: `state = "in_transit"`, `sent_at_ms = now`, `arrives_at_ms = now + delayMs()`, `receipt_at_ms = arrives_at_ms + delayMs()`, `receipt_text` stays null until shown. Sending a message that is not `draft` returns it unchanged (idempotent).
- `viewMessage` (derived from `nowMs`, no stored timers):

| side | condition | state | content_visible |
|---|---|---|---|
| astronaut | state draft | draft | true |
| astronaut | now < receipt_at | in_transit | true |
| astronaut | now ≥ receipt_at | acknowledged | true |
| earth | now < arrives_at | in_transit | false |
| earth | now ≥ arrives_at | delivered | true |

- `simulated_minutes_left` = `ceil((target − now) × demo_time_scale / 60_000)` where target = receipt_at (astronaut) or arrives_at (earth); `null` when not in transit.
- UI re-renders every 1 s (`setInterval`); state comes only from `viewMessage`.

## 6. UI behaviour

| Where | Text (EN) |
|---|---|
| Banner on red | "A message for the flight surgeon is ready. Review and send." |
| Send panel title | "Message to Earth — {recipient_label}" |
| Green draft body | "All indicators are within your normal range." |
| Astronaut, in transit | "In transit to Earth — answer expected in {n} min (simulated)." |
| Astronaut, acknowledged | "Received, under review (simulated)." |
| Earth, in transit | "Incoming message — arrives in {n} min." (content hidden) |
| Earth, delivered | full content: status, indicators with rule titles and "Source: …", 7-day readings table, flags, note, label "SYNTHETIC" |
| Both windows, always | "Demo: time accelerated ×60. Real one-way delay up to ~20 min." |
| Private message | badge "Private" on both sides |

The Earth window is titled "Earth — Flight Surgeon (simulated)". It never offers medical advice text of its own; there is no reply editor in v1 [ANSWER: Lana, Q10].

## 7. Security and privacy

- No network. The "Earth" is a second local window; messages travel only through Tauri local events or in memory.
- Astronaut controls sending: explicit Send click; preview shows the full content before sending [project description: data under the astronaut's control].
- Data minimisation: only the fields in §4.2. Diary and AI chat cannot be attached.
- All text (note, titles) rendered as plain text; never `dangerouslySetInnerHTML`.
- Tauri: the second window is declared in `tauri.conf.json` (label `earth`); the capability file grants only the event permissions both windows need (Tauri v2 capabilities; exact permission ids: VERIFY Nikita, e.g. the core event default set). No shell, fs or http permissions for this module.
- No logging of message content in production.

## 8. Acceptance criteria

Settings as in §4.1, so `delayMs() === 20000`. `t0 = 1_000_000`.

1. **Delay.** `send(draft, t0)` → `arrives_at_ms = t0 + 20000`, `receipt_at_ms = t0 + 40000`, state `in_transit`.
2. **Earth view.** at `t0 + 10000` → earth `in_transit`, `content_visible:false`, `simulated_minutes_left` 10; at `t0 + 20000` → `delivered`, visible.
3. **Receipt.** astronaut at `t0 + 39999` → `in_transit` (minutes_left 1); at `t0 + 40000` → `acknowledged`, text "Received, under review (simulated)."
4. **Day-40 draft.** Evaluation from synthetic data day 40 [synthetic-data #6] → indicators = heart_rate, sleep_hours (in that order); triggered `hr_y_baseline`, `sleep_y_avg7`; `recent_readings` = 14 readings (heart_rate and sleep_hours, 2026-11-08..14); kind `medical`; `shouldAutoDraft` false.
5. **Red auto-draft.** Same data + flag `irregular_heartbeat` → `shouldAutoDraft` true; heart_rate red via `hr_r_irregular`; `flags_today` contains `{id:"irregular_heartbeat", label:"Irregular or skipping heartbeat"}`; kind `medical`.
6. **Private.** flag `self_harm_thoughts` → kind `private_behavioral`, recipient label contains "behavioral health" and "private".
7. **Green.** all-green evaluation → `indicators: []`, `recent_readings: []`, draft still builds.
8. **Note.** 501 chars → `validateNote` fails with "Note is too long (max 500 characters)."; empty note → `astronaut_note: null`; note `"<b>hi</b>"` is stored as-is and rendered literally.
9. **Minimal content.** `Object.keys(content)` equals exactly the 11 fields in §4.2; `content.synthetic === true`.
10. **Idempotent send.** `send(send(draft,t0), t0+5000)` → times unchanged.
11. **Transport.** In-memory transport: a listener receives the sent message deep-equal; after unsubscribe it receives nothing.
12. **IDs.** second draft on the same date → id `msg-2026-11-14-2`.
13. **Purity.** `buildDraft` does not mutate the evaluation or the store.

## 9. Out of scope

Real network sending, live chat or calls, a flight-surgeon reply editor, message history persistence after restart, encryption (nothing leaves the device), sending images, auto-send.

## 10. Files

| Path | Owner |
|---|---|
| `src/features/earth-link/settings.ts`, `message.ts`, `transport.ts` | AI agent |
| `src/features/earth-link/earthLink.test.ts` (criteria 1–13, in-memory transport, injected `nowMs`) | AI agent |
| Send panel, banner, Earth window UI, `tauri.conf.json` window `earth`, capability file | Nikita |

## 11. Estimate and priority

MVP [BRIEF §4]. Agent ~1 h (logic + tests), Nikita ~1 h (two windows, Tauri events, UI). Not on the Ч+12 critical path: do after the Day-40 core works.

## 12. Assumptions and open questions

| ID | Item | Who |
|---|---|---|
| Q-EL-SRC | OPEN QUESTION: NASA / ESA source link for "up to ~20 min one-way signal delay to Mars" → SOURCES.md and the on-screen note. | Ayesha |
| A-EL1 | ASSUMPTION: receipt is computed from timestamps, so the Earth window does not need to send events back (simpler, fewer Tauri permissions). | Lana |
| A-EL2 | ASSUMPTION: the delay is fixed at the upper bound, 20 min (the real value depends on Mars distance; we label it illustrative). | Lana |
| A-EL3 | ASSUMPTION: messages are lost on restart (in memory), acceptable for the demo. | Lana |

## 13. Self-check

| Check | |
|---|---|
| Agent can code without questions | ✓ (Tauri detection and permission ids marked VERIFY for Nikita, outside agent code) |
| No invented numbers / APIs | ✓ 20 min from brief, ×60 from Lana; `@tauri-apps/api/event` emit/listen are real Tauri v2 APIs; uncertain items marked VERIFY |
| Medical thresholds | ✓ none; red/yellow come from the rules engine |
| Matches neighbours | ✓ EvaluationResult, HistoryStore, Reading, rules.json labels |
| Testable criteria | ✓ 13 |
| Security | ✓ |
| MVP and time | ✓ |

## Audit update — 15 Nov 2026 (implementation v2: async chat)

The module is now an asynchronous chat (`src/features/earth-link/chat.ts`, `EarthLinkPanel.tsx`) instead of a single message object. Behaviour kept from v1, as implemented:
- **Red status:** the Main screen shows "A message for the flight surgeon is ready. Review and send." with **Review draft**; it opens Comms → Earth with a draft built only from the rules result (`buildEarthDraftText`: overall status, red then yellow indicators with rule titles, "Telemetry attached"). The astronaut reviews, edits and presses Send. Telemetry is attached by default (checkbox).
- **Delay:** one-way ~20 min shown ×60 faster (20 s); messages show "Transmitting (×60 demo)…" until they arrive.
- **Automatic receipt:** when an astronaut message arrives, Earth sends "Received — under review by the flight surgeon. (Automatic receipt, simulated.)", which takes the same delay back (`pendingReceipts`, `createAutoReceipt`). A real reply typed in the Flight Surgeon profile makes the receipt unnecessary.
- **Dates:** messages show the mission date for their mission day (Day 40 = 14 Nov 2026), never the computer clock.
