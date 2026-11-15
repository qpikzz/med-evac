import type { EvaluationResult, RulesFile, Status } from "../../rules/types";
import type { PictureResult } from "./combinations";
import {
  MAX_TURNS_SENT,
  MAX_USER_CHARS,
  type ChatMessage,
} from "./ollama";

export const SYSTEM_PROMPT = [
  "You are ORBITA (Onboard Remote Biometric & Integrated Telemetry Assistant), the onboard health explainer of a fictional Mars mission app. The data is SYNTHETIC.",
  "You explain; you do not decide. Colours, urgency and whom to contact are set only by the app's health rules. Never change, soften or question them.",
  "Strictly order every clinical response by severity. Open immediately with all CRITICAL / RED alerts, the affected metrics, and why they need immediate attention. Only after every RED item, summarize ELEVATED / YELLOW warnings. Mention NOMINAL / GREEN metrics briefly at the end or only when specifically asked.",
  "Round all calculated or averaged numbers to 1–2 decimal places depending on the metric (e.g., 36.8 °C for temperature, 6.6 h for sleep, whole numbers for bpm and mmHg). NEVER output raw unrounded floating-point decimals like 36.84285714285715.",
  'Never give a diagnosis or name a disease as a conclusion. Use "may be related to" and "worth discussing with your crew medical officer".',
  "Use only the facts in the CONTEXT message. If something is not there, say you do not know.",
  "When you mention a combination from the verified list, name its source. If the picture is marked UNVERIFIED, say so.",
  "You are not a doctor or a psychologist. If the astronaut seems distressed, encourage them to talk to the crew medical officer.",
  "Use short, plain sentences. Maximum 120 words.",
].join("\n");

export class PromptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromptError";
  }
}

export interface BuildMessagesArgs {
  mode: "explain_today" | "chat";
  ev: EvaluationResult;
  picture: PictureResult;
  rules: RulesFile;
  chat: { role: "user" | "assistant"; content: string }[];
  clinicalNotes?: string;
}

const STATUS_PRIORITY: Record<Status, number> = {
  red: 0,
  yellow: 1,
  green: 2,
  no_data: 3,
};

export function sortIndicatorsBySeverity<
  T extends Pick<EvaluationResult["indicators"][number], "status">,
>(indicators: T[]): T[] {
  return [...indicators].sort(
    (left, right) => STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status],
  );
}

function indicatorLabel(rules: RulesFile, indicatorId: string): string {
  return rules.indicators.find((indicator) => indicator.id === indicatorId)?.label ?? indicatorId;
}

function metricUnit(rules: RulesFile, metricId: string | undefined): string {
  if (metricId === undefined) {
    return "";
  }
  return rules.metrics.find((metric) => metric.id === metricId)?.unit ?? "";
}

function metricPrecision(rules: RulesFile, metricId: string | undefined): number {
  switch (metricUnit(rules, metricId)) {
    case "bpm":
    case "mmHg":
    case "mg/dL":
      return 0;
    case "°C":
    case "h":
    case "kg":
    case "µSv/h":
    case "mSv":
    case "0-10":
    case "0–10":
      return 1;
    default:
      return 2;
  }
}

function roundedValue(value: number, precision: number): number {
  return Number(value.toFixed(precision));
}

function ruleDeltaPrecision(
  rules: RulesFile,
  ruleId: string,
  metricId: string | undefined,
): number {
  const rule = rules.indicators
    .flatMap((indicator) => indicator.rules)
    .find((entry) => entry.id === ruleId);
  return rule?.trigger.type === "baseline_delta" && rule.trigger.unit === "abs"
    ? metricPrecision(rules, metricId)
    : 2;
}

function observedLines(
  rules: RulesFile,
  ruleId: string,
  observed: EvaluationResult["indicators"][number]["triggered"][number]["observed"],
): string[] {
  if (!observed) {
    return [];
  }
  const lines: string[] = [];
  const unit = metricUnit(rules, observed.metric);
  if (typeof observed.value === "number") {
    lines.push(
      `    Observed value: ${roundedValue(observed.value, metricPrecision(rules, observed.metric))}${unit ? ` ${unit}` : ""}`,
    );
  }
  if (typeof observed.baseline === "number") {
    lines.push(
      `    Observed baseline: ${roundedValue(observed.baseline, metricPrecision(rules, observed.metric))}${unit ? ` ${unit}` : ""}`,
    );
  }
  if (typeof observed.delta === "number") {
    lines.push(
      `    Observed delta: ${roundedValue(observed.delta, ruleDeltaPrecision(rules, ruleId, observed.metric))}`,
    );
  }
  return lines;
}

const DECIMAL_WITH_UNIT =
  /(^|[^\w.])(-?\d+(?:\.\d+)?)(\s*)(°C|bpm|mmHg|mg\/dL|µSv\/h|mSv|h\b|kg\b|0[-–]10)/gi;
