import { missionDateForDay } from "../features/synthetic-data";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import CrewAvatar from "./CrewAvatar";
import type { AuthProfile } from "../features/auth/types";
import {
  earthChatActivity,
  earthMessageDelivery,
  type EarthChatMessage,
  type EarthTelemetrySnapshot,
} from "../features/earth-link/chat";
import type { RulesFile, Status } from "../rules/types";

interface EarthLinkPanelProps {
  side: "astronaut" | "earth";
  astronautId: string;
  astronautName: string;
  astronautProfiles: Pick<AuthProfile, "profile_id" | "display_name">[];
  thread: EarthChatMessage[];
  nowMs: number;
  rules: RulesFile;
  currentTelemetry: EarthTelemetrySnapshot | null;
  onSelectAstronaut: (astronautId: string) => void;
  onSend: (text: string, attachTelemetry: boolean) => void;
  /** Prepared draft (red status): placed in the composer for the astronaut to review and send. */
  draftText?: string | null;
}

function displayStatus(status: Status): string {
  return status === "no_data"
    ? "No Data"
    : `${status[0].toUpperCase()}${status.slice(1)}`;
}

function displayEscalation(escalation: EarthTelemetrySnapshot["overallEscalation"]): string {
  switch (escalation) {
    case "self":
      return "Self";
    case "crew_medical_officer":
      return "Crew Medical Officer";
    case "ground_flight_surgeon":
      return "Flight Surgeon on Earth";
    default:
      return "Not available";
  }
}

export function cleanRuleSource(source: string): string {
  return source
    .replace(/\s*\[ANSWER:[^\]]*\]/gi, "")
    .replace(/\s*[-–—]?\s*SOURCE PENDING(?:\s*\([^)]*\))?/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*;\s*;/g, ";")
    .replace(/^[\s;,.–—-]+|[\s;,.–—-]+$/g, "")
    .trim();
}

// Mission date (from the mission day) + time of day, so messages never contradict "Day N".
function formatMessageDate(timestamp: number, missionDay: number): string {
  const [year, month, day] = missionDateForDay(missionDay).split("-").map(Number);
  const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
  const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(timestamp));
  return `${date}, ${time}`;
}

function messageState(
  message: EarthChatMessage,
  nowMs: number,
  viewer: EarthLinkPanelProps["side"],
): string {
  if (earthMessageDelivery(message, nowMs) === "transmitting") {
    return "Transmitting (×60 demo)…";
  }
  if (message.sender === "astronaut") {
    return "Delivered to Earth";
  }
  return viewer === "earth" ? "Delivered to crew" : "Received from Houston";
}

