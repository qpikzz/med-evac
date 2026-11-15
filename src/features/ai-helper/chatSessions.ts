import type { Status } from "../../rules/types";

export type SIChatRole = "user" | "assistant";

export interface SIChatMessage {
  id: string;
  role: SIChatRole;
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  missionDay: number;
  createdAt: string;
  updatedAt: string;
  messages: SIChatMessage[];
}

export interface ChatSessionState {
  sessions: ChatSession[];
  activeSessionId: string;
  storageError: string | null;
}

export interface ChatSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ChatSessionStore {
  getSnapshot: () => ChatSessionState;
  subscribe: (listener: () => void) => () => void;
  getSession: (sessionId: string) => ChatSession | undefined;
  createSession: (missionDay: number, briefing: string) => ChatSession;
  selectSession: (sessionId: string) => void;
  deleteSession: (sessionId: string, missionDay: number, briefing: string) => ChatSession;
  appendMessage: (
    sessionId: string,
    role: SIChatRole,
    content: string,
  ) => ChatSession;
}

export interface ChatSessionStoreOptions {
  storage?: ChatSessionStorage | null;
  now?: () => Date;
}

const SESSION_PREFIX = "orbita_si_sessions_";
const ACTIVE_SESSION_PREFIX = "orbita_si_active_session_";
const MAX_TITLE_LENGTH = 52;
let fallbackId = 0;

