// Body map zone config. Edit labels, hazards and hotspot positions here — no code changes needed.
// Coordinates are in the SVG viewBox "0 0 400 800" (x to the right, y down).

export type LayerId = "skin" | "organs" | "skeleton";
export type ZoneId =
  | "brain"
  | "heart"
  | "blood"
  | "immune"
  | "skin"
  | "radiation"
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
  shape: ZoneShape;
}

export const LAYERS: { id: LayerId; label: string }[] = [
  { id: "skin", label: "Skin" },
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
    shape: { kind: "point", x: 200, y: 82, r: 34 },
  },
  {
    id: "heart",
    layer: "organs",
    indicatorIds: ["heart_rate", "blood_pressure"],
    label: "Heart · Rate & pressure",
    shortLabel: "Heart",
    hazard: "Altered gravity (fluid shift)",
    shape: { kind: "point", x: 214, y: 250, r: 28 },
  },
  {
    id: "blood",
    layer: "organs",
    indicatorIds: ["blood_sugar"],
    label: "Blood · Glucose",
    shortLabel: "Blood",
    hazard: "Hostile closed environment",
    shape: { kind: "point", x: 112, y: 330, r: 24 },
  },
  {
    id: "immune",
    layer: "organs",
    indicatorIds: ["immune_signs"],
    label: "Immune system",
    shortLabel: "Immune system",
    hazard: "Radiation, closed environment",
    shape: { kind: "point", x: 190, y: 345, r: 26 },
  },
  {
    id: "skin",
    layer: "skin",
    indicatorIds: ["skin_health", "body_temperature"],
    label: "Skin · Temperature",
    shortLabel: "Skin",
    hazard: "Hostile closed environment",
    shape: { kind: "point", x: 286, y: 330, r: 26 },
  },
  {
    id: "radiation",
    layer: "skin",
    indicatorIds: ["radiation_dose"],
    label: "Radiation dose (whole body)",
    shortLabel: "Radiation dose",
    hazard: "Space radiation",
    shape: { kind: "aura", cx: 200, cy: 400, rx: 168, ry: 388 },
  },
  {
    id: "musculoskeletal",
    layer: "skeleton",
    indicatorIds: ["body_mass"],
    label: "Bones & muscle · Body mass",
    shortLabel: "Bones & muscle",
    hazard: "Altered gravity",
    shape: { kind: "point", x: 200, y: 420, r: 30 },
  },
];
