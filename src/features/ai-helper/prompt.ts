import type { EvaluationResult, RulesFile, Status } from "../../rules/types";
import type { PictureResult } from "./combinations";
import {
  MAX_TURNS_SENT,
  MAX_USER_CHARS,
  type ChatMessage,
} from "./ollama";

export const SYSTEM_PROMPT = [
  "You are the onboard health explainer of a fictional Mars mission app. The data is SYNTHETIC.",
  "You explain; you do not decide. Colours, urgency and whom to contact are set only by the app's health rules. Never change, soften or question them.",
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
}

function isNonGreen(status: Status): boolean {
  return status === "yellow" || status === "red";
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

function observedLines(
  rules: RulesFile,
  observed: EvaluationResult["indicators"][number]["triggered"][number]["observed"],
): string[] {
  if (!observed) {
    return [];
  }
  const lines: string[] = [];
  const unit = metricUnit(rules, observed.metric);
  if (typeof observed.value === "number") {
    lines.push(`    Observed value: ${observed.value}${unit ? ` ${unit}` : ""}`);
  }
  if (typeof observed.baseline === "number") {
    lines.push(`    Observed baseline: ${observed.baseline}${unit ? ` ${unit}` : ""}`);
  }
  if (typeof observed.delta === "number") {
    lines.push(`    Observed delta: ${observed.delta}`);
  }
  return lines;
}

function serializeContext(
  ev: EvaluationResult,
  picture: PictureResult,
  rules: RulesFile,
): string {
  const lines: string[] = ["CONTEXT:"];
  lines.push(`Today: ${ev.today}`);
  lines.push(`Overall status: ${ev.overall_status}`);
  lines.push(`Overall escalation: ${ev.overall_escalation ?? "none"}`);

  const nonGreen = ev.indicators.filter((indicator) => isNonGreen(indicator.status));
  lines.push("Non-green indicators:");
  if (nonGreen.length === 0) {
    lines.push("- None");
  }
  for (const indicator of nonGreen) {
    lines.push(
      `- ${indicatorLabel(rules, indicator.indicator_id)} (${indicator.indicator_id}): ${indicator.status.toUpperCase()}`,
    );
    for (const rule of indicator.triggered) {
      lines.push(`  Rule: ${rule.title}`);
      lines.push(`  Explanation: ${rule.explanation}`);
      lines.push(`  Source: ${rule.source}`);
      lines.push(...observedLines(rules, rule.observed));
    }
  }

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
  const { mode, ev, picture, rules, chat } = args;
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: serializeContext(ev, picture, rules) },
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
