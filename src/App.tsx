import { useEffect, useState } from "react";
import Header, { type AppView, type UserRole } from "./components/Header";
import LocalAIChannel from "./components/LocalAIChannel";
import MainDashboard from "./components/MainDashboard";
import EarthLinkPanel from "./components/EarthLinkPanel";
import { useAppState } from "./features/app-state/AppStateContext";
import { historyStore } from "./features/synthetic-data";
import {
  buildDraft,
  send as sendEarthMessage,
  shouldAutoDraft,
  type EarthMessage,
} from "./features/earth-link/message";
import { createInMemoryTransport } from "./features/earth-link/transport";
import type { TriggeredRule } from "./rules/types";
import "./App.css";

function upsertMessage(messages: EarthMessage[], message: EarthMessage): EarthMessage[] {
  const index = messages.findIndex((item) => item.id === message.id);
  if (index === -1) {
    return [...messages, message];
  }
  return messages.map((item) => (item.id === message.id ? message : item));
}

function App() {
  const { today, missionDay, rules, flagsToday, evaluation } = useAppState();
  const [role, setRole] = useState<UserRole>("astronaut");
  const [activeView, setActiveView] = useState<AppView>("main");
  const [commsChannel, setCommsChannel] = useState<"local" | "earth">("local");
  const [commsContext, setCommsContext] = useState<string | null>(null);
  const [openCheckupToken, setOpenCheckupToken] = useState(0);
  const [earthMessages, setEarthMessages] = useState<EarthMessage[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [transportError, setTransportError] = useState<string | null>(null);
  const [transport] = useState(createInMemoryTransport);
  const todayMessages = earthMessages.filter(
    (message) => message.content.mission_date === today,
  );
  const activeEarthMessage = todayMessages[todayMessages.length - 1] ?? null;

  useEffect(
    () =>
      transport.onMessage((message) => {
        setEarthMessages((current) => upsertMessage(current, message));
      }),
    [transport],
  );

  useEffect(() => {
    if (!shouldAutoDraft(evaluation)) {
      return;
    }
    setEarthMessages((current) => {
      const currentToday = current.filter(
        (message) => message.content.mission_date === today,
      );
      if (
        currentToday.some(
          (message) => message.state === "draft" || message.state === "in_transit",
        )
      ) {
        return current;
      }
      const draft = buildDraft({
        evaluation,
        store: historyStore,
        rules,
        flagsToday,
        missionDay,
        existingIdsToday: currentToday.length,
      });
      return [...current, draft];
    });
  }, [evaluation, flagsToday, missionDay, rules, today]);

  useEffect(() => {
    if (activeEarthMessage?.state !== "in_transit") {
      return;
    }
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeEarthMessage?.id, activeEarthMessage?.state]);

  function changeRole(nextRole: UserRole): void {
    setRole(nextRole);
    setActiveView(nextRole === "ground_operator" ? "comms" : "main");
    setCommsChannel(nextRole === "ground_operator" ? "earth" : "local");
  }

  function contactEarth(): void {
    setCommsChannel("earth");
    setActiveView("comms");
  }

  function askLocalAI(indicatorLabel: string, rule?: TriggeredRule): void {
    setCommsChannel("local");
    setCommsContext(
      rule ? `${indicatorLabel}: ${rule.title}` : `${indicatorLabel}: today's indicator summary`,
    );
    setActiveView("comms");
  }

  function openTodaysCheckup(): void {
    setActiveView("main");
    setOpenCheckupToken((current) => current + 1);
  }

  function prepareEarthDraft(): void {
    setEarthMessages((current) => {
      const currentToday = current.filter(
        (message) => message.content.mission_date === today,
      );
      if (currentToday[currentToday.length - 1]?.state === "draft") {
        return current;
      }
      const draft = buildDraft({
        evaluation,
        store: historyStore,
        rules,
        flagsToday,
        missionDay,
        existingIdsToday: currentToday.length,
      });
      return [...current, draft];
    });
  }

  async function sendEarthDraft(note: string): Promise<void> {
    const currentToday = earthMessages.filter(
      (message) => message.content.mission_date === today,
    );
    const currentDraft = currentToday[currentToday.length - 1];
    if (!currentDraft || currentDraft.state !== "draft") {
      return;
    }
    const draft = buildDraft({
      evaluation,
      store: historyStore,
      rules,
      flagsToday,
      missionDay,
      note,
      existingIdsToday: Math.max(0, currentToday.length - 1),
    });
    const sentMessage = sendEarthMessage(draft, Date.now());
    setNowMs(Date.now());
    setEarthMessages((current) => upsertMessage(current, sentMessage));
    setTransportError(null);
    try {
      await transport.send(sentMessage);
    } catch (error) {
      setTransportError(
        error instanceof Error ? error.message : "The Earth message could not be sent.",
      );
    }
  }

  return (
    <div className="app-shell">
      <Header
        role={role}
        activeView={activeView}
        onRoleChange={changeRole}
        onViewChange={setActiveView}
      />
      {shouldAutoDraft(evaluation) && (
        <div className="red-auto-draft-banner" role="status">
          A message for the flight surgeon is ready. Review and send.
        </div>
      )}
      {activeView === "main" ? (
        <MainDashboard
          onContactEarth={contactEarth}
          onAskLocalAI={askLocalAI}
          openCheckupToken={openCheckupToken}
        />
      ) : (
        <main className="comms-view dashboard-card">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Communication</p>
              <h1>Comms</h1>
            </div>
          </div>
          {role === "astronaut" && (
            <div className="comms-channel-switcher" aria-label="Communication channel">
              <button
                className={`comms-channel${commsChannel === "local" ? " is-selected" : ""}`}
                type="button"
                aria-pressed={commsChannel === "local"}
                onClick={() => setCommsChannel("local")}
              >
                Local AI (Offline SI)
              </button>
              <button
                className={`comms-channel${commsChannel === "earth" ? " is-selected" : ""}`}
                type="button"
                aria-pressed={commsChannel === "earth"}
                onClick={() => setCommsChannel("earth")}
              >
                Ground Operator (Earth)
              </button>
            </div>
          )}
          {commsChannel === "local" ? (
            <LocalAIChannel
              onOpenCheckup={openTodaysCheckup}
              selectedContext={commsContext}
            />
          ) : (
            <>
              {transportError && (
                <p className="earth-transport-error" role="alert">
                  {transportError}
                </p>
              )}
              <EarthLinkPanel
                side={role === "ground_operator" ? "earth" : "astronaut"}
                message={activeEarthMessage}
                nowMs={nowMs}
                rules={rules}
                onCreateDraft={prepareEarthDraft}
                onSend={sendEarthDraft}
              />
            </>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
