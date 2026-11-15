import type { Reading } from "../../rules/types";
import {
  createHistoryStore,
  type HistoryStore,
  type SyntheticDataset,
} from "../synthetic-data/historyStore";
import { DEMO_DAY, MISSION_DAY1, getToday } from "../synthetic-data/missionClock";
import { syntheticDataset } from "../synthetic-data";
import { HISTORY_STORAGE_PREFIX } from "./constants";
import type { AuthProfile } from "./types";

interface PersistedHistory {
  readings: Reading[];
  flags: Record<string, string[]>;
  notes: Record<string, string>;
}

const EMPTY_DATASET: SyntheticDataset = {
  synthetic: true,
  label: "EMPTY PROFILE HISTORY - no synthetic seed for this crew member.",
  schema_version: "1.0",
  generator: "src/features/auth/profileHistory.ts",
  astronaut: { id: "empty", display_name: "Empty profile" },
  mission: { name: "ORBITA", day1_date: MISSION_DAY1, demo_day: DEMO_DAY },
  preflight: { readings: [] },
  history: { readings: [], flags_by_date: {} },
  day40_checkup: {
    date: getToday(),
    readings: [],
    flags: [],
    demo_invalid_entry: { metric: "bp_systolic", raw: "920" },
  },
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function safeStorage(): StorageLike | null {
  if (typeof globalThis.localStorage === "undefined") {
    return null;
  }
  return globalThis.localStorage;
}

function parseFlags(value: unknown): Record<string, string[]> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  const flags: Record<string, string[]> = {};
  for (const [date, dateFlags] of Object.entries(value)) {
    if (Array.isArray(dateFlags) && dateFlags.every((flag) => typeof flag === "string")) {
      flags[date] = [...dateFlags];
    }
  }
  return flags;
}

function parseNotes(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  const notes: Record<string, string> = {};
  for (const [date, note] of Object.entries(value)) {
    if (typeof note === "string") {
      notes[date] = note;
    }
  }
  return notes;
}

function parsePersisted(raw: string | null): PersistedHistory | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const record = parsed as Partial<PersistedHistory>;
    if (!Array.isArray(record.readings)) {
      return null;
    }
    return {
      readings: record.readings,
      flags: parseFlags(record.flags),
      notes: parseNotes(record.notes),
    };
  } catch {
    return null;
  }
}

export function historyStorageKey(profileId: string): string {
  return `${HISTORY_STORAGE_PREFIX}${profileId}`;
}

function withPersistence(
  store: HistoryStore,
  storageKey: string,
  persisted: PersistedHistory | null,
): HistoryStore {
  const storage = safeStorage();
  let flags: Record<string, string[]> = persisted ? { ...persisted.flags } : {};
  let notes: Record<string, string> = persisted ? { ...persisted.notes } : {};

  if (persisted && persisted.readings.length > 0) {
    store.addReadings(persisted.readings.filter((reading) => reading.valid === true));
  }
  for (const [date, dateFlags] of Object.entries(flags)) {
    store.setFlags(date, dateFlags);
  }
  for (const [date, note] of Object.entries(notes)) {
    store.setNotes(date, note);
  }

  function persist(): void {
    if (!storage) {
      return;
    }
    try {
      storage.setItem(
        storageKey,
        JSON.stringify({
          readings: store.getReadings(),
          flags,
          notes,
        } satisfies PersistedHistory),
      );
    } catch {
      // Persistence is best-effort in restricted webview storage contexts.
    }
  }

  return {
    getPreflight: () => store.getPreflight(),
    getReadings: () => store.getReadings(),
    getReadingsByMetric: (metric) => store.getReadingsByMetric(metric),
    addReadings(readings) {
      store.addReadings(readings);
      persist();
    },
    getFlags(date) {
      return flags[date] ? [...flags[date]] : store.getFlags(date);
    },
    setFlags(date, newFlags) {
      flags = { ...flags, [date]: Array.from(new Set(newFlags)) };
      store.setFlags(date, flags[date]);
      persist();
    },
    getNotes(date) {
      return notes[date] ?? store.getNotes(date);
    },
    setNotes(date, note) {
      if (note.length > 0) {
        notes = { ...notes, [date]: note };
      } else {
        notes = { ...notes };
        delete notes[date];
      }
      store.setNotes(date, note);
      persist();
    },
    hasCheckup(date) {
      return store.hasCheckup(date);
    },
    subscribe: (listener) => store.subscribe(listener),
    reset() {
      flags = {};
      notes = {};
      store.reset();
      persist();
    },
  };
}

export function createProfileHistoryStore(
  profile: Pick<AuthProfile, "profile_id" | "history_seed">,
): HistoryStore {
  const useSynthetic = profile.history_seed === "synthetic";
  const base = createHistoryStore(useSynthetic ? syntheticDataset : EMPTY_DATASET, {
    // Day 40 is NOT pre-filled: the demo starts at the daily check-up form (story steps 2–3).
    includeDay40: false,
  });
  const key = historyStorageKey(profile.profile_id);
  const storage = safeStorage();
  const persisted = storage ? parsePersisted(storage.getItem(key)) : null;
  return withPersistence(base, key, persisted);
}

const registry = new Map<string, HistoryStore>();

export function getProfileHistoryStore(
  profile: Pick<AuthProfile, "profile_id" | "history_seed">,
): HistoryStore {
  const existing = registry.get(profile.profile_id);
  if (existing) {
    return existing;
  }
  const created = createProfileHistoryStore(profile);
  registry.set(profile.profile_id, created);
  return created;
}

export function resetProfileHistoryRegistry(): void {
  registry.clear();
}

export function forgetProfileHistory(profileId: string): void {
  registry.delete(profileId);
}
