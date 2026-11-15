# Feature Specification: Body Map (2D, layered) + Dark Space Theme — ORBITA

- **Status:** Implemented (merged in qpikzz/med-evac#1)
- **Version:** 1.0 · 14 Nov 2026, 20:15 (Baku)
- **Applies to:** `src/components/BodyMap/*`, `src/components/InteractiveBody3DMap.tsx`, `src/styles/theme.css`, `src/components/Header.tsx`
- **Design system:** `DESIGN.md` v2.0

---

## 0. Простыми словами (на русском)
Карта тела — главный экран. Это 2D-фигура человека с тремя слоями: кожа, органы, скелет. Зоны на фигуре
светятся цветом из движка правил (зелёный / жёлтый / красный / нет данных). По клику на зону открывается
карточка показателя. Модуль сам ничего не решает: он только рисует то, что дал движок правил. Плюс
тёмная минималистичная «космическая» тема для всего приложения.

## 1. Goal
Render the Rules engine's `EvaluationResult` as a calm, dark, layered 2D human figure where each body zone shows the
worst status of its indicators and opens the indicator card on click — without making any health decision itself.

## 2. Context
```
Rules engine ──EvaluationResult──► BodyMap (this) ──onSelect(zone)──► Indicator cards (existing)
rules.json ─────(which rules are enabled)──► BodyMap
```
- Reads types from `src/rules/types.ts` (`EvaluationResult`, `IndicatorResult`, `Status`, `RulesFile`).
- Does NOT import or call the engine. Parent passes `result` in. This makes it testable with mock data.
- Out of scope: engine, rules.json, storage, check-up form, charts, Earth window, AI helper.
- If a body map component already exists in the repo, replace its internals and keep its export name and file
  location so the parent does not change. Report which files changed.

## 3. User scenarios
- **S1 Day 40.** Heart zone and brain zone glow yellow; other zones green; radiation shows "Monitoring only".
  The astronaut clicks the heart → heart-rate card opens.
- **S2 Red flag on a hidden layer.** Skin layer is hidden, astronaut is on Organs. A red skin status still shows a
  red badge on the "Skin" layer tab, so nothing red is ever invisible.
- **S3 Before first check-up.** `result = null` → all zones neutral, caption "No check-up yet today".

## 4. Inputs and outputs (contract)

```ts
// src/components/BodyMap/BodyMap.tsx
export interface BodyMapProps {
  result: EvaluationResult | null;
  rules: RulesFile;                       // used only to detect monitoring-only indicators
  selectedZone?: ZoneId | null;
  onSelect: (zone: ZoneId, indicatorIds: string[]) => void;
}
export type LayerId = "skin" | "organs" | "skeleton";
export type ZoneId = "brain" | "heart" | "blood" | "immune" | "skin" | "radiation" | "musculoskeletal";
```

### 4.1 Zones (put in `src/components/BodyMap/zones.ts`, one config object, easy to edit)

| ZoneId | Layer | Indicator ids (from rules.json) | Label (EN) | Hazard link (tooltip line) |
|---|---|---|---|---|
| brain | organs | sleep_hours, mood | Brain · Sleep & mood | Isolation & confinement |
| heart | organs | heart_rate, blood_pressure | Heart · Rate & pressure | Altered gravity (fluid shift) |
| blood | organs | blood_sugar | Blood · Glucose | Hostile closed environment |
| immune | organs | immune_signs | Immune system | Radiation, closed environment |
| skin | skin | skin_health, body_temperature | Skin · Temperature | Hostile closed environment |
| radiation | skin | radiation_dose | Radiation dose (whole body) | Space radiation |
| musculoskeletal | skeleton | body_mass | Bones & muscle · Body mass | Altered gravity |

Hazard names are the five HRP hazards from the brief. Each zone has hotspot coordinates in the SVG viewBox
(`0 0 400 800`) stored in the same config, so Rəna/Lana can move them without touching code.
Radiation is drawn as a soft outline/aura around the whole body, not as a point.

### 4.2 Zone status
1. Collect `IndicatorResult` for the zone's indicator ids.
2. **Monitoring-only:** an indicator whose rules in `rules.json` are ALL `enabled: false` is excluded from the colour
   and shown as "Monitoring only — limits are set by mission flight surgeons." (Today: none — see §11; radiation_dose
   has enabled event rules, so it is coloured by the engine like any other zone.)
   If all indicators of a zone are monitoring-only → zone style `monitoring` (neutral, dashed outline).
3. Zone status = worst of the remaining: red > yellow > green > no_data.
4. Layer tab badge = worst zone status on that layer.
5. `result === null` → every zone `no_data`.
The component never changes, softens or recomputes a status. It only takes the worst.

## 5. Visual rules

### 5.1 Layers and art
- Three layers, switched by tabs "Skin · Organs · Skeleton" (default: Organs). Only one visible at a time,
  with a 200 ms cross-fade.
- Base art per layer is loaded from `src/assets/body/` (`skin.*`, `organs.*`, `skeleton.*`, SVG or transparent PNG
  from Rəna). Art is decoration only; status colour is drawn by an SVG hotspot layer ON TOP of the art.
- If a file is missing, draw a simple minimal line-art placeholder silhouette in SVG so the app always works.
- Assets are bundled locally (imports), never loaded from the network.

### 5.2 Dark space theme (`src/styles/theme.css`, CSS variables, applied app-wide)
Use Rəna's palette if `src/styles/palette` or her values exist; otherwise these defaults:
```
--bg: #0B0F1A;  --surface: #121829;  --surface-2: #1A2238;  --border: #263049;
--text: #E6EAF2; --text-muted: #8A94A8; --accent: #7AA2FF;
--status-green: #3DDC97; --status-yellow: #FFC857; --status-red: #FF5C6C; --status-none: #5B6478;
```
- Background: `--bg` with a very subtle starfield made of CSS radial-gradients (no image files).
- Cards: `--surface`, radius 12 px, 1 px `--border`, spacing on an 8 px scale.
- Typography: system font stack or a locally bundled open-licence (OFL) font. No Google Fonts / CDN.
  Max 3 text sizes. Small uppercase muted labels for section titles.
- ~~Header shows "Day 40 · Mars transit" and a visible "SYNTHETIC DATA" badge.~~ Superseded by the header-polish task:
  header shows `Day 40 · <date>`; the "SYNTHETIC DATA" badge is on the daily check-up card.
- Status is never colour-only: every zone/tab/card also shows a text word (OK / Watch / Alert / No data /
  Monitoring) and a simple icon (✓ / ! / !! / – / ◌).
- Glow: yellow zones pulse slowly (2.5 s), red faster (1.2 s), green static, no_data dim.
  All animation off when `prefers-reduced-motion: reduce`.
- Minimal: no gradients on text, no more than one accent colour, no decorative clutter.

### 5.3 Interaction and accessibility
- Hover/focus on a zone → small tooltip: label, status word, hazard line.
- Click or Enter/Space on a zone → `onSelect(zoneId, indicatorIds)`; selected zone gets a white 2 px ring.
- Each hotspot: `role="button"`, `tabIndex=0`, `aria-label` like "Heart: Watch — tell your crew medical officer".
- Layer tabs are keyboard-accessible buttons.

## 6. Security and honesty
- No network requests of any kind (no CDN fonts, images, scripts).
- No new npm dependencies **inside the BodyMap module** (React + CSS/SVG only). The app elsewhere uses `recharts` and `motion` (see `SOURCE.md`).
- No `dangerouslySetInnerHTML`; all texts rendered as plain text.
- No NASA logo or NASA branding in the art or UI. Space Apps branding only, per brand guidelines.
- Images: own drawings or open-licence (CC0 / CC-BY) only → add to SOURCES.md. AI-generated images → add a
  visible "AI-generated illustration" note in the About/Credits screen and in SOURCES.md.
- No disease names or diagnoses anywhere in this module.

## 7. Acceptance criteria
Mocks go to `src/components/BodyMap/mocks.ts`.
1. **Day 40 mock** (heart_rate yellow, sleep_hours yellow, rest green, radiation_dose green but all its rules
   disabled) → heart and brain zones yellow; blood, immune, skin, musculoskeletal green; radiation shows
   "Monitoring only" in neutral style (NOT green).
2. **Red on hidden layer:** mock with immune_signs red and skin_health red while Organs is active → immune zone red;
   "Skin" tab shows a red badge.
3. **Click:** clicking the heart calls `onSelect("heart", ["heart_rate","blood_pressure"])`.
4. **Keyboard:** Tab reaches every zone and tab; Enter selects.
5. **No result:** `result = null` → all zones no_data, caption "No check-up yet today".
6. **Missing art:** delete `src/assets/body/organs.*` → placeholder silhouette renders, no crash.
7. **Offline:** with Wi-Fi off, the screen looks identical; devtools Network tab shows no external requests.
8. **Not colour-only:** every status visible as a word as well.
9. `npm run build` passes; existing tests still pass.

## 8. Out of scope
3D, animations of organs, editing rules, any status logic, the indicator card content, charts, gamification.

## 9. Files
| Path | Action |
|---|---|
| `src/components/BodyMap/BodyMap.tsx` | create or replace internals |
| `src/components/BodyMap/zones.ts` | create |
| `src/components/BodyMap/BodyMap.css` | create |
| `src/components/BodyMap/mocks.ts` | create |
| `src/styles/theme.css` | create; import once in the app entry |
| `src/assets/body/*` | from Rəna (optional) |
| anything in `src/rules/`, `src/data/` | DO NOT TOUCH |

## 10. Estimate and priority
MVP (the body map is part of the Day-40 story). Agent ~1–1.5 h, Nikita review/integration ~20 min.

## 11. Implementation Notes (15 Nov 2026)
- **Radiation — decided:** `radiation_dose` is **not** monitoring-only. Its numeric dose limits stay disabled in `rules.json` (`value: null`, set by mission flight surgeons — open question Q-RAD), but two event rules are enabled and must stay on: `rad_y_spe` (solar particle event warning → yellow) and `rad_r_event` (dosimeter unexpectedly high / acute radiation event → red). Switching them off would hide a red. So:
  - the astronaut checks radiation **every day** in the check-up's "Radiation check" block (dose rate, accumulated dose, 3 event toggles);
  - the radiation zone shows the engine's status (`OK` when a dose is recorded and no event is reported — the Day-40 demo now includes illustrative synthetic dose readings; `No data` if no dose is entered; `Watch` / `Alert` on an event);
  - the zone carries a note: "Read your dosimeter at every check-up. Dose limits are set by mission flight surgeons; alerts come from the radiation events you report.";
  - on yellow/red the aura sends out waves and the dashboard shows the animated `RadiationAlert` (see `DESIGN.md` §5.2).
  The AC1 mock still uses a rules copy with all radiation rules disabled, to test the monitoring-only style itself.
- **Existing component kept:** `InteractiveBody3DMap.tsx` keeps its path and exports and wraps `BodyMap`, so `MainDashboard` is unchanged apart from the radiation alert and animations. Its `LayerSwitcher` export renders nothing; the dashboard grid is now 2 columns.
- **Added:** a list of all 7 zones under the figure (status word + icon), so every zone is keyboard-reachable without switching layers. When the parent selects a zone on another layer, the map switches to that layer.
- **Theme:** `theme.css` remaps the older tokens from `App.css` / `Dashboard.css`; hard-coded light colours in those files were replaced with tokens. The "3 text sizes" rule is applied inside the body map and radiation alert; other screens keep their sizes.
- **AC5 in the app:** the dashboard only renders the map after a check-up, so `result = null` is covered by unit tests, not visible in the running app.
- **Tests:** `src/components/BodyMap/bodyMap.test.ts` (AC1, AC2, AC5, AC8, aria-labels, placeholder art) and `src/components/RadiationAlert/radiationAlert.test.ts` (real engine: no event → no alert, SPE → yellow, dosimeter → red). Click/keyboard (AC3, AC4) and offline (AC7) were checked in a browser.
