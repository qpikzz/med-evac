import { useState } from "react";
import Header, { type AppView, type UserRole } from "./components/Header";
import "./App.css";

function App() {
  const [role, setRole] = useState<UserRole>("astronaut");
  const [activeView, setActiveView] = useState<AppView>("main");

  function changeRole(nextRole: UserRole): void {
    setRole(nextRole);
    setActiveView(nextRole === "ground_operator" ? "comms" : "main");
  }

  const isComms = activeView === "comms";

  return (
    <div className="app-shell">
      <Header
        role={role}
        activeView={activeView}
        onRoleChange={changeRole}
        onViewChange={setActiveView}
      />
      <main className="workspace">
        <section className="workspace-card" aria-labelledby="workspace-title">
          <div className="workspace-kicker">{isComms ? "Communication" : "Daily health"}</div>
          <h1 id="workspace-title">{isComms ? "Comms" : "Main"}</h1>
          <p>
            {isComms
              ? "Local AI and Ground Operator communication will appear here."
              : "Your daily check-up and health summary will appear here."}
          </p>
        </section>
      </main>
    </div>
  );
}

export default App;
