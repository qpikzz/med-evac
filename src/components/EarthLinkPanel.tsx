import { useEffect, useState } from "react";
import {
  validateNote,
  viewMessage,
  type EarthMessage,
} from "../features/earth-link/message";
import { EARTH_LINK } from "../features/earth-link/settings";
import type { RulesFile } from "../rules/types";

interface EarthLinkPanelProps {
  side: "astronaut" | "earth";
  message: EarthMessage | null;
  nowMs: number;
  rules: RulesFile;
  onCreateDraft?: () => void;
  onSend?: (note: string) => void;
}

const DEMO_DELAY_TEXT =
  "Demo: time accelerated ×60. Real one-way delay up to ~20 min.";

function formatEscalation(escalation: EarthMessage["content"]["overall_escalation"]): string {
  switch (escalation) {
    case "self":
      return "Self";
    case "crew_medical_officer":
      return "Crew Medical Officer";
    case "ground_flight_surgeon":
      return "Flight Surgeon on Earth";
    default:
      return "None";
  }
}

function MessageTelemetry({
  message,
  rules,
  note,
}: {
  message: EarthMessage;
  rules: RulesFile;
  note: string;
}) {
  const metricUnits = new Map(rules.metrics.map((metric) => [metric.id, metric.unit]));

  return (
    <div className="earth-telemetry">
      <p className="synthetic-label">SYNTHETIC</p>
      <p>
        Overall status:{" "}
        <strong>
          {message.content.overall_status === "no_data"
            ? "No Data"
            : `${message.content.overall_status[0].toUpperCase()}${message.content.overall_status.slice(1)}`}
        </strong>
      </p>
      <p>
        Escalation: <strong>{formatEscalation(message.content.overall_escalation)}</strong>
      </p>
      <section>
        <h3>Triggered indicators and rules</h3>
        {message.content.indicators.length === 0 ? (
          <p>All indicators are within your normal range.</p>
        ) : (
          <ul className="earth-indicator-list">
            {message.content.indicators.map((indicator) => (
              <li key={indicator.indicator_id}>
                <strong>
                  {indicator.label} ({indicator.status})
                </strong>
                {indicator.triggered.length === 0 ? (
                  <p>No triggering rule details.</p>
                ) : (
                  <ul>
                    {indicator.triggered.map((rule) => (
                      <li key={rule.rule_id}>
                        <span>{rule.title}</span>
                        <span className="rule-source">Source: {rule.source}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3>Readings (7 days)</h3>
        {message.content.recent_readings.length === 0 ? (
          <p>No recent readings.</p>
        ) : (
          <div className="earth-table-scroll">
            <table className="earth-readings-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Metric</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {message.content.recent_readings.map((reading, index) => {
                  const metric = rules.metrics.find((item) => item.id === reading.metric);
                  return (
                    <tr key={`${reading.date}-${reading.metric}-${index}`}>
                      <td>{reading.date}</td>
                      <td>{metric?.label ?? reading.metric}</td>
                      <td>
                        {reading.value} {metricUnits.get(reading.metric) ?? ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section>
        <h3>Relevant flags</h3>
        {message.content.flags_today.length === 0 ? (
          <p>None</p>
        ) : (
          <ul>
            {message.content.flags_today.map((flag) => (
              <li key={flag.id}>{flag.label}</li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3>Astronaut note</h3>
        <p className="earth-astronaut-note">{note || "None"}</p>
      </section>
    </div>
  );
}

function EarthLinkPanel({
  side,
  message,
  nowMs,
  rules,
  onCreateDraft,
  onSend,
}: EarthLinkPanelProps) {
  const [note, setNote] = useState(message?.content.astronaut_note ?? "");
  const noteValidation = validateNote(note);
  const isDraft = message?.state === "draft";
  const visibleMessage = side === "earth" && !isDraft ? message : null;
  const messageView = visibleMessage
    ? viewMessage(visibleMessage, side, nowMs)
    : null;

  useEffect(() => {
    setNote(message?.content.astronaut_note ?? "");
  }, [message?.id]);

  if (side === "earth") {
    return (
      <section className="earth-link-panel dashboard-card" aria-label="Ground Operator Earth console">
        <header className="earth-panel-header">
          <div>
            <p className="section-eyebrow">Ground Operator console</p>
            <h2>Earth — Flight Surgeon (simulated)</h2>
          </div>
          {visibleMessage?.kind === "private_behavioral" && (
            <span className="private-badge">Private</span>
          )}
        </header>
        <p className="demo-delay-note">{DEMO_DELAY_TEXT}</p>
        {messageView && !messageView.content_visible && (
          <div className="earth-message-status" aria-live="polite">
            <p>{messageView.text}</p>
          </div>
        )}
        {messageView?.content_visible && visibleMessage && (
          <MessageTelemetry
            message={visibleMessage}
            rules={rules}
            note={visibleMessage.content.astronaut_note ?? ""}
          />
        )}
        {!messageView && (
          <p className="earth-empty-state">
            No incoming message yet. Message content appears here after arrival.
          </p>
        )}
        <aside className="earth-todo-banner">
          #TODO Cross-instance synchronization and a flight surgeon reply editor are deferred in this MVP.
        </aside>
      </section>
    );
  }

  return (
    <section className="earth-link-panel astronaut-earth-panel dashboard-card" aria-label="Message to Earth">
      {!message ? (
        <div className="earth-empty-state">
          <p>No Earth message is prepared for today.</p>
          <button className="button button-secondary" type="button" onClick={onCreateDraft}>
            Prepare a message for Earth
          </button>
        </div>
      ) : (
        <>
          <header className="earth-panel-header">
            <div>
              <p className="section-eyebrow">Delayed one-way communication</p>
              <h2>Message to Earth — {message.recipient_label}</h2>
            </div>
            {message.kind === "private_behavioral" && (
              <span className="private-badge">Private</span>
            )}
          </header>
          <p className="demo-delay-note">{DEMO_DELAY_TEXT}</p>
          <div className="earth-message-status" aria-live="polite">
            <p>
              {isDraft
                ? message.content.indicators.length === 0
                  ? "All indicators are within your normal range."
                  : "Draft ready for review and send."
                : viewMessage(message, side, nowMs).text}
            </p>
          </div>
          <MessageTelemetry message={message} rules={rules} note={note} />
          {isDraft ? (
            <div className="earth-note-composer">
              <label htmlFor="earth-astronaut-note">Astronaut note (optional)</label>
              <textarea
                id="earth-astronaut-note"
                value={note}
                onChange={(event) => setNote(event.currentTarget.value)}
                aria-invalid={!noteValidation.ok}
                aria-describedby="earth-note-help earth-note-error"
              />
              <div className="earth-note-meta">
                <span id="earth-note-help">Up to {EARTH_LINK.note_max_chars} characters</span>
                <span>{note.length}/{EARTH_LINK.note_max_chars}</span>
              </div>
              {!noteValidation.ok && (
                <p className="earth-note-error" id="earth-note-error">
                  {noteValidation.message}
                </p>
              )}
              <button
                className="button button-primary"
                type="button"
                disabled={!noteValidation.ok}
                onClick={() => onSend?.(note)}
              >
                Send
              </button>
            </div>
          ) : (
            <p className="earth-note-locked">This message has been sent and can no longer be edited.</p>
          )}
        </>
      )}
    </section>
  );
}

export default EarthLinkPanel;
