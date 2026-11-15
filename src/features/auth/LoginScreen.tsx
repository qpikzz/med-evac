import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, Nfc } from "lucide-react";
import OrbitaLogo from "../../components/OrbitaLogo";
import { useAuth } from "./AuthContext";
import {
  DISPLAY_NAME_MAX_LENGTH,
  LOCKOUT_TICK_MS,
  PIN_LENGTH,
  ROLE_LABELS,
} from "./constants";
import {
  ENROLLMENT_COPY,
  PIN_COPY,
  SCAN_COPY,
  SESSION_COPY,
} from "./copy";
import { demoBadgeSummary } from "./demoBadges";
import { createUnknownBadgeId, initials } from "./identity";
import { PinDots } from "./PinDots";
import { PinKeypad } from "./PinKeypad";
import { isValidPin } from "./pinCrypto";
import type { AuthProfile, SessionMode, UserRole } from "./types";
import "./LoginScreen.css";

type LoginStep = "scan" | "pin" | "enroll" | "session";
type EnrollmentStage = "create" | "confirm";

interface LoginScreenProps {
  initialCredentialId?: string | null;
  allowCancel?: boolean;
  onCancel?: () => void;
}

const SESSION_CHOICES: { mode: SessionMode; label: string; hint: string }[] = [
  { mode: "ephemeral", label: SESSION_COPY.ephemeral, hint: SESSION_COPY.ephemeralHint },
  { mode: "persistent", label: SESSION_COPY.persistent, hint: SESSION_COPY.persistentHint },
];

const ROLE_OPTIONS = ["astronaut", "ground_operator"] as const;

