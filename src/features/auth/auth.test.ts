import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import Header from "../../components/Header";
import { AuthProvider } from "./AuthContext";
import LoginScreen from "./LoginScreen";
import { PinDots } from "./PinDots";
import { PinKeypad } from "./PinKeypad";
import { createAuthStore } from "./authStore";
import {
  AUTH_PROFILES_STORAGE_KEY,
  EPHEMERAL_TIMEOUT_MS,
  LOCKOUT_MS,
  LOCKOUT_SECONDS,
  MAX_FAILED_ATTEMPTS,
  PIN_LENGTH,
  ROLE_LABELS,
} from "./constants";
import {
  ENROLLMENT_COPY,
  HEADER_COPY,
  PIN_COPY,
  SCAN_COPY,
  SESSION_COPY,
} from "./copy";
import { createUnknownBadgeId, initials } from "./identity";
import { demoBadgeSummary } from "./demoBadges";
import { hashPin, isValidPin, randomSalt, verifyPinHash } from "./pinCrypto";
import {
  createProfileHistoryStore,
  getProfileHistoryStore,
  historyStorageKey,
  resetProfileHistoryRegistry,
} from "./profileHistory";
import { cloneSeedProfiles } from "./seed";
import {
  createSession,
  landingChannelForRole,
  landingViewForRole,
  shouldUseInactivityWatchdog,
} from "./session";
import { createInactivityTimer } from "./sessionTimer";
import type { StorageLike } from "./types";
import { getToday } from "../synthetic-data/missionClock";

const DEMO_LOGINS = [
  { credential_id: "orbita-nfc-astro-01", pin: "111111", profile_id: "astro-01" },
  { credential_id: "orbita-nfc-astro-02", pin: "222222", profile_id: "astro-02" },
  { credential_id: "orbita-nfc-ground-01", pin: "333333", profile_id: "ground-01" },
] as const;

function createMemoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem(key: string): string | null {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      data.set(key, value);
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetProfileHistoryRegistry();
});

describe("centralized auth constants and UI copy", () => {
  it("defines the spec-mandated numeric constants", () => {
    expect(PIN_LENGTH).toBe(6);
    expect(MAX_FAILED_ATTEMPTS).toBe(3);
    expect(LOCKOUT_SECONDS).toBe(30);
    expect(LOCKOUT_MS).toBe(30_000);
    expect(EPHEMERAL_TIMEOUT_MS).toBe(300_000);
    expect(ROLE_LABELS.ground_operator).toBe("Ground Operator");
  });

  it("keeps the exact English login, enrollment, session, and header strings", () => {
    expect(SCAN_COPY.title).toBe("Tap NFC Badge to Reader");
    expect(SCAN_COPY.subtitle).toBe(
      "Select a demo crew badge below or simulate a new unregistered tag",
    );
    expect(SCAN_COPY.newBadge).toBe("+ Tap New Unregistered Badge");
    expect(PIN_COPY.title).toBe("Enter 6-Digit PIN");
    expect(PIN_COPY.lockout(30)).toBe(
      "Too many incorrect attempts. Try again in 30s.",
    );
    expect(ENROLLMENT_COPY.createPrompt).toBe(
      "New badge detected. Create a 6-digit PIN",
    );
    expect(ENROLLMENT_COPY.confirmPrompt).toBe("Confirm your 6-digit PIN");
    expect(ENROLLMENT_COPY.mismatch).toBe("PINs do not match. Please try again.");
    expect(SESSION_COPY.question).toBe("Remember this session?");
    expect(SESSION_COPY.ephemeral).toBe(
      "No — log out after 5 min of inactivity",
    );
    expect(SESSION_COPY.persistent).toBe("Yes — keep me signed in");
    expect(HEADER_COPY.addAccount).toBe("Add Account");
    expect(HEADER_COPY.logout).toBe("Sign Out");
  });
});

