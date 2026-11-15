import type { RulesFile } from "../../rules/types";

export const SAFETY_PHRASES = [
  "hurt myself",
  "harm myself",
  "kill myself",
  "suicide",
  "end my life",
  "don't want to live",
  "do not want to live",
  "self-harm",
  "self harm",
  "want to die",
  "better off dead",
  // Russian — crew members may type in their own language
  "убить себя",
  "покончить с собой",
  "суицид",
  "навредить себе",
  "не хочу жить",
  "самоповрежд",
] as const;

export interface SafetyHit {
  hit: true;
  phrase: string;
}

export type SafetyResult = SafetyHit | { hit: false };

export interface SafetySupportCard {
  rule_id: string;
  title: string;
  explanation: string;
  actions: string[];
  recheck: string;
}

export function checkSafety(text: string): SafetyResult {
  const normalized = text.toLowerCase();
  for (const phrase of SAFETY_PHRASES) {
    if (normalized.includes(phrase)) {
      return { hit: true, phrase };
    }
  }
  return { hit: false };
}

export function buildSafetySupportCard(rules: RulesFile): SafetySupportCard | null {
  for (const indicator of rules.indicators) {
    for (const rule of indicator.rules) {
      if (rule.id === "mood_r_flags") {
        return {
          rule_id: rule.id,
          title: rule.title,
          explanation: rule.explanation,
          actions: [...rule.actions],
          recheck: rule.recheck,
        };
      }
    }
  }
  return null;
}


/* ---- Output check for the local model (the model explains; it never decides) ---- */

const DIAGNOSIS_PATTERNS: RegExp[] = [
  /\byou (?:have|are suffering from|'ve got)\b/i,
  /\bdiagnos(?:is|ed|e)\b/i,
  /\b(?:heart attack|myocardial infarction|stroke|cancer|diabetes|pneumonia|sepsis|covid)\b/i,
];

const REASSURANCE_PATTERNS: RegExp[] = [
  /\b(?:all|everything) (?:is |looks )?(?:good|fine|normal|ok(?:ay)?)\b/i,
  /\bnothing to worry\b/i,
  /\bno (?:need|reason) to (?:worry|contact|tell)\b/i,
  /\byou(?:'re| are) (?:fine|healthy|okay|ok)\b/i,
];

export interface AnswerReview {
  ok: boolean;
  issues: ("diagnosis" | "reassurance_conflicts_with_rules")[];
}

/** Flags model answers that name a diagnosis, or reassure while the rules say yellow/red. */
export function reviewAiAnswer(text: string, overallStatus: string): AnswerReview {
  const issues: AnswerReview["issues"] = [];
  if (DIAGNOSIS_PATTERNS.some((pattern) => pattern.test(text))) {
    issues.push("diagnosis");
  }
  if ((overallStatus === "red" || overallStatus === "yellow") && REASSURANCE_PATTERNS.some((p) => p.test(text))) {
    issues.push("reassurance_conflicts_with_rules");
  }
  return { ok: issues.length === 0, issues };
}

/** Note appended under a flagged answer: the rules' status and escalation always win. */
export function rulesCheckNote(review: AnswerReview, overallStatus: string, escalationText: string): string {
  const parts = ["Rules check: part of this AI answer may not match the app's rules."];
  if (review.issues.includes("diagnosis")) {
    parts.push("The assistant cannot diagnose — only a medical professional can.");
  }
  parts.push(`Today's status from the rules is ${overallStatus.toUpperCase()}. ${escalationText}`.trim());
  return parts.join(" ");
}
