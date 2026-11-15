import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LogOut, Trash2, UserPlus } from "lucide-react";
import { ROLE_LABELS } from "../features/auth/constants";
import { HEADER_COPY } from "../features/auth/copy";
import type { AuthProfile } from "../features/auth/types";
import CrewAvatar from "./CrewAvatar";
import OrbitaLogo from "./OrbitaLogo";
import { getToday, missionDayForDate } from "../features/synthetic-data";

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
  onForgetProfile: (profileId: string) => void;
}

function Header({
  activeView,
  profiles,
  activeProfile,
  onViewChange,
  onSelectAccount,
  onAddAccount,
  onLogout,
  onForgetProfile,
}: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [forgetError, setForgetError] = useState<string | null>(null);
  const [forgetTarget, setForgetTarget] = useState<AuthProfile | null>(null);
  // Mission clock, not the computer clock: "Day 40" always pairs with its own date (2026-11-14).
  const missionDate = getToday();
  const missionDay = missionDayForDate(missionDate);
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

  useEffect(() => {
    if (!forgetTarget) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setForgetTarget(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [forgetTarget]);

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

  function forgetAccount(profileId: string): boolean {
    setForgetError(null);
    try {
      onForgetProfile(profileId);
      return true;
    } catch {
      setForgetError(HEADER_COPY.forgetFailed);
      return false;
    }
  }

  function confirmForgetAccount(): void {
    if (!forgetTarget) {
      return;
    }
    if (forgetAccount(forgetTarget.profile_id)) {
      setForgetTarget(null);
    }
  }

  return (
    <>
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-lockup" aria-label="ORBITA">
            <OrbitaLogo size={42} />
          </div>
          <div className="mission-context">
            <span className="mission-day">Day {missionDay}</span>
            <span className="mission-divider" aria-hidden="true">·</span>
            <time className="mission-date" dateTime={missionDate}>{missionDate}</time>
            <span className="synthetic-badge" title="Fictional astronaut and synthetic data — not real medical data">Synthetic data</span>
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
            aria-label={`${activeProfile.display_name}, ${ROLE_LABELS[role]}`}
            aria-haspopup="true"
            aria-expanded={profileOpen}
            aria-controls="profile-menu"
            onClick={() => setProfileOpen((open) => !open)}
          >
            <CrewAvatar
              className="profile-avatar"
              profileId={activeProfile.profile_id}
              size={30}
            />
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

          <div
            className="profile-menu"
            id="profile-menu"
            aria-label="Account menu"
            hidden={!profileOpen}
          >
            <p className="profile-menu-label">{HEADER_COPY.savedProfiles}</p>
            <div className="profile-menu-section">
              {profiles.map((profile) => {
                const isActive = profile.profile_id === activeProfile.profile_id;
                return (
                  <div
                    className={`profile-option${isActive ? " is-active" : ""}`}
                    key={profile.profile_id}
                  >
                    <button
                      className="profile-option-select"
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => selectAccount(profile)}
                    >
                      <CrewAvatar
                        className="profile-option-avatar"
                        profileId={profile.profile_id}
                        size={28}
                      />
                      <span className="profile-option-copy">
                        <span className="profile-option-name">{profile.display_name}</span>
                        <span className="profile-option-role">{ROLE_LABELS[profile.role]}</span>
                      </span>
                      {isActive && (
                        <Check className="profile-check" size={15} aria-hidden="true" />
                      )}
                    </button>
                    <button
                      className="profile-forget"
                      type="button"
                      aria-label="Forget account"
                      title="Forget account"
                      onClick={(event) => {
                        event.stopPropagation();
                        setForgetError(null);
                        setForgetTarget(profile);
                      }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>

            {forgetError && (
              <p className="profile-menu-error" role="alert">{forgetError}</p>
            )}

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
      {forgetTarget && (
        <div className="forget-dialog-backdrop">
          <section
            className="forget-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="forget-dialog-title"
            aria-describedby="forget-dialog-description"
          >
            <h2 className="forget-dialog-title" id="forget-dialog-title">
              Are you sure you want to forget this account?
            </h2>
            <p className="forget-dialog-description" id="forget-dialog-description">
              Your data will not be deleted; the account will only be removed from the displayed account list.
            </p>
            {forgetError && <p className="forget-dialog-error" role="alert">{forgetError}</p>}
            <div className="forget-dialog-actions">
              <button
                className="forget-dialog-cancel"
                type="button"
                autoFocus
                onClick={() => setForgetTarget(null)}
              >
                No
              </button>
              <button
                className="forget-dialog-confirm"
                type="button"
                onClick={confirmForgetAccount}
              >
                Yes
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default Header;