describe("identity helpers", () => {
  it("derives compact initials from display names", () => {
    expect(initials("Cmdr. Alex Vance")).toBe("AV");
    expect(initials("Dr. Maya Lin")).toBe("ML");
    expect(initials("Flight Surgeon (Houston)")).toBe("FS");
    expect(initials("A")).toBe("A");
  });

  it("generates distinct unknown-badge credential IDs", () => {
    const first = createUnknownBadgeId();
    const second = createUnknownBadgeId();
    expect(first).toMatch(/^orbita-nfc-demo-[0-9a-f]{16}$/);
    expect(second).toMatch(/^orbita-nfc-demo-[0-9a-f]{16}$/);
    expect(first).not.toBe(second);
  });
});

describe("demo badge metadata", () => {
  it("exposes the seeded roles, history states, and visible demo PIN hints", () => {
    const store = createAuthStore({ storage: null });
    const profiles = store.getProfiles();

    expect(profiles.map(demoBadgeSummary)).toEqual([
      {
        subtitle: "Astronaut · 40-day history",
        pinLabel: "NFC · PIN: 111111",
      },
      {
        subtitle: "Astronaut · Empty history",
        pinLabel: "NFC · PIN: 222222",
      },
      {
        subtitle: "Ground Operator",
        pinLabel: "NFC · PIN: 333333",
      },
    ]);
  });
});

describe("salted SHA-256 PIN crypto", () => {
  it("validates the strict six-digit PIN format", () => {
    expect(isValidPin("111111")).toBe(true);
    expect(isValidPin("000000")).toBe(true);
    expect(isValidPin("11111")).toBe(false);
    expect(isValidPin("1111111")).toBe(false);
    expect(isValidPin("11111a")).toBe(false);
    expect(isValidPin("")).toBe(false);
  });

  it("hashes with a per-profile salt and never exposes the PIN", async () => {
    const salt = randomSalt();
    const otherSalt = randomSalt();
    const digest = await hashPin("111111", salt);

    expect(salt).toHaveLength(32);
    expect(otherSalt).not.toBe(salt);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).not.toBe("111111");
    expect(await hashPin("111111", otherSalt)).not.toBe(digest);
    expect(await verifyPinHash("111111", salt, digest)).toBe(true);
    expect(await verifyPinHash("111112", salt, digest)).toBe(false);
    expect(await verifyPinHash("111111", salt, "short-hash")).toBe(false);
  });

  it("stores salted hashes instead of plain-text demo PINs", async () => {
    for (const seed of cloneSeedProfiles()) {
      expect(seed.pin_hash).toHaveLength(64);
      expect(seed.pin_hash).not.toMatch(/^\d{6}$/);
      expect(await hashPin(seed.pin_hash, seed.salt)).not.toBe(seed.pin_hash);
    }

    const store = createAuthStore({ storage: null });
    for (const login of DEMO_LOGINS) {
      const profile = store.getProfile(login.credential_id);
      expect(profile).toBeDefined();
      expect(profile?.pin_hash).not.toBe(login.pin);
      expect(profile && (await hashPin(login.pin, profile.salt))).toBe(profile?.pin_hash);
    }
  });
});

describe("AuthStore seed registry and PIN verification", () => {
  it("criterion 1: every demo profile authenticates with its own six-digit PIN", async () => {
    const store = createAuthStore({ storage: null });
    const profiles = store.getProfiles();

    expect(profiles.map((profile) => profile.profile_id)).toEqual([
      "astro-01",
      "astro-02",
      "ground-01",
    ]);
    expect(profiles.map((profile) => profile.role)).toEqual([
      "astronaut",
      "astronaut",
      "ground_operator",
    ]);

    for (const login of DEMO_LOGINS) {
      const result = await store.verifyPin(login.credential_id, login.pin);
      expect(result.ok).toBe(true);
      expect(result.profile?.profile_id).toBe(login.profile_id);
    }
  });

  it("rejects unknown credentials and malformed PINs without arming a lockout", async () => {
    const store = createAuthStore({ storage: null });

    const unknown = await store.verifyPin("orbita-nfc-missing", "111111");
    expect(unknown).toMatchObject({ ok: false, reason: "unknown_credential", remainingMs: 0 });

    const malformed = await store.verifyPin("orbita-nfc-astro-01", "12345");
    expect(malformed).toMatchObject({ ok: false, reason: "invalid_format", remainingMs: 0 });
    expect(store.getFailedAttempts("orbita-nfc-astro-01")).toBe(0);
  });

  it("returns defensive copies instead of mutable profile records", () => {
    const store = createAuthStore({ storage: null });
    const profile = store.getProfile("orbita-nfc-astro-01");
    if (!profile) {
      throw new Error("Expected the seeded astro-01 profile");
    }
    profile.display_name = "Tampered";
    expect(store.getProfileById("astro-01")?.display_name).toBe("Cmdr. Alex Vance");
  });
});

