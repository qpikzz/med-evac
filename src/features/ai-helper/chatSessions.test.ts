import { describe, expect, it } from "vitest";
import {
  activeChatSessionStorageKey,
  chatSessionsStorageKey,
  createChatSessionStore,
  formatChatSessionOptionLabel,
  type ChatSessionStorage,
} from "./chatSessions";

class MemoryStorage implements ChatSessionStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const initial = {
  missionDay: 40,
  status: "yellow" as const,
  briefing: "Day 40 · Yellow\nELEVATED / YELLOW warnings:\n- Heart rate.",
};

describe("SI chat sessions", () => {
  it("persists messages, active-session switches, reloads, and profile isolation", () => {
    const storage = new MemoryStorage();
    const astroOne = createChatSessionStore("astro-01", initial, { storage });
    const first = astroOne.getSnapshot().sessions[0];

    expect(first.title).toBe("Day 40 · Clinical Briefing");
    expect(first.messages).toHaveLength(1);
    expect(first.messages[0].role).toBe("assistant");
    expect(first.messages[0].content).toContain("ELEVATED / YELLOW");
    expect(formatChatSessionOptionLabel(first)).toBe(
      "Day 40 · Clinical Briefing (1 message)",
    );
    expect(storage.getItem(chatSessionsStorageKey("astro-01"))).not.toBeNull();
    expect(storage.getItem(activeChatSessionStorageKey("astro-01"))).toBe(first.id);

    const afterPrompt = astroOne.appendMessage(first.id, "user", "Why is my heart rate yellow?");
    expect(afterPrompt.title).toBe("Why is my heart rate yellow?");
    astroOne.appendMessage(first.id, "assistant", "The rules marked it yellow.");
    expect(formatChatSessionOptionLabel(afterPrompt)).toBe(
      "Why is my heart rate yellow? · Day 40 (2 messages)",
    );

    const second = astroOne.createSession(41, "Day 41 · Green\nNo active alerts.");
    expect(astroOne.getSnapshot().activeSessionId).toBe(second.id);
    astroOne.selectSession(first.id);
    expect(storage.getItem(activeChatSessionStorageKey("astro-01"))).toBe(first.id);

    const restoredAstroOne = createChatSessionStore(
      "astro-01",
      { missionDay: 42, status: "green", briefing: "A new default briefing." },
      { storage },
    );
    expect(restoredAstroOne.getSnapshot().activeSessionId).toBe(first.id);
    expect(restoredAstroOne.getSession(first.id)?.messages.map((message) => message.role)).toEqual([
      "assistant",
      "user",
      "assistant",
    ]);
    expect(restoredAstroOne.getSession(first.id)?.title).toBe("Why is my heart rate yellow?");

    const astroTwo = createChatSessionStore("astro-02", initial, { storage });
    expect(astroTwo.getSnapshot().sessions).toHaveLength(1);
    expect(astroTwo.getSnapshot().sessions[0].id).not.toBe(first.id);
    expect(storage.getItem(activeChatSessionStorageKey("astro-02"))).toBe(
      astroTwo.getSnapshot().activeSessionId,
    );
  });

  it("deletes a session and creates a fresh default when deleting the last one", () => {
    const storage = new MemoryStorage();
    const store = createChatSessionStore("ground-01", initial, { storage });
    const original = store.getSnapshot().sessions[0];

    store.deleteSession(original.id, 41, "Day 41 · Green\nNo active alerts.");

    const state = store.getSnapshot();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].id).not.toBe(original.id);
    expect(state.sessions[0].title).toBe("Day 41 · Clinical Briefing");
    expect(state.sessions[0].messages[0].content).toContain("Day 41 · Green");
    expect(state.activeSessionId).toBe(state.sessions[0].id);
    expect(storage.getItem(activeChatSessionStorageKey("ground-01"))).toBe(
      state.activeSessionId,
    );
  });

  it("refreshes only the current-day generated opening briefing on restore and data updates", () => {
    const storage = new MemoryStorage();
    const legacyBriefing = {
      missionDay: 40,
      status: "yellow" as const,
      briefing:
        "Day 40 · Yellow\nCRITICAL / RED alerts:\n- None.\nELEVATED / YELLOW warnings:\n- Heart rate differs from your normal.",
    };
    const firstStore = createChatSessionStore("astro-01", legacyBriefing, { storage });
    const currentSession = firstStore.getSnapshot().sessions[0];
    firstStore.appendMessage(currentSession.id, "user", "What should I do?");
    firstStore.createSession(39, "Day 39 · Yellow\nA prior mission-day briefing.");

    const refreshedBriefing = {
      missionDay: 40,
      status: "yellow" as const,
      briefing:
        "Day 40 · Yellow\nCRITICAL / RED alerts:\n- None.\nELEVATED / YELLOW warnings:\n- Heart rate differs from your normal.\n  Next: Rest and recheck as directed.",
    };
    const restoredStore = createChatSessionStore(
      "astro-01",
      refreshedBriefing,
      { storage },
    );
    const restoredCurrent = restoredStore.getSession(currentSession.id);
    expect(restoredCurrent?.messages[0].content).toBe(refreshedBriefing.briefing);
    expect(restoredCurrent?.messages.map((message) => message.role)).toEqual([
      "assistant",
      "user",
    ]);

    const priorSession = restoredStore
      .getSnapshot()
      .sessions.find((session) => session.missionDay === 39);
    expect(priorSession?.messages[0].content).toBe(
      "Day 39 · Yellow\nA prior mission-day briefing.",
    );

    const updatedBriefing = {
      ...refreshedBriefing,
      briefing: refreshedBriefing.briefing.replace(
        "Rest and recheck as directed.",
        "Contact your Crew Medical Officer if it persists.",
      ),
    };
    restoredStore.refreshInitialBriefing(updatedBriefing);
    expect(restoredStore.getSession(currentSession.id)?.messages[0].content).toBe(
      updatedBriefing.briefing,
    );
    expect(storage.getItem(chatSessionsStorageKey("astro-01"))).toContain(
      "Contact your Crew Medical Officer if it persists.",
    );
  });
});
