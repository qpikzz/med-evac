import { useEffect, useState } from "react";
import Header, { type AppView } from "./components/Header";
import LocalAIChannel from "./components/LocalAIChannel";
import MainDashboard from "./components/MainDashboard";
import EarthLinkPanel from "./components/EarthLinkPanel";
import { useAuth } from "./features/auth/AuthContext";
import LoginScreen from "./features/auth/LoginScreen";
import { landingChannelForRole, landingViewForRole } from "./features/auth/session";
import type { AuthProfile } from "./features/auth/types";
import { useAppState } from "./features/app-state/AppStateContext";
import {
  buildDraft,
  send as sendEarthMessage,
  shouldAutoDraft,
  type EarthMessage,
} from "./features/earth-link/message";
import { createInMemoryTransport } from "./features/earth-link/transport";
import type { TriggeredRule } from "./rules/types";
import "./App.css";

interface LoginPrompt {
  credentialId?: string;
}

function upsertMessage(messages: EarthMessage[], message: EarthMessage): EarthMessage[] {
  const index = messages.findIndex((item) => item.id === message.id);
  if (index === -1) {
    return [...messages, message];
  }
  return messages.map((item) => (item.id === message.id ? message : item));
}

function App() {
  const { profiles, activeSession, activeProfile, forgetProfile, logout } = useAuth();
  const { today, missionDay, rules, flagsToday, evaluation, store } = useAppState();
  const [activeView, setActiveView] = useState<AppView>("main");
  const [commsChannel, setCommsChannel] = useState<"local" | "earth">("local");
  const [commsContext, setCommsContext] = useState<string | null>(null);
  const [openCheckupToken, setOpenCheckupToken] = useState(0);
  const [earthMessages, setEarthMessages] = useState<EarthMessage[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [transportError, setTransportError] = useState<string | null>(null);
  const [transport] = useState(createInMemoryTransport);
  const [loginPrompt, setLoginPrompt] = useState<LoginPrompt | null>(null);

  const role = activeProfile?.role ?? "astronaut";
  const effectiveView: AppView =
    role === "ground_operator" ? landingViewForRole(role) : activeView;
  const effectiveChannel =
    role === "ground_operator" ? landingChannelForRole(role) : commsChannel;

  const todayMessages = earthMessages.filter(
    (message) => message.content.mission_date === today,
  );
  const activeEarthMessage = todayMessages[todayMessages.length - 1] ?? null;

  useEffect(() => {
    setLoginPrompt(null);
  }, [activeSession]);

  useEffect(() => {
    if (!activeProfile) {
      return;
    }
    setActiveView(landingViewForRole(activeProfile.role));
    setCommsChannel(landingChannelForRole(activeProfile.role));
    setCommsContext(null);
    setEarthMessages([]);
    setTransportError(null);
    setOpenCheckupToken(0);
  }, [activeProfile]);

  useEffect(
    () =>
      transport.onMessage((message) => {
        setEarthMessages((current) => upsertMessage(current, message));
      }),
    [transport],
  );

  useEffect(() => {
    if (role !== "astronaut" || !shouldAutoDraft(evaluation)) {
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
        store,
        rules,
        flagsToday,
        missionDay,
        existingIdsToday: currentToday.length,
      });
      return [...current, draft];
    });
  }, [evaluation, flagsToday, missionDay, role, rules, store, today]);

  useEffect(() => {
    if (activeEarthMessage?.state !== "in_transit") {
      return;
    }
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeEarthMessage?.id, activeEarthMessage?.state]);

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
        store,
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
      store,
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

  function selectAccount(profile: AuthProfile): void {
    if (profile.profile_id === activeProfile?.profile_id) {
      return;
    }
    setLoginPrompt({ credentialId: profile.credential_id });
  }

  function addAccount(): void {
    setLoginPrompt({});
  }

  function signOut(): void {
    setLoginPrompt(null);
    setCommsContext(null);
    setEarthMessages([]);
    setTransportError(null);
    logout();
  }

  if (!activeSession || !activeProfile) {
    return <LoginScreen />;
  }

  if (loginPrompt) {
    return (
      <LoginScreen
        initialCredentialId={loginPrompt.credentialId}
        allowCancel
        onCancel={() => setLoginPrompt(null)}
      />
    );
  }

  return (
    <div className="app-shell" key={activeProfile.profile_id}>
      <Header
        activeView={effectiveView}
        profiles={profiles}
        activeProfile={activeProfile}
        onViewChange={setActiveView}
        onSelectAccount={selectAccount}
        onAddAccount={addAccount}
        onLogout={signOut}
        onForgetProfile={forgetProfile}
      />
      {role === "astronaut" && shouldAutoDraft(evaluation) && (
        <div className="red-auto-draft-banner" role="status">
          A message for the flight surgeon is ready. Review and send.
        </div>
      )}
      {effectiveView === "main" ? (
        <MainDashboard
          onContactEarth={contactEarth}
          onAskLocalAI={askLocalAI}
          openCheckupToken={openCheckupToken}
        />
      ) : (
        <main className="comms-view dashboard-card">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">ORBITA · Communication</p>
              <h1>Comms</h1>
              <p className="comms-brand-expansion">
                Onboard Remote Biometric &amp; Integrated Telemetry Assistant
              </p>
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
          {effectiveChannel === "local" ? (
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
