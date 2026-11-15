# Feature Specification: Mission Access Gate (`login`) — ORBITA

- **Status:** Approved
- **Version:** 1.3
- **Brand:** ORBITA
- **Applies to:** `src/features/auth/*`, `src/components/Header.tsx`, `src/state/AppStateProvider.tsx`

---

## 1. Purpose & Security Model

**ORBITA** replaces traditional username/password authentication with a two-factor, offline-first **Crew NFC Badge + 6-digit PIN** access gate designed for shared orbital medical terminals and Ground Control consoles.

- **Factor 1 (Possession):** Personal crew NFC badge tapped against the terminal reader (`credential_id`). The desktop MVP simulates the tap with demo badge cards and reserves the physical reader integration for the `#TODO(nfc-hardware)` roadmap.
- **Factor 2 (Knowledge):** Personal 6-digit numeric PIN entered via an on-screen tactile keypad (prevents shoulder-surfing and hardware keylogging).
- **Zero-Cloud & Isolation:** No passwords or credential secrets are stored in plain text or sent over the network. Each astronaut profile owns an isolated `HistoryStore` partition (check-ups, personal baselines, Earth drafts).

---

## 2. Pre-Seeded Demo Accounts & Data Isolation

At cold start, the local credential registry (`AuthStore`) contains **3 pre-seeded profiles**:

| Profile ID | Display Name | Role | Credential ID | Pre-seeded History | Demo PIN |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `astro-01` | Cmdr. Alex Vance | `astronaut` | `orbita-nfc-astro-01` | **Full 40-day synthetic history** (`synthetic_history.json`) | `111111` |
| `astro-02` | Dr. Maya Lin | `astronaut` | `orbita-nfc-astro-02` | **Empty `HistoryStore`** (fresh mission start) | `222222` |
| `ground-01` | Flight Surgeon (Houston) | `ground_operator` | `orbita-nfc-ground-01` | Ground Console (`side = "earth"`) | `333333` |

### Data Isolation Rules
1. Switching or logging into `astro-01` vs. `astro-02` loads completely separate `HistoryStore` instances keyed by `profile_id` (`orbita_history_<profile_id>`).
2. `astro-01` starts with the 40-day synthetic mission dataset; `astro-02` starts with zero check-ups (`No Data` state on `Main`).
3. Newly enrolled badges (`astro-03`, etc.) start with an empty `HistoryStore`.

---

## 3. Authentication & Seamless Enrollment Flow

### Step 1 — Factor 1: Crew NFC Badge Tap
When unauthenticated (or after clicking **"Add Account"** / **"Sign Out"**), the app renders the **ORBITA Mission Access Gate** (`LoginScreen`) entirely in English:
- **Primary prompt:** `"Tap NFC Badge to Reader"` with a clean, centered NFC contactless pulse reader icon.
- **Subtitle:** `"Select a demo crew badge below or simulate a new unregistered tag"`.
- **Desktop / Demo Execution:**
  - The MVP presents the pre-seeded demo badge cards as tap targets. Each card shows the crew member's name, role, history state, and a visible `NFC · PIN: {pin}` pill so evaluators can test both existing login and seamless enrollment without an external reader.
  - A dashed `"+ Tap New Unregistered Badge"` action simulates presenting an unknown tag.
- **Lookup:**
  - If `credential_id` exists in `AuthStore` $\rightarrow$ proceed to **Step 2A (PIN Verification)**.
  - If `credential_id` is **unknown** (never seen before) $\rightarrow$ proceed seamlessly to **Step 2B (First-Time Seamless Enrollment)**.

### Step 2A — Known Badge: 6-Digit PIN Entry
- Displays recognized crew member name, role badge, the heading `"Enter 6-Digit PIN"`, and a 6-dot PIN indicator + on-screen numeric keypad (`0–9`, `Backspace`, `Clear`).
- PIN length is strictly **6 digits** (`^\d{6}$`).
- PIN is verified against a salted SHA-256 hash stored in `AuthStore` (never plain text).
- **Brute-Force Lockout Rule:**
  - Every **3 consecutive failed PIN attempts** locks the keypad for **30 seconds** (`lockout_seconds = 30`).
  - Displays a live countdown: `"Too many incorrect attempts. Try again in {s}s."`
  - **Fixed interval:** The lockout duration is **always 30 seconds** per 3 failed attempts (no exponential backoff).