const LONG_DECIMAL = /(^|[^\w.])(-?\d+\.\d{3,})(?!\w)/g;

function responsePrecision(unit: string): number {
  switch (unit) {
    case "bpm":
    case "mmHg":
    case "mg/dL":
      return 0;
    case "°C":
      return 2;
    case "h":
    case "kg":
    case "µSv/h":
    case "mSv":
    case "0-10":
    case "0–10":
      return 1;
    default:
      return 2;
  }
}

export function formatClinicalResponse(text: string): string {
  return text
    .replace(DECIMAL_WITH_UNIT, (_match, prefix: string, value: string, space: string, unit: string) => {
      const number = Number(value);
      if (!Number.isFinite(number)) {
        return `${prefix}${value}${space}${unit}`;
      }
      return `${prefix}${roundedValue(number, responsePrecision(unit))}${space}${unit}`;
    })
    .replace(LONG_DECIMAL, (_match, prefix: string, value: string) => {
      const number = Number(value);
      return Number.isFinite(number)
        ? `${prefix}${roundedValue(number, 2)}`
        : `${prefix}${value}`;
    });
}

function serializeContext(
  ev: EvaluationResult,
  picture: PictureResult,
  rules: RulesFile,
  clinicalNotes: string | undefined,
): string {
  const lines: string[] = ["CONTEXT:"];
  lines.push(`Today: ${ev.today}`);
  if (clinicalNotes?.trim()) {
    lines.push(`Clinical notes: ${clinicalNotes.trim()}`);
  }
  lines.push(`Overall status: ${ev.overall_status}`);
  lines.push(`Overall escalation: ${ev.overall_escalation ?? "none"}`);

  const prioritized = sortIndicatorsBySeverity(ev.indicators);
  const redIndicators = prioritized.filter((indicator) => indicator.status === "red");
  const yellowIndicators = prioritized.filter((indicator) => indicator.status === "yellow");
  const nonGreen = [...redIndicators, ...yellowIndicators];

  for (const [heading, indicators] of [
    ["CRITICAL / RED ALERTS — address these first:", redIndicators],
    ["ELEVATED / YELLOW WARNINGS — address only after all RED alerts:", yellowIndicators],
  ] as const) {
    lines.push(heading);
    if (indicators.length === 0) {
      lines.push("- None");
    }
    for (const indicator of indicators) {
      lines.push(
        `- ${indicatorLabel(rules, indicator.indicator_id)} (${indicator.indicator_id}): ${indicator.status.toUpperCase()}`,
      );
      const triggered = [...indicator.triggered].sort(
        (left, right) => STATUS_PRIORITY[left.level] - STATUS_PRIORITY[right.level],
      );
      for (const rule of triggered) {
        lines.push(`  Rule: ${rule.title}`);
        lines.push(`  Explanation: ${rule.explanation}`);
        lines.push(`  Source: ${rule.source}`);
        lines.push(...observedLines(rules, rule.rule_id, rule.observed));
      }
    }
  }

  lines.push(
    "NOMINAL / GREEN INDICATORS: Mention briefly at the end or only when specifically asked.",
  );

  lines.push("Matched combinations:");
  if (picture.matched.length > 0) {
    for (const entry of picture.matched) {
      const combination = entry.combination;
      lines.push(`- ${combination.title}`);
      lines.push(
        `  Possible explanations: ${combination.possible_explanations.join(" | ")}`,
      );
      lines.push(
        `  Actions: ${combination.actions.length > 0 ? combination.actions.join(" | ") : "none"}`,
      );
      lines.push(`  Discuss with: ${combination.discuss_with}`);
      lines.push(`  Source: ${combination.source}`);
    }
  } else if (picture.unverified) {
    const labels = nonGreen
      .map((indicator) => indicatorLabel(rules, indicator.indicator_id))
      .join(", ");
    lines.push(`UNVERIFIED PICTURE: no verified combination matches ${labels}`);
  } else {
    lines.push("- None");
  }

  return lines.join("\n");
}

export function buildMessages(args: BuildMessagesArgs): ChatMessage[] {
  const { mode, ev, picture, rules, chat, clinicalNotes } = args;
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: serializeContext(ev, picture, rules, clinicalNotes) },
  ];

  if (mode === "explain_today") {
    messages.push({ role: "user", content: "Explain today's picture to me in plain words." });
    return messages;
  }

  const newUserText = chat.length > 0 ? chat[chat.length - 1].content : "";
  if (newUserText.length > MAX_USER_CHARS) {
    throw new PromptError("Please keep it under 1000 characters.");
  }

  const recentTurns = chat.slice(-MAX_TURNS_SENT);
  for (const turn of recentTurns) {
    messages.push({ role: turn.role, content: turn.content });
  }
  return messages;
}
