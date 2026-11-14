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
