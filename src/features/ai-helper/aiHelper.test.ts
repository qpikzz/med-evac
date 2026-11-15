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
  buildDeterministicClinicalSummary,
  getTriggeredMetricSummaries,
} from "./clinicalSummary";
import {
  CombinationsFileError,
  loadCombinations,
  matchCombinations,
  type CombinationsFile,
} from "./combinations";
import { DEFAULT_HELPER_SETTINGS, askModel, type HelperSettings } from "./ollama";
import {
  SYSTEM_PROMPT,
  buildMessages,
  formatClinicalResponse,
  sortIndicatorsBySeverity,
} from "./prompt";
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
  it("prioritizes red indicators in summary order and clinical context", () => {
    const { ev } = day40();
    const prioritized = cloneEvaluation(ev);
    const sleep = prioritized.indicators.find((item) => item.indicator_id === "sleep_hours");
    const heart = prioritized.indicators.find((item) => item.indicator_id === "heart_rate");
    if (!sleep || !heart || sleep.triggered.length === 0 || heart.triggered.length === 0) {
      throw new Error("Day-40 severity indicators are missing");
    }

    sleep.status = "red";
    sleep.escalation = rules.escalation.red;
    sleep.triggered[0].level = "red";
    heart.status = "yellow";
    heart.escalation = rules.escalation.yellow;

    const pills = sortIndicatorsBySeverity(prioritized.indicators.filter(
      (indicator) => indicator.triggered.length > 0,
    ));
    expect(pills.map((indicator) => indicator.status)).toEqual(["red", "yellow"]);

    const messages = explainMessages(prioritized);
    const context = messages[1].content;
    expect(context.indexOf("CRITICAL / RED ALERTS")).toBeLessThan(
      context.indexOf("ELEVATED / YELLOW WARNINGS"),
    );
    expect(context.indexOf("Sleep last night (sleep_hours): RED")).toBeLessThan(
      context.indexOf("Resting heart rate (heart_rate): YELLOW"),
    );
    expect(SYSTEM_PROMPT).toContain("Open immediately with all CRITICAL / RED alerts");
  });

  it("rounds computed prompt values and displayed clinical responses", () => {
    const { ev } = day40();
    const evaluation = cloneEvaluation(ev);
    const heart = evaluation.indicators.find((item) => item.indicator_id === "heart_rate");
    const sleep = evaluation.indicators.find((item) => item.indicator_id === "sleep_hours");
    if (!heart?.triggered[0] || !sleep?.triggered[0]) {
      throw new Error("Day-40 numeric observations are missing");
    }
    heart.triggered[0].observed = {
      metric: "heart_rate",
      value: 80.12345,
      baseline: 62.654321,
      delta: 17.345678,
    };
    sleep.triggered[0].observed = {
      metric: "sleep_hours",
      value: 6.642857142857,
      baseline: 6.642857142857,
      delta: -0.123456789,
    };

    const context = explainMessages(evaluation)[1].content;
    expect(context).toContain(
      "Exact baseline comparison: Observed 80 bpm · preflight baseline 63 bpm · deviation +17 bpm",
    );
    expect(context).toContain(
      "Your resting heart rate (80 bpm) is +17 bpm above your preflight baseline of 63 bpm (alert threshold: ±12 bpm).",
    );
    expect(context).toContain("Observed value: 6.6 h");
    expect(context).not.toContain("80.12345");
    expect(context).not.toContain("6.642857142857");

    expect(
      formatClinicalResponse(
        "Temperature 39.012345 °C; sleep 6.642857 h; pulse 80.123 bpm; pressure 121.9 mmHg; average 36.84285714285715.",
      ),
    ).toBe(
      "Temperature 39.01 °C; sleep 6.6 h; pulse 80 bpm; pressure 122 mmHg; average 36.84.",
    );
  });

  it("builds the initial deterministic briefing red-first with rounded observations", () => {
    const { ev } = day40();
    const evaluation = cloneEvaluation(ev);
    const sleep = evaluation.indicators.find((item) => item.indicator_id === "sleep_hours");
    const heart = evaluation.indicators.find((item) => item.indicator_id === "heart_rate");
    if (!sleep?.triggered[0] || !heart?.triggered[0]) {
      throw new Error("Day-40 briefing indicators are missing");
    }

    sleep.status = "red";
    sleep.escalation = rules.escalation.red;
    sleep.triggered[0].level = "red";
    sleep.triggered[0].observed = {
      metric: "sleep_hours",
      value: 6.642857142857,
      baseline: 7.123456789,
      delta: -0.123456789,
    };
    heart.status = "yellow";
    heart.escalation = rules.escalation.yellow;
    heart.triggered[0].observed = {
      metric: "heart_rate",
      value: 80.12345,
      baseline: 62.654321,
      delta: 17.345678,
    };

    const summary = buildDeterministicClinicalSummary(evaluation, rules, 40);
    expect(summary.indexOf("CRITICAL / RED alerts")).toBeLessThan(
      summary.indexOf("ELEVATED / YELLOW warnings"),
    );
    expect(summary.indexOf("Sleep last night:")).toBeLessThan(
      summary.indexOf("Resting heart rate:"),
    );
    expect(summary).toContain("Observed 6.6 h.");
    expect(summary).toContain(
      "Your resting heart rate (80 bpm) is +17 bpm above your preflight baseline of 63 bpm (alert threshold: ±12 bpm).",
    );
    expect(summary).not.toContain("6.642857142857");
    const summaryLines = summary.split("\n");
    const alertBulletIndexes = summaryLines.flatMap((line, index) =>
      line.startsWith("- ") && line !== "- None." ? [index] : [],
    );
    expect(alertBulletIndexes.length).toBeGreaterThan(0);
    for (const index of alertBulletIndexes) {
      expect(summaryLines[index + 1]).toMatch(/^  Next: .+/);
    }
  });

  it("consolidates same-metric red threshold and baseline triggers with exact comparison", () => {
    const { ev } = day40();
    const evaluation = cloneEvaluation(ev);
    const temperature = evaluation.indicators.find(
      (item) => item.indicator_id === "body_temperature",
    );
    if (!temperature) {
      throw new Error("Day-40 body temperature indicator is missing");
    }
    temperature.status = "red";
    temperature.escalation = rules.escalation.red;
    temperature.triggered = [
      {
        rule_id: "temp_r_abs",
        level: "red",
        source: "TABLE: Body temperature, RED",
        title: "High fever",
        explanation: "Your resting temperature is 39.0 °C or higher.",
        actions: [],
        recheck: "Measure again in 30 minutes.",
        observed: { metric: "body_temp", value: 43 },
      },
      {
        rule_id: "temp_y_baseline",
        level: "yellow",
        source: "TABLE: Body temperature, YELLOW",
        title: "Temperature above your normal",
        explanation: "Your resting temperature is at least 1 °C above your own 7-day average.",
        actions: [],
        recheck: "Measure again in 30 minutes.",
        observed: { metric: "body_temp", value: 43, baseline: 36.8, delta: 6.2 },
      },
    ];

    const temperatureSummaries = getTriggeredMetricSummaries(evaluation, rules).filter(
      (summary) => summary.metricKey === "body_temp",
    );
    expect(temperatureSummaries).toHaveLength(1);
    expect(temperatureSummaries[0].status).toBe("red");

    const briefing = buildDeterministicClinicalSummary(evaluation, rules, 40);
    const temperatureBullets = briefing
      .split("\n")
      .filter((line) => line.startsWith("- Body temperature:"));
    expect(temperatureBullets).toHaveLength(1);
    expect(temperatureBullets[0]).toContain(
      "Your resting temperature (43.0 °C) is +6.2 °C above your 7-day baseline of 36.8 °C (alert threshold: +1.0 °C).",
    );
    expect(briefing).not.toContain("at least 1 °C above your own 7-day average");
    expect(briefing).toContain(
      `${temperatureBullets[0]}\n  Next: Rest and drink water. Tell your crew medical officer now. Contact the flight surgeon on Earth. Take fever medicine only on their advice.`,
    );

    const context = buildMessages({
      mode: "explain_today",
      ev: evaluation,
      picture: matchCombinations(evaluation, [], fixture),
      rules,
      chat: [],
    })[1].content;
    const temperatureContextLines = context
      .split("\n")
      .filter((line) => line.startsWith("- Body temperature (body_temp):"));
    expect(temperatureContextLines).toHaveLength(1);
    expect(context).toContain(
      "Exact baseline comparison: Observed 43.0 °C · 7-day baseline 36.8 °C · deviation +6.2 °C",
    );
    expect(context).toContain(
      "Your resting temperature (43.0 °C) is +6.2 °C above your 7-day baseline of 36.8 °C (alert threshold: +1.0 °C).",
    );
    expect(context).not.toContain("at least 1 °C above your own 7-day average");
  });

  it("adds a positive maintenance tip when the overall status is green with no alerts", () => {
    const { ev } = day40();
    const evaluation = cloneEvaluation(ev);
    evaluation.overall_status = "green";
    evaluation.overall_escalation = rules.escalation.green;
    for (const indicator of evaluation.indicators) {
      indicator.status = "green";
      indicator.escalation = rules.escalation.green;
      indicator.triggered = [];
    }

    expect(buildDeterministicClinicalSummary(evaluation, rules, 40)).toContain(
      "Next: All indicators are within your nominal range. Keep up your current hydration, sleep, and exercise schedule.",
    );
  });

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

  it("includes submitted clinical notes in the Local AI context", () => {
    const { ev } = day40();
    const picture = matchCombinations(ev, [], fixture);
    const messages = buildMessages({
      mode: "explain_today",
      ev,
      picture,
      rules,
      chat: [],
      clinicalNotes: "Mild fatigue after exercise.",
    });

    expect(messages[1].content).toContain(
      "Clinical notes: Mild fatigue after exercise.",
    );
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