function resolveStorage(
  storage: ChatSessionStorage | null | undefined,
): ChatSessionStorage | null {
  if (storage !== undefined) {
    return storage;
  }
  try {
    return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

export function chatSessionsStorageKey(profileId: string): string {
  return `${SESSION_PREFIX}${profileId}`;
}

export function activeChatSessionStorageKey(profileId: string): string {
  return `${ACTIVE_SESSION_PREFIX}${profileId}`;
}

export function formatChatSessionOptionLabel(session: ChatSession): string {
  const count = session.messages.length;
  const messageCount = `${count} ${count === 1 ? "message" : "messages"}`;
  const titleAlreadyIncludesDay = new RegExp(
    `^Day\\s+${session.missionDay}(?:\\b|$)`,
    "i",
  ).test(session.title);
  if (titleAlreadyIncludesDay) {
    const titleWithoutDay = session.title.replace(
      new RegExp(`^Day\\s+${session.missionDay}\\s*[·:–—-]?\\s*`, "i"),
      "",
    );
    return titleWithoutDay
      ? `Day ${session.missionDay} · ${titleWithoutDay} (${messageCount})`
      : `Day ${session.missionDay} (${messageCount})`;
  }
  return `${session.title} · Day ${session.missionDay} (${messageCount})`;
}

function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  fallbackId += 1;
  return `${Date.now()}-${fallbackId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isChatMessage(value: unknown): value is SIChatMessage {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    typeof value.createdAt === "string"
  );
}

function isChatSession(value: unknown): value is ChatSession {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    value.title.length > 0 &&
    typeof value.missionDay === "number" &&
    Number.isFinite(value.missionDay) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.messages) &&
    value.messages.every(isChatMessage)
  );
}

function sessionTitleFromPrompt(prompt: string): string {
  const normalized = prompt.trim().replace(/\s+/g, " ");
  if (normalized.length <= MAX_TITLE_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`;
}

function statusLabel(status: Status): string {
  return status === "no_data"
    ? "No Data"
    : `${status[0].toUpperCase()}${status.slice(1)}`;
}

function makeSession(
  missionDay: number,
  status: Status,
  briefing: string,
  now: () => Date,
): ChatSession {
  const timestamp = now().toISOString();
  return {
    id: createId(),
    title: `Day ${missionDay} · Clinical Briefing`,
    missionDay,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [
      {
        id: createId(),
        role: "assistant",
        content: briefing || `Day ${missionDay} · ${statusLabel(status)}`,
        createdAt: timestamp,
      },
    ],
  };
}

export function createChatSessionStore(
  profileId: string,
  initial: { missionDay: number; status: Status; briefing: string },
  options: ChatSessionStoreOptions = {},
): ChatSessionStore {
  const storage = resolveStorage(options.storage);
  const now = options.now ?? (() => new Date());
  const sessionKey = chatSessionsStorageKey(profileId);
  const activeKey = activeChatSessionStorageKey(profileId);
  const listeners = new Set<() => void>();
  let state: ChatSessionState;
  let storageError: string | null = null;
  let shouldPersistState = false;

  let sessions: ChatSession[] = [];
  let activeSessionId: string | null = null;
  if (storage) {
    try {
      const savedSessions = storage.getItem(sessionKey);
      if (savedSessions !== null) {
        const parsed: unknown = JSON.parse(savedSessions);
        if (!Array.isArray(parsed) || !parsed.every(isChatSession)) {
          throw new Error("Saved SI sessions have an invalid format.");
        }
        sessions = parsed;
        activeSessionId = storage.getItem(activeKey);
      } else {
        shouldPersistState = true;
      }
    } catch (error) {
      storageError =
        error instanceof Error
          ? error.message
          : "Saved SI sessions could not be loaded. A fresh session was created.";
      sessions = [];
      activeSessionId = null;
      shouldPersistState = true;
    }
  } else if (typeof window !== "undefined") {
    storageError = "SI chat storage is unavailable; sessions will not survive app restarts.";
  }

  if (sessions.length === 0) {
    const first = makeSession(initial.missionDay, initial.status, initial.briefing, now);
    sessions = [first];
    activeSessionId = first.id;
    shouldPersistState = storage !== null;
  } else if (!sessions.some((session) => session.id === activeSessionId)) {
    activeSessionId = sessions[0].id;
    shouldPersistState = true;
  }

  state = {
    sessions,
    activeSessionId: activeSessionId ?? sessions[0].id,
    storageError,
  };

  function persist(next: ChatSessionState): ChatSessionState {
    if (!storage) {
      return next;
    }
    try {
      storage.setItem(sessionKey, JSON.stringify(next.sessions));
      storage.setItem(activeKey, next.activeSessionId);
      return { ...next, storageError: null };
    } catch {
      return {
        ...next,
        storageError: "SI chat changes could not be saved to local storage.",
      };
    }
  }

  if (storage && shouldPersistState) {
    try {
      storage.setItem(sessionKey, JSON.stringify(state.sessions));
      storage.setItem(activeKey, state.activeSessionId);
    } catch {
      state = { ...state, storageError: "SI chat changes could not be saved to local storage." };
    }
  }

  function commit(next: ChatSessionState): void {
    state = persist(next);
    for (const listener of listeners) {
      listener();
    }
  }

  const store: ChatSessionStore = {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSession(sessionId) {
      return state.sessions.find((session) => session.id === sessionId);
    },
    createSession(missionDay, briefing) {
      const session = makeSession(missionDay, initial.status, briefing, now);
      commit({
        ...state,
        sessions: [session, ...state.sessions],
        activeSessionId: session.id,
      });
      return session;
    },
    selectSession(sessionId) {
      if (!state.sessions.some((session) => session.id === sessionId)) {
        return;
      }
      commit({ ...state, activeSessionId: sessionId });
    },
    deleteSession(sessionId, missionDay, briefing) {
      const remaining = state.sessions.filter((session) => session.id !== sessionId);
      const wasActive = state.activeSessionId === sessionId;
      let nextActiveId = state.activeSessionId;
      let nextSessions = remaining;
      let replacement: ChatSession | undefined;

      if (remaining.length === 0) {
        replacement = makeSession(missionDay, initial.status, briefing, now);
        nextSessions = [replacement];
        nextActiveId = replacement.id;
      } else if (wasActive) {
        nextActiveId = remaining[0].id;
      }

      const activeSession = nextSessions.find((session) => session.id === nextActiveId);
      if (!activeSession) {
        throw new Error("The selected SI chat session could not be restored.");
      }

      commit({
        ...state,
        sessions: nextSessions,
        activeSessionId: nextActiveId,
      });
      return replacement ?? activeSession;
    },
    appendMessage(sessionId, role, content) {
      const session = state.sessions.find((entry) => entry.id === sessionId);
      if (!session) {
        throw new Error("The selected SI chat session no longer exists.");
      }
      const createdAt = now().toISOString();
      const message: SIChatMessage = {
        id: createId(),
        role,
        content,
        createdAt,
      };
      const firstUserPrompt =
        role === "user" && !session.messages.some((entry) => entry.role === "user");
      const nextSession: ChatSession = {
        ...session,
        title: firstUserPrompt ? sessionTitleFromPrompt(content) : session.title,
        updatedAt: createdAt,
        messages: [...session.messages, message],
      };
      commit({
        ...state,
        sessions: state.sessions.map((entry) =>
          entry.id === sessionId ? nextSession : entry,
        ),
      });
      return nextSession;
    },
  };

  return store;
}

const storeRegistry = new Map<string, ChatSessionStore>();

export function getChatSessionStore(
  profileId: string,
  initial: { missionDay: number; status: Status; briefing: string },
): ChatSessionStore {
  const existing = storeRegistry.get(profileId);
  if (existing) {
    return existing;
  }
  const created = createChatSessionStore(profileId, initial);
  storeRegistry.set(profileId, created);
  return created;
}

export function resetChatSessionStoreRegistry(): void {
  storeRegistry.clear();
}