export function TelemetryDetails({
  telemetry,
  rules,
}: {
  telemetry: EarthTelemetrySnapshot;
  rules: RulesFile;
}) {
  const metricLabels = new Map(
    rules.metrics.map((metric) => [metric.id, { label: metric.label, unit: metric.unit }]),
  );
  const triggeredIndicators = telemetry.indicators.filter(
    (indicator) => indicator.triggered.length > 0,
  );

  return (
    <div className="telemetry-drawer-content">
      <section className="telemetry-overall">
        <p className="telemetry-section-label">Overall triage</p>
        <div className="telemetry-status-row">
          <span className={`telemetry-status-pill status-${telemetry.overallStatus}`}>
            Overall status: {displayStatus(telemetry.overallStatus)}
          </span>
          <span>Escalation: {displayEscalation(telemetry.overallEscalation)}</span>
        </div>
        <p className="telemetry-mission-date">
          Day {telemetry.missionDay} · {telemetry.missionDate}
        </p>
      </section>

      <section className="telemetry-detail-section">
        <h3>Triggered indicators &amp; rules</h3>
        {triggeredIndicators.length === 0 ? (
          <p className="telemetry-quiet-note">No indicators triggered a rule for this check-up.</p>
        ) : (
          <div className="telemetry-indicator-list">
            {triggeredIndicators.map((indicator) => (
              <article className="telemetry-indicator-card" key={indicator.id}>
                <header>
                  <strong>{indicator.label}</strong>
                  <span className={`telemetry-status-pill status-${indicator.status}`}>
                    {displayStatus(indicator.status)}
                  </span>
                </header>
                {indicator.triggered.map((rule) => {
                  const source = cleanRuleSource(rule.source);
                  return (
                    <div className="telemetry-rule" key={rule.ruleId}>
                      <strong>{rule.title}</strong>
                      <p>{rule.explanation}</p>
                      {rule.actions.length > 0 && (
                        <ul>{rule.actions.map((action) => <li key={action}>{action}</li>)}</ul>
                      )}
                      <p className="telemetry-rule-meta">Recheck: {rule.recheck}</p>
                      {source && <p className="telemetry-rule-source">Source: {source}</p>}
                    </div>
                  );
                })}
              </article>
            ))}
          </div>
        )}
      </section>

      {(telemetry.flags.length > 0 || telemetry.astronautNote) && (
        <section className="telemetry-detail-section">
          <h3>Today&apos;s symptoms &amp; clinical notes</h3>
          {telemetry.flags.length > 0 && (
            <div className="telemetry-symptoms">
              {telemetry.flags.map((flag) => (
                <span className="telemetry-symptom-tag" key={flag.id}>{flag.label}</span>
              ))}
            </div>
          )}
          {telemetry.astronautNote && (
            <p className="telemetry-note">{telemetry.astronautNote}</p>
          )}
        </section>
      )}

      <section className="telemetry-detail-section">
        <h3>7-day vitals history <span>Readings 7 days</span></h3>
        {telemetry.recentReadings.length === 0 ? (
          <p className="telemetry-quiet-note">No valid readings are available for this period.</p>
        ) : (
          <div className="telemetry-table-scroll">
            <table className="telemetry-readings-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Metric</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {telemetry.recentReadings.map((reading, index) => {
                  const metric = metricLabels.get(reading.metric);
                  return (
                    <tr key={`${reading.date}-${reading.metric}-${index}`}>
                      <td>{reading.date}</td>
                      <td>{metric?.label ?? reading.metric}</td>
                      <td>{reading.value} {metric?.unit ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function EarthLinkPanel({
  side,
  astronautId,
  astronautName,
  astronautProfiles,
  thread,
  nowMs,
  rules,
  currentTelemetry,
  onSelectAstronaut,
  onSend,
  draftText,
}: EarthLinkPanelProps) {
  const [composer, setComposer] = useState(() => draftText ?? "");
  const [attachTelemetry, setAttachTelemetry] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTelemetry, setDrawerTelemetry] = useState<EarthTelemetrySnapshot | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const latestTelemetry = useMemo(
    () => [...thread].reverse().find((message) => message.telemetry)?.telemetry ?? currentTelemetry,
    [currentTelemetry, thread],
  );

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }
    function onKeyDown(event: globalThis.KeyboardEvent): void {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  useEffect(() => {
    const threadElement = threadRef.current;
    if (threadElement) {
      threadElement.scrollTop = threadElement.scrollHeight;
    }
  }, [thread]);

  function openTelemetry(telemetry: EarthTelemetrySnapshot | null): void {
    setDrawerTelemetry(telemetry);
    setDrawerOpen(true);
  }

  function submitMessage(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const text = composer.trim();
    if (!text) {
      return;
    }
    onSend(text, side === "astronaut" && attachTelemetry && currentTelemetry !== null);
    setComposer("");
  }

  function handleComposerKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  const currentSender = side === "astronaut" ? "astronaut" : "flight_surgeon";
  const activity = earthChatActivity(thread, nowMs, currentSender);

  return (
    <section className="earth-chat-panel" aria-label="Earth Mission Control chat">
      <header className="earth-chat-header">
        <div className="earth-chat-title">
          <div>
            <p className="earth-chat-eyebrow">
              {side === "astronaut" ? "Async mission link" : "Ground Operator console"}
            </p>
            <h2>{side === "astronaut" ? "Flight Surgeon (Houston)" : astronautName}</h2>
            <p className="earth-chat-subtitle">
              {side === "astronaut"
                ? "Houston MCC · store-and-forward communication"
                : "Astronaut crew thread · store-and-forward communication"}
            </p>
          </div>
        </div>
        <div className="earth-chat-header-actions">
          {side === "earth" && astronautProfiles.length > 1 && (
            <label className="crew-thread-select">
              <span>Viewing crew</span>
              <select value={astronautId} onChange={(event) => onSelectAstronaut(event.currentTarget.value)}>
                {astronautProfiles.map((profile) => (
                  <option key={profile.profile_id} value={profile.profile_id}>
                    {profile.display_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            className="telemetry-open-button"
            type="button"
            onClick={() => openTelemetry(latestTelemetry)}
          >
            <span aria-hidden="true">📊</span> Check-up Telemetry
          </button>
        </div>
      </header>

      <div className="earth-chat-meta">
        <span className="earth-link-delay">Async Link · ~20 min one-way (×60 demo)</span>
        <span className="earth-chat-activity">{activity}</span>
      </div>

      <div className="earth-chat-thread" aria-live="polite" ref={threadRef}>
        {thread.map((message) => {
          const isCrewMessage = message.sender === "astronaut";
          const senderName = isCrewMessage ? astronautName : "Flight Surgeon (Houston)";
          const delivery = messageState(message, nowMs, side);
          return (
            <article
              className={`earth-chat-message${isCrewMessage ? " from-astronaut" : " from-surgeon"}`}
              key={message.id}
            >
              <CrewAvatar
                className="earth-chat-avatar"
                profileId={isCrewMessage ? astronautId : "ground-01"}
                size={34}
              />
              <div className="earth-chat-message-content">
                <header className="earth-chat-message-meta">
                  <span className="earth-chat-sender">{senderName}</span>
                  <span className="earth-chat-role">{isCrewMessage ? "Astronaut" : "Flight Surgeon"}</span>
                  <span className="earth-chat-time">
                    {formatMessageDate(message.createdAtMs, message.missionDay)} · Mission Day {message.missionDay}
                  </span>
                </header>
                <div className="earth-chat-bubble">
                  <p>{message.text}</p>
                  {message.telemetry && (
                    <div className="telemetry-attachment">
                      <span aria-hidden="true">📦</span>
                      <div className="telemetry-attachment-copy">
                        <strong>
                          Day {message.telemetry.missionDay} Check-up Telemetry
                        </strong>
                        <span>
                          Status: {displayStatus(message.telemetry.overallStatus)} ·{" "}
                          {message.telemetry.indicators.length} indicators · 7-day vitals
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openTelemetry(message.telemetry ?? null)}
                      >
                        Inspect Data
                      </button>
                    </div>
                  )}
                  <p className={`earth-chat-delivery${delivery === "transmitting" ? " is-transmitting" : ""}`}>
                    {delivery}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
        {thread.length === 0 && (
          <p className="earth-chat-empty">
            No messages yet. Send a note to start the mission thread.
          </p>
        )}
      </div>

      <form className="earth-chat-composer" onSubmit={submitMessage}>
        {side === "astronaut" && currentTelemetry && (
          <label className="telemetry-attach-toggle">
            <input
              type="checkbox"
              checked={attachTelemetry}
              onChange={(event) => setAttachTelemetry(event.currentTarget.checked)}
            />
            <span>Attach Day {currentTelemetry.missionDay} Check-up Telemetry</span>
          </label>
        )}
        <div className="earth-chat-input-row">
          <label className="visually-hidden" htmlFor="earth-chat-composer">
            {side === "astronaut" ? "Message Flight Surgeon" : "Reply to astronaut"}
          </label>
          <textarea
            id="earth-chat-composer"
            rows={2}
            placeholder={side === "astronaut" ? "Write a message to Houston…" : "Write an official reply…"}
            value={composer}
            onChange={(event) => setComposer(event.currentTarget.value)}
            onKeyDown={handleComposerKeyDown}
          />
          <button className="button button-primary" type="submit" disabled={!composer.trim()}>
            {side === "astronaut" ? "Send to Earth" : "Send Reply"}
          </button>
        </div>
        <p className="earth-chat-caption">
          Messages are queued locally and shown with a simulated ×60 relay delay.
        </p>
      </form>

      {drawerOpen && (
        <div className="telemetry-drawer-layer">
          <button
            className="telemetry-drawer-backdrop"
            type="button"
            aria-label="Close Check-up Telemetry"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="telemetry-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="telemetry-drawer-title"
          >
            <header className="telemetry-drawer-header">
              <div>
                <p className="earth-chat-eyebrow">Mission medical data</p>
                <h2 id="telemetry-drawer-title">📊 Check-up Telemetry</h2>
                {drawerTelemetry && (
                  <p>Day {drawerTelemetry.missionDay} · {drawerTelemetry.missionDate}</p>
                )}
              </div>
              <button
                className="telemetry-drawer-close"
                type="button"
                aria-label="Close drawer"
                onClick={() => setDrawerOpen(false)}
              >
                ×
              </button>
            </header>
            {drawerTelemetry ? (
              <TelemetryDetails telemetry={drawerTelemetry} rules={rules} />
            ) : (
              <p className="telemetry-drawer-empty">
                No check-up telemetry is attached to this thread yet.
              </p>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

export default EarthLinkPanel;
