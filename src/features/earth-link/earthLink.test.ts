import { describe, expect, it, vi } from "vitest";
import rulesJson from "../../data/rules.json";
import syntheticJson from "../../data/synthetic_history.json";
import { evaluate } from "../../rules/engine";
import { loadRules } from "../../rules/loadRules";
import type { EvaluationResult } from "../../rules/types";
import { computeBaselines } from "../personal-baseline/baseline";
import { createHistoryStore, loadSyntheticDataset } from "../synthetic-data/historyStore";
import {
  buildDraft,
  delayMs,
  send,
  shouldAutoDraft,
  validateNote,
  viewMessage,
  type BuildDraftArgs,
} from "./message";
import { EARTH_LINK } from "./settings";
import { createInMemoryTransport } from "./transport";

const today = "2026-11-14";
const t0 = 1_000_000;
const dataset = loadSyntheticDataset(syntheticJson);
const rules = loadRules(rulesJson);

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

function draftFor(
  evaluation: EvaluationResult,
  store: Store,
  overrides: Partial<Omit<BuildDraftArgs, "evaluation" | "store">> = {},
) {
  return buildDraft({
    evaluation,
    store,
    rules,
    flagsToday: [],
    missionDay: 40,
    existingIdsToday: 0,
    ...overrides,
  });
}

function indicator(ev: EvaluationResult, id: string) {
  const found = ev.indicators.find((item) => item.indicator_id === id);
  if (!found) {
    throw new Error(`Missing indicator ${id}`);
  }
  return found;
}

function greenEvaluation(ev: EvaluationResult): EvaluationResult {
  const clone = JSON.parse(JSON.stringify(ev)) as EvaluationResult;
  clone.overall_status = "green";
  clone.overall_escalation = rules.escalation.green;
  clone.indicators = clone.indicators.map((item) => ({
    ...item,
    status: "green",
    escalation: rules.escalation.green,
    triggered: [],
    baseline_forming: false,
  }));
  return clone;
}

