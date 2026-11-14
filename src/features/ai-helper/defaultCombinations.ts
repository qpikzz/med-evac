import combinationsJson from "../../data/combinations.json";
import type { RulesFile } from "../../rules/types";
import { loadCombinations, type CombinationsFile } from "./combinations";

/*
 * #TODO(Q-AI-COMBO): `src/data/combinations.json` currently holds a clean,
 * valid empty list. Replace it with Ayesha's verified combination list in the
 * shape defined by `openspec/specs/FEATURES/ai-helper.md` §4.1. The agent must
 * not invent medical content.
 */
export function loadDefaultCombinations(rules: RulesFile): CombinationsFile {
  return loadCombinations(combinationsJson, rules);
}
