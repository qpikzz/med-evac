import type {
  Escalation,
  EvaluationResult,
  Reading,
  RulesFile,
  Status,
} from "../../rules/types";
import { addDays } from "../../rules/dateMath";
import type { HistoryStore } from "../synthetic-data/historyStore";
import { EARTH_LINK } from "./settings";

export type MessageKind = "medical" | "private_behavioral";
export type MessageState = "draft" | "in_transit" | "acknowledged";

export type Observed =
  EvaluationResult["indicators"][number]["triggered"][number]["observed"];

export interface EarthMessageContent {
  synthetic: true;
  astronaut_id: string;
  mission_date: string;
  mission_day: number;
  overall_status: Status;
  overall_escalation: Escalation | null;
  indicators: {
    indicator_id: string;
    label: string;
    status: "yellow" | "red";
    triggered: {
      rule_id: string;
      level: "yellow" | "red";
      title: string;
      source: string;
      observed?: Observed;
    }[];
  }[];
  flags_today: { id: string; label: string }[];
  recent_readings: Reading[];
  astronaut_note: string | null;
  rules_version: string;
}

export interface EarthMessage {
  id: string;
  kind: MessageKind;
  recipient_label: string;
  content: EarthMessageContent;
  state: MessageState;
  sent_at_ms: number | null;
  arrives_at_ms: number | null;
  receipt_at_ms: number | null;
  receipt_text: "Received, under review (simulated)" | null;
}

export interface BuildDraftArgs {
  evaluation: EvaluationResult;
  store: HistoryStore;
  rules: RulesFile;
  flagsToday: string[];
  missionDay: number;
  note?: string;
  existingIdsToday: number;
}

export interface MessageView {
  side: "astronaut" | "earth";
  state: "draft" | "in_transit" | "delivered" | "acknowledged";
  simulated_minutes_left: number | null;
  content_visible: boolean;
  text: string;
}

const PRIVATE_RECIPIENT =
  "Flight surgeon and behavioral health support (Earth) - private";
const MEDICAL_RECIPIENT = "Flight surgeon (Earth)";

export function delayMs(): number {
  return Math.round(
    (EARTH_LINK.one_way_delay_minutes * 60_000) / EARTH_LINK.demo_time_scale,
  );
}

export function shouldAutoDraft(ev: EvaluationResult): boolean {
  return ev.overall_status === "red";
}

function indicatorLabel(rules: RulesFile, indicatorId: string): string {
  return rules.indicators.find((indicator) => indicator.id === indicatorId)?.label ?? indicatorId;
}

function cloneObserved(observed: Observed): Observed {
  if (!observed) {
    return observed;
  }
  const copy: NonNullable<Observed> = {};
  if (observed.metric !== undefined) {
    copy.metric = observed.metric;
  }
  if (observed.value !== undefined) {
    copy.value = observed.value;
  }
  if (observed.baseline !== undefined) {
    copy.baseline = observed.baseline;
  }
  if (observed.delta !== undefined) {
    copy.delta = observed.delta;
  }
  if (observed.flags !== undefined) {
    copy.flags = [...observed.flags];
  }
  return copy;
}

function isListedStatus(status: Status): status is "yellow" | "red" {
  return status === "yellow" || status === "red";
}

export function buildDraft(args: BuildDraftArgs): EarthMessage {
  const { evaluation, store, rules, flagsToday, missionDay, note, existingIdsToday } = args;

  if (note !== undefined) {
    const validation = validateNote(note);
    if (!validation.ok) {
      throw new Error(validation.message);
    }
  }

  const indicators = evaluation.indicators
    .filter((indicator) => isListedStatus(indicator.status))
    .map((indicator) => ({
      indicator_id: indicator.indicator_id,
      label: indicatorLabel(rules, indicator.indicator_id),
      status: indicator.status as "yellow" | "red",
      triggered: indicator.triggered.map((rule) => {
        const copy: EarthMessageContent["indicators"][number]["triggered"][number] = {
          rule_id: rule.rule_id,
          level: rule.level,
          title: rule.title,
          source: rule.source,
        };
        if (rule.observed !== undefined) {
          copy.observed = cloneObserved(rule.observed);
        }
        return copy;
      }),
    }));

  const listedIndicatorIds = new Set(indicators.map((indicator) => indicator.indicator_id));
  const metricToIndicator = new Map(
    rules.metrics.map((metric) => [metric.id, metric.indicator_id]),
  );
  const metricOrder = new Map(rules.metrics.map((metric, index) => [metric.id, index]));
  const firstDay = addDays(evaluation.today, -6);

  const recentReadings = store
    .getReadings()
    .filter((reading) => reading.valid === true)
    .filter(
      (reading) => reading.date >= firstDay && reading.date <= evaluation.today,
    )
    .filter((reading) => {
      const indicatorId = metricToIndicator.get(reading.metric);
      return indicatorId !== undefined && listedIndicatorIds.has(indicatorId);
    })
    .map((reading) => ({ ...reading }))
    .sort((left, right) => {
      if (left.date !== right.date) {
        return left.date.localeCompare(right.date);
      }
      return (metricOrder.get(left.metric) ?? 0) - (metricOrder.get(right.metric) ?? 0);
    });

  const flagDefinitions = new Map(rules.flags.map((flag) => [flag.id, flag]));
  const seenFlags = new Set<string>();
  const flags = [] as { id: string; label: string }[];
  for (const flagId of flagsToday) {
    if (seenFlags.has(flagId)) {
      continue;
    }
    seenFlags.add(flagId);
    const definition = flagDefinitions.get(flagId);
    if (!definition) {
      continue;
    }
    if (!definition.indicator_ids.some((indicatorId) => listedIndicatorIds.has(indicatorId))) {
      continue;
    }
    flags.push({ id: definition.id, label: definition.label });
  }

  const trimmedNote = note?.trim() ?? "";
  const astronautNote = trimmedNote === "" ? null : trimmedNote;

  const isPrivate = evaluation.indicators.some(
    (indicator) =>
      indicator.indicator_id === "mood" &&
      indicator.triggered.some((rule) => rule.level === "red"),
  );
  const kind: MessageKind = isPrivate ? "private_behavioral" : "medical";
  const recipientLabel = isPrivate ? PRIVATE_RECIPIENT : MEDICAL_RECIPIENT;

  const content: EarthMessageContent = {
    synthetic: true,
    astronaut_id: "SYN-01",
    mission_date: evaluation.today,
    mission_day: missionDay,
    overall_status: evaluation.overall_status,
    overall_escalation: evaluation.overall_escalation,
    indicators,
    flags_today: flags,
    recent_readings: recentReadings,
    astronaut_note: astronautNote,
    rules_version: evaluation.rules_version,
  };

  return {
    id: `msg-${evaluation.today}-${existingIdsToday + 1}`,
    kind,
    recipient_label: recipientLabel,
    content,
    state: "draft",
    sent_at_ms: null,
    arrives_at_ms: null,
    receipt_at_ms: null,
    receipt_text: null,
  };
}