### Step 2B — Seamless Enrollment (New Unknown Badge)
If an unrecognized NFC badge is presented:
1. No separate registration form is required first; the system immediately prompts:
   - `"New badge detected. Create a 6-digit PIN"` (6 digits)
   - Followed by `"Confirm your 6-digit PIN"` (6 digits)
2. Optional crew display name & role (`Astronaut` / `Ground Operator`, defaulting to `Astronaut` with auto-generated callsign if left blank).
3. If the two 6-digit PINs do not match, show `"PINs do not match. Please try again."` and reset to the create-PIN stage.
4. On match, store `{ profile_id, display_name, role, credential_id, pin_hash, salt }` in `AuthStore` and proceed directly to **Step 3**.

### Step 3 — Session Persistence Choice & 5-Minute Auto-Lock
Immediately after valid PIN entry (or new badge enrollment), prompt the user:
- Question: **`"Remember this session?"`**
- Two explicit choices:
  1. **`"No — log out after 5 min of inactivity"`** (`session_mode = "ephemeral"`):
     - Starts an inactivity watchdog timer of **5 minutes (`300,000 ms`)** tracking pointer, keyboard, and touch events.
     - Upon 5 minutes of inactivity, automatically clears the active session and returns to `LoginScreen`.
  2. **`"Yes — keep me signed in"`** (`session_mode = "persistent"`):
     - Keeps the session active without an inactivity timeout until the user explicitly clicks **"Sign Out"**.

---

## 4. Header Profile Dropdown Redesign (`Header.tsx`)

The top-right Profile Switcher in `Header.tsx` must remain anchored strictly on the far right in all roles and states, and its visual styling and interaction must be upgraded:

1. **Trigger Pill Alignment & Fixed Chevron:**
   - Compact pill (`height: 40px`, `padding: 4px 12px 4px 5px`, `gap: 10px`), left circular geometric mission emblem (`30x30px`), two-line label stack (`Display Name` in `13px font-semibold` + `Role` in `11px text-slate-500`).
   - Seeded profile emblems are distinct: blue orbital compass for `astro-01`, cyan-blue biometric pulse for `astro-02`, and indigo telemetry radar for `ground-01`. Custom profile IDs deterministically map to one of these emblems.
   - Replace the jumping ASCII `^`/`v` character with a fixed `14x14px` SVG chevron icon (`lucide-react` `ChevronDown`) that rotates smoothly (`rotate-180`, `transition-transform duration-150`) around its center so it never shifts vertically.
2. **Dropdown Popover Menu (`right: 0`, `min-width: 230px`, `mt-2`):**
   - **Section 1 — Saved Profiles:** Lists available accounts (`Cmdr. Alex Vance`, `Dr. Maya Lin`, `Flight Surgeon (Houston)`, plus any newly enrolled badges) with a checkmark on the active user. Clicking another saved account switches to `LoginScreen` pre-focused on that badge's PIN prompt (or switches immediately if already unlocked in current session).
   - **Divider:** `1px solid` subtle border.
   - **Section 2 — Account Actions:**
     - **`"Add Account"`** — Opens `LoginScreen` in new-badge scan / enrollment mode while preserving existing accounts.
     - **`"Sign Out"`** — Clears the active session (`activeSession = null`) and returns immediately to `LoginScreen` Step 1.
     - **`"Forget account"`** — Opens a confirmation dialog with the title `"Are you sure you want to forget this account?"`, the description `"Your data will not be deleted; the account will only be removed from the displayed account list."`, and `"No"` / `"Yes"` actions. Escape cancels without deleting. Confirmation removes the selected profile only from the saved profile registry and preserves `orbita_history_<profile_id>`. Forgetting the active profile immediately clears its session and returns to `LoginScreen`. Profile IDs with retained history are not reused for new enrollments.

