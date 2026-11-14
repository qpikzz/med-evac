import { useState } from "react";
import { useAppState } from "../features/app-state/AppStateContext";
import type { TriggeredRule } from "../rules/types";
import CheckupFormCard from "./CheckupFormCard";
import IndicatorSparklineList from "./IndicatorSparklineList";
import InteractiveBody3DMap, { LayerSwitcher } from "./InteractiveBody3DMap";
import "../Dashboard.css";

interface MainDashboardProps {
  onContactEarth: () => void;
  onAskLocalAI: (indicatorLabel: string, rule?: TriggeredRule) => void;
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

function MainDashboard({ onContactEarth, onAskLocalAI }: MainDashboardProps) {
  const { evaluation, hasCheckup } = useAppState();
  const [editing, setEditing] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<"Skin" | "Muscles" | "Organs">("Organs");
  const showForm = !hasCheckup || editing;

  return (
    <main className="main-dashboard">
      {showForm ? (
        <CheckupFormCard
          onContactEarth={onContactEarth}
          onSubmitted={() => setEditing(false)}
        />
      ) : (
        <section className="checkup-complete-bar dashboard-card" aria-label="Check-up complete">
          <div className="complete-copy">
            <span className="complete-check" aria-hidden="true">✓</span>
            <p>Thank you for taking care of yourself!</p>
          </div>
          <button className="button button-secondary" type="button" onClick={() => setEditing(true)}>
            Edit Check-up
          </button>
        </section>
      )}

      {!hasCheckup ? (
        <section className="waiting-summary dashboard-card" aria-live="polite">
          <span className="waiting-icon" aria-hidden="true">◌</span>
          <p>Waiting for your daily check-up to generate your health summary.</p>
        </section>
      ) : (
        !editing && (
          <>
            <section className="status-summary-row" aria-label="Health summary">
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
            </section>

            <section className="dashboard-grid" aria-label="Health dashboard">
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
            </section>
          </>
        )
      )}
    </main>
  );
}

export default MainDashboard;