describe("earth link", () => {
  it("criterion 1: send schedules arrival and receipt times", () => {
    expect(delayMs()).toBe(20_000);
    expect(EARTH_LINK.demo_time_scale).toBe(60);

    const { ev, store } = day40();
    const sent = send(draftFor(ev, store), t0);

    expect(sent.arrives_at_ms).toBe(t0 + 20_000);
    expect(sent.receipt_at_ms).toBe(t0 + 40_000);
    expect(sent.state).toBe("in_transit");
  });

  it("criterion 2: the Earth view hides content until arrival", () => {
    const { ev, store } = day40();
    const sent = send(draftFor(ev, store), t0);

    const inTransit = viewMessage(sent, "earth", t0 + 10_000);
    expect(inTransit.state).toBe("in_transit");
    expect(inTransit.content_visible).toBe(false);
    expect(inTransit.simulated_minutes_left).toBe(10);

    const delivered = viewMessage(sent, "earth", t0 + 20_000);
    expect(delivered.state).toBe("delivered");
    expect(delivered.content_visible).toBe(true);
  });

  it("criterion 3: the astronaut acknowledges after the return delay", () => {
    const { ev, store } = day40();
    const sent = send(draftFor(ev, store), t0);

    const before = viewMessage(sent, "astronaut", t0 + 39_999);
    expect(before.state).toBe("in_transit");
    expect(before.simulated_minutes_left).toBe(1);

    const after = viewMessage(sent, "astronaut", t0 + 40_000);
    expect(after.state).toBe("acknowledged");
    expect(after.text).toBe("Received, under review (simulated).");
  });

  it("criterion 4: the Day-40 draft contains the yellow indicators", () => {
    const { ev, store } = day40();
    const draft = draftFor(ev, store);

    expect(draft.content.indicators.map((item) => item.indicator_id)).toEqual([
      "heart_rate",
      "sleep_hours",
    ]);
    expect(
      draft.content.indicators[0].triggered.some((rule) => rule.rule_id === "hr_y_baseline"),
    ).toBe(true);
    expect(
      draft.content.indicators[1].triggered.some((rule) => rule.rule_id === "sleep_y_avg7"),
    ).toBe(true);
    expect(draft.content.recent_readings).toHaveLength(14);
    expect(draft.kind).toBe("medical");
    expect(shouldAutoDraft(ev)).toBe(false);
  });

  it("criterion 5: a red flag triggers an auto-draft with the flag", () => {
    const { ev, store } = day40(["irregular_heartbeat"]);
    expect(shouldAutoDraft(ev)).toBe(true);

    const heart = indicator(ev, "heart_rate");
    expect(heart.status).toBe("red");
    expect(heart.triggered.some((rule) => rule.rule_id === "hr_r_irregular")).toBe(true);

    const draft = draftFor(ev, store, { flagsToday: ["irregular_heartbeat"] });
    expect(draft.content.flags_today).toContainEqual({
      id: "irregular_heartbeat",
      label: "Irregular or skipping heartbeat",
    });
    expect(draft.kind).toBe("medical");
  });

  it("criterion 6: mood red creates a private behavioral message", () => {
    const { ev, store } = day40(["self_harm_thoughts"]);
    const draft = draftFor(ev, store, { flagsToday: ["self_harm_thoughts"] });

    expect(draft.kind).toBe("private_behavioral");
    expect(draft.recipient_label).toContain("behavioral health");
    expect(draft.recipient_label).toContain("private");
  });

  it("criterion 7: an all-green evaluation still builds a draft", () => {
    const { ev, store } = day40();
    const draft = draftFor(greenEvaluation(ev), store);

    expect(draft.content.indicators).toEqual([]);
    expect(draft.content.recent_readings).toEqual([]);
    expect(draft.state).toBe("draft");
    expect(draft.kind).toBe("medical");
  });

  it("criterion 8: note length and content rules", () => {
    expect(validateNote("a".repeat(501))).toEqual({
      ok: false,
      message: "Note is too long (max 500 characters).",
    });
    expect(validateNote("a".repeat(500))).toEqual({ ok: true });

    const { ev, store } = day40();
    expect(draftFor(ev, store, { note: "" }).content.astronaut_note).toBeNull();
    expect(draftFor(ev, store, { note: "<b>hi</b>" }).content.astronaut_note).toBe(
      "<b>hi</b>",
    );
  });

  it("criterion 9: the content has exactly the contracted fields", () => {
    const { ev, store } = day40();
    const draft = draftFor(ev, store);

    expect(Object.keys(draft.content).sort()).toEqual(
      [
        "synthetic",
        "astronaut_id",
        "mission_date",
        "mission_day",
        "overall_status",
        "overall_escalation",
        "indicators",
        "flags_today",
        "recent_readings",
        "astronaut_note",
        "rules_version",
      ].sort(),
    );
    expect(draft.content.synthetic).toBe(true);
  });

  it("criterion 10: sending a non-draft message is idempotent", () => {
    const { ev, store } = day40();
    const first = send(draftFor(ev, store), t0);
    const second = send(first, t0 + 5_000);

    expect(second.sent_at_ms).toBe(first.sent_at_ms);
    expect(second.arrives_at_ms).toBe(first.arrives_at_ms);
    expect(second.receipt_at_ms).toBe(first.receipt_at_ms);
    expect(second).toEqual(first);
  });

  it("criterion 11: the in-memory transport notifies until unsubscribed", async () => {
    const { ev, store } = day40();
    const message = send(draftFor(ev, store), t0);
    const transport = createInMemoryTransport();
    const listener = vi.fn();
    const unsubscribe = transport.onMessage(listener);

    await transport.send(message);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toEqual(message);

    unsubscribe();
    await transport.send(message);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("criterion 12: ids increment per mission date", () => {
    const { ev, store } = day40();
    const second = draftFor(ev, store, { existingIdsToday: 1 });
    expect(second.id).toBe("msg-2026-11-14-2");
  });

  it("criterion 13: building a draft does not mutate the inputs", () => {
    const { ev, store } = day40();
    const evaluationBefore = JSON.stringify(ev);
    const readingsBefore = JSON.stringify(store.getReadings());

    draftFor(ev, store, { flagsToday: [], note: "hello" });

    expect(JSON.stringify(ev)).toBe(evaluationBefore);
    expect(JSON.stringify(store.getReadings())).toBe(readingsBefore);
  });
});
