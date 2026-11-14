import { useState } from "react";

export type UserRole = "astronaut" | "ground_operator";
export type AppView = "main" | "comms";

interface HeaderProps {
  role: UserRole;
  activeView: AppView;
  onRoleChange: (role: UserRole) => void;
  onViewChange: (view: AppView) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  astronaut: "Astronaut",
  ground_operator: "Ground Operator",
};

function Header({ role, activeView, onRoleChange, onViewChange }: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);

  function selectRole(nextRole: UserRole): void {
    onRoleChange(nextRole);
    setProfileOpen(false);
  }

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-lockup" aria-label="MED-EVAC">
          <span className="brand-mark" aria-hidden="true">M</span>
          <span className="brand-name">MED-EVAC</span>
        </div>
        <div className="mission-context">
          <span className="mission-day">Day 40</span>
          <time className="mission-date" dateTime="2026-11-14">2026-11-14</time>
        </div>
      </div>

      {role === "astronaut" && (
        <nav className="primary-nav" aria-label="Primary navigation">
          {(["main", "comms"] as const).map((view) => (
            <button
              className={`nav-tab${activeView === view ? " is-active" : ""}`}
              type="button"
              key={view}
              aria-current={activeView === view ? "page" : undefined}
              onClick={() => onViewChange(view)}
            >
              {view === "main" ? "Main" : "Comms"}
            </button>
          ))}
        </nav>
      )}

      <div className="profile-switcher">
        <button
          className="profile-trigger"
          type="button"
          aria-haspopup="true"
          aria-expanded={profileOpen}
          aria-controls="profile-menu"
          onClick={() => setProfileOpen((open) => !open)}
        >
          <span className="profile-avatar" aria-hidden="true">
            {role === "astronaut" ? "A" : "G"}
          </span>
          <span className="profile-copy">
            <span className="profile-name">{ROLE_LABELS[role]}</span>
            <span className="profile-caption">Profile</span>
          </span>
          <span className="profile-chevron" aria-hidden="true">{profileOpen ? "⌃" : "⌄"}</span>
        </button>
        {profileOpen && (
          <div className="profile-menu" id="profile-menu" aria-label="Choose profile">
            {(["astronaut", "ground_operator"] as const).map((option) => (
              <button
                className="profile-option"
                type="button"
                key={option}
                aria-pressed={role === option}
                onClick={() => selectRole(option)}
              >
                <span>{ROLE_LABELS[option]}</span>
                {role === option && <span className="profile-check" aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
