// Large animated illustration for an alert card — one per indicator. Decorative (aria-hidden):
// the card's text carries the meaning. CSS animations, off with prefers-reduced-motion.
import { INDICATOR_ICONS } from "../indicatorIcons";
import { HeartPulse } from "lucide-react";

const MOTION: Record<string, string> = {
  heart_rate: "art-beat",
  blood_pressure: "art-sway",
  blood_sugar: "art-drip",
  body_temperature: "art-rise",
  sleep_hours: "art-float",
  mood: "art-float",
  body_mass: "art-sway",
  immune_signs: "art-pulse",
  radiation_dose: "art-spin",
  skin_health: "art-pulse",
};

function Extras({ id }: { id: string }) {
  if (id === "heart_rate" || id === "blood_pressure") {
    return (
      <polyline
        className="art-ecg"
        points="20,250 90,250 108,224 126,272 146,196 164,262 182,250 280,250"
        fill="none"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    );
  }
  if (id === "sleep_hours") {
    return (
      <g className="art-sparkles">
        <circle cx="60" cy="70" r="4" />
        <circle cx="240" cy="60" r="3" />
        <circle cx="250" cy="200" r="4" />
        <circle cx="50" cy="210" r="3" />
        <text x="215" y="110" className="art-zzz">z</text>
        <text x="235" y="85" className="art-zzz art-zzz2">z</text>
      </g>
    );
  }
  if (id === "blood_sugar") {
    return <circle className="art-drop" cx="150" cy="215" r="7" />;
  }
  return (
    <g className="art-particles">
      <circle cx="58" cy="90" r="4" />
      <circle cx="244" cy="80" r="3" />
      <circle cx="236" cy="220" r="4" />
      <circle cx="62" cy="214" r="3" />
    </g>
  );
}

function AlertArt({ indicatorId, level }: { indicatorId: string; level: "yellow" | "red" }) {
  const Icon = INDICATOR_ICONS[indicatorId] ?? HeartPulse;
  const motion = MOTION[indicatorId] ?? "art-pulse";
  return (
    <div className={`alert-art alert-art-${level}`} aria-hidden="true">
      <svg viewBox="0 0 300 300" className="alert-art-svg">
        <defs>
          <radialGradient id={`art-halo-${indicatorId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle className="art-halo" cx="150" cy="150" r="130" fill={`url(#art-halo-${indicatorId})`} />
        <circle className="art-ring" cx="150" cy="150" r="80" />
        <circle className="art-ring art-ring-2" cx="150" cy="150" r="80" />
        <circle className="art-ring art-ring-3" cx="150" cy="150" r="80" />
        <circle className="art-orbit" cx="150" cy="150" r="118" />
        <Extras id={indicatorId} />
      </svg>
      <div className={`alert-art-icon ${motion}`}>
        <Icon size={112} strokeWidth={1.6} />
      </div>
    </div>
  );
}

export default AlertArt;
