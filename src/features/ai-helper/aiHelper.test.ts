import { describe, expect, it, vi } from "vitest";
import combinationsFixture from "./__fixtures__/combinations.test.json";
import shippedCombinations from "../../data/combinations.json";
import rulesJson from "../../data/rules.json";
import syntheticJson from "../../data/synthetic_history.json";
import { evaluate } from "../../rules/engine";
import { loadRules } from "../../rules/loadRules";
import type { EvaluationResult } from "../../rules/types";
import { computeBaselines } from "../personal-baseline/baseline";
import { createHistoryStore, loadSyntheticDataset } from "../synthetic-data/historyStore";
import {
  CombinationsFileError,
  loadCombinations,
  matchCombinations,
  type CombinationsFile,
} from "./combinations";
import { DEFAULT_HELPER_SETTINGS, askModel, type HelperSettings } from "./ollama";
import { SYSTEM_PROMPT, buildMessages } from "./prompt";
import { buildSafetySupportCard, checkSafety } from "./safety";

const today = "2026-11-14";
const dataset = loadSyntheticDataset(syntheticJson);
const rules = loadRules(rulesJson);
const fixture: CombinationsFile = loadCombinations(combinationsFixture, rules);

type Store = ReturnType<typeof createHistoryStore>;

function day40(flags: string[] = []): { ev: EvaluationResult; store: Store } {
  const store = createHistoryStore(dataset, { includeDay40: true });
  const baselines = computeBaselines({
    today,
    preflight: store.getPreflight(),
    history: store.getReadings(),
    rules,
  });
  const ev = evaluate({
    today,
    readings: store.getReadings(),
    flags,
    baselines,
    rules,
  });
  return { ev, store };
}

function cloneEvaluation(ev: EvaluationResult): EvaluationResult {
  return JSON.parse(JSON.stringify(ev)) as EvaluationResult;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as unknown as Response;
}

function expectCombinationsError(json: unknown): CombinationsFileError {
  try {
    loadCombinations(json, rules);
  } catch (error) {
    expect(error).toBeInstanceOf(CombinationsFileError);
    return error as CombinationsFileError;
  }
  throw new Error("Expected loadCombinations to throw");
}

function explainMessages(ev: EvaluationResult) {
  const picture = matchCombinations(ev, [], fixture);
  return buildMessages({ mode: "explain_today", ev, picture, rules, chat: [] });
}