describe("per-profile history isolation", () => {
  it("criterion 2: astro-01 loads synthetic history while astro-02 starts empty", () => {
    const astroOne = createProfileHistoryStore({
      profile_id: "astro-01",
      history_seed: "synthetic",
    });
    const astroTwo = createProfileHistoryStore({
      profile_id: "astro-02",
      history_seed: "empty",
    });
    const ground = createProfileHistoryStore({
      profile_id: "ground-01",
      history_seed: "empty",
    });

    const astroOneDates = new Set(astroOne.getReadings().map((reading) => reading.date));
    expect(astroOne.getPreflight().length).toBeGreaterThan(0);
    expect(astroOne.getReadings().length).toBeGreaterThan(0);
    expect(astroOneDates.size).toBe(40);
    expect(astroOne.hasCheckup(getToday())).toBe(true);

    expect(astroTwo.getPreflight()).toEqual([]);
    expect(astroTwo.getReadings()).toEqual([]);
    expect(astroTwo.getFlags(getToday())).toEqual([]);
    expect(astroTwo.hasCheckup(getToday())).toBe(false);

    expect(ground.getPreflight()).toEqual([]);
    expect(ground.getReadings()).toEqual([]);
    expect(ground.hasCheckup(getToday())).toBe(false);
  });

  it("keeps writes in one profile away from every other profile", () => {
    const astroOne = createProfileHistoryStore({
      profile_id: "astro-01",
      history_seed: "synthetic",
    });
    const astroTwo = createProfileHistoryStore({
      profile_id: "astro-02",
      history_seed: "empty",
    });
    const before = astroOne.getReadings().length;

    astroTwo.addReadings([
      { date: getToday(), metric: "heart_rate", value: 71, valid: true },
    ]);
    astroTwo.setFlags(getToday(), ["fatigue"]);

    expect(astroTwo.getReadings()).toHaveLength(1);
    expect(astroTwo.getFlags(getToday())).toEqual(["fatigue"]);
    expect(astroOne.getReadings()).toHaveLength(before);
    expect(astroOne.getFlags(getToday())).not.toContain("fatigue");
    expect(historyStorageKey("astro-01")).toBe("orbita_history_astro-01");
    expect(historyStorageKey("astro-02")).toBe("orbita_history_astro-02");
  });

  it("persists each profile under its own key and reloads without cross-leaking", () => {
    const storage = createMemoryStorage();
    vi.stubGlobal("localStorage", storage);
    const futureDate = "2026-11-15";

    const astroOne = createProfileHistoryStore({
      profile_id: "astro-01",
      history_seed: "synthetic",
    });
    const astroTwo = createProfileHistoryStore({
      profile_id: "astro-02",
      history_seed: "empty",
    });

    astroOne.addReadings([
      { date: futureDate, metric: "heart_rate", value: 88, valid: true },
    ]);
    astroTwo.setFlags(futureDate, ["fatigue"]);

    expect(storage.data.has(historyStorageKey("astro-01"))).toBe(true);
    expect(storage.data.has(historyStorageKey("astro-02"))).toBe(true);

    const reloadedOne = createProfileHistoryStore({
      profile_id: "astro-01",
      history_seed: "synthetic",
    });
    const reloadedTwo = createProfileHistoryStore({
      profile_id: "astro-02",
      history_seed: "empty",
    });

    expect(
      reloadedOne
        .getReadingsByMetric("heart_rate")
        .some((reading) => reading.date === futureDate && reading.value === 88),
    ).toBe(true);
    expect(reloadedTwo.getFlags(futureDate)).toEqual(["fatigue"]);
    expect(
      reloadedTwo
        .getReadings()
        .some((reading) => reading.date === futureDate && reading.metric === "heart_rate"),
    ).toBe(false);
    expect(reloadedTwo.getPreflight()).toEqual([]);
  });

  it("ignores corrupted persisted flags instead of leaking malformed state", () => {
    const storage = createMemoryStorage();
    vi.stubGlobal("localStorage", storage);
    storage.setItem(
      historyStorageKey("astro-02"),
      JSON.stringify({ readings: [], flags: { "2026-11-15": "not-an-array" } }),
    );

    const store = createProfileHistoryStore({
      profile_id: "astro-02",
      history_seed: "empty",
    });
    expect(store.getFlags("2026-11-15")).toEqual([]);
  });

  it("reuses the registry entry for one profile and clears it on reset", () => {
    const first = getProfileHistoryStore({
      profile_id: "astro-01",
      history_seed: "synthetic",
    });
    const second = getProfileHistoryStore({
      profile_id: "astro-01",
      history_seed: "synthetic",
    });
    const otherProfile = getProfileHistoryStore({
      profile_id: "astro-02",
      history_seed: "empty",
    });

    expect(first).toBe(second);
    expect(first).not.toBe(otherProfile);

    resetProfileHistoryRegistry();
    const afterReset = getProfileHistoryStore({
      profile_id: "astro-01",
      history_seed: "synthetic",
    });
    expect(afterReset).not.toBe(first);
  });
});