export function validateNote(note: string): { ok: true } | { ok: false; message: string } {
  if (note.length > EARTH_LINK.note_max_chars) {
    return {
      ok: false,
      message: `Note is too long (max ${EARTH_LINK.note_max_chars} characters).`,
    };
  }
  return { ok: true };
}

export function send(msg: EarthMessage, nowMs: number): EarthMessage {
  if (msg.state !== "draft") {
    return msg;
  }
  const delay = delayMs();
  return {
    ...msg,
    state: "in_transit",
    sent_at_ms: nowMs,
    arrives_at_ms: nowMs + delay,
    receipt_at_ms: nowMs + delay * 2,
    receipt_text: null,
  };
}

function summaryBody(content: EarthMessageContent): string {
  if (content.indicators.length === 0) {
    return "All indicators are within your normal range.";
  }
  const lines: string[] = [
    `Overall status: ${content.overall_status}`,
    `Escalation: ${content.overall_escalation ?? "none"}`,
  ];
  for (const indicator of content.indicators) {
    lines.push(`${indicator.label} (${indicator.status})`);
    for (const rule of indicator.triggered) {
      lines.push(`- ${rule.title}`);
      lines.push(`  Source: ${rule.source}`);
    }
  }
  return lines.join("\n");
}

function deliveredText(msg: EarthMessage): string {
  const content = msg.content;
  const lines: string[] = ["SYNTHETIC"];
  if (msg.kind === "private_behavioral") {
    lines.push("Private");
  }
  lines.push(`Message to ${msg.recipient_label}`);
  lines.push(`Mission date: ${content.mission_date} (Day ${content.mission_day})`);
  lines.push(...summaryBody(content).split("\n"));

  const flagText =
    content.flags_today.length === 0
      ? "none"
      : content.flags_today.map((flag) => `${flag.label} (${flag.id})`).join(", ");
  lines.push(`Flags today: ${flagText}`);

  lines.push("Readings (7 days):");
  if (content.recent_readings.length === 0) {
    lines.push("- none");
  }
  for (const reading of content.recent_readings) {
    lines.push(`- ${reading.date} ${reading.metric}: ${reading.value}`);
  }
  lines.push(`Note: ${content.astronaut_note ?? "none"}`);
  return lines.join("\n");
}

function minutesLeft(target: number, nowMs: number): number {
  return Math.ceil(
    ((target - nowMs) * EARTH_LINK.demo_time_scale) / 60_000,
  );
}

export function viewMessage(
  msg: EarthMessage,
  side: "astronaut" | "earth",
  nowMs: number,
): MessageView {
  const arrivesAt = msg.arrives_at_ms;
  const receiptAt = msg.receipt_at_ms;

  if (msg.state === "draft" || arrivesAt === null || receiptAt === null) {
    if (side === "astronaut") {
      return {
        side,
        state: "draft",
        simulated_minutes_left: null,
        content_visible: true,
        text: summaryBody(msg.content),
      };
    }
    return {
      side,
      state: "draft",
      simulated_minutes_left: null,
      content_visible: false,
      text: "No message yet.",
    };
  }

  if (side === "astronaut") {
    if (nowMs < receiptAt) {
      const left = minutesLeft(receiptAt, nowMs);
      return {
        side,
        state: "in_transit",
        simulated_minutes_left: left,
        content_visible: true,
        text: `In transit to Earth — answer expected in ${left} min (simulated).`,
      };
    }
    return {
      side,
      state: "acknowledged",
      simulated_minutes_left: null,
      content_visible: true,
      text: "Received, under review (simulated).",
    };
  }

  if (nowMs < arrivesAt) {
    const left = minutesLeft(arrivesAt, nowMs);
    return {
      side,
      state: "in_transit",
      simulated_minutes_left: left,
      content_visible: false,
      text: `Incoming message — arrives in ${left} min.`,
    };
  }

  return {
    side,
    state: "delivered",
    simulated_minutes_left: null,
    content_visible: true,
    text: deliveredText(msg),
  };
}
