import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  DEFAULT_HELPER_SETTINGS,
  askModel,
  type LlmResult,
} from "../features/ai-helper/ollama";
import { buildMessages, PromptError } from "../features/ai-helper/prompt";
import {
  loadDefaultCombinations,
} from "../features/ai-helper/defaultCombinations";
import { matchCombinations } from "../features/ai-helper/combinations";
import { buildSafetySupportCard, checkSafety } from "../features/ai-helper/safety";
import { useAppState } from "../features/app-state/AppStateContext";

interface LocalAIChannelProps {
  onOpenCheckup: () => void;
  selectedContext: string | null;
}

interface VisibleMessage {
  role: "user" | "assistant";
  content: string;
}

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

const QUICK_PROMPTS = [
  "Why is my heart rate yellow?",
  "Explain today's self-care steps",
  "Analyze today's results",
];

function fallbackText(result: Exclude<LlmResult, { status: "ok" }>): string {
  switch (result.status) {
    case "unavailable":
      return "The local AI assistant is not running. Showing verified combinations only.";
    case "model_missing":
      return `The local AI model is not installed (run: ollama pull ${DEFAULT_HELPER_SETTINGS.model}). Showing verified combinations only.`;
    case "timeout":
    case "error":
      return "The AI assistant did not answer. Showing verified combinations only.";
  }
}

