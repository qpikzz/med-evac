import { useMemo, useState, type FormEvent } from "react";
import type { RawEntry } from "../features/input-check/inputCheck";
import { useAppState } from "../features/app-state/AppStateContext";
import type { MeasurementContext, RulesFile } from "../rules/types";
import SymptomNotesComposer from "./SymptomNotesComposer";
import syntheticHistory from "../data/synthetic_history.json";

interface CheckupFormCardProps {
  onContactEarth: () => void;
  onSubmitted: () => void;
}

type FieldValues = Record<string, string>;
export type UnitSystem = "metric" | "imperial";

const UNIT_SYSTEM_STORAGE_KEY = "orbita_unit_system";

function getStoredUnitSystem(): UnitSystem {
  if (typeof globalThis.localStorage === "undefined") {
    return "metric";
  }
  return globalThis.localStorage.getItem(UNIT_SYSTEM_STORAGE_KEY) === "imperial"
    ? "imperial"
    : "metric";
}

function normalizeNumericInput(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^[+-]?\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatOneDecimal(value: number): string {
  return value.toFixed(1);
}

export function getDisplayedMetricValue(
  metricId: string,
  canonicalValue: string,
  unitSystem: UnitSystem,
): string {
  const numeric = normalizeNumericInput(canonicalValue);
  if (numeric === null) {
    return canonicalValue;
  }
  if (unitSystem === "metric") {
    return metricId === "body_temp" || metricId === "body_mass"
      ? formatOneDecimal(numeric)
      : canonicalValue;
  }
  if (metricId === "body_temp") {
    return formatOneDecimal((numeric * 9) / 5 + 32);
  }
  if (metricId === "body_mass") {
    return formatOneDecimal(numeric * 2.20462);
  }
  return canonicalValue;
}

export function getCanonicalMetricValue(
  metricId: string,
  displayedValue: string,
  unitSystem: UnitSystem,
): string {
  const numeric = normalizeNumericInput(displayedValue);
  if (numeric === null || unitSystem === "metric") {
    return displayedValue;
  }
  if (metricId === "body_temp") {
    return String(Number((((numeric - 32) * 5) / 9).toFixed(3)));
  }
  if (metricId === "body_mass") {
    return String(Number((numeric / 2.20462).toFixed(3)));
  }
  return displayedValue;
}

export function getDisplayedMetricUnit(
  metricId: string,
  canonicalUnit: string,
  unitSystem: UnitSystem,
): string {
  if (unitSystem === "imperial" && metricId === "body_temp") {
    return "°F";
  }
  if (unitSystem === "imperial" && metricId === "body_mass") {
    return "lbs";
  }
  return canonicalUnit;
}

function getTodayValues(metrics: ReturnType<typeof useAppState>["rules"]["metrics"],
  readings: ReturnType<typeof useAppState>["readings"],
  today: string,
): FieldValues {
  const values: FieldValues = {};
  for (const reading of readings) {
    if (reading.date === today) {
      values[reading.metric] = String(reading.value);
    }
  }
  for (const metric of metrics) {
    values[metric.id] ??= "";
  }
  return values;
}

function formatError(
  result: ReturnType<ReturnType<typeof useAppState>["validateCheckup"]>["results"][number],
  unitSystem: UnitSystem,
): string {
  if (result.ok) {
    return "";
  }
  if (result.code !== "out_of_range" || !result.range) {
    return result.message;
  }
  const { min, max } = result.range;
  const unit = getDisplayedMetricUnit(result.metric, result.range.unit, unitSystem);
  const displayBound = (value: number): string =>
    getDisplayedMetricValue(result.metric, String(value), unitSystem);
  const displayMin = min === null ? null : displayBound(min);
  const displayMax = max === null ? null : displayBound(max);
  if (min !== null && max !== null) {
    return `${result.message} Expected ${displayMin}–${displayMax} ${unit}.`;
  }
  if (min !== null) {
    return `${result.message} Expected at least ${displayMin} ${unit}.`;
  }
  if (max !== null) {
    return `${result.message} Expected at most ${displayMax} ${unit}.`;
  }
  return result.message;
}

export type ThresholdFeedback = "elevated" | "alert";

function compareThreshold(value: number, op: "<" | "<=" | ">" | ">=", threshold: number): boolean {
  switch (op) {
    case "<":
      return value < threshold;
    case "<=":
      return value <= threshold;
    case ">":
      return value > threshold;
    case ">=":
      return value >= threshold;
  }
}

export function getThresholdFeedback(
  rules: RulesFile,
  metricId: string,
  raw: string,
  context: MeasurementContext,
  selectedFlags: string[],
): ThresholdFeedback | null {
  const normalized = raw.trim().replace(",", ".");
  if (!/^[+-]?\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return null;
  }

  const matchesActiveThreshold = rules.indicators
    .flatMap((indicator) => indicator.rules)
    .filter((rule) => {
      const trigger = rule.trigger;
      if (
        !rule.enabled ||
        trigger.type !== "threshold" ||
        trigger.metric !== metricId ||
        trigger.value === null ||
        (trigger.context !== undefined && trigger.context !== context)
      ) {
        return false;
      }
      if (
        rule.requires_flags.length > 0 &&
        !rule.requires_flags.some((flag) => selectedFlags.includes(flag))
      ) {
        return false;
      }
      return compareThreshold(value, trigger.op, trigger.value);
    });

  return matchesActiveThreshold.some((rule) => rule.level === "red")
    ? "alert"
    : matchesActiveThreshold.length > 0
      ? "elevated"
      : null;
}

function ThresholdPill({ feedback }: { feedback: ThresholdFeedback | null }) {
  return (
    <span
      className={`threshold-pill${feedback ? ` is-${feedback}` : " is-empty"}`}
      aria-hidden={!feedback}
    >
      {feedback === "alert" ? "Alert" : "Elevated"}
    </span>
  );
}

function CheckupFormCard({ onContactEarth, onSubmitted }: CheckupFormCardProps) {
  const {
    rules,
    today,
    readings,
    flagsToday,
    store,
    validateCheckup,
    submitCheckup,
  } = useAppState();
  const [values, setValues] = useState<FieldValues>(() =>
    getTodayValues(rules.metrics, readings, today),
  );
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(getStoredUnitSystem);
  const [displayDrafts, setDisplayDrafts] = useState<FieldValues>({});
  const [temperatureContext, setTemperatureContext] = useState<MeasurementContext>(() => {
    const reading = [...readings].reverse().find(
      (item) => item.date === today && item.metric === "body_temp",
    );
    return reading?.context ?? "rest";
  });
  const [selectedFlags, setSelectedFlags] = useState<string[]>(flagsToday);
  const [clinicalNotes, setClinicalNotes] = useState(() => store.getNotes(today));

  const entries = useMemo<RawEntry[]>(
    () =>
      rules.metrics.map((metric) => ({
        metric: metric.id,
        raw: values[metric.id] ?? "",
        ...(metric.id === "body_temp" ? { context: temperatureContext } : {}),
      })),
    [rules.metrics, temperatureContext, values],
  );
  const validation = useMemo(
    () => validateCheckup(entries),
    [entries, validateCheckup],
  );
  const errors = new Map(
    validation.results
      .filter((result) => !result.ok)
      .map((result) => [result.metric, formatError(result, unitSystem)]),
  );
  const metricById = useMemo(
    () => new Map(rules.metrics.map((metric) => [metric.id, metric])),
    [rules.metrics],
  );

  function updateValue(metric: string, value: string): void {
    setValues((current) => ({ ...current, [metric]: value }));
  }

  function updateDisplayedValue(metric: string, displayedValue: string): void {
    setDisplayDrafts((current) => ({ ...current, [metric]: displayedValue }));
    updateValue(metric, getCanonicalMetricValue(metric, displayedValue, unitSystem));
  }

  function changeUnitSystem(nextUnitSystem: UnitSystem): void {
    if (typeof globalThis.localStorage !== "undefined") {
      globalThis.localStorage.setItem(UNIT_SYSTEM_STORAGE_KEY, nextUnitSystem);
    }
    setDisplayDrafts({});
    setUnitSystem(nextUnitSystem);
  }

  function feedbackFor(metricId: string, context: MeasurementContext = "rest") {
    if (errors.has(metricId)) {
      return null;
    }
    return getThresholdFeedback(
      rules,
      metricId,
      values[metricId] ?? "",
      context,
      selectedFlags,
    );
  }

  function renderMetricField(metricId: string) {
    const metric = metricById.get(metricId);
    if (!metric) {
      return null;
    }
    const error = errors.get(metricId);
    const feedback = feedbackFor(
      metricId,
      metricId === "body_temp" ? temperatureContext : "rest",
    );
    const displayedValue =
      displayDrafts[metricId] ??
      getDisplayedMetricValue(metricId, values[metricId] ?? "", unitSystem);
    return (
      <div className="metric-field" key={metricId}>
        <div className="metric-label-row">
          <label htmlFor={`metric-${metricId}`}>{metric.label}</label>
          <ThresholdPill feedback={feedback} />
        </div>
        <div className={`metric-input-shell${feedback ? ` is-${feedback}` : ""}`}>
          <input
            id={`metric-${metricId}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={displayedValue}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `error-${metricId}` : undefined}
            onChange={(event) =>
              metricId === "body_mass"
                ? updateDisplayedValue(metricId, event.currentTarget.value)
                : updateValue(metricId, event.currentTarget.value)
            }
          />
          <span className="metric-unit">
            {getDisplayedMetricUnit(metricId, metric.unit, unitSystem)}
          </span>
        </div>
        {error && (
          <p className="field-error" id={`error-${metricId}`} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  function renderBloodPressureField() {
    const systolicError = errors.get("bp_systolic");
    const diastolicError = errors.get("bp_diastolic");
    const systolicFeedback = feedbackFor("bp_systolic");
    const diastolicFeedback = feedbackFor("bp_diastolic");
    const feedback =
      systolicError || diastolicError
        ? null
        : systolicFeedback === "alert" || diastolicFeedback === "alert"
          ? "alert"
          : systolicFeedback || diastolicFeedback;
    return (
      <div className="metric-field metric-field-wide">
        <div className="metric-label-row">
          <span className="metric-field-title">Blood pressure</span>
          <ThresholdPill feedback={feedback} />
        </div>
        <div
          className={[
            "bp-input-shell",
            systolicError || diastolicError ? "has-error" : "",
            feedback ? `is-${feedback}` : "",
          ].filter(Boolean).join(" ")}
        >
          <label className="visually-hidden" htmlFor="metric-bp_systolic">
            Systolic blood pressure
          </label>
          <input
            id="metric-bp_systolic"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={values.bp_systolic ?? ""}
            aria-invalid={Boolean(systolicError)}
            aria-describedby={systolicError ? "error-bp_systolic" : undefined}
            onChange={(event) => updateValue("bp_systolic", event.currentTarget.value)}
          />
          <span className="bp-separator" aria-hidden="true">/</span>
          <label className="visually-hidden" htmlFor="metric-bp_diastolic">
            Diastolic blood pressure
          </label>
          <input
            id="metric-bp_diastolic"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={values.bp_diastolic ?? ""}
            aria-invalid={Boolean(diastolicError)}
            aria-describedby={diastolicError ? "error-bp_diastolic" : undefined}
            onChange={(event) => updateValue("bp_diastolic", event.currentTarget.value)}
          />
          <span className="metric-unit">mmHg</span>
        </div>
        {systolicError && (
          <p className="field-error" id="error-bp_systolic" role="alert">
            Systolic: {systolicError}
          </p>
        )}
        {diastolicError && (
          <p className="field-error" id="error-bp_diastolic" role="alert">
            Diastolic: {diastolicError}
          </p>
        )}
      </div>
    );
  }

  function renderTemperatureField() {
    const metric = metricById.get("body_temp");
    if (!metric) {
      return null;
    }
    const error = errors.get(metric.id);
    const feedback = feedbackFor(metric.id, temperatureContext);
    const displayedValue =
      displayDrafts[metric.id] ??
      getDisplayedMetricValue(metric.id, values[metric.id] ?? "", unitSystem);
    return (
      <div className="metric-field">
        <div className="metric-label-row">
          <label htmlFor="metric-body_temp">{metric.label}</label>
          <ThresholdPill feedback={feedback} />
        </div>
        <div className="temperature-control-row">
          <div className={`metric-input-shell${feedback ? ` is-${feedback}` : ""}`}>
            <input
              id="metric-body_temp"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={displayedValue}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "error-body_temp" : undefined}
              onChange={(event) => updateDisplayedValue(metric.id, event.currentTarget.value)}
            />
            <span className="metric-unit">
              {getDisplayedMetricUnit(metric.id, metric.unit, unitSystem)}
            </span>
          </div>
          <div className="segmented-control context-toggle" role="group" aria-label="Temperature context">
            {(["rest", "exercise"] as const).map((context) => (
              <button
                key={context}
                className={temperatureContext === context ? "is-selected" : ""}
                type="button"
                aria-pressed={temperatureContext === context}
                onClick={() => setTemperatureContext(context)}
              >
                {context === "rest" ? "Rest" : "Exercise"}
              </button>
            ))}
          </div>
        </div>
        {error && (
          <p className="field-error" id="error-body_temp" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  function renderScoreField(metricId: string) {
    const metric = metricById.get(metricId);
    if (!metric) {
      return null;
    }
    const value = values[metricId] ?? "";
    const parsedSliderValue = Number(value);
    const sliderValue = value === "" || !Number.isFinite(parsedSliderValue)
      ? 0
      : Math.min(10, Math.max(0, parsedSliderValue));
    const error = errors.get(metricId);
    return (
      <div className="score-field">
        <div className="metric-label-row">
          <span className="metric-field-title">{metric.label}</span>
          <output className="score-readout" aria-live="polite">
            {value === "" ? "—" : value} <span>/ 10</span>
          </output>
        </div>
        <div className="score-slider">
          <span aria-hidden="true">0</span>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={sliderValue}
            aria-label={`${metric.label}, 0 to 10`}
            aria-valuetext={value === "" ? "Not selected" : `${value} out of 10`}
            aria-describedby={error ? `error-${metricId}` : undefined}
            onChange={(event) => updateValue(metricId, event.currentTarget.value)}
            style={{
              background: `linear-gradient(to right, var(--accent) ${sliderValue * 10}%, var(--surface-2) ${sliderValue * 10}%)`,
            }}
          />
          <span aria-hidden="true">10</span>
        </div>
        {error && (
          <p className="field-error" id={`error-${metricId}`} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  function toggleFlag(flagId: string): void {
    setSelectedFlags((current) =>
      current.includes(flagId)
        ? current.filter((selected) => selected !== flagId)
        : [...current, flagId],
    );
  }

  // Demo helper (synthetic data): fill the scripted Day-40 values from synthetic_history.json.
  function loadDay40Demo(): void {
    const demoValues: FieldValues = {};
    for (const reading of syntheticHistory.day40_checkup.readings) {
      demoValues[reading.metric] = String(reading.value);
      if (reading.metric === "body_temp") {
        setTemperatureContext(reading.context === "exercise" ? "exercise" : "rest");
      }
    }
    for (const metric of rules.metrics) {
      demoValues[metric.id] ??= "";
    }
    setValues(demoValues);
    setDisplayDrafts({});
    setSelectedFlags(syntheticHistory.day40_checkup.flags);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const result = submitCheckup(entries, selectedFlags, clinicalNotes);
    if (result.allOk) {
      onSubmitted();
    }
  }

  return (
    <form className="checkup-form" onSubmit={handleSubmit} noValidate>
      <div className="checkup-content">
        <div className="section-heading">
          <div>
            <p className="section-eyebrow">Daily check-up</p>
            <h2>How are you feeling today?</h2>
          </div>
          <div className="unit-system-toggle" role="group" aria-label="Display units">
            <button
              type="button"
              aria-pressed={unitSystem === "metric"}
              className={unitSystem === "metric" ? "is-selected" : ""}
              onClick={() => changeUnitSystem("metric")}
            >
              Metric (°C, kg)
            </button>
            <button
              type="button"
              aria-pressed={unitSystem === "imperial"}
              className={unitSystem === "imperial" ? "is-selected" : ""}
              onClick={() => changeUnitSystem("imperial")}
            >
              Imperial (°F, lbs)
            </button>
          </div>
        </div>
    <section className="metric-form-column" aria-label="Measurements">
          <h3>Measurements</h3>
          <div className="measurement-groups">
            <section className="measurement-group" aria-labelledby="vitals-heading">
              <h4 id="vitals-heading">Vitals</h4>
              {renderBloodPressureField()}
              <div className="vitals-row">
                {renderMetricField("heart_rate")}
                {renderTemperatureField()}
                {renderMetricField("glucose")}
              </div>
            </section>

            <section className="measurement-group" aria-labelledby="recovery-heading">
              <h4 id="recovery-heading">Recovery &amp; Wellbeing</h4>
              <div className="measurement-row">
                {renderMetricField("sleep_hours")}
                {renderMetricField("body_mass")}
              </div>
              <div className="measurement-row">
                {renderScoreField("mood")}
                {renderScoreField("skin_symptom_score")}
              </div>
            </section>

            <section className="measurement-group" aria-labelledby="radiation-heading">
              <h4 id="radiation-heading">Radiation telemetry</h4>
              <p className="radiation-hint">
                Read your personal dosimeter every day. The rules check the dose rate, your total dose
                and any radiation event you mark here.
              </p>
              <div className="radiation-strip">
                {renderMetricField("radiation_dose_rate")}
                {renderMetricField("radiation_accumulated")}
              </div>
              <div className="radiation-flag-list" role="group" aria-label="Radiation events">
                {rules.flags
                  .filter((flag) => flag.indicator_ids.includes("radiation_dose"))
                  .map((flag) => {
                    const selected = selectedFlags.includes(flag.id);
                    return (
                      <button
                        className={`symptom-quick-pick radiation-pill${selected ? " is-selected" : ""}`}
                        type="button"
                        key={flag.id}
                        aria-pressed={selected}
                        onClick={() => toggleFlag(flag.id)}
                      >
                        {flag.label}
                      </button>
                    );
                  })}
              </div>
            </section>
          </div>
        </section>

        <div className="composer-divider">
          <SymptomNotesComposer
            flags={rules.flags}
            selectedFlags={selectedFlags}
            onToggleFlag={toggleFlag}
            notes={clinicalNotes}
            onNotesChange={setClinicalNotes}
          />
        </div>

      <div className="form-actions">
        <div className="secondary-actions">
          <button
            className="button contact-earth-button"
            type="button"
            onClick={onContactEarth}
          >
            <svg className="earth-horizon" viewBox="0 0 72 72" aria-hidden="true">
              <defs>
                <radialGradient id="earth-ocean" cx="35%" cy="30%" r="75%">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#1D4ED8" />
                </radialGradient>
                <filter id="earth-atmosphere" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="2.2" />
                </filter>
                <clipPath id="earth-sphere">
                  <circle cx="37" cy="39" r="29" />
                </clipPath>
              </defs>
              <circle
                cx="37"
                cy="39"
                r="30"
                fill="none"
                stroke="#38BDF8"
                strokeOpacity="0.8"
                strokeWidth="3"
                filter="url(#earth-atmosphere)"
              />
              <circle cx="37" cy="39" r="29" fill="url(#earth-ocean)" />
              <g clipPath="url(#earth-sphere)" fill="#22C55E">
                <path d="M12 27 19 24 24 17 31 16 34 21 31 25 34 30 29 34 28 41 23 43 21 51 15 48 13 40 9 36Z" />
                <path d="m31 43 6-3 6 3 2 7-4 5-2 9-5-3-2-9-4-4Z" />
                <path d="m42 19 7-3 8 3 5 7-4 5-7-2-3 4-5-3-5-6Z" />
                <path d="m50 37 8-2 6 4-2 7-6 2-4 8-5-5 2-7-4-3Z" />
              </g>
              <circle
                cx="37"
                cy="39"
                r="28.5"
                fill="none"
                stroke="#38BDF8"
                strokeOpacity="0.9"
                strokeWidth="1.2"
              />
            </svg>
            <span className="contact-starfield" aria-hidden="true">
              <span className="contact-star" />
              <span className="contact-star" />
              <span className="contact-star" />
              <span className="contact-star" />
              <span className="contact-star" />
              <span className="contact-star" />
              <span className="contact-star" />
              <span className="contact-star" />
              <span className="contact-star" />
              <span className="contact-star" />
              <span className="contact-star" />
              <span className="contact-star" />
            </span>
            <span className="contact-earth-label">Contact Earth</span>
          </button>
          <button className="button button-quiet demo-fill-button" type="button" onClick={loadDay40Demo}>
            Load Day-40 demo values
          </button>
        </div>
        <button
          className="button button-primary checkup-submit-button"
          type="submit"
          disabled={!validation.allOk}
        >
          Submit Check-up
        </button>
      </div>
      </div>
    </form>
  );
}

export default CheckupFormCard;
