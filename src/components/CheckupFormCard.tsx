import { useMemo, useState, type FormEvent } from "react";
import syntheticHistory from "../data/synthetic_history.json";
import type { RawEntry } from "../features/input-check/inputCheck";
import { useAppState } from "../features/app-state/AppStateContext";
import type { MeasurementContext } from "../rules/types";

interface CheckupFormCardProps {
  onContactEarth: () => void;
  onSubmitted: () => void;
}

type FieldValues = Record<string, string>;

const EMPTY_VALUES: FieldValues = {};

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

function formatError(result: ReturnType<ReturnType<typeof useAppState>["validateCheckup"]>["results"][number]): string {
  if (result.ok) {
    return "";
  }
  if (result.code !== "out_of_range" || !result.range) {
    return result.message;
  }
  const { min, max, unit } = result.range;
  if (min !== null && max !== null) {
    return `${result.message} Expected ${min}–${max} ${unit}.`;
  }
  if (min !== null) {
    return `${result.message} Expected at least ${min} ${unit}.`;
  }
  if (max !== null) {
    return `${result.message} Expected at most ${max} ${unit}.`;
  }
  return result.message;
}

function CheckupFormCard({ onContactEarth, onSubmitted }: CheckupFormCardProps) {
  const { rules, today, readings, flagsToday, validateCheckup, submitCheckup } = useAppState();
  const [values, setValues] = useState<FieldValues>(() =>
    getTodayValues(rules.metrics, readings, today),
  );
  const [temperatureContext, setTemperatureContext] = useState<MeasurementContext>(() => {
    const reading = [...readings].reverse().find(
      (item) => item.date === today && item.metric === "body_temp",
    );
    return reading?.context ?? "rest";
  });
  const [selectedFlags, setSelectedFlags] = useState<string[]>(flagsToday);
  const [symptomSearch, setSymptomSearch] = useState("");
  const [freeText, setFreeText] = useState("");

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
    validation.results.filter((result) => !result.ok).map((result) => [result.metric, formatError(result)]),
  );

  function updateValue(metric: string, value: string): void {
    setValues((current) => ({ ...current, [metric]: value }));
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
    setSelectedFlags(syntheticHistory.day40_checkup.flags);
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
    </form>
  );
}

export default CheckupFormCard;
