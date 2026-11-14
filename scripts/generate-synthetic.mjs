import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MISSION_DAY1 = "2026-10-06";
const PREFLIGHT_START = "2026-09-22";
const DEMO_DATE = "2026-11-14";

const METRIC_ORDER = [
  "heart_rate",
  "bp_systolic",
  "bp_diastolic",
  "glucose",
  "body_temp",
  "sleep_hours",
  "mood",
  "body_mass",
  "skin_symptom_score",
];

const PREFLIGHT_PATTERNS = {
  heart_rate: [62, 63, 61, 62, 63, 61, 62],
  bp_systolic: [115, 117, 113, 115, 116, 114, 115],
  bp_diastolic: [75, 76, 74, 75, 77, 73, 75],
  mood: [8, 8, 7, 8, 8, 7, 8],
  body_mass: [70.0, 70.2, 69.8, 70.0, 70.1, 69.9, 70.0],
};

const MISSION_PATTERNS = {
  heart_rate: [63, 64, 62, 63, 64, 62, 63],
  bp_systolic: [116, 118, 114, 116, 117, 115, 116],
  bp_diastolic: [76, 77, 75, 76, 78, 74, 76],
  glucose: [92, 95, 90, 94, 97, 91, 93],
  body_temp: [36.8, 36.9, 36.7, 36.8, 37.0, 36.8, 36.9],
  sleep_hours: [7.5, 7.0, 8.0, 7.5, 7.5, 7.0, 8.0],
  mood: [8, 7, 7, 8, 7, 7, 8],
  skin_symptom_score: [1, 0, 1, 1, 0, 1, 0],
};

const OVERRIDES = {
  heart_rate: { 39: 76, 40: 80 },
  sleep_hours: { 34: 7.0, 35: 6.5, 36: 6.5, 37: 7.0, 38: 6.5, 39: 6.0, 40: 6.5 },
  mood: { 37: 6, 38: 6, 39: 6, 40: 6 },
};

function addDays(date, delta) {
  const [year, month, day] = date.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day) + delta * 86_400_000;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function missionValue(metric, day) {
  const override = OVERRIDES[metric];
  if (override && Object.prototype.hasOwnProperty.call(override, day)) {
    return override[day];
  }
  if (metric === "body_mass") {
    return (700 - Math.floor((day - 1) / 4)) / 10;
  }
  return MISSION_PATTERNS[metric][(day - 1) % 7];
}

function reading(date, metric, value) {
  return { date, metric, value, context: "rest", valid: true };
}

function preflightReadings() {
  const readings = [];
  const metrics = METRIC_ORDER.filter((metric) => metric in PREFLIGHT_PATTERNS);
  for (let index = 0; index < 7; index += 1) {
    const date = addDays(PREFLIGHT_START, index);
    for (const metric of metrics) {
      readings.push(reading(date, metric, PREFLIGHT_PATTERNS[metric][index]));
    }
  }
  return readings;
}

function missionReadings(day) {
  const date = addDays(MISSION_DAY1, day - 1);
  return METRIC_ORDER.map((metric) => reading(date, metric, missionValue(metric, day)));
}

export function buildSyntheticDataset() {
  const historyReadings = [];
  const flagsByDate = {};

  for (let day = 1; day <= 39; day += 1) {
    historyReadings.push(...missionReadings(day));
    flagsByDate[addDays(MISSION_DAY1, day - 1)] = [];
  }

  return {
    synthetic: true,
    label: "SYNTHETIC DATA - fictional astronaut. Not real medical data.",
    schema_version: "1.0",
    generator: "scripts/generate-synthetic.mjs",
    astronaut: { id: "SYN-01", display_name: "Astronaut A (synthetic)" },
    mission: { name: "Mars transit (synthetic)", day1_date: MISSION_DAY1, demo_day: 40 },
    preflight: { readings: preflightReadings() },
    history: { readings: historyReadings, flags_by_date: flagsByDate },
    day40_checkup: {
      date: DEMO_DATE,
      readings: missionReadings(40),
      flags: [],
      demo_invalid_entry: { metric: "heart_rate", raw: "920" },
    },
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const target = join(__dirname, "..", "src", "data", "synthetic_history.json");
  writeFileSync(target, JSON.stringify(buildSyntheticDataset(), null, 2) + "\n", "utf8");
}
