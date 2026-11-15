import { useMemo, useState, type FormEvent } from "react";
import syntheticHistory from "../data/synthetic_history.json";
import type { RawEntry } from "../features/input-check/inputCheck";
import { useAppState } from "../features/app-state/AppStateContext";
import type { MeasurementContext, RulesFile } from "../rules/types";
import SymptomNotesComposer from "./SymptomNotesComposer";

interface CheckupFormCardProps {
  onContactEarth: () => void;
  onSubmitted: () => void;
}

type FieldValues = Record<string, string>;
export type UnitSystem = "metric" | "imperial";

const EMPTY_VALUES: FieldValues = {};
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
  const radiationMetrics = rules.metrics.filter((metric) => metric.indicator_id === "radiation_dose");
  const otherMetrics = rules.metrics.filter((metric) => metric.indicator_id !== "radiation_dose");
  const radiationFlags = rules.flags.filter((flag) => flag.indicator_ids.includes("radiation_dose"));
  const filteredFlags = rules.flags.filter((flag) =>
    flag.label.toLowerCase().includes(symptomSearch.trim().toLowerCase()),
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

  function loadDay40Demo(): void {
    const demoValues: FieldValues = { ...EMPTY_VALUES };
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
    setClinicalNotes("");
  }

  function renderMetricField(metric: (typeof rules.metrics)[number]) {
    const error = errors.get(metric.id);
    const isTemperature = metric.id === "body_temp";
    return (
      <div className="metric-field" key={metric.id}>
        <label htmlFor={`metric-${metric.id}`}>{metric.label}</label>
        {isTemperature && (
          <div className="segmented-control context-toggle" aria-label="Temperature context">
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
        )}
        <div className="input-with-unit">
          <input
            id={`metric-${metric.id}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={values[metric.id] ?? ""}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `error-${metric.id}` : undefined}
            onChange={(event) => updateValue(metric.id, event.currentTarget.value)}
          />
          <span>{metric.unit}</span>
        </div>
        {error && (
          <p className="field-error" id={`error-${metric.id}`} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const result = submitCheckup(entries, selectedFlags);
    if (result.allOk) {
      onSubmitted();
    }
  }

  return (
    <form className="checkup-card dashboard-card" onSubmit={handleSubmit} noValidate>
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Daily check-up</p>
          <h2>How are you feeling today?</h2>
        </div>
        <span className="synthetic-badge">Synthetic data</span>
      </div>

      <div className="checkup-grid">
        <section className="metric-form-column" aria-label="Measurements">
          <h3>Measurements</h3>
          <div className="metric-input-grid">
            {otherMetrics.map(renderMetricField)}
          </div>

          {radiationMetrics.length > 0 && (
            <section className="radiation-check" aria-label="Radiation check">
              <div className="radiation-check-heading">
                <h3>Radiation check</h3>
                <p>
                  Read your personal dosimeter. Dose limits are set by mission flight surgeons; any
                  radiation event you mark here is checked by the rules.
                </p>
              </div>
              <div className="metric-input-grid">{radiationMetrics.map(renderMetricField)}</div>
              <div className="radiation-flag-list" aria-label="Radiation events">
                {radiationFlags.map((flag) => {
                  const selected = selectedFlags.includes(flag.id);
                  return (
                    <button
                      className={`symptom-pill radiation-pill${selected ? " is-selected" : ""}`}
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
          )}
        </section>

        <section className="symptoms-column" aria-label="Symptoms and notes">
          <div className="symptom-heading">
            <div>
              <h3>Symptoms and events</h3>
              <p>Select any that apply. You can choose more than one.</p>
            </div>
            <span className="selection-count">{selectedFlags.length} selected</span>
          </div>
          <label className="visually-hidden" htmlFor="symptom-search">Search symptoms and events</label>
          <input
            className="symptom-search"
            id="symptom-search"
            type="search"
            placeholder="Search symptoms and events"
            value={symptomSearch}
            onChange={(event) => setSymptomSearch(event.currentTarget.value)}
          />
          <div className="symptom-pill-list">
            {filteredFlags.map((flag) => {
              const selected = selectedFlags.includes(flag.id);
              return (
                <button
                  className={`symptom-pill${selected ? " is-selected" : ""}`}
                  type="button"
                  key={flag.id}
                  aria-pressed={selected}
                  onClick={() => toggleFlag(flag.id)}
                >
                  {flag.label}
                </button>
              );
            })}
            {filteredFlags.length === 0 && <p className="empty-search">No matching symptoms or events.</p>}
          </div>
          <label className="notes-label" htmlFor="checkup-notes">Anything else?</label>
          <textarea
            id="checkup-notes"
            rows={4}
            placeholder="Tell us if anything else is bothering you..."
            value={freeText}
            onChange={(event) => setFreeText(event.currentTarget.value)}
          />
        </section>
      </div>

        <div className="form-actions">
          <div className="secondary-actions">
            <button className="button button-secondary" type="button" onClick={onContactEarth}>
              Contact Earth
            </button>
            {import.meta.env.DEV && (
              <button className="button button-quiet" type="button" onClick={loadDay40Demo}>
                Fill day-40 check-up
              </button>
            )}
          </div>
          <button className="button button-primary" type="submit" disabled={!validation.allOk}>
            Submit Check-up
          </button>
        </div>
      </div>
    </form>
  );
}

export default CheckupFormCard;
