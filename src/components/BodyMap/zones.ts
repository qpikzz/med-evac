// Body map zone config. Edit labels, hazards and hotspot positions here — no code changes needed.
// Coordinates are in the SVG viewBox "0 0 400 800" (x to the right, y down).

export type LayerId = "skin" | "muscles" | "organs" | "skeleton";
export type ZoneId =
  | "brain"
  | "heart"
  | "blood"
  | "immune"
  | "skin"
  | "radiation"
  | "muscles"
  | "musculoskeletal";

/** A point hotspot (circle) or a soft aura around the whole body. */
export type ZoneShape =
  | { kind: "point"; x: number; y: number; r: number }
  | { kind: "aura"; cx: number; cy: number; rx: number; ry: number };

export interface ZoneConfig {
  id: ZoneId;
  layer: LayerId;
  indicatorIds: string[];
  label: string;
  /** Short name used in aria-labels, e.g. "Heart". */
  shortLabel: string;
  hazard: string;
  /** Optional extra line shown in the tooltip and zone list. */
  note?: string;
  shape: ZoneShape;
}

export const LAYERS: { id: LayerId; label: string }[] = [
  { id: "skin", label: "Skin" },
  { id: "muscles", label: "Muscles" },
  { id: "organs", label: "Organs" },
  { id: "skeleton", label: "Skeleton" },
];

export const DEFAULT_LAYER: LayerId = "organs";

export const ZONES: ZoneConfig[] = [
  {
    id: "brain",
    layer: "organs",
    indicatorIds: ["sleep_hours", "mood"],
    label: "Brain · Sleep & mood",
    shortLabel: "Brain",
    hazard: "Isolation & confinement",
    shape: { kind: "point", x: 200, y: 72, r: 24 },
  },
  {
    id: "heart",
    layer: "organs",
    indicatorIds: ["heart_rate", "blood_pressure"],
    label: "Heart · Rate & pressure",
    shortLabel: "Heart",
    hazard: "Altered gravity (fluid shift)",
    shape: { kind: "point", x: 213, y: 250, r: 22 },
  },
  {
    id: "blood",
    layer: "organs",
    indicatorIds: ["blood_sugar"],
    label: "Pancreas & blood · Glucose",
    shortLabel: "Blood",
    hazard: "Hostile closed environment",
    shape: { kind: "point", x: 208, y: 344, r: 18 },
  },
  {
    id: "immune",
    layer: "organs",
    indicatorIds: ["immune_signs"],
    label: "Immune system · Spleen & lymph nodes",
    shortLabel: "Immune system",
    hazard: "Radiation, closed environment",
    shape: { kind: "point", x: 262, y: 308, r: 18 },
  },
  {
    id: "skin",
    layer: "skin",
    indicatorIds: ["skin_health", "body_temperature"],
    label: "Skin · Temperature",
    shortLabel: "Skin",
    hazard: "Hostile closed environment",
    shape: { kind: "point", x: 290, y: 340, r: 20 },
  },
  {
    id: "radiation",
    layer: "skin",
    indicatorIds: ["radiation_dose"],
    label: "Radiation dose (whole body)",
    shortLabel: "Radiation dose",
    hazard: "Space radiation",
    note: "Read your dosimeter at every check-up. Alerts come from radiation events you report and from the dose-rate and total-dose limits in the rules.",
    shape: { kind: "aura", cx: 200, cy: 400, rx: 168, ry: 388 },
  },
  {
    id: "muscles",
    layer: "muscles",
    indicatorIds: ["body_mass"],
    label: "Muscles · Body mass",
    shortLabel: "Muscles",
    hazard: "Altered gravity",
    shape: { kind: "point", x: 172, y: 500, r: 22 },
  },
  {
    id: "musculoskeletal",
    layer: "skeleton",
    indicatorIds: ["body_mass"],
    label: "Bones · Body mass",
    shortLabel: "Bones",
    hazard: "Altered gravity",
    shape: { kind: "point", x: 200, y: 418, r: 24 },
  },
];
