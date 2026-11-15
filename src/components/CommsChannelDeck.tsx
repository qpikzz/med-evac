import type { Status } from "../rules/types";

export type CommsChannel = "local" | "earth";

interface CommsChannelDeckProps {
  activeChannel: CommsChannel;
  canUseLocalAI: boolean;
  missionDay: number;
  status: Status;
  earthActivity: string;
  onSelect: (channel: CommsChannel) => void;
}

function displayStatus(status: Status): string {
  return status === "no_data"
    ? "No Data"
    : `${status[0].toUpperCase()}${status.slice(1)}`;
}

function NeuralCoreIcon() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 4.5 31.7 11v18L20 35.5 8.3 29V11L20 4.5Z" />
      <path d="M20 11.5v17M12.6 15.8l14.8 8.4m0-8.4-14.8 8.4" />
      <circle cx="20" cy="20" r="4.3" />
      <circle cx="20" cy="11.5" r="1.4" />
      <circle cx="12.6" cy="15.8" r="1.4" />
      <circle cx="27.4" cy="15.8" r="1.4" />
      <circle cx="12.6" cy="24.2" r="1.4" />
      <circle cx="27.4" cy="24.2" r="1.4" />
      <circle cx="20" cy="28.5" r="1.4" />
    </svg>
  );
}

function EarthLinkIcon() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="19" cy="20" r="9.5" />
      <path d="M10.3 16h6l3.1-5.2m8.6 10.1 4.7 1.8-2.2 5.7-5-1.6m-15-6.2-4.1 2.2 2.4 4.5 4-1.4" />
      <path d="M15.2 12.6c1.4 1.8 2.1 4.1 2.1 7.4s-.7 5.6-2.1 7.4m7.6-14.8c-1.4 1.8-2.1 4.1-2.1 7.4s.7 5.6 2.1 7.4M9.8 20h18.4" />
      <path d="m27.7 8.1 4.4 2.5-2.5 4.4m-1.9-6.9-4.2 7.3" />
      <circle cx="31.8" cy="7.5" r="1.5" />
    </svg>
  );
}

function CommsChannelDeck({
  activeChannel,
  canUseLocalAI,
  missionDay,
  status,
  earthActivity,
  onSelect,
}: CommsChannelDeckProps) {
  return (
    <nav className="comms-channel-deck" aria-label="Communication channel">
      <button
        className={`comms-channel-card${activeChannel === "local" ? " is-active" : ""}`}
        type="button"
        aria-pressed={activeChannel === "local"}
        disabled={!canUseLocalAI}
        onClick={() => onSelect("local")}
      >
        <span className="comms-channel-icon"><NeuralCoreIcon /></span>
        <span className="comms-channel-card-copy">
          <span className="comms-channel-title">Onboard SI Assistant</span>
          <span className="comms-channel-subtitle">Local Neural Engine · granite3.3:8b</span>
          <span className="comms-channel-metadata">
            <span className="comms-status-pill comms-status-online">Instant · 0 ms · Offline</span>
            <span className="comms-triage-pill" data-status={status}>
              Day {missionDay} · {displayStatus(status)}
            </span>
          </span>
          {!canUseLocalAI && <span className="comms-channel-unavailable">Crew-side channel</span>}
        </span>
      </button>
      <button
        className={`comms-channel-card${activeChannel === "earth" ? " is-active" : ""}`}
        type="button"
        aria-pressed={activeChannel === "earth"}
        onClick={() => onSelect("earth")}
      >
        <span className="comms-channel-icon earth-channel-icon"><EarthLinkIcon /></span>
        <span className="comms-channel-card-copy">
          <span className="comms-channel-title">Earth Mission Control</span>
          <span className="comms-channel-subtitle">Flight Surgeon · Houston MCC</span>
          <span className="comms-channel-metadata">
            <span className="comms-status-pill">Async Link · ~20 min one-way (×60 demo)</span>
            <span className="comms-thread-indicator">{earthActivity}</span>
          </span>
        </span>
      </button>
    </nav>
  );
}

export default CommsChannelDeck;
