// Alert area: the most serious yellow/red indicator as a large card with its own animation on the right,
// every other alert as a compact row below. Text and levels come only from the Rules engine / rules.json.
import { AnimatePresence, motion } from "motion/react";
import type { EvaluationResult, RulesFile } from "../../rules/types";
import { IndicatorIcon } from "../indicatorIcons";
import AlertArt from "./AlertArt";
import { alertViews } from "./healthAlerts";
import "./HealthAlerts.css";

interface HealthAlertsProps {
  result: EvaluationResult | null;
  rules: RulesFile;
  onShowOnMap: (indicatorId: string) => void;
  onContactEarth: () => void;
}

const WORD = { yellow: "Watch", red: "Alert" } as const;
const MARK = { yellow: "!", red: "!!" } as const;

function HealthAlerts({ result, rules, onShowOnMap, onContactEarth }: HealthAlertsProps) {
  const views = alertViews(result, rules);
  if (views.length === 0) return null;
  const [primary, ...others] = views;

  return (
    <section className="health-alerts" aria-label="Health alerts">
      <AnimatePresence mode="wait">
        <motion.article
          key={primary.indicatorId}
          className={`alert-card alert-card-${primary.level}`}
          role="alert"
          aria-label={`${primary.label}: ${WORD[primary.level]}`}
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 24 }}
        >
          <div className="alert-card-body">
            <p className="alert-eyebrow">
              <span aria-hidden="true">{MARK[primary.level]}</span> {WORD[primary.level]} · {primary.label}
            </p>
            {primary.rules.map((rule, index) => (
              <motion.div
                key={rule.rule_id}
                className="alert-rule"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + index * 0.1 }}
              >
                <h3 className="alert-title">{rule.title}</h3>
                <p className="alert-text">{rule.explanation}</p>
                {rule.actions.length > 0 && (
                  <ul className="alert-actions">
                    {rule.actions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                )}
                {rule.recheck && <p className="alert-meta">Recheck: {rule.recheck}</p>}
              </motion.div>
            ))}
            {primary.reportedFlags.length > 0 && (
              <p className="alert-meta">You reported: {primary.reportedFlags.join(" · ")}</p>
            )}
            {primary.escalationText && <p className="alert-escalation">{primary.escalationText}</p>}
            <div className="alert-buttons">
              <button className="button button-secondary" type="button" onClick={() => onShowOnMap(primary.indicatorId)}>
                Show on body map
              </button>
              {primary.level === "red" && (
                <button className="button button-primary" type="button" onClick={onContactEarth}>
                  Contact Earth
                </button>
              )}
            </div>
          </div>
          <AlertArt indicatorId={primary.indicatorId} level={primary.level} />
        </motion.article>
      </AnimatePresence>

      {others.length > 0 && (
        <ul className="alert-others" aria-label="Other alerts">
          {others.map((view, index) => (
            <motion.li
              key={view.indicatorId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.06 }}
            >
              <button
                type="button"
                className={`alert-chip alert-chip-${view.level}`}
                onClick={() => onShowOnMap(view.indicatorId)}
                aria-label={`${view.label}: ${WORD[view.level]} — ${view.rules[0]?.title ?? ""}. Show on body map`}
              >
                <span className="alert-chip-icon">
                  <IndicatorIcon id={view.indicatorId} size={18} />
                </span>
                <span className="alert-chip-label">{view.label}</span>
                <span className="alert-chip-rule">{view.rules[0]?.title}</span>
                <span className="alert-chip-status">
                  <span aria-hidden="true">{MARK[view.level]}</span> {WORD[view.level]}
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default HealthAlerts;