function LoginScreen({ initialCredentialId, allowCancel = false, onCancel }: LoginScreenProps) {
  const {
    profiles,
    verifyPin,
    enroll,
    startSession,
    getLockoutRemainingMs,
  } = useAuth();

  const initialProfile = useMemo(() => {
    if (!initialCredentialId) {
      return null;
    }
    return profiles.find((profile) => profile.credential_id === initialCredentialId) ?? null;
  }, [initialCredentialId, profiles]);

  const [step, setStep] = useState<LoginStep>(initialProfile ? "pin" : "scan");
  const [selectedProfile, setSelectedProfile] = useState<AuthProfile | null>(initialProfile);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lockoutRemainingMs, setLockoutRemainingMs] = useState(0);

  const [unknownBadgeId, setUnknownBadgeId] = useState("");
  const [enrollmentStage, setEnrollmentStage] = useState<EnrollmentStage>("create");
  const [firstPin, setFirstPin] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole>("astronaut");

  const [verifiedProfile, setVerifiedProfile] = useState<AuthProfile | null>(null);

  const locked = lockoutRemainingMs > 0;
  const lockoutSeconds = Math.ceil(lockoutRemainingMs / 1000);

  useEffect(() => {
    if (step !== "pin" || !selectedProfile) {
      return;
    }
    const update = () => {
      setLockoutRemainingMs(getLockoutRemainingMs(selectedProfile.credential_id));
    };
    update();
    const timer = window.setInterval(update, LOCKOUT_TICK_MS);
    return () => window.clearInterval(timer);
  }, [step, selectedProfile, getLockoutRemainingMs]);

  const verifyKnownPin = useCallback(
    async (candidate: string) => {
      if (!selectedProfile) {
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        const result = await verifyPin(selectedProfile.credential_id, candidate);
        if (result.ok && result.profile) {
          setVerifiedProfile(result.profile);
          setPin("");
          setStep("session");
          return;
        }
        setPin("");
        if (result.reason === "locked") {
          setLockoutRemainingMs(result.remainingMs);
          setError(null);
        } else if (result.reason === "invalid_pin") {
          setError(PIN_COPY.invalidPin);
        } else {
          setError(PIN_COPY.verifyFailed);
        }
      } catch {
        setPin("");
        setError(PIN_COPY.verifyFailed);
      } finally {
        setSubmitting(false);
      }
    },
    [selectedProfile, verifyPin],
  );

  useEffect(() => {
    if (step !== "pin" || pin.length !== PIN_LENGTH || submitting || locked) {
      return;
    }
    void verifyKnownPin(pin);
  }, [step, pin, submitting, locked, verifyKnownPin]);

  function resetToScan(): void {
    setStep("scan");
    setSelectedProfile(null);
    setPin("");
    setError(null);
    setLockoutRemainingMs(0);
    setEnrollmentStage("create");
    setFirstPin("");
    setDisplayName("");
    setRole("astronaut");
    setUnknownBadgeId("");
    setVerifiedProfile(null);
  }

  function selectBadge(profile: AuthProfile): void {
    setSelectedProfile(profile);
    setStep("pin");
    setPin("");
    setError(null);
    setLockoutRemainingMs(getLockoutRemainingMs(profile.credential_id));
    setVerifiedProfile(null);
  }

  function selectUnknownBadge(): void {
    setUnknownBadgeId(createUnknownBadgeId());
    setEnrollmentStage("create");
    setFirstPin("");
    setPin("");
    setDisplayName("");
    setRole("astronaut");
    setError(null);
    setVerifiedProfile(null);
    setStep("enroll");
  }

  function pressDigit(digit: string): void {
    if (locked || submitting) {
      return;
    }
    setPin((current) => (current.length >= PIN_LENGTH ? current : current + digit));
  }

  function backspace(): void {
    if (locked || submitting) {
      return;
    }
    setPin((current) => current.slice(0, -1));
  }

  function clearPin(): void {
    if (locked || submitting) {
      return;
    }
    setPin("");
    setError(null);
  }

  function submitEnrollmentFirst(): void {
    if (!isValidPin(pin)) {
      setError(PIN_COPY.lengthError);
      return;
    }
    setFirstPin(pin);
    setPin("");
    setEnrollmentStage("confirm");
    setError(null);
  }

  async function submitEnrollmentConfirm(): Promise<void> {
    if (!isValidPin(pin)) {
      setError(PIN_COPY.lengthError);
      return;
    }
    if (pin !== firstPin) {
      setError(ENROLLMENT_COPY.mismatch);
      setEnrollmentStage("create");
      setFirstPin("");
      setPin("");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const profile = await enroll({
        credential_id: unknownBadgeId,
        pin: firstPin,
        display_name: displayName,
        role,
      });
      setVerifiedProfile(profile);
      setPin("");
      setStep("session");
    } catch {
      setError(ENROLLMENT_COPY.failed);
    } finally {
      setSubmitting(false);
    }
  }

  function chooseSessionMode(mode: SessionMode): void {
    if (!verifiedProfile) {
      return;
    }
    startSession(verifiedProfile.profile_id, mode);
  }

  return (
    <main className="orbita-gate">
      <div className="orbita-gate-card">
        <header className="orbita-gate-header">
          <div className="orbita-brand" aria-label="ORBITA">
            <OrbitaLogo size={44} />
            <span className="orbita-brand-copy">
              <span className="orbita-brand-name">ORBITA</span>
              <span className="orbita-brand-tagline">
                Onboard Remote Biometric &amp; Integrated Telemetry Assistant
              </span>
            </span>
          </div>
          <span className="orbita-gate-tag">{SCAN_COPY.gateTag}</span>
          {allowCancel && (
            <button className="gate-cancel" type="button" onClick={onCancel}>
              {SCAN_COPY.cancel}
            </button>
          )}
        </header>

        {step === "scan" && (
          <section className="gate-step" aria-labelledby="scan-title">
            <div className="nfc-pulse" aria-hidden="true">
              <span className="nfc-ring nfc-ring-1" />
              <span className="nfc-ring nfc-ring-2" />
              <span className="nfc-ring nfc-ring-3" />
              <span className="nfc-core">
                <Nfc size={28} strokeWidth={1.8} />
              </span>
            </div>
            <h1 id="scan-title" className="gate-title">
              {SCAN_COPY.title}
            </h1>
            <p className="gate-subtitle">{SCAN_COPY.subtitle}</p>

            <div className="badge-section">
              <p className="badge-section-label">{SCAN_COPY.demoBadges}</p>
              <div className="badge-list">
                {profiles.map((profile) => {
                  const summary = demoBadgeSummary(profile);
                  return (
                    <button
                      className="badge-button"
                      type="button"
                      key={profile.profile_id}
                      onClick={() => selectBadge(profile)}
                    >
                      <span className="badge-avatar" aria-hidden="true">
                        {initials(profile.display_name)}
                      </span>
                      <span className="badge-copy">
                        <span className="badge-name">{profile.display_name}</span>
                        <span className="badge-role">{summary.subtitle}</span>
                      </span>
                      <span className="badge-pin">{summary.pinLabel}</span>
                    </button>
                  );
                })}
              </div>
              <button className="badge-new" type="button" onClick={selectUnknownBadge}>
                {SCAN_COPY.newBadge}
              </button>
            </div>
          </section>
        )}

        {step === "pin" && selectedProfile && (
          <section className="gate-step" aria-labelledby="pin-title">
            <button className="gate-back" type="button" onClick={resetToScan}>
              <ChevronLeft size={16} aria-hidden="true" />
              {PIN_COPY.back}
            </button>
            <div className="recognized-profile">
              <span className="badge-avatar badge-avatar-large" aria-hidden="true">
                {initials(selectedProfile.display_name)}
              </span>
              <div>
                <h1 id="pin-title" className="gate-title gate-title-small">
                  {selectedProfile.display_name}
                </h1>
                <span className={`role-pill role-${selectedProfile.role}`}>
                  {ROLE_LABELS[selectedProfile.role]}
                </span>
              </div>
            </div>
            <p className="gate-subtitle">{PIN_COPY.title}</p>
            <PinDots value={pin} />
            {locked && (
              <p className="gate-lockout" role="alert" aria-live="assertive">
                {PIN_COPY.lockout(lockoutSeconds)}
              </p>
            )}
            {!locked && error && <p className="gate-error" role="alert">{error}</p>}
            <PinKeypad
              disabled={locked || submitting}
              onDigit={pressDigit}
              onBackspace={backspace}
              onClear={clearPin}
            />
          </section>
        )}

        {step === "enroll" && (
          <section className="gate-step" aria-labelledby="enroll-title">
            <button className="gate-back" type="button" onClick={resetToScan}>
              <ChevronLeft size={16} aria-hidden="true" />
              {PIN_COPY.back}
            </button>
            <span className="enroll-badge-tag">{unknownBadgeId}</span>
            <h1 id="enroll-title" className="gate-title gate-title-small">
              {enrollmentStage === "create"
                ? ENROLLMENT_COPY.createPrompt
                : ENROLLMENT_COPY.confirmPrompt}
            </h1>
            {enrollmentStage === "create" && (
              <div className="enroll-fields">
                <label className="enroll-field">
                  <span>{ENROLLMENT_COPY.displayNameLabel}</span>
                  <input
                    type="text"
                    value={displayName}
                    placeholder={ENROLLMENT_COPY.displayNamePlaceholder}
                    maxLength={DISPLAY_NAME_MAX_LENGTH}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                </label>
                <div className="enroll-role" role="group" aria-label={ENROLLMENT_COPY.roleLabel}>
                  {ROLE_OPTIONS.map((option) => (
                    <button
                      className={`enroll-role-option${role === option ? " is-selected" : ""}`}
                      type="button"
                      key={option}
                      aria-pressed={role === option}
                      onClick={() => setRole(option)}
                    >
                      {ROLE_LABELS[option]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <PinDots value={pin} />
            {error && <p className="gate-error" role="alert">{error}</p>}
            <PinKeypad
              disabled={submitting}
              onDigit={pressDigit}
              onBackspace={backspace}
              onClear={clearPin}
            />
            {enrollmentStage === "create" ? (
              <button
                className="gate-primary"
                type="button"
                disabled={pin.length !== PIN_LENGTH}
                onClick={submitEnrollmentFirst}
              >
                {ENROLLMENT_COPY.continueButton}
              </button>
            ) : (
              <button
                className="gate-primary"
                type="button"
                disabled={pin.length !== PIN_LENGTH || submitting}
                onClick={() => void submitEnrollmentConfirm()}
              >
                {submitting ? ENROLLMENT_COPY.creatingButton : ENROLLMENT_COPY.createButton}
              </button>
            )}
          </section>
        )}

        {step === "session" && verifiedProfile && (
          <section className="gate-step" aria-labelledby="session-title">
            <div className="recognized-profile">
              <span className="badge-avatar badge-avatar-large" aria-hidden="true">
                {initials(verifiedProfile.display_name)}
              </span>
              <div>
                <h1 id="session-title" className="gate-title gate-title-small">
                  {SESSION_COPY.question}
                </h1>
                <span className={`role-pill role-${verifiedProfile.role}`}>
                  {ROLE_LABELS[verifiedProfile.role]}
                </span>
              </div>
            </div>
            <p className="gate-subtitle">
              {SESSION_COPY.ephemeralSubtitle(verifiedProfile.display_name)}
            </p>
            <div className="session-choices">
              {SESSION_CHOICES.map((choice) => (
                <button
                  className="session-choice"
                  type="button"
                  key={choice.mode}
                  onClick={() => chooseSessionMode(choice.mode)}
                >
                  <span className="session-choice-label">{choice.label}</span>
                  <span className="session-choice-hint">{choice.hint}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default LoginScreen;
