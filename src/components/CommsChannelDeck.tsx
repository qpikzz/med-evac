import { useId } from "react";
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
  const iconId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    <svg className="neural-core-emblem" viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <radialGradient id={`${iconId}-neural-aura`} cx="50%" cy="48%" r="58%">
          <stop offset="0" stopColor="#67e8f9" stopOpacity=".34" />
          <stop offset=".58" stopColor="#6366f1" stopOpacity=".12" />
          <stop offset="1" stopColor="#0b0f1a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${iconId}-neural-metal`} x1="7" y1="8" x2="33" y2="33">
          <stop stopColor="#a5f3fc" />
          <stop offset=".52" stopColor="#818cf8" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
        <radialGradient id={`${iconId}-neural-core`} cx="38%" cy="32%" r="70%">
          <stop stopColor="#ecfeff" />
          <stop offset=".35" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#6366f1" />
        </radialGradient>
        <filter id={`${iconId}-neural-glow`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.1" />
        </filter>
      </defs>
      <circle className="emblem-aura" cx="20" cy="20" r="19" fill={`url(#${iconId}-neural-aura)`} />
      <circle className="emblem-halo" cx="20" cy="20" r="15.5" />
      <ellipse
        className="emblem-orbit"
        cx="20"
        cy="20"
        rx="17"
        ry="7.5"
        transform="rotate(-38 20 20)"
        stroke={`url(#${iconId}-neural-metal)`}
      />
      <ellipse
        className="emblem-orbit-secondary"
        cx="20"
        cy="20"
        rx="12.5"
        ry="17"
        transform="rotate(24 20 20)"
      />
      <path
        className="emblem-circuit"
        d="M20 9v5m0 12v5M9 20h5m12 0h5m-18.2-7.8 3.6 3.6m7.2 8.4 3.6 3.6m0-15.6-3.6 3.6m-7.2 8.4-3.6 3.6"
        stroke={`url(#${iconId}-neural-metal)`}
      />
      <path
        className="emblem-core-halo"
        d="m20 13 6.1 3.5v7L20 27l-6.1-3.5v-7L20 13Z"
        fill="#67e8f9"
        filter={`url(#${iconId}-neural-glow)`}
      />
      <path
        className="emblem-core-shell"
        d="m20 13 6.1 3.5v7L20 27l-6.1-3.5v-7L20 13Z"
        fill={`url(#${iconId}-neural-metal)`}
      />
      <circle className="emblem-core-node" cx="20" cy="20" r="3.1" fill={`url(#${iconId}-neural-core)`} />
      <circle className="emblem-node" cx="20" cy="9" r="1.2" />
      <circle className="emblem-node" cx="31" cy="20" r="1.2" />
      <circle className="emblem-node" cx="20" cy="31" r="1.2" />
      <circle className="emblem-node" cx="9" cy="20" r="1.2" />
      <circle className="emblem-node-highlight" cx="31" cy="11" r="1" />
    </svg>
  );
}

function EarthLinkIcon() {
  const iconId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  return (
    <svg className="earth-telemetry-emblem" viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <radialGradient id={`${iconId}-earth-aura`} cx="42%" cy="62%" r="64%">
          <stop offset="0" stopColor="#34d399" stopOpacity=".28" />
          <stop offset=".55" stopColor="#38bdf8" stopOpacity=".13" />
          <stop offset="1" stopColor="#0b0f1a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${iconId}-earth-ocean`} x1="10" y1="12" x2="27" y2="31">
          <stop stopColor="#67e8f9" />
          <stop offset=".55" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id={`${iconId}-earth-land`} x1="11" y1="15" x2="25" y2="27">
          <stop stopColor="#a7f3d0" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
        <linearGradient id={`${iconId}-earth-orbit`} x1="5" y1="30" x2="34" y2="7">
          <stop stopColor="#34d399" />
          <stop offset=".52" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#a5b4fc" />
        </linearGradient>
        <filter id={`${iconId}-earth-glow`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <clipPath id={`${iconId}-earth-clip`}>
          <circle cx="17.5" cy="22" r="9.5" />
        </clipPath>
      </defs>
      <circle className="emblem-aura" cx="20" cy="20" r="19" fill={`url(#${iconId}-earth-aura)`} />
      <ellipse
        className="emblem-planet-orbit"
        cx="19"
        cy="21"
        rx="17"
        ry="8"
        transform="rotate(-31 19 21)"
        stroke={`url(#${iconId}-earth-orbit)`}
      />
      <circle className="emblem-planet-halo" cx="17.5" cy="22" r="10.8" />
      <circle
        className="emblem-planet"
        cx="17.5"
        cy="22"
        r="9.5"
        fill={`url(#${iconId}-earth-ocean)`}
      />
      <path
        className="emblem-continent"
        d="m12 16 3-1 1.8 1.1-.6 2.1-2 1.2-1.2 2.4-2.1-.8-.8-2.3Zm8.2 3.4 2.2-.8 2.2 1.4-.2 2.4 1.6 1.4-1.1 3.1-2.4 1.6-1.6-2 .8-2.5-1.8-1.2Z"
        fill={`url(#${iconId}-earth-land)`}
        clipPath={`url(#${iconId}-earth-clip)`}
      />
      <path className="emblem-earth-latitude" d="M9.3 22h16.4M11 17.5c4.1 2.1 9 2.1 13.1 0m-13.1 9c4.1-2.1 9-2.1 13.1 0" />
      <path className="emblem-horizon" d="M7.2 22a10.3 10.3 0 0 1 20.6 0" />
      <path className="emblem-uplink" d="M27.5 15.8a7.1 7.1 0 0 1 0 10.4m3-13.4a11.2 11.2 0 0 1 0 16.4" />
      <circle className="emblem-uplink-node" cx="28" cy="21" r="1.4" />
      <circle className="emblem-uplink-pulse" cx="33" cy="9" r="1.5" />
      <path className="emblem-uplink-beam" d="m27.5 18.8 4.5-8" />
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