describe("fixed three-attempt lockout", () => {
  it("criterion 3: locks for exactly 30 seconds after every three failures", async () => {
    let now = 1_000;
    const store = createAuthStore({ storage: null, now: () => now });
    const credential = "orbita-nfc-astro-01";

    for (let attempt = 1; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
      const result = await store.verifyPin(credential, "000000", now);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("invalid_pin");
      expect(result.remainingMs).toBe(0);
      now += 1;
    }

    const third = await store.verifyPin(credential, "000000", now);
    expect(third.ok).toBe(false);
    expect(third.reason).toBe("locked");
    expect(third.remainingMs).toBe(LOCKOUT_MS);
    expect(LOCKOUT_MS).toBe(LOCKOUT_SECONDS * 1000);
    expect(store.getFailedAttempts(credential)).toBe(0);

    const whileLocked = await store.verifyPin(credential, "111111", now + 1_000);
    expect(whileLocked.reason).toBe("locked");
    expect(whileLocked.remainingMs).toBe(29_000);

    const stillLocked = await store.verifyPin(credential, "000000", now + 2_000);
    expect(stillLocked.reason).toBe("locked");
    expect(stillLocked.remainingMs).toBe(28_000);

    const afterExpiry = await store.verifyPin(credential, "111111", now + LOCKOUT_MS);
    expect(afterExpiry.ok).toBe(true);

    const secondWindowStart = now + LOCKOUT_MS;
    for (let attempt = 1; attempt < MAX_FAILED_ATTEMPTS; attempt += 1) {
      const result = await store.verifyPin(credential, "999999", secondWindowStart);
      expect(result.reason).toBe("invalid_pin");
    }
    const secondLock = await store.verifyPin(credential, "999999", secondWindowStart);
    expect(secondLock.reason).toBe("locked");
    expect(secondLock.remainingMs).toBe(LOCKOUT_MS);
  });
});

