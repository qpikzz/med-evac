// Animated radiation warning. Shows only what the Rules engine triggered — never decides a level itself.
import { motion, useReducedMotion } from "motion/react";
import type { EvaluationResult, RulesFile } from "../../rules/types";
import { radiationAlertView } from "./radiationAlert";
import "./RadiationAlert.css";

interface RadiationAlertProps {
  result: EvaluationResult | null;
  rules: RulesFile;
  onShowOnMap: () => void;
  onContactEarth: () => void;
}

// Radiation trefoil: three 60° blades around a centre dot.
function bladePath(startDeg: number): string {
  const r1 = 5;
  const r2 = 15;
  const a1 = (startDeg * Math.PI) / 180;
  const a2 = ((startDeg + 60) * Math.PI) / 180;
  const p = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  return `M ${p(r1, a1)} L ${p(r2, a1)} A ${r2} ${r2} 0 0 1 ${p(r2, a2)} L ${p(r1, a2)} A ${r1} ${r1} 0 0 0 ${p(r1, a1)} Z`;
}

function Trefoil() {
  return (
    <svg className="rad-trefoil" viewBox="-18 -18 36 36" aria-hidden="true">
      {[-120, 0, 120].map((deg) => (
        <path key={deg} d={bladePath(deg - 30)} />
      ))}
      <circle r="3" />
    </svg>
  );
}

function RadiationAlert({ result, rules, onShowOnMap, onContactEarth }: RadiationAlertProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const view = radiationAlertView(result, rules);
  if (!view) return null;

  const pulse = view.level === "red" ? 1.2 : 2.4;

  return (
    <motion.section
      className={`rad-alert rad-alert-${view.level}`}
      role="alert"
      aria-label={`${view.heading}: ${view.level === "red" ? "Alert" : "Watch"}`}
      initial={{ opacity: 0, y: -16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <div className="rad-icon-wrap" aria-hidden="true">
        {!reduceMotion &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="rad-ring"
              initial={{ scale: 0.6, opacity: 0.7 }}
              animate={{ scale: 2.1, opacity: 0 }}
              transition={{ duration: pulse * 1.2, repeat: Infinity, delay: (i * pulse) / 2.5, ease: "easeOut" }}
            />
          ))}
        <motion.div
          className="rad-icon"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: view.level === "red" ? 6 : 12, repeat: Infinity, ease: "linear" }}
        >
          <Trefoil />
        </motion.div>
      </div>

      <div className="rad-body">
        <p className="rad-eyebrow">
          <span aria-hidden="true">{view.level === "red" ? "!!" : "!"}</span>{" "}
          {view.heading} · {view.level === "red" ? "Alert" : "Watch"}
        </p>
        {view.rules.map((rule, index) => (
          <motion.div
            key={rule.rule_id}
            className="rad-rule"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + index * 0.1 }}
          >
            <h3 className="rad-title">{rule.title}</h3>
            <p className="rad-text">{rule.explanation}</p>
            {rule.actions.length > 0 && (
              <ul className="rad-actions">
                {rule.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            )}
            {rule.recheck && <p className="rad-recheck">Recheck: {rule.recheck}</p>}
          </motion.div>
        ))}
        {view.reportedFlags.length > 0 && (
          <p className="rad-meta">You reported: {view.reportedFlags.join(" · ")}</p>
        )}
        {view.escalationText && <p className="rad-escalation">{view.escalationText}</p>}
        <div className="rad-buttons">
          <button className="button button-secondary" type="button" onClick={onShowOnMap}>
            Show on body map
          </button>
          {view.level === "red" && (
            <button className="button button-primary" type="button" onClick={onContactEarth}>
              Contact Earth
            </button>
          )}
        </div>
      </div>
    </motion.section>
  );
}

export default RadiationAlert;
