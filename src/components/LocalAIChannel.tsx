import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  DEFAULT_HELPER_SETTINGS,
  askModel,
} from "../features/ai-helper/ollama";
import {
  buildMessages,
  formatClinicalResponse,
  PromptError,
} from "../features/ai-helper/prompt";
import {
  getChatSessionStore,
  formatChatSessionOptionLabel,
  type SIChatMessage,
} from "../features/ai-helper/chatSessions";
import {
  buildDeterministicClinicalSummary,
  getTriggeredMetricSummaries,
} from "../features/ai-helper/clinicalSummary";
import {
  loadDefaultCombinations,
} from "../features/ai-helper/defaultCombinations";
import { matchCombinations } from "../features/ai-helper/combinations";
import {
  buildSafetySupportCard,
  checkSafety,
  reviewAiAnswer,
  rulesCheckNote,
} from "../features/ai-helper/safety";
import { useAppState } from "../features/app-state/AppStateContext";
import { useAuth } from "../features/auth/AuthContext";
import type { EvaluationResult, RulesFile } from "../rules/types";

interface LocalAIChannelProps {
  onOpenCheckup: () => void;
}

export function buildLocalAIQuickPrompts(
  evaluation: EvaluationResult,
  rules: RulesFile,
): string[] {
  const topMetric = getTriggeredMetricSummaries(evaluation, rules)[0];
  const firstPrompt = topMetric
    ? `Why is my ${topMetric.label.toLowerCase()} ${topMetric.status}?`
    : evaluation.overall_status === "green"
      ? "Compare today's vitals to my 7-day baseline"
      : "What should I know about today's health status?";
  return [
    firstPrompt,
    "Build today's self-care & protection plan",
    "Analyze today's results",
  ];
}

