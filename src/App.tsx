import { useState } from "react";
import Header, { type AppView, type UserRole } from "./components/Header";
import MainDashboard from "./components/MainDashboard";
import type { TriggeredRule } from "./rules/types";
import "./App.css";

function App() {
  const [role, setRole] = useState<UserRole>("astronaut");
  const [activeView, setActiveView] = useState<AppView>("main");
  const [commsChannel, setCommsChannel] = useState<"local" | "earth">("local");
  const [commsContext, setCommsContext] = useState<string | null>(null);

  function changeRole(nextRole: UserRole): void {
    setRole(nextRole);
    setActiveView(nextRole === "ground_operator" ? "comms" : "main");
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

  return (
    <div className="app-shell">
      <Header
        role={role}
        activeView={activeView}
        onRoleChange={changeRole}
        onViewChange={setActiveView}
      />
      {activeView === "main" ? (
        <MainDashboard onContactEarth={contactEarth} onAskLocalAI={askLocalAI} />
      ) : (
        <main className="comms-view dashboard-card">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Communication</p>
              <h1>Comms</h1>
            </div>
          </div>
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
          <p className="comms-placeholder">
            {commsContext && commsChannel === "local" && (
              <span className="comms-context">Selected context: {commsContext}</span>
            )}
            {commsChannel === "earth"
              ? "Ground Operator communication is not connected in this MVP."
              : "Local AI communication is not connected in this MVP."}
          </p>
        </main>
      )}
    </div>
  );
}

export default App;