function LocalAIChannel({ onOpenCheckup, selectedContext }: LocalAIChannelProps) {
  const { evaluation, flagsToday, clinicalNotesToday, rules, missionDay } = useAppState();
  const combinations = useMemo(() => loadDefaultCombinations(rules), [rules]);
  const picture = useMemo(
    () => matchCombinations(evaluation, flagsToday, combinations),
    [combinations, evaluation, flagsToday],
  );
  const supportCard = useMemo(() => buildSafetySupportCard(rules), [rules]);
  const [chat, setChat] = useState<VisibleMessage[]>([]);
  const [composer, setComposer] = useState("");
  const [autoExplanation, setAutoExplanation] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [showSupportCard, setShowSupportCard] = useState(false);
  const requestId = useRef(0);
  const chatStreamRef = useRef<HTMLDivElement>(null);

  const nonGreenKey = picture.non_green_indicators.join(",");
  const explainKey = `${evaluation.today}:${evaluation.overall_status}:${nonGreenKey}:${evaluation.indicators
    .filter((indicator) => indicator.status === "yellow" || indicator.status === "red")
    .flatMap((indicator) => indicator.triggered.map((rule) => rule.rule_id))
    .join(",")}`;

  const runModel = useCallback(
    async (
      mode: "explain_today" | "chat",
      text: string,
      chatTurns: ConversationTurn[],
    ): Promise<void> => {
      const safety = checkSafety(text);
      if (safety.hit) {
        setShowSupportCard(true);
        setNotice(null);
        setIsThinking(false);
        return;
      }

      const currentRequest = ++requestId.current;
      setIsThinking(true);
      setNotice(null);
      if (mode === "explain_today") {
        setAutoExplanation(null);
      }

      try {
        const messages = buildMessages({
          mode,
          ev: evaluation,
          picture,
          rules,
          chat: chatTurns,
          clinicalNotes: clinicalNotesToday,
        });
        const result = await askModel(messages, DEFAULT_HELPER_SETTINGS);
        if (currentRequest !== requestId.current) {
          return;
        }
        if (result.status === "ok") {
          if (mode === "explain_today") {
            setAutoExplanation(result.text);
          } else {
            setChat((current) => [
              ...current,
              { role: "assistant", content: result.text },
            ]);
          }
        } else {
          setNotice(fallbackText(result));
        }
      } catch (error) {
        if (currentRequest !== requestId.current) {
          return;
        }
        setNotice(
          error instanceof PromptError
            ? error.message
            : "The AI assistant did not answer. Showing verified combinations only.",
        );
      } finally {
        if (currentRequest === requestId.current) {
          setIsThinking(false);
        }
      }
    },
    [clinicalNotesToday, evaluation, picture, rules],
  );

  useEffect(() => {
    if (picture.non_green_indicators.length === 0) {
      setAutoExplanation(null);
      return;
    }
    void runModel("explain_today", "", []);
  }, [explainKey, picture.non_green_indicators.length, runModel]);

  useEffect(
    () => () => {
      requestId.current += 1;
    },
    [],
  );

  useEffect(() => {
    const stream = chatStreamRef.current;
    if (stream) {
      stream.scrollTop = stream.scrollHeight;
    }
  }, [chat, isThinking]);

  function submitText(text: string): void {
    if (text.length > DEFAULT_HELPER_SETTINGS.max_user_chars) {
      setInputError("Please keep it under 1000 characters.");
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    setInputError(null);
    setNotice(null);
    const nextChat: ConversationTurn[] = [
      ...chat.map(({ role, content }) => ({ role, content })),
      { role: "user", content: trimmed },
    ];
    setChat((current) => [...current, { role: "user", content: trimmed }]);
    setComposer("");

    if (checkSafety(trimmed).hit) {
      setShowSupportCard(true);
      return;
    }
    void runModel("chat", trimmed, nextChat);
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

  const triggeredIndicators = evaluation.indicators.filter(
    (indicator) => indicator.triggered.length > 0,
  );

  return (
    <section className="local-ai-panel" aria-label="Local AI assistant">
      <header className="local-ai-context">
        <div className="local-ai-context-main">
          <div>
            <span className={`comms-triage-pill triage-${evaluation.overall_status}`}>
              Day {missionDay} · {evaluation.overall_status.replace("_", " ")}
            </span>
          </div>
          <span className="offline-model-badge">
            Local Neural Engine · {DEFAULT_HELPER_SETTINGS.model}
          </span>
        </div>
        <div className="rule-chip-list" aria-label="Triggered rules">
          {triggeredIndicators.length > 0
            ? triggeredIndicators.map((indicator) => (
                <span
                  className={`rule-context-chip status-${indicator.status}`}
                  key={indicator.indicator_id}
                >
                  {indicator.indicator_id === "heart_rate"
                    ? "Heart rate differs from your normal"
                    : indicator.indicator_id === "sleep_hours"
                      ? "Not enough sleep this week"
                      : rules.indicators.find((item) => item.id === indicator.indicator_id)?.label
                        ?? indicator.indicator_id}
                </span>
              ))
            : <span className="rule-context-chip">No triggered indicators today</span>}
        </div>
        {selectedContext && <p className="selected-ai-context">Opened from Main: {selectedContext}</p>}
        <details className="clinical-reasoning">
          <summary>
            <span>Clinical Reasoning &amp; Overall Picture</span>
            <span className="reasoning-hint">Rules-led context · optional</span>
          </summary>
          <div className="clinical-reasoning-content">
            {picture.matched.length > 0 ? (
              <div className="combination-list">
                {picture.matched.map(({ combination }) => (
                  <article className="matched-combination" key={combination.id}>
                    <h3>{combination.title}</h3>
                    <p>Possible explanations to discuss with your crew medical officer:</p>
                    <ul>
                      {combination.possible_explanations.map((explanation) => (
                        <li key={explanation}>{explanation}</li>
                      ))}
                    </ul>
                    {combination.actions.length > 0 && (
                      <ul>
                        {combination.actions.map((action) => <li key={action}>{action}</li>)}
                      </ul>
                    )}
                    <p className="combination-source">Based on: {combination.source}</p>
                  </article>
                ))}
              </div>
            ) : picture.unverified ? (
              <p>Unverified picture: multiple indicators changed together. Discuss with your crew medical officer.</p>
            ) : (
              <p>No combined changes today.</p>
            )}
            {autoExplanation && <p className="reasoning-explanation">{autoExplanation}</p>}
          </div>
        </details>
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

      <section className="ai-chat-panel" aria-label="AI explanation and chat">
        {notice && <p className="ai-fallback-notice" role="status">{notice}</p>}

        <div className="chat-stream" aria-live="polite" ref={chatStreamRef}>
          {chat.length === 0 && !isThinking && (
            <p className="chat-empty-state">Ask a question to start a private conversation on this device.</p>
          )}
          {chat.map((message, index) => (
            <article className={`chat-message chat-${message.role}`} key={`${message.role}-${index}`}>
              <span className="chat-role">
                {message.role === "user" ? "You" : "Onboard SI · granite3.3:8b"}
              </span>
              <p>{message.content}</p>
            </article>
          ))}
          {isThinking && <p className="ai-thinking" aria-live="polite">Onboard SI is thinking…</p>}
        </div>

        <div className="quick-prompts" aria-label="Suggested questions">
          {QUICK_PROMPTS.map((prompt) => (
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
