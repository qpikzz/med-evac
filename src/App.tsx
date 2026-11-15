import { useEffect, useMemo, useState } from "react";
import Header, { type AppView } from "./components/Header";
import LocalAIChannel from "./components/LocalAIChannel";
import MainDashboard from "./components/MainDashboard";
import EarthLinkPanel from "./components/EarthLinkPanel";
import CommsChannelDeck from "./components/CommsChannelDeck";
import { useAuth } from "./features/auth/AuthContext";
import LoginScreen from "./features/auth/LoginScreen";
import { landingChannelForRole, landingViewForRole } from "./features/auth/session";
import type { AuthProfile } from "./features/auth/types";
import { useAppState } from "./features/app-state/AppStateContext";
import {
  buildEarthTelemetrySnapshot,
  createEarthChatMessage,
  earthChatActivity,
  loadEarthChatThread,
  saveEarthChatThread,
  seedEarthChatThread,
  type EarthChatMessage,
} from "./features/earth-link/chat";
import "./App.css";

interface LoginPrompt {
  credentialId?: string;
}

function App() {
  const { profiles, activeSession, activeProfile, forgetProfile, logout } = useAuth();
  const {
    missionDay,
    rules,
    flagsToday,
    clinicalNotesToday,
    readings,
    evaluation,
    hasCheckup,
  } = useAppState();
  const [activeView, setActiveView] = useState<AppView>("main");
  const [commsChannel, setCommsChannel] = useState<"local" | "earth">("local");
  const [openCheckupToken, setOpenCheckupToken] = useState(0);
  const initialAstronautId =
    activeProfile?.role === "astronaut" ? activeProfile.profile_id : "astro-01";
  const [earthAstronautId, setEarthAstronautId] = useState(initialAstronautId);
  const [earthThread, setEarthThread] = useState<EarthChatMessage[]>(() =>
    seedEarthChatThread(initialAstronautId),
  );
  const [threadLoadedFor, setThreadLoadedFor] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [earthChatError, setEarthChatError] = useState<string | null>(null);
  const [loginPrompt, setLoginPrompt] = useState<LoginPrompt | null>(null);

  const role = activeProfile?.role ?? "astronaut";
  const effectiveView: AppView =
    role === "ground_operator" ? landingViewForRole(role) : activeView;
  const effectiveChannel =
    role === "ground_operator" ? landingChannelForRole(role) : commsChannel;

  useEffect(() => {
    setLoginPrompt(null);
  }, [activeSession]);

  useEffect(() => {
    if (!activeProfile) {
      return;
    }
    setActiveView(landingViewForRole(activeProfile.role));
    setCommsChannel(landingChannelForRole(activeProfile.role));
    setEarthAstronautId(
      activeProfile.role === "astronaut" ? activeProfile.profile_id : "astro-01",
    );
    setEarthChatError(null);
    setOpenCheckupToken(0);
  }, [activeProfile]);

  useEffect(() => {
    try {
      setEarthThread(loadEarthChatThread(earthAstronautId));
      setThreadLoadedFor(earthAstronautId);
      setEarthChatError(null);
    } catch (error) {
      setEarthThread(seedEarthChatThread(earthAstronautId));
      setThreadLoadedFor("");
      setEarthChatError(
        error instanceof Error ? error.message : "The Earth chat could not be loaded.",
      );
    }
  }, [earthAstronautId]);

  useEffect(() => {
    if (threadLoadedFor !== earthAstronautId) {
      return;
    }
    try {
      saveEarthChatThread(earthAstronautId, earthThread);
    } catch (error) {
      setEarthChatError(
        error instanceof Error ? error.message : "The Earth chat could not be saved.",
      );
    }
  }, [earthAstronautId, earthThread, threadLoadedFor]);

  useEffect(() => {
    if (!earthThread.some((message) => message.arrivesAtMs > nowMs)) {
      return;
    }
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [earthThread, nowMs]);

  const currentTelemetry = useMemo(
    () => {
      if (!hasCheckup) {
        return null;
      }
      return buildEarthTelemetrySnapshot({
        evaluation,
        rules,
        flagsToday,
        readings,
        clinicalNotes: clinicalNotesToday,
        missionDay,
      });
    },
    [clinicalNotesToday, evaluation, flagsToday, hasCheckup, missionDay, readings, rules],
  );
  const earthActivity = earthChatActivity(
    earthThread,
    nowMs,
    role === "astronaut" ? "astronaut" : "flight_surgeon",
  );

  function contactEarth(): void {
    setCommsChannel("earth");
    setActiveView("comms");
  }

  function askLocalAI(): void {
    setCommsChannel("local");
    setActiveView("comms");
  }

  function openTodaysCheckup(): void {
    setActiveView("main");
    setOpenCheckupToken((current) => current + 1);
  }

  function sendEarthChat(text: string, attachTelemetry: boolean): void {
    const createdAtMs = Date.now();
    const message = createEarthChatMessage({
      id: `${earthAstronautId}-${createdAtMs}-${earthThread.length}`,
      astronautId: earthAstronautId,
      sender: role === "astronaut" ? "astronaut" : "flight_surgeon",
      text,
      missionDay,
      createdAtMs,
      ...(attachTelemetry && currentTelemetry ? { telemetry: currentTelemetry } : {}),
    });
    setEarthThread((current) => [...current, message]);
    setNowMs(createdAtMs);
    setEarthChatError(null);
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
    setEarthChatError(null);
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
      {effectiveView === "main" ? (
        <MainDashboard
          onContactEarth={contactEarth}
          onAskLocalAI={askLocalAI}
          openCheckupToken={openCheckupToken}
        />
      ) : (
        <main className="comms-view">
          <CommsChannelDeck
            activeChannel={effectiveChannel}
            canUseLocalAI={role === "astronaut"}
            missionDay={missionDay}
            status={evaluation.overall_status}
            earthActivity={earthActivity}
            onSelect={setCommsChannel}
          />
          {earthChatError && <p className="earth-transport-error" role="alert">{earthChatError}</p>}
          {effectiveChannel === "local" ? (
            <LocalAIChannel
              onOpenCheckup={openTodaysCheckup}
            />
          ) : (
            <EarthLinkPanel
              side={role === "ground_operator" ? "earth" : "astronaut"}
              astronautId={earthAstronautId}
              astronautName={
                profiles.find((profile) => profile.profile_id === earthAstronautId)?.display_name
                  ?? "Cmdr. Alex Vance"
              }
              astronautProfiles={profiles
                .filter((profile) => profile.role === "astronaut")
                .map(({ profile_id, display_name }) => ({ profile_id, display_name }))}
              thread={earthThread}
              nowMs={nowMs}
              rules={rules}
              currentTelemetry={role === "astronaut" ? currentTelemetry : null}
              onSelectAstronaut={setEarthAstronautId}
              onSend={sendEarthChat}
            />
          )}
        </main>
      )}
    </div>
  );
}

export default App;
