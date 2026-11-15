// One small, simple icon per indicator (lucide-react, ISC). Decoration only — status is shown as text too.
import {
  Droplet,
  Gauge,
  Hand,
  HeartPulse,
  Moon,
  Radiation,
  Scale,
  ShieldPlus,
  Smile,
  Thermometer,
  type LucideIcon,
} from "lucide-react";

export const INDICATOR_ICONS: Record<string, LucideIcon> = {
  blood_pressure: Gauge,
  heart_rate: HeartPulse,
  blood_sugar: Droplet,
  body_temperature: Thermometer,
  sleep_hours: Moon,
  mood: Smile,
  body_mass: Scale,
  immune_signs: ShieldPlus,
  radiation_dose: Radiation,
  skin_health: Hand,
};

export function IndicatorIcon({ id, size = 20 }: { id: string; size?: number }) {
  const Icon = INDICATOR_ICONS[id] ?? HeartPulse;
  return <Icon size={size} strokeWidth={2} aria-hidden="true" />;
}
