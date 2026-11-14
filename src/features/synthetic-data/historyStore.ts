import type { Reading } from "../../rules/types";

export interface SyntheticDataset {
  synthetic: true;
  label: string;
  schema_version: "1.0";
  generator: string;
  astronaut: { id: string; display_name: string };
  mission: { name: string; day1_date: string; demo_day: number };
  preflight: { readings: Reading[] };
  history: {
    readings: Reading[];
    flags_by_date: Record<string, string[]>;
  };
  day40_checkup: {
    date: string;
    readings: Reading[];
    flags: string[];
    demo_invalid_entry: { metric: string; raw: string };
  };
}

export class SyntheticDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyntheticDataError";
  }
}

export interface HistoryStore {
  getPreflight(): Reading[];
  getReadings(): Reading[];
  getReadingsByMetric(metric: string): Reading[];
  addReadings(readings: Reading[]): void;
  getFlags(date: string): string[];
  setFlags(date: string, flags: string[]): void;
  hasCheckup(date: string): boolean;
  subscribe(listener: () => void): () => void;
  reset(): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertReadings(value: unknown, where: string): asserts value is Reading[] {
  if (!Array.isArray(value)) {
    throw new SyntheticDataError(`${where} must be an array`);
  }
  value.forEach((reading, index) => {
    const label = `${where}[${index}]`;
    if (!isRecord(reading)) {
      throw new SyntheticDataError(`${label} must be an object`);
    }
    if (typeof reading.date !== "string") {
      throw new SyntheticDataError(`${label}.date must be a string`);
    }
    if (typeof reading.metric !== "string") {
      throw new SyntheticDataError(`${label}.metric must be a string`);
    }
    if (typeof reading.value !== "number" || !Number.isFinite(reading.value)) {
      throw new SyntheticDataError(`${label}.value must be a finite number`);
    }
    if (typeof reading.valid !== "boolean") {
      throw new SyntheticDataError(`${label}.valid must be a boolean`);
    }
  });
}

export function loadSyntheticDataset(json: unknown): SyntheticDataset {
  if (!isRecord(json)) {
    throw new SyntheticDataError("dataset must be an object");
  }
  if (json.synthetic !== true) {
    throw new SyntheticDataError("dataset.synthetic must be true");
  }
  if (json.schema_version !== "1.0") {
    throw new SyntheticDataError('dataset.schema_version must be "1.0"');
  }
  if (!isRecord(json.preflight) || !isRecord(json.history) || !isRecord(json.day40_checkup)) {
    throw new SyntheticDataError("dataset sections are missing");
  }
  assertReadings(json.preflight.readings, "preflight.readings");
  assertReadings(json.history.readings, "history.readings");
  assertReadings(json.day40_checkup.readings, "day40_checkup.readings");
  if (!isRecord(json.history.flags_by_date)) {
    throw new SyntheticDataError("history.flags_by_date must be an object");
  }

  return json as unknown as SyntheticDataset;
}

function cloneReading(reading: Reading): Reading {
  return { ...reading };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function cloneFlags(flags: Record<string, string[]>): Record<string, string[]> {
  const copy: Record<string, string[]> = {};
  for (const [date, values] of Object.entries(flags)) {
    copy[date] = [...values];
  }
  return copy;
}

export function createHistoryStore(
  data: SyntheticDataset,
  opts?: { includeDay40?: boolean },
): HistoryStore {
  const seedPreflight = data.preflight.readings.map(cloneReading);
  const seedReadings = data.history.readings.map(cloneReading);
  const seedFlags = cloneFlags(data.history.flags_by_date);
  const seedFlaggedDates = new Set(Object.keys(seedFlags));

  if (opts?.includeDay40 === true) {
    seedReadings.push(...data.day40_checkup.readings.map(cloneReading));
    seedFlags[data.day40_checkup.date] = unique(data.day40_checkup.flags);
    seedFlaggedDates.add(data.day40_checkup.date);
  }

  let readings = seedReadings.map(cloneReading);
  let flags = cloneFlags(seedFlags);
  let flaggedDates = new Set(seedFlaggedDates);
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function getReadings(): Reading[] {
    return [...readings]
      .map(cloneReading)
      .sort((left, right) => left.date.localeCompare(right.date));
  }

  return {
    getPreflight(): Reading[] {
      return [...seedPreflight].map(cloneReading).sort((a, b) => a.date.localeCompare(b.date));
    },

    getReadings,

    getReadingsByMetric(metric: string): Reading[] {
      return getReadings().filter((reading) => reading.metric === metric);
    },

    addReadings(newReadings: Reading[]): void {
      if (newReadings.some((reading) => reading.valid !== true)) {
        throw new Error("Cannot add readings with valid !== true");
      }
      const replacedKeys = new Set(
        newReadings.map((reading) => `${reading.date}\u0000${reading.metric}`),
      );
      readings = readings.filter(
        (reading) => !replacedKeys.has(`${reading.date}\u0000${reading.metric}`),
      );
      readings.push(...newReadings.map(cloneReading));
      notify();
    },

    getFlags(date: string): string[] {
      return [...(flags[date] ?? [])];
    },

    setFlags(date: string, newFlags: string[]): void {
      flags[date] = unique(newFlags);
      flaggedDates.add(date);
      notify();
    },

    hasCheckup(date: string): boolean {
      return readings.some((reading) => reading.date === date) || flaggedDates.has(date);
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    reset(): void {
      readings = seedReadings.map(cloneReading);
      flags = cloneFlags(seedFlags);
      flaggedDates = new Set(seedFlaggedDates);
      notify();
    },
  };
}