### 4.1 Profile Registry Recovery

- The persisted profile registry is authoritative after its first write. Deleted demo profiles are not automatically reseeded on normal reload.
- If no profiles remain, `LoginScreen` shows a subtle **`Reset Demo Badges`** link. Selecting it explicitly restores the three seeded demo profiles.

---

## 5. Future Hardware Integration Specification (NFC Reader Roadmap)

> **Future Roadmap (`#TODO(nfc-hardware)`):** Replace the demo badge tap targets with a native Tauri Rust PC/SC or Web NFC reader daemon (`tauri-plugin-nfc` / `pcsc` crate).

### Expected NFC Badge NDEF / APDU Payload Schema
When physical NFC cards are provisioned for flight hardware, each badge stores a signed binary/CBOR or JSON record structured as follows:

```json
{
  "schema_version": "orbita.nfc.v1",
  "credential_id": "orbita-nfc-astro-01",
  "crew_uuid": "550e8400-e29b-41d4-a716-446655440001",
  "display_name": "Cmdr. Alex Vance",
  "role": "astronaut",
  "clearance_level": "crew_standard",
  "public_key": "ed25519:MCowBQYDK2VwAyEA...",
  "private_key_slot": "SE_SLOT_01_NON_EXPORTABLE",
  "issued_at": "2026-10-01T00:00:00Z",
  "signature": "ed25519_sig:..."
}
```

- **Security note on `private_key`:** On production NFC smartcards (e.g., DESFire EV3 / JavaCard), the `private_key` resides inside the card's Secure Element (`SE_SLOT_01_NON_EXPORTABLE`) and never leaves the chip; the terminal sends a random 32-byte nonce (`CHALLENGE`) and verifies the card's Ed25519 signature against `public_key`. For software-emulated tags during bench testing, an encrypted `private_key` field may be unwrapped only after the 6-digit PIN derives the key via PBKDF2/Argon2.

---

## 6. Acceptance Criteria

1. Cold start opens **ORBITA** `LoginScreen` displaying `"Tap NFC Badge to Reader"`, the NFC pulse reader icon, and the English demo badge controls; the NFC badge tap is the only Factor 1 path.
2. Logging in as `astro-01` (`PIN: 111111`) loads the 40-day synthetic dataset; logging in as `astro-02` (`PIN: 222222`) loads an empty `HistoryStore` (`No Data`); logging in as `ground-01` (`PIN: 333333`) opens the Ground Operator `Comms` console.
3. Entering a wrong 6-digit PIN 3 times triggers a strict **30-second** lockout countdown; after 30 seconds, 3 more wrong attempts again trigger a **30-second** lockout.
4. Tapping an unknown badge seamlessly triggers `"New badge detected. Create a 6-digit PIN"` $\rightarrow$ `"Confirm your 6-digit PIN"` and creates an isolated profile.
5. After PIN verification, `"Remember this session?"` appears with `"No — log out after 5 min of inactivity"` (auto-logout after 5 minutes of inactivity) and `"Yes — keep me signed in"` (persistent until manual logout).
6. Top-right Profile Switcher uses a centered rotating SVG chevron (zero vertical jump), stays pinned to the far right in all roles, and includes `"Add Account"` and `"Sign Out"` in its dropdown.
7. Each seeded demo badge card displays the crew name, role, history state, and a visible `NFC · PIN: {pin}` pill (`111111`, `222222`, `333333`).
8. The Header uses the three geometric mission emblems; custom profile IDs map deterministically to an emblem variant.
9. Forgetting a profile requires confirmation and removes it from the saved registry without deleting its isolated history. Escape or `"No"` cancels; `"Yes"` confirms. Forgetting the active profile returns to `LoginScreen`; deleted profiles remain removed after reload, and IDs with retained history are not reused.
10. `Reset Demo Badges` is visible only when the profile registry is empty and explicitly restores the seeded demo profiles.