describe("seamless unknown-badge enrollment", () => {
  it("criterion 4: new badge creates an isolated empty profile", async () => {
    const store = createAuthStore({ storage: null });
    const credential = "orbita-nfc-demo-unregistered";

    const profile = await store.enroll({
      credential_id: credential,
      pin: "654321",
      role: "astronaut",
    });

    expect(profile.profile_id).toBe("astro-03");
    expect(profile.display_name).toBe("Crew Member 03");
    expect(profile.history_seed).toBe("empty");
    expect(profile.side).toBe("space");
    expect(profile.pin_hash).not.toContain("654321");
    expect(profile.pin_hash).toHaveLength(64);
    expect(profile.salt.length).toBeGreaterThan(0);
    expect(store.getProfiles()).toHaveLength(4);

    const verified = await store.verifyPin(credential, "654321");
    expect(verified.ok).toBe(true);

    const isolated = createProfileHistoryStore(profile);
    expect(isolated.getReadings()).toEqual([]);
    expect(isolated.hasCheckup(getToday())).toBe(false);

    await expect(
      store.enroll({ credential_id: credential, pin: "654321" }),
    ).rejects.toMatchObject({ code: "credential_exists" });
  });

  it("enrolls Ground Operators on the Earth side with an empty history", async () => {
    const store = createAuthStore({ storage: null });
    const profile = await store.enroll({
      credential_id: "orbita-nfc-demo-ground",
      pin: "987654",
      role: "ground_operator",
    });

    expect(profile.profile_id).toBe("ground-02");
    expect(profile.display_name).toBe("Crew Member 02");
    expect(profile.role).toBe("ground_operator");
    expect(profile.side).toBe("earth");
    expect(profile.history_seed).toBe("empty");
    expect(landingViewForRole(profile.role)).toBe("comms");
    expect(landingChannelForRole(profile.role)).toBe("earth");
  });

  it("rejects malformed enrollment PINs", async () => {
    const store = createAuthStore({ storage: null });
    await expect(
      store.enroll({ credential_id: "orbita-nfc-demo-short", pin: "12345" }),
    ).rejects.toMatchObject({ code: "invalid_pin_format" });
  });

  it("persists enrolled profiles as salted hashes with no plain-text PIN", async () => {
    const storage = createMemoryStorage();
    const store = createAuthStore({ storage });
    const pin = "445566";

    await store.enroll({ credential_id: "orbita-nfc-demo-persist", pin });
    const raw = storage.data.get(AUTH_PROFILES_STORAGE_KEY) ?? "";
    expect(raw).not.toContain(pin);

    const records = JSON.parse(raw) as Array<Record<string, unknown>>;
    for (const record of records) {
      expect(record.pin_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(record).not.toHaveProperty("pin");
    }

    const reloaded = createAuthStore({ storage });
    expect(reloaded.getProfile("orbita-nfc-demo-persist")?.display_name).toBe(
      "Crew Member 03",
    );
    expect((await reloaded.verifyPin("orbita-nfc-demo-persist", pin)).ok).toBe(true);
  });
});

describe("session persistence and inactivity watchdog", () => {
  it("criterion 5: only ephemeral sessions arm the five-minute watchdog", () => {
    const ephemeral = createSession("astro-01", "ephemeral", 42);
    const persistent = createSession("astro-01", "persistent", 42);

    expect(ephemeral.session_mode).toBe("ephemeral");
    expect(persistent.session_mode).toBe("persistent");
    expect(shouldUseInactivityWatchdog(ephemeral.session_mode)).toBe(true);
    expect(shouldUseInactivityWatchdog(persistent.session_mode)).toBe(false);
  });

  it("criterion 2: ground operators land on the Earth Comms console", () => {
    expect(landingViewForRole("ground_operator")).toBe("comms");
    expect(landingChannelForRole("ground_operator")).toBe("earth");
    expect(landingViewForRole("astronaut")).toBe("main");
    expect(landingChannelForRole("astronaut")).toBe("local");
  });

  it("criterion 5: logs out after 300,000 ms of inactivity and resets on activity", () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    const timer = createInactivityTimer(onTimeout);

    expect(EPHEMERAL_TIMEOUT_MS).toBe(300_000);
    timer.start();
    vi.advanceTimersByTime(EPHEMERAL_TIMEOUT_MS - 1);
    expect(onTimeout).not.toHaveBeenCalled();

    timer.poke();
    vi.advanceTimersByTime(EPHEMERAL_TIMEOUT_MS - 1);
    expect(onTimeout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(EPHEMERAL_TIMEOUT_MS);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("cleans up pending timeouts on stop and supports a clean restart", () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    const timer = createInactivityTimer(onTimeout, 1_000);

    timer.poke();
    expect(timer.isActive()).toBe(false);

    timer.start();
    expect(timer.isActive()).toBe(true);
    timer.stop();
    expect(timer.isActive()).toBe(false);
    vi.advanceTimersByTime(1_000);
    expect(onTimeout).not.toHaveBeenCalled();

    timer.start();
    vi.advanceTimersByTime(1_000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(timer.isActive()).toBe(false);

    timer.poke();
    vi.advanceTimersByTime(1_000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});

describe("ORBITA access gate and header UI contracts", () => {
  it("criterion 6: header renders the fixed chevron, saved profiles, and account actions", () => {
    const store = createAuthStore({ storage: null });
    const profiles = store.getProfiles();
    const activeProfile = profiles[0];

    const html = renderToStaticMarkup(
      React.createElement(Header, {
        activeView: "main",
        profiles,
        activeProfile,
        onViewChange: () => undefined,
        onSelectAccount: () => undefined,
        onAddAccount: () => undefined,
        onLogout: () => undefined,
      }),
    );

    expect(html).toContain("profile-switcher");
    expect(html).toContain("profile-trigger");
    expect(html).toContain("profile-chevron");
    expect(html).toContain('width="14"');
    expect(html).toContain('height="14"');
    expect(html).toContain("Cmdr. Alex Vance");
    expect(html).toContain("Dr. Maya Lin");
    expect(html).toContain("Flight Surgeon (Houston)");
    expect(html).toContain("profile-option is-active");
    expect(html).toContain("profile-menu-divider");
    expect(html).toContain("Add Account");
    expect(html).toContain("Sign Out");
    expect(html.indexOf("profile-switcher")).toBeGreaterThan(
      html.indexOf("primary-nav"),
    );
  });

  it("criterion 6: ground operator header hides primary navigation and stays profile-driven", () => {
    const store = createAuthStore({ storage: null });
    const profiles = store.getProfiles();
    const groundProfile = profiles.find((profile) => profile.role === "ground_operator");
    if (!groundProfile) {
      throw new Error("Expected a seeded ground operator profile");
    }

    const html = renderToStaticMarkup(
      React.createElement(Header, {
        activeView: "comms",
        profiles,
        activeProfile: groundProfile,
        onViewChange: () => undefined,
        onSelectAccount: () => undefined,
        onAddAccount: () => undefined,
        onLogout: () => undefined,
      }),
    );

    expect(html).toContain("profile-switcher");
    expect(html).toContain("Flight Surgeon (Houston)");
    expect(html).toContain("Ground Operator");
    expect(html).not.toContain("primary-nav");
  });

  it("criterion 1: cold start renders the English ORBITA NFC prompt and demo badge controls", () => {
    const html = renderToStaticMarkup(
      React.createElement(AuthProvider, null, React.createElement(LoginScreen)),
    );

    expect(html).toContain("ORBITA");
    expect(html).toContain("Tap NFC Badge to Reader");
    expect(html).toContain(
      "Select a demo crew badge below or simulate a new unregistered tag",
    );
    expect(html).toContain("Astronaut · 40-day history");
    expect(html).toContain("NFC · PIN: 111111");
    expect(html).toContain("Astronaut · Empty history");
    expect(html).toContain("NFC · PIN: 222222");
    expect(html).toContain("Ground Operator");
    expect(html).toContain("NFC · PIN: 333333");
    expect(html).toContain("+ Tap New Unregistered Badge");
  });

  it("criterion 2A: a pre-focused saved badge opens the six-digit PIN keypad", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(LoginScreen, {
          initialCredentialId: "orbita-nfc-astro-01",
        }),
      ),
    );

    expect(html).toContain("Cmdr. Alex Vance");
    expect(html).toContain("Enter 6-Digit PIN");
    expect(html).toContain("PIN entry, 0 of 6 digits");
    expect(html).toContain("pin-keypad");
    expect(html).not.toContain("Tap NFC Badge to Reader");
  });

  it("renders all ten keypad digits plus Clear and Backspace", () => {
    const html = renderToStaticMarkup(
      React.createElement(PinKeypad, {
        onDigit: () => undefined,
        onBackspace: () => undefined,
        onClear: () => undefined,
      }),
    );

    for (const digit of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]) {
      expect(html).toContain(`>${digit}</button>`);
    }
    expect(html).toContain("Clear");
    expect(html).toContain("Backspace");
  });

  it("renders six PIN dots with the filled count matching the value", () => {
    const html = renderToStaticMarkup(
      React.createElement(PinDots, { value: "12" }),
    );

    expect(html).toContain('aria-label="PIN entry, 2 of 6 digits"');
    expect((html.match(/is-filled/g) ?? []).length).toBe(2);
    expect((html.match(/class="pin-dot(?!s)/g) ?? []).length).toBe(6);
  });
});