function LocalAIChannel({ onOpenCheckup }: LocalAIChannelProps) {
  const { evaluation, flagsToday, clinicalNotesToday, rules, missionDay } = useAppState();
  const { activeProfile } = useAuth();
  const profileId = activeProfile?.profile_id ?? "guest";
  const combinations = useMemo(() => loadDefaultCombinations(rules), [rules]);
  const picture = useMemo(
    () => matchCombinations(evaluation, flagsToday, combinations),
    [combinations, evaluation, flagsToday],
  );
  const supportCard = useMemo(() => buildSafetySupportCard(rules), [rules]);
  const deterministicBriefing = useMemo(
    () => buildDeterministicClinicalSummary(evaluation, rules, missionDay),
    [evaluation, missionDay, rules],
  );
  const sessionStore = useMemo(
    () =>
      getChatSessionStore(profileId, {
        missionDay,
        status: evaluation.overall_status,
        briefing: deterministicBriefing,
      }),
    [deterministicBriefing, evaluation.overall_status, missionDay, profileId],
  );
  useLayoutEffect(() => {
    sessionStore.refreshInitialBriefing({
      missionDay,
      status: evaluation.overall_status,
      briefing: deterministicBriefing,
    });
  }, [deterministicBriefing, evaluation.overall_status, missionDay, sessionStore]);
  const sessionState = useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSnapshot,
    sessionStore.getSnapshot,
  );
  const activeSession =
    sessionState.sessions.find((session) => session.id === sessionState.activeSessionId) ??
    sessionState.sessions[0];
  const [composer, setComposer] = useState("");
  const [thinkingRequest, setThinkingRequest] = useState<{
    profileId: string;
    sessionId: string;
    requestId: number;
  } | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [showSupportCard, setShowSupportCard] = useState(false);
  const requestId = useRef(0);
  const chatStreamRef = useRef<HTMLDivElement>(null);
  const isThinking =
    thinkingRequest?.profileId === profileId &&
    thinkingRequest.sessionId === activeSession?.id;

  const runModel = useCallback(
    async (sessionId: string, chatTurns: SIChatMessage[]): Promise<void> => {
      const currentRequest = ++requestId.current;
      setThinkingRequest({ profileId, sessionId, requestId: currentRequest });

      try {
        const messages = buildMessages({
          mode: "chat",
          ev: evaluation,
          picture,
          rules,
          chat: chatTurns,
          clinicalNotes: clinicalNotesToday,
        });
        const result = await askModel(messages, DEFAULT_HELPER_SETTINGS);
        if (!sessionStore.getSession(sessionId)) {
          return;
        }

        if (result.status === "ok" && result.text.trim()) {
          const answer = result.text.trim();
          const review = reviewAiAnswer(answer, evaluation.overall_status);
          const escalation = evaluation.overall_escalation
            ? rules.ui_text[`escalation_${evaluation.overall_escalation}`] ?? ""
            : "";
          sessionStore.appendMessage(
            sessionId,
            "assistant",
            review.ok
              ? formatClinicalResponse(answer)
              : `${formatClinicalResponse(answer)}\n\n${rulesCheckNote(review, evaluation.overall_status, escalation)}`,
          );
        } else {
          const reason =
            result.status === "ok"
              ? "Ollama returned an empty response."
              : result.status === "unavailable"
                ? "Ollama is unavailable."
                : result.status === "model_missing"
                  ? `The local AI model is not installed (run: ollama pull ${DEFAULT_HELPER_SETTINGS.model}).`
                  : result.status === "timeout"
                    ? "Ollama did not respond before the timeout."
                    : `Ollama could not complete the request (${result.detail}).`;
          sessionStore.appendMessage(
            sessionId,
            "assistant",
            `${reason} Here is today's deterministic clinical briefing:\n\n${deterministicBriefing}`,
          );
        }
      } catch (error) {
        if (sessionStore.getSession(sessionId)) {
          const reason =
            error instanceof PromptError
              ? `The request could not be sent: ${error.message}`
              : "The AI assistant could not complete the request.";
          sessionStore.appendMessage(
            sessionId,
            "assistant",
            `${reason} Here is today's deterministic clinical briefing:\n\n${deterministicBriefing}`,
          );
        }
      } finally {
        setThinkingRequest((current) =>
          current?.requestId === currentRequest ? null : current,
        );
      }
    },
    [
      clinicalNotesToday,
      deterministicBriefing,
      evaluation,
      picture,
      profileId,
      rules,
      sessionStore,
    ],
  );

  useEffect(() => {
    const stream = chatStreamRef.current;
    if (stream) {
      stream.scrollTop = stream.scrollHeight;
    }
  }, [activeSession?.messages, isThinking]);

  function createNewSession(): void {
    sessionStore.createSession(missionDay, deterministicBriefing);
    setComposer("");
    setInputError(null);
  }

  function deleteActiveSession(): void {
    if (!activeSession) {
      return;
    }
    sessionStore.deleteSession(activeSession.id, missionDay, deterministicBriefing);
    setComposer("");
    setInputError(null);
  }

  function submitText(text: string): void {
    if (!activeSession) {
      return;
    }
    if (text.length > DEFAULT_HELPER_SETTINGS.max_user_chars) {
      setInputError("Please keep it under 1000 characters.");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    setInputError(null);
    const updatedSession = sessionStore.appendMessage(activeSession.id, "user", trimmed);
    setComposer("");

    if (checkSafety(trimmed).hit) {
      setShowSupportCard(true);
      const supportReply = supportCard
        ? [
            supportCard.title,
            supportCard.explanation,
            ...supportCard.actions,
            `Check in: ${supportCard.recheck}`,
          ].join("\n\n")
        : deterministicBriefing;
      sessionStore.appendMessage(activeSession.id, "assistant", supportReply);
      return;
    }
    setShowSupportCard(false);
    void runModel(activeSession.id, updatedSession.messages);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    submitText(composer);
  }

  function handleComposerKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submitText(composer);
    }
  }

  const triggeredMetrics = getTriggeredMetricSummaries(evaluation, rules);
  const quickPrompts = buildLocalAIQuickPrompts(evaluation, rules);

  return (
    <section className="local-ai-panel" aria-label="Local AI assistant">
      <header className="local-ai-context" aria-label="Today's clinical summary">
        <span className={`comms-triage-pill triage-${evaluation.overall_status}`}>
          Day {missionDay} · {evaluation.overall_status.replace("_", " ")}
        </span>
        <div className="rule-chip-list" aria-label="Triggered rules">
          {triggeredMetrics.map((metric) => (
            <span
              className={`rule-context-chip status-${metric.status}`}
              key={metric.metricKey}
            >
              {metric.metricKey === "heart_rate"
                ? "Heart rate differs from your normal"
                : metric.metricKey === "sleep_hours"
                  ? "Not enough sleep this week"
                  : metric.label}
            </span>
          ))}
        </div>
        <span className="offline-model-badge">
          Local Neural Engine · {DEFAULT_HELPER_SETTINGS.model}
        </span>
      </header>

      {showSupportCard && supportCard && (
        <section className="safety-support-card" aria-live="assertive">
          <div>
            <p className="section-eyebrow">Support</p>
            <h2>{supportCard.title}</h2>
            <p>{supportCard.explanation}</p>
            <ul>{supportCard.actions.map((action) => <li key={action}>{action}</li>)}</ul>
            <p>Check in: {supportCard.recheck}</p>
          </div>
          <button className="button button-secondary" type="button" onClick={onOpenCheckup}>
            Open today&apos;s check-up
          </button>
        </section>
      )}

      {(picture.matched.length > 0 || picture.unverified) && (
        <section className="verified-picture" aria-label="Verified symptom combinations">
          <p className="verified-picture-eyebrow">Layer 1 · verified combinations (no AI)</p>
          {picture.matched.map(({ combination }) => {
            const [quote, links = ""] = combination.source.split(" | ");
            return (
              <article className="verified-combo" key={combination.id}>
                <h3>{combination.title}</h3>
                {combination.possible_explanations.map((text) => (
                  <p key={text}>{text}</p>
                ))}
                {combination.actions.length > 0 && (
                  <ul>
                    {combination.actions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                )}
                <p className="verified-combo-discuss">
                  Discuss with your{" "}
                  {combination.discuss_with === "ground_flight_surgeon" ? "flight surgeon on Earth" : "crew medical officer"}.
                </p>
                <p className="verified-combo-source">
                  Based on: {quote}
                  {links && <span className="verified-combo-links">{links}</span>}
                </p>
              </article>
            );
          })}
          {picture.unverified && (
            <p className="verified-picture-unverified">
              Unverified picture:{" "}
              {picture.non_green_indicators
                .map((id) => rules.indicators.find((indicator) => indicator.id === id)?.label ?? id)
                .join(" and ")}{" "}
              changed together, and this combination is not in the verified list. Discuss with your crew medical
              officer.
            </p>
          )}
        </section>
      )}

      <section className="ai-chat-panel" aria-label="AI explanation and chat">
        {sessionState.storageError && (
          <p className="ai-fallback-notice" role="alert">{sessionState.storageError}</p>
        )}

        {activeSession && (
          <div className="si-session-bar" aria-label="SI chat sessions">
            <label className="visually-hidden" htmlFor="si-session-selector">Saved SI sessions</label>
            <select
              id="si-session-selector"
              value={activeSession.id}
              onChange={(event) => {
                sessionStore.selectSession(event.currentTarget.value);
              }}
            >
              {sessionState.sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {formatChatSessionOptionLabel(session)}
                </option>
              ))}
            </select>
            <button type="button" className="si-new-session" onClick={createNewSession}>
              + New Session
            </button>
            <button
              type="button"
              className="si-delete-session"
              aria-label={`Delete session ${activeSession.title}`}
              title="Delete session"
              onClick={deleteActiveSession}
            >
              ×
            </button>
          </div>
        )}

        <div className="chat-stream" aria-live="polite" ref={chatStreamRef}>
          {activeSession?.messages.length === 0 && !isThinking && (
            <p className="chat-empty-state">Ask a question to start a private conversation on this device.</p>
          )}
          {activeSession?.messages.map((message) => (
            <article className={`chat-message chat-${message.role}`} key={message.id}>
              <span className="chat-role">
                {message.role === "user" ? "You" : "Onboard SI · granite3.3:8b"}
              </span>
              <p>{message.content}</p>
            </article>
          ))}
          {isThinking && <p className="ai-thinking" aria-live="polite">Onboard SI is thinking…</p>}
        </div>

        <div className="quick-prompts" aria-label="Suggested questions">
          {quickPrompts.map((prompt) => (
            <button type="button" key={prompt} onClick={() => submitText(prompt)} disabled={isThinking}>
              {prompt}
            </button>
          ))}
        </div>

        <form className="ai-composer" onSubmit={handleSubmit}>
          <label className="visually-hidden" htmlFor="ai-composer">
            Ask the local AI assistant
          </label>
          <div className="ai-composer-input">
            <textarea
              id="ai-composer"
              rows={2}
              placeholder="Ask about today's results or tell me how you feel. Stays on this device."
              value={composer}
              onKeyDown={handleComposerKeyDown}
              onChange={(event) => {
                setComposer(event.currentTarget.value);
                if (inputError) {
                  setInputError(null);
                }
              }}
            />
            <button className="button button-primary" type="submit" disabled={!composer.trim() || isThinking}>
              Send
            </button>
          </div>
          <div className="ai-composer-footer">
            <span className={composer.length > DEFAULT_HELPER_SETTINGS.max_user_chars ? "text-limit-error" : ""}>
              {composer.length}/1000
            </span>
          </div>
          {inputError && <p className="field-error" role="alert">{inputError}</p>}
        </form>
        <p className="ai-caption">
          Deterministic rules set status and urgency; AI provides clinical context only.
        </p>
      </section>
    </section>
  );
}

export default LocalAIChannel;
