import { addDays } from "../../rules/dateMath";
import type { Escalation, EvaluationResult, Reading, RulesFile, Status } from "../../rules/types";
import { EARTH_LINK } from "./settings";

export type EarthChatSender = "astronaut" | "flight_surgeon";

export interface EarthTelemetryIndicator {
  id: string;
  label: string;
  status: Status;
  triggered: {
    ruleId: string;
    level: "yellow" | "red";
    title: string;
    source: string;
    explanation: string;
    actions: string[];
    recheck: string;
  }[];
}

export interface EarthTelemetrySnapshot {
  missionDate: string;
  missionDay: number;
  overallStatus: Status;
  overallEscalation: Escalation | null;
  indicators: EarthTelemetryIndicator[];
  flags: { id: string; label: string }[];
  recentReadings: Reading[];
  astronautNote: string | null;
}

export interface EarthChatMessage {
  id: string;
  astronautId: string;
  sender: EarthChatSender;
  text: string;
  missionDay: number;
  createdAtMs: number;
  arrivesAtMs: number;
  read?: boolean;
  telemetry?: EarthTelemetrySnapshot;
}

export type EarthMessageDelivery = "transmitting" | "delivered";

export interface EarthChatStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

const STORAGE_PREFIX = "orbita_earth_chat_v2_";
const LEGACY_STORAGE_PREFIX = "orbita_earth_chat_v1_";
const STATUSES = new Set<Status>(["green", "yellow", "red", "no_data"]);
const ESCALATIONS = new Set<Escalation>([
  "self",
  "crew_medical_officer",
  "ground_flight_surgeon",
]);

const SEED_MESSAGES: EarthChatMessage[] = [
  {
    id: "astro-01-day-39-crew",
    astronautId: "astro-01",
    sender: "astronaut",
    text: "Flight Surgeon, my resting heart rate has been slightly elevated over the past couple of days. What could be causing this, and should I adjust today's exercise protocol?",
    missionDay: 39,
    createdAtMs: Date.parse("2026-11-13T08:15:00.000Z"),
    arrivesAtMs: Date.parse("2026-11-13T08:35:00.000Z"),
  },
  {
    id: "astro-01-day-39-surgeon",
    astronautId: "astro-01",
    sender: "flight_surgeon",
    text: "Copy, Alex. A mild rise in resting heart rate in flight can come with fluid shifts, dehydration or short sleep. For today, keep steady hydration, choose light aerobic recovery instead of heavy resistive loads, and re-check resting vitals tomorrow morning. Tell us if it stays 12 bpm or more above your preflight normal, or comes with chest pain, fainting or dizziness.",
    missionDay: 39,
    createdAtMs: Date.parse("2026-11-13T08:35:00.000Z"),
    arrivesAtMs: Date.parse("2026-11-13T08:55:00.000Z"),
    read: true,
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isReading(value: unknown): value is Reading {
  return (
    isRecord(value) &&
    typeof value.date === "string" &&
    typeof value.metric === "string" &&
    typeof value.value === "number" &&
    Number.isFinite(value.value) &&
    typeof value.valid === "boolean" &&
    (value.context === undefined || value.context === "rest" || value.context === "exercise")
  );
}

function isTelemetryIndicator(value: unknown): value is EarthTelemetryIndicator {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.status === "string" &&
    STATUSES.has(value.status as Status) &&
    Array.isArray(value.triggered) &&
    value.triggered.every(
      (rule) =>
        isRecord(rule) &&
        typeof rule.ruleId === "string" &&
        (rule.level === "yellow" || rule.level === "red") &&
        typeof rule.title === "string" &&
        typeof rule.source === "string" &&
        typeof rule.explanation === "string" &&
        Array.isArray(rule.actions) &&
        rule.actions.every((action) => typeof action === "string") &&
        typeof rule.recheck === "string",
    )
  );
}

function isTelemetrySnapshot(value: unknown): value is EarthTelemetrySnapshot {
  return (
    isRecord(value) &&
    typeof value.missionDate === "string" &&
    typeof value.missionDay === "number" &&
    Number.isFinite(value.missionDay) &&
    typeof value.overallStatus === "string" &&
    STATUSES.has(value.overallStatus as Status) &&
    (value.overallEscalation === null ||
      (typeof value.overallEscalation === "string" &&
        ESCALATIONS.has(value.overallEscalation as Escalation))) &&
    Array.isArray(value.indicators) &&
    value.indicators.every(isTelemetryIndicator) &&
    Array.isArray(value.flags) &&
    value.flags.every(
      (flag) =>
        isRecord(flag) && typeof flag.id === "string" && typeof flag.label === "string",
    ) &&
    Array.isArray(value.recentReadings) &&
    value.recentReadings.every(isReading) &&
    (value.astronautNote === null || typeof value.astronautNote === "string")
  );
}

function isEarthChatMessage(value: unknown, astronautId: string): value is EarthChatMessage {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.astronautId === astronautId &&
    (value.sender === "astronaut" || value.sender === "flight_surgeon") &&
    typeof value.text === "string" &&
    value.text.trim().length > 0 &&
    typeof value.missionDay === "number" &&
    Number.isFinite(value.missionDay) &&
    typeof value.createdAtMs === "number" &&
    Number.isFinite(value.createdAtMs) &&
    typeof value.arrivesAtMs === "number" &&
    Number.isFinite(value.arrivesAtMs) &&
    (value.read === undefined || typeof value.read === "boolean") &&
    (value.telemetry === undefined || isTelemetrySnapshot(value.telemetry))
  );
}

