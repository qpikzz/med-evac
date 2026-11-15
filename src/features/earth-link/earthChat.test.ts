import { describe, expect, it } from "vitest";
import rulesJson from "../../data/rules.json";
import syntheticJson from "../../data/synthetic_history.json";
import { evaluate } from "../../rules/engine";
import { loadRules } from "../../rules/loadRules";
import { computeBaselines } from "../personal-baseline/baseline";
import { createHistoryStore, loadSyntheticDataset } from "../synthetic-data/historyStore";
import {
  buildEarthTelemetrySnapshot,
  createEarthChatMessage,
  earthChatStorageKey,
  earthMessageDelivery,
  loadEarthChatThread,
  saveEarthChatThread,
  seedEarthChatThread,
  type EarthChatStorage,
} from "./chat";

const dataset = loadSyntheticDataset(syntheticJson);
const rules = loadRules(rulesJson);
const today = "2026-11-14";

function day40Snapshot() {
  const store = createHistoryStore(dataset, { includeDay40: true });
  const readings = store.getReadings();
  const evaluation = evaluate({
    today,
    readings,
    flags: [],
    baselines: computeBaselines({
      today,
      preflight: store.getPreflight(),
      history: readings,
      rules,
    }),
    rules,
  });
  return buildEarthTelemetrySnapshot({
    evaluation,
    rules,
    flagsToday: [],
    readings,
    clinicalNotes: "Routine check-up note.",
    missionDay: 40,
  });
}

function memoryStorage(): EarthChatStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe("Earth chat", () => {
  it("persists separate multi-message threads for each astronaut profile", () => {
    const storage = memoryStorage();
    const seeded = loadEarthChatThread("astro-01", storage);
    expect(seeded).toHaveLength(4);
    expect(seeded.map((message) => message.missionDay)).toEqual([38, 38, 39, 39]);
    expect(seeded[0].sender).toBe("astronaut");
    expect(seeded[1].sender).toBe("flight_surgeon");

    const reply = createEarthChatMessage({
      id: "astro-01-new-reply",
      astronautId: "astro-01",
      sender: "astronaut",
      text: "Thanks, I will.",
      missionDay: 40,
      createdAtMs: 1_000,
    });
    saveEarthChatThread("astro-01", [...seeded, reply], storage);

    expect(loadEarthChatThread("astro-01", storage)).toHaveLength(5);
    expect(loadEarthChatThread("astro-02", storage)).toEqual([]);
    expect(storage.getItem(earthChatStorageKey("astro-01"))).not.toBeNull();
  });

  it("adds a telemetry attachment only when one is selected and keeps its seven-day readings", () => {
    const telemetry = day40Snapshot();
    const attached = createEarthChatMessage({
      id: "attached",
      astronautId: "astro-01",
      sender: "astronaut",
      text: "Check-up attached.",
      missionDay: 40,
      createdAtMs: 1_000,
      telemetry,
    });
    const plain = createEarthChatMessage({
      id: "plain",
      astronautId: "astro-01",
      sender: "astronaut",
      text: "No attachment.",
      missionDay: 40,
      createdAtMs: 1_000,
    });

    expect(attached.telemetry).toBe(telemetry);
    expect(telemetry.recentReadings.every((reading) => reading.date >= "2026-11-08")).toBe(true);
    expect(telemetry.recentReadings.every((reading) => reading.date <= today)).toBe(true);
    expect(plain.telemetry).toBeUndefined();
  });

  it("transitions asynchronous messages from transmitting to delivered", () => {
    const message = createEarthChatMessage({
      id: "transit",
      astronautId: "astro-01",
      sender: "flight_surgeon",
      text: "Received.",
      missionDay: 40,
      createdAtMs: 1_000,
    });

    expect(earthMessageDelivery(message, 1_001)).toBe("transmitting");
    expect(earthMessageDelivery(message, message.arrivesAtMs)).toBe("delivered");
  });

  it("seeds only the primary demo astronaut's initial mission thread", () => {
    expect(seedEarthChatThread("astro-01")).toHaveLength(4);
    expect(seedEarthChatThread("astro-02")).toEqual([]);
  });
});
