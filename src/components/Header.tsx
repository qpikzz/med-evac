import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LogOut, UserPlus } from "lucide-react";
import { ROLE_LABELS } from "../features/auth/constants";
import { HEADER_COPY } from "../features/auth/copy";
import { initials } from "../features/auth/identity";
import type { AuthProfile } from "../features/auth/types";
import OrbitaLogo from "./OrbitaLogo";

export type { UserRole } from "../features/auth/types";
export type AppView = "main" | "comms";

interface HeaderProps {
  activeView: AppView;
  profiles: AuthProfile[];
  activeProfile: AuthProfile;
  onViewChange: (view: AppView) => void;
  onSelectAccount: (profile: AuthProfile) => void;
  onAddAccount: () => void;
  onLogout: () => void;
}

function Header({
  activeView,
  profiles,
  activeProfile,
  onViewChange,
  onSelectAccount,
  onAddAccount,
  onLogout,
}: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement | null>(null);
  const role = activeProfile.role;

  useEffect(() => {
    if (!profileOpen) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen]);

  function selectAccount(profile: AuthProfile): void {
    setProfileOpen(false);
    onSelectAccount(profile);
  }

  function addAccount(): void {
    setProfileOpen(false);
    onAddAccount();
  }

  function logout(): void {
    setProfileOpen(false);
    onLogout();
  }

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-lockup" aria-label="ORBITA">
          <OrbitaLogo size={32} />
          <span className="brand-name">ORBITA</span>
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

      <div className="profile-switcher" ref={switcherRef}>
        <button
          className="profile-trigger"
          type="button"
          aria-haspopup="true"
          aria-expanded={profileOpen}
          aria-controls="profile-menu"
          onClick={() => setProfileOpen((open) => !open)}
        >
          <span className="profile-avatar" aria-hidden="true">
            {initials(activeProfile.display_name)}
          </span>
          <span className="profile-copy">
            <span className="profile-name">{activeProfile.display_name}</span>
            <span className="profile-caption">{ROLE_LABELS[role]}</span>
          </span>
          <ChevronDown
            className={`profile-chevron${profileOpen ? " is-open" : ""}`}
            size={14}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>

        <div className="profile-menu" id="profile-menu" aria-label="Account menu" hidden={!profileOpen}>
          <p className="profile-menu-label">{HEADER_COPY.savedProfiles}</p>
          <div className="profile-menu-section">
            {profiles.map((profile) => {
              const isActive = profile.profile_id === activeProfile.profile_id;
              return (
                <button
                  className={`profile-option${isActive ? " is-active" : ""}`}
                  type="button"
                  key={profile.profile_id}
                  aria-pressed={isActive}
                  onClick={() => selectAccount(profile)}
                >
                  <span className="profile-option-avatar" aria-hidden="true">
                    {initials(profile.display_name)}
                  </span>
                  <span className="profile-option-copy">
                    <span className="profile-option-name">{profile.display_name}</span>
                    <span className="profile-option-role">{ROLE_LABELS[profile.role]}</span>
                  </span>
                  {isActive && <Check className="profile-check" size={15} aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="profile-menu-divider" role="separator" />

          <div className="profile-menu-section">
            <button className="profile-action" type="button" onClick={addAccount}>
              <UserPlus size={15} aria-hidden="true" />
              {HEADER_COPY.addAccount}
            </button>
            <button
              className="profile-action profile-action-danger"
              type="button"
              onClick={logout}
            >
              <LogOut size={15} aria-hidden="true" />
              {HEADER_COPY.logout}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
