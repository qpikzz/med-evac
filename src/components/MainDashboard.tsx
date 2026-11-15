import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAppState } from "../features/app-state/AppStateContext";
import type { TriggeredRule } from "../rules/types";
import CheckupFormCard from "./CheckupFormCard";
import IndicatorSparklineList from "./IndicatorSparklineList";
import InteractiveBody3DMap, { LayerSwitcher } from "./InteractiveBody3DMap";
import RadiationAlert from "./RadiationAlert/RadiationAlert";
import "../Dashboard.css";

interface MainDashboardProps {
  onContactEarth: () => void;
  onAskLocalAI: (indicatorLabel: string, rule?: TriggeredRule) => void;
  openCheckupToken: number;
}

function displayStatus(status: string): string {
  switch (status) {
    case "green":
      return "Green";
    case "yellow":
      return "Yellow";
    case "red":
      return "Red";
    default:
      return "No Data";
  }
}

function displayEscalation(escalation: string | null): string {
  switch (escalation) {
    case "self":
      return "Self";
    case "crew_medical_officer":
      return "Crew Medical Officer";
    case "ground_flight_surgeon":
      return "Flight Surgeon on Earth";
    default:
      return "No Data";
  }
}

function MainDashboard({
  onContactEarth,
  onAskLocalAI,
  openCheckupToken,
}: MainDashboardProps) {
  const { evaluation, hasCheckup, rules } = useAppState();
  const [editing, setEditing] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<"Skin" | "Muscles" | "Organs">("Organs");
  const showForm = !hasCheckup || editing;

  function showRadiationOnMap(): void {
    setSelectedIndicator("radiation_dose");
    document.querySelector(".body-map")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  useEffect(() => {
    if (openCheckupToken > 0) {
      setEditing(true);
    }
  }, [openCheckupToken]);

  return (
    <main className="main-dashboard">
      <AnimatePresence mode="wait" initial={false}>
        {showForm ? (
          <motion.div
            key="checkup-form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.15 } }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <CheckupFormCard
              onContactEarth={onContactEarth}
              onSubmitted={() => setEditing(false)}
            />
          </motion.div>
        ) : (
          <motion.section
            key="checkup-complete"
            className="checkup-complete-bar dashboard-card"
            aria-label="Check-up complete"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="complete-copy">
              <motion.span
                className="complete-check"
                aria-hidden="true"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
              >
                ✓
              </motion.span>
              <p>Thank you for taking care of yourself!</p>
            </div>
            <div className="complete-actions">
              <button className="button button-secondary" type="button" onClick={onContactEarth}>
                Contact Earth
              </button>
              <button className="button button-secondary" type="button" onClick={() => setEditing(true)}>
                Edit Check-up
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {!hasCheckup ? (
        <section className="waiting-summary dashboard-card" aria-live="polite">
          <span className="waiting-icon" aria-hidden="true">◌</span>
          <p>Waiting for your daily check-up to generate your health summary.</p>
        </section>
      ) : (
        !editing && (
          <>
            <RadiationAlert
              result={evaluation}
              rules={rules}
              onShowOnMap={showRadiationOnMap}
              onContactEarth={onContactEarth}
            />
            <motion.section
              className="status-summary-row"
              aria-label="Health summary"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
            >
              <article className={`status-summary-card dashboard-card status-${evaluation.overall_status}`}>
                <p className="summary-label">Overall Status</p>
                <div className="summary-value">
                  <span className={`status-badge status-badge-${evaluation.overall_status}`}>
                    {displayStatus(evaluation.overall_status)}
                  </span>
                </div>
                <p className="summary-description">
                  {evaluation.overall_status === "no_data"
                    ? "No measurement data is available today."
                    : evaluation.overall_status === "green"
                      ? "Your check-up is within the current rules."
                      : "Review the indicators that need attention."}
                </p>
              </article>
              <article className={`status-summary-card dashboard-card status-${evaluation.overall_status}`}>
                <p className="summary-label">Escalation Level</p>
                <div className="summary-value escalation-value">
                  {displayEscalation(evaluation.overall_escalation)}
                </div>
                <p className="summary-description">
                  {evaluation.overall_escalation === "self"
                    ? "Continue your usual routine."
                    : evaluation.overall_escalation === "crew_medical_officer"
                      ? "Share this check-up with your crew medical officer."
                      : evaluation.overall_escalation === "ground_flight_surgeon"
                        ? "Contact your crew medical officer and the flight surgeon on Earth."
                        : "No escalation level is available."}
                </p>
              </article>
            </motion.section>

            <motion.section
              className="dashboard-grid"
              aria-label="Health dashboard"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.12 }}
            >
              <IndicatorSparklineList
                selectedIndicator={selectedIndicator}
                onSelectIndicator={setSelectedIndicator}
                onAskLocalAI={onAskLocalAI}
              />
              <InteractiveBody3DMap
                indicators={evaluation.indicators}
                selectedIndicator={selectedIndicator}
                activeLayer={activeLayer}
                onSelectIndicator={(indicatorId) => setSelectedIndicator(indicatorId)}
              />
              <LayerSwitcher activeLayer={activeLayer} onLayerChange={setActiveLayer} />
            </motion.section>
          </>
        )
      )}
    </main>
  );
}

export default MainDashboard;