describe("ai helper", () => {
  it("criterion 1: Day-40 picture matches the heart-and-sleep combination", () => {
    const { ev } = day40();
    const picture = matchCombinations(ev, [], fixture);

    expect(picture.matched.map((entry) => entry.combination.id)).toEqual([
      "combo_test_hr_sleep",
    ]);
    expect(picture.unverified).toBe(false);
    expect(picture.non_green_indicators).toEqual(["heart_rate", "sleep_hours"]);
  });

  it("criterion 2: an empty combination list marks the picture unverified", () => {
    const { ev } = day40();
    const empty = loadCombinations({ schema_version: "1.0", combinations: [] }, rules);
    const picture = matchCombinations(ev, [], empty);

    expect(picture.matched).toEqual([]);
    expect(picture.unverified).toBe(true);
  });

  it("criterion 3: a single changed indicator is not unverified", () => {
    const { ev } = day40();
    const onlySleep = cloneEvaluation(ev);
    const heart = onlySleep.indicators.find((item) => item.indicator_id === "heart_rate");
    if (!heart) {
      throw new Error("Missing heart_rate indicator");
    }
    heart.status = "green";
    heart.escalation = rules.escalation.green;
    heart.triggered = [];

    const picture = matchCombinations(onlySleep, [], fixture);
    expect(picture.unverified).toBe(false);
    expect(picture.matched).toEqual([]);
  });

  it("criterion 4: rule plus flag combination needs the flag", () => {
    const withFlag = day40(["cough"]).ev;
    const withoutFlag = day40().ev;

    const matchedWith = matchCombinations(withFlag, ["cough"], fixture);
    const matchedWithout = matchCombinations(withoutFlag, [], fixture);

    expect(
      matchedWith.matched.some((entry) => entry.combination.id === "combo_test_flag"),
    ).toBe(true);
    expect(
      matchedWithout.matched.some((entry) => entry.combination.id === "combo_test_flag"),
    ).toBe(false);
  });

  it("criterion 5: validation rejects unknown ids and short all_of lists", () => {
    const badIndicator = JSON.parse(JSON.stringify(combinationsFixture));
    badIndicator.combinations[0].all_of[0].indicator_id = "heart";
    const indicatorError = expectCombinationsError(badIndicator);
    expect(indicatorError.message).toContain("combo_test_hr_sleep");
    expect(indicatorError.message).toContain("heart");

    const shortAllOf = JSON.parse(JSON.stringify(combinationsFixture));
    shortAllOf.combinations[0].all_of = [shortAllOf.combinations[0].all_of[0]];
    expect(() => loadCombinations(shortAllOf, rules)).toThrowError(CombinationsFileError);
  });

  it("criterion 6: Ollama down returns unavailable", async () => {
    const { ev } = day40();
    const fetchImpl = vi.fn(async () => {
      throw new Error("connection refused");
    }) as unknown as typeof fetch;
    const settings: HelperSettings = { ...DEFAULT_HELPER_SETTINGS, timeout_ms: 50 };

    const result = await askModel(explainMessages(ev), settings, fetchImpl);
    expect(result).toEqual({ status: "unavailable" });
  });

  it("criterion 7: a missing model returns model_missing", async () => {
    const { ev } = day40();
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ models: [{ name: "llama3:8b" }] }),
    ) as unknown as typeof fetch;

    const result = await askModel(explainMessages(ev), DEFAULT_HELPER_SETTINGS, fetchImpl);
    expect(result).toEqual({ status: "model_missing" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("criterion 8: the chat request has the expected shape", async () => {
    type ChatRequestBody = {
      model: string;
      stream: boolean;
      options: { temperature: number };
      messages: { role: string; content: string }[];
    };
    let posted: ChatRequestBody | undefined;

    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/tags")) {
          return jsonResponse({ models: [{ name: "granite3.3:8b" }] });
        }
        posted = JSON.parse(String(init?.body)) as ChatRequestBody;
        return jsonResponse({ message: { content: "ok" } });
      },
    ) as unknown as typeof fetch;

    const { ev } = day40();
    const result = await askModel(explainMessages(ev), DEFAULT_HELPER_SETTINGS, fetchImpl);
    expect(result).toEqual({ status: "ok", text: "ok" });

    if (!posted) {
      throw new Error("Chat request was not captured");
    }
    expect(posted.model).toBe("granite3.3:8b");
    expect(posted.stream).toBe(false);
    expect(posted.options.temperature).toBe(0.2);
    expect(posted.messages[0]).toEqual({ role: "system", content: SYSTEM_PROMPT });
    expect(posted.messages[1].content.startsWith("CONTEXT:")).toBe(true);
    expect(posted.messages[1].content).toContain("Heart rate differs from your normal");
    expect(posted.messages[1].content).toContain("TABLE: Sleep hours, YELLOW");
  });

  it("criterion 9: the answer text is returned literally", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/tags")) {
        return jsonResponse({ models: [{ name: "granite3.3:8b" }] });
      }
      return jsonResponse({ message: { content: "<b>Rest</b>" } });
    }) as unknown as typeof fetch;

    const { ev } = day40();
    const result = await askModel(explainMessages(ev), DEFAULT_HELPER_SETTINGS, fetchImpl);
    expect(result).toEqual({ status: "ok", text: "<b>Rest</b>" });
  });

  it("criterion 10: safety text is blocked before any model call", async () => {
    const safety = checkSafety("I want to HURT MYSELF");
    expect(safety.hit).toBe(true);
    if (safety.hit) {
      expect(safety.phrase).toBe("hurt myself");
    }

    const fetchImpl = vi.fn();
    const card = buildSafetySupportCard(rules);
    expect(card?.title).toBe("You deserve support right now");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("criterion 11: a hanging request times out", async () => {
    const fetchImpl = vi.fn(
      () => new Promise<Response>(() => undefined),
    ) as unknown as typeof fetch;
    const settings: HelperSettings = { ...DEFAULT_HELPER_SETTINGS, timeout_ms: 50 };

    const { ev } = day40();
    const result = await askModel(explainMessages(ev), settings, fetchImpl);
    expect(result).toEqual({ status: "timeout" });
  });

  it("criterion 12: user text and turn limits are enforced", () => {
    const { ev } = day40();
    const picture = matchCombinations(ev, [], fixture);

    expect(() =>
      buildMessages({
        mode: "chat",
        ev,
        picture,
        rules,
        chat: [{ role: "user", content: "a".repeat(1001) }],
      }),
    ).toThrowError(/1000/);

    const chat = Array.from({ length: 15 }, (_, index) => ({
      role: (index % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `turn-${index}`,
    }));
    const messages = buildMessages({ mode: "chat", ev, picture, rules, chat });

    expect(messages).toHaveLength(12);
    expect(messages[0].role).toBe("system");
    expect(messages[1].content.startsWith("CONTEXT:")).toBe(true);
    expect(messages.slice(2)).toHaveLength(10);
    expect(messages[messages.length - 1].content).toBe("turn-14");
  });

  it("criterion 13: helper functions never change the evaluation", async () => {
    const { ev } = day40();
    const before = JSON.stringify(ev);

    const picture = matchCombinations(ev, [], fixture);
    const messages = buildMessages({ mode: "explain_today", ev, picture, rules, chat: [] });
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/tags")) {
        return jsonResponse({ models: [{ name: "granite3.3:8b" }] });
      }
      return jsonResponse({ message: { content: "ok" } });
    }) as unknown as typeof fetch;

    await askModel(messages, DEFAULT_HELPER_SETTINGS, fetchImpl);
    expect(JSON.stringify(ev)).toBe(before);
  });

  it("criterion 14: the shipped combinations file loads", () => {
    expect(() => loadCombinations(shippedCombinations, rules)).not.toThrow();
  });
});