function resolveStorage(storage?: EarthChatStorage): EarthChatStorage | null {
  if (storage !== undefined) {
    return storage;
  }
  return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
}

export function earthChatStorageKey(astronautId: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(astronautId)}`;
}

function legacyEarthChatStorageKey(astronautId: string): string {
  return `${LEGACY_STORAGE_PREFIX}${encodeURIComponent(astronautId)}`;
}

export function seedEarthChatThread(astronautId: string): EarthChatMessage[] {
  return astronautId === "astro-01" ? SEED_MESSAGES.map((message) => ({ ...message })) : [];
}

export function loadEarthChatThread(
  astronautId: string,
  storage?: EarthChatStorage,
): EarthChatMessage[] {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) {
    return seedEarthChatThread(astronautId);
  }

  const legacyKey = legacyEarthChatStorageKey(astronautId);
  if (resolvedStorage.getItem(legacyKey) !== null) {
    resolvedStorage.removeItem?.(legacyKey);
  }

  const raw = resolvedStorage.getItem(earthChatStorageKey(astronautId));
  if (raw === null) {
    const seededThread = seedEarthChatThread(astronautId);
    resolvedStorage.setItem(earthChatStorageKey(astronautId), JSON.stringify(seededThread));
    return seededThread;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Saved Earth chat for ${astronautId} is not valid JSON.`);
  }
  if (!Array.isArray(parsed) || !parsed.every((message) => isEarthChatMessage(message, astronautId))) {
    throw new Error(`Saved Earth chat for ${astronautId} has an invalid message format.`);
  }
  return parsed;
}

export function earthChatActivity(
  thread: EarthChatMessage[],
  nowMs: number,
  viewer: EarthChatSender,
): string {
  const latestMessage = thread[thread.length - 1];
  if (!latestMessage) {
    return "No messages yet";
  }
  if (earthMessageDelivery(latestMessage, nowMs) === "transmitting") {
    return "Transmitting";
  }
  if (latestMessage.sender !== viewer && latestMessage.read !== true) {
    return "Unread reply";
  }
  return `${thread.length} messages`;
}

export function saveEarthChatThread(
  astronautId: string,
  messages: EarthChatMessage[],
  storage?: EarthChatStorage,
): void {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) {
    throw new Error("Earth chat persistence is unavailable in this environment.");
  }
  resolvedStorage.setItem(earthChatStorageKey(astronautId), JSON.stringify(messages));
}

