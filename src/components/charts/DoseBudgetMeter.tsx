// Radiation dose budget meter (display only). Shows the accumulated dose against NASA's 600 mSv career
// limit and a simple projection to Mars arrival. It never changes a status colour — the Rules engine does.
import { motion } from "motion/react";
import type { RulesFile } from "../../rules/types";
import { CAREER_LIMIT_MSV, type DoseBudget } from "../../features/radiation/doseBudget";
import "./DoseBudgetMeter.css";

interface DoseBudgetMeterProps {
  budget: DoseBudget;
  rules: RulesFile;
}

function fmt(value: number, digits = 0): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: digits }).format(value);
}

/** Threshold ticks from rules.json (enabled accumulated-dose rules), so the meter matches the engine. */
function ruleTicks(rules: RulesFile): { value: number; level: "yellow" | "red" }[] {
  const indicator = rules.indicators.find((ind) => ind.id === "radiation_dose");
  if (!indicator) return [];
  return indicator.rules.flatMap((rule) =>
    rule.enabled &&
    rule.trigger.type === "threshold" &&
    rule.trigger.metric === "radiation_accumulated" &&
    typeof rule.trigger.value === "number"
      ? [{ value: rule.trigger.value, level: rule.level }]
      : [],
  );
}

function DoseBudgetMeter({ budget, rules }: DoseBudgetMeterProps) {
  const pct = (v: number) => `${Math.min(Math.max((v / CAREER_LIMIT_MSV) * 100, 0), 100)}%`;
  const projected = budget.projectedArrivalMsv;
  const ticks = ruleTicks(rules);

  return (
    <div className="dose-budget" aria-label="Radiation dose budget">
      <div className="dose-budget-head">
        <span className="dose-budget-title">Dose budget</span>
        <span className="dose-budget-value">
          <strong>{fmt(budget.todayMsv, 1)}</strong> / {CAREER_LIMIT_MSV} mSv · {fmt(budget.percentOfLimit)}%
        </span>
      </div>

      <div
        className="dose-meter"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={CAREER_LIMIT_MSV}
        aria-valuenow={budget.todayMsv}
        aria-valuetext={`${fmt(budget.todayMsv, 1)} of ${CAREER_LIMIT_MSV} mSv NASA career limit`}
      >
        {projected !== null && (
          <motion.span
            className="dose-meter-projected"
            initial={{ width: 0 }}
            animate={{ width: pct(projected) }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          />
        )}
        <motion.span
          className="dose-meter-fill"
          initial={{ width: 0 }}
          animate={{ width: pct(budget.todayMsv) }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
        {ticks.map((tick) => (
          <span
            key={`${tick.level}-${tick.value}`}
            className={`dose-meter-tick dose-tick-${tick.level}`}
            style={{ left: pct(tick.value) }}
            title={`${tick.level === "red" ? "Alert" : "Watch"} at ${tick.value} mSv (rules.json)`}
          />
        ))}
      </div>

      <dl className="dose-budget-rows">
        <div>
          <dt>
            <i className="dose-key dose-key-today" aria-hidden="true" /> Today (day {budget.arrivalDay - budget.daysLeft})
          </dt>
          <dd>{fmt(budget.todayMsv, 1)} mSv</dd>
        </div>
        {projected !== null && budget.projectedPercent !== null && (
          <div>
            <dt>
              <i className="dose-key dose-key-projected" aria-hidden="true" /> At Mars arrival (day {budget.arrivalDay})
            </dt>
            <dd>
              ≈ {fmt(projected)} mSv · {fmt(budget.projectedPercent)}%
            </dd>
          </div>
        )}
        {ticks.length > 0 && (
          <div>
            <dt>
              <i className="dose-key dose-key-tick" aria-hidden="true" /> Rule thresholds
            </dt>
            <dd>
              {ticks
                .slice()
                .sort((a, b) => a.value - b.value)
                .map((t) => `${t.level === "red" ? "Alert" : "Watch"} ${fmt(t.value)}`)
                .join(" · ")}{" "}
              mSv
            </dd>
          </div>
        )}
        {budget.rateMsvPerDay !== null && (
          <div>
            <dt>Current rate</dt>
            <dd>{fmt(budget.rateMsvPerDay, 1)} mSv/day</dd>
          </div>
        )}
      </dl>
      <p className="dose-budget-note">
        Reference: NASA career limit 600 mSv (NASA-STD-3001 Vol. 1 Rev. C). Projection assumes today's rate; a solar
        particle event can add much more. Status colour comes from the rules.
      </p>
    </div>
  );
}

export default DoseBudgetMeter;
