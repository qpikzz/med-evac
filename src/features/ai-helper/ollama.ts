export interface HelperSettings {
  ollama_url: "http://127.0.0.1:11434";
  model: "granite3.3:8b";
  timeout_ms: number;
  temperature: number;
  max_user_chars: number;
  max_turns_sent: number;
}

export type LlmResult =
  | { status: "ok"; text: string }
  | { status: "unavailable" }
  | { status: "model_missing" }
  | { status: "timeout" }
  | { status: "error"; detail: string };

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export const MAX_USER_CHARS = 1000;
export const MAX_TURNS_SENT = 10;

export const DEFAULT_HELPER_SETTINGS: HelperSettings = {
  ollama_url: "http://127.0.0.1:11434",
  model: "granite3.3:8b",
  timeout_ms: 60000,
  temperature: 0.2,
  max_user_chars: MAX_USER_CHARS,
  max_turns_sent: MAX_TURNS_SENT,
};

type FetchOutcome =
  | { kind: "response"; response: Response }
  | { kind: "rejected"; error: unknown }
  | { kind: "timeout" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<FetchOutcome> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<FetchOutcome>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve({ kind: "timeout" });
    }, timeoutMs);
  });

  const request: Promise<FetchOutcome> = Promise.resolve()
    .then(() => fetchImpl(url, { ...init, signal: controller.signal }))
    .then((response) => ({ kind: "response", response }) as FetchOutcome)
    .catch((error) => ({ kind: "rejected", error }) as FetchOutcome);

  try {
    return await Promise.race([request, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

function modelsContain(model: string, payload: unknown): boolean {
  if (!isRecord(payload) || !Array.isArray(payload.models)) {
    return false;
  }
  return payload.models.some(
    (entry) => isRecord(entry) && typeof entry.name === "string" && entry.name === model,
  );
}

export async function askModel(
  messages: ChatMessage[],
  settings: HelperSettings,
  fetchImpl: typeof fetch = fetch,
): Promise<LlmResult> {
  if (typeof fetchImpl !== "function") {
    return { status: "error", detail: "fetch is not available" };
  }

  const base = settings.ollama_url.replace(/\/+$/, "");

  const tags = await fetchWithTimeout(
    `${base}/api/tags`,
    { method: "GET" },
    settings.timeout_ms,
    fetchImpl,
  );
  if (tags.kind === "timeout") {
    return { status: "timeout" };
  }
  if (tags.kind === "rejected") {
    return { status: "unavailable" };
  }
  if (!tags.response.ok) {
    return { status: "error", detail: `Model check failed with HTTP ${tags.response.status}` };
  }

  let tagsJson: unknown;
  try {
    tagsJson = await tags.response.json();
  } catch {
    return { status: "error", detail: "Model check returned invalid JSON" };
  }
  if (!modelsContain(settings.model, tagsJson)) {
    return { status: "model_missing" };
  }

  const chat = await fetchWithTimeout(
    `${base}/api/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.model,
        messages,
        stream: false,
        options: { temperature: settings.temperature },
      }),
    },
    settings.timeout_ms,
    fetchImpl,
  );
  if (chat.kind === "timeout") {
    return { status: "timeout" };
  }
  if (chat.kind === "rejected") {
    return { status: "unavailable" };
  }
  if (!chat.response.ok) {
    return { status: "error", detail: `Chat request failed with HTTP ${chat.response.status}` };
  }

  let chatJson: unknown;
  try {
    chatJson = await chat.response.json();
  } catch {
    return { status: "error", detail: "Chat returned invalid JSON" };
  }
  if (!isRecord(chatJson) || !isRecord(chatJson.message)) {
    return { status: "error", detail: "Chat response is missing message.content" };
  }
  const content = chatJson.message.content;
  if (typeof content !== "string") {
    return { status: "error", detail: "Chat response is missing message.content" };
  }

  return { status: "ok", text: content };
}