export function buildEarthTelemetrySnapshot(args: {
  evaluation: EvaluationResult;
  rules: RulesFile;
  flagsToday: string[];
  readings: Reading[];
  clinicalNotes: string;
  missionDay: number;
}): EarthTelemetrySnapshot {
  const { evaluation, rules, flagsToday, readings, clinicalNotes, missionDay } = args;
  const flagDefinitions = new Map(rules.flags.map((flag) => [flag.id, flag.label]));
  const metricOrder = new Map(rules.metrics.map((metric, index) => [metric.id, index]));
  const firstDay = addDays(evaluation.today, -6);

  return {
    missionDate: evaluation.today,
    missionDay,
    overallStatus: evaluation.overall_status,
    overallEscalation: evaluation.overall_escalation,
    indicators: evaluation.indicators.map((indicator) => {
      const definition = rules.indicators.find((item) => item.id === indicator.indicator_id);
      return {
        id: indicator.indicator_id,
        label: definition?.label ?? indicator.indicator_id,
        status: indicator.status,
        triggered: indicator.triggered.map((rule) => ({
          ruleId: rule.rule_id,
          level: rule.level,
          title: rule.title,
          source: rule.source,
          explanation: rule.explanation,
          actions: [...rule.actions],
          recheck: rule.recheck,
        })),
      };
    }),
    flags: flagsToday.flatMap((id) => {
      const label = flagDefinitions.get(id);
      return label === undefined ? [] : [{ id, label }];
    }),
    recentReadings: readings
      .filter(
        (reading) =>
          reading.valid &&
          reading.date >= firstDay &&
          reading.date <= evaluation.today,
      )
      .map((reading) => ({ ...reading }))
      .sort((left, right) => {
        if (left.date !== right.date) {
          return left.date.localeCompare(right.date);
        }
        return (metricOrder.get(left.metric) ?? 0) - (metricOrder.get(right.metric) ?? 0);
      }),
    astronautNote: clinicalNotes.trim() || null,
  };
}

export function createEarthChatMessage(args: {
  id: string;
  astronautId: string;
  sender: EarthChatSender;
  text: string;
  missionDay: number;
  createdAtMs: number;
  telemetry?: EarthTelemetrySnapshot;
}): EarthChatMessage {
  const message: EarthChatMessage = {
    id: args.id,
    astronautId: args.astronautId,
    sender: args.sender,
    text: args.text.trim(),
    missionDay: args.missionDay,
    createdAtMs: args.createdAtMs,
    arrivesAtMs:
      args.createdAtMs +
      Math.round((EARTH_LINK.one_way_delay_minutes * 60_000) / EARTH_LINK.demo_time_scale),
  };
  if (args.telemetry) {
    message.telemetry = args.telemetry;
  }
  return message;
}

export function earthMessageDelivery(
  message: EarthChatMessage,
  nowMs: number,
): EarthMessageDelivery {
  return nowMs < message.arrivesAtMs ? "transmitting" : "delivered";
}


/** Text of the automatic receipt Earth sends when an astronaut message arrives (simulated). */
export const AUTO_RECEIPT_TEXT =
  "Received — under review by the flight surgeon. (Automatic receipt, simulated.)";

/** Builds the automatic receipt for an astronaut message: it is "sent" when that message arrives
 *  and takes the same one-way delay to come back. Id is derived, so it is created only once. */
export function createAutoReceipt(original: EarthChatMessage): EarthChatMessage {
  return createEarthChatMessage({
    id: `${original.id}-receipt`,
    astronautId: original.astronautId,
    sender: "flight_surgeon",
    text: AUTO_RECEIPT_TEXT,
    missionDay: original.missionDay,
    createdAtMs: original.arrivesAtMs,
  });
}

/** Astronaut messages that have arrived on Earth but have no receipt yet. */
export function pendingReceipts(thread: EarthChatMessage[], nowMs: number): EarthChatMessage[] {
  const ids = new Set(thread.map((message) => message.id));
  return thread.filter(
    (message) =>
      message.sender === "astronaut" &&
      message.arrivesAtMs <= nowMs &&
      !ids.has(`${message.id}-receipt`) &&
      // a real reply from the flight surgeon after this message makes a receipt unnecessary
      !thread.some((other) => other.sender === "flight_surgeon" && other.createdAtMs > message.createdAtMs),
  );
}

/** Draft for the flight surgeon, built only from the rules engine's result (no own logic). */
export function buildEarthDraftText(
  evaluation: { overall_status: string; indicators: { indicator_id: string; status: string; triggered: { title: string; level: string }[] }[] },
  labels: Record<string, string>,
  missionDay: number,
): string {
  const lines = evaluation.indicators
    .filter((indicator) => indicator.status === "red" || indicator.status === "yellow")
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "red" ? -1 : 1))
    .map(
      (indicator) =>
        `${indicator.status.toUpperCase()} · ${labels[indicator.indicator_id] ?? indicator.indicator_id}: ${indicator.triggered
          .map((rule) => rule.title)
          .join("; ")}`,
    );
  return [
    `Day ${missionDay} check-up — overall ${evaluation.overall_status.toUpperCase()}.`,
    ...lines,
    "Telemetry attached. Please advise.",
  ].join("\n");
}
