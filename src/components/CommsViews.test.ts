import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import rulesJson from "../data/rules.json";
import { AppStateProvider } from "../features/app-state/AppStateContext";
import { AuthProvider } from "../features/auth/AuthContext";
import {
  loadEarthChatThread,
  type EarthTelemetrySnapshot,
} from "../features/earth-link/chat";
import { loadRules } from "../rules/loadRules";
import CommsChannelDeck from "./CommsChannelDeck";
import EarthLinkPanel, { cleanRuleSource, TelemetryDetails } from "./EarthLinkPanel";
import LocalAIChannel from "./LocalAIChannel";

const rules = loadRules(rulesJson);

describe("Comms views", () => {
  it("renders the Onboard SI assistant as a clean chat workspace", () => {
    const markup = renderToStaticMarkup(
      createElement(
        AuthProvider,
        null,
        createElement(
          AppStateProvider,
          null,
          createElement(LocalAIChannel, {
            onOpenCheckup: () => undefined,
            selectedContext: null,
          }),
        ),
      ),
    );

    expect(markup).toContain("Clinical Reasoning &amp; Overall Picture");
    expect(markup).toContain("Why is my heart rate yellow?");
    expect(markup).toContain("Deterministic rules set status and urgency; AI provides clinical context only.");
    expect(markup).not.toContain("AI explanation - not a diagnosis");
    expect(markup).not.toContain("SYNTHETIC");
  });

  it("renders the two-card channel deck and keeps local AI unavailable to ground operators", () => {
    const markup = renderToStaticMarkup(
      createElement(CommsChannelDeck, {
        activeChannel: "earth",
        canUseLocalAI: false,
        missionDay: 40,
        status: "yellow",
        earthActivity: "Unread reply",
        onSelect: () => undefined,
      }),
    );

    expect(markup).toContain("Onboard SI Assistant");
    expect(markup).toContain("Earth Mission Control");
    expect(markup).toContain("Day 40 · Yellow");
    expect(markup).toContain("Unread reply");
    expect(markup).toContain('disabled=""');
  });

  it("renders seeded Earth messages as plain chat bubbles without debug source annotations", () => {
    const astronautProfiles = [
      { profile_id: "astro-01", display_name: "Cmdr. Alex Vance" },
    ];
    const markup = renderToStaticMarkup(
      createElement(EarthLinkPanel, {
        side: "astronaut",
        astronautId: "astro-01",
        astronautName: "Cmdr. Alex Vance",
        astronautProfiles,
        thread: loadEarthChatThread("astro-01"),
        nowMs: Date.now(),
        rules,
        currentTelemetry: null,
        onSelectAstronaut: () => undefined,
        onSend: () => undefined,
      }),
    );

    expect(markup).toContain("Flight Surgeon (Houston)");
    expect(markup).toContain("Day 38 check-in complete");
    expect(markup).toContain("Check-up Telemetry");
    expect(markup).not.toContain("Draft ready for review and send");
    expect(markup).not.toContain("SYNTHETIC");
    expect(markup).not.toContain("[ANSWER:");
    expect(markup).toContain("<svg");
  });

  it("renders a Flight Surgeon thread and a clean, complete telemetry drawer", () => {
    const telemetry: EarthTelemetrySnapshot = {
      missionDate: "2026-11-14",
      missionDay: 40,
      overallStatus: "yellow",
      overallEscalation: "crew_medical_officer",
      indicators: [
        {
          id: "heart_rate",
          label: "Heart rate",
          status: "yellow",
          triggered: [
            {
              ruleId: "hr_y_baseline",
              level: "yellow",
              title: "Heart rate differs from your normal",
              source: "TABLE: Heart rate [ANSWER: Lana] - SOURCE PENDING (Ayesha)",
              explanation: "The reading is above the personal baseline.",
              actions: ["Recheck at rest."],
              recheck: "Next check-up",
            },
          ],
        },
      ],
      flags: [{ id: "fatigue", label: "Fatigue" }],
      recentReadings: [
        { date: "2026-11-14", metric: "heart_rate", value: 84, valid: true },
      ],
      astronautNote: "Slept less after maintenance.",
    };
    const groundMarkup = renderToStaticMarkup(
      createElement(EarthLinkPanel, {
        side: "earth",
        astronautId: "astro-01",
        astronautName: "Cmdr. Alex Vance",
        astronautProfiles: [
          { profile_id: "astro-01", display_name: "Cmdr. Alex Vance" },
          { profile_id: "astro-02", display_name: "Dr. Maya Lin" },
        ],
        thread: loadEarthChatThread("astro-01"),
        nowMs: Date.now(),
        rules,
        currentTelemetry: null,
        onSelectAstronaut: () => undefined,
        onSend: () => undefined,
      }),
    );
    const drawerMarkup = renderToStaticMarkup(
      createElement(TelemetryDetails, { telemetry, rules }),
    );

    expect(groundMarkup).toContain("Ground Operator console");
    expect(groundMarkup).toContain("Send Reply");
    expect(groundMarkup).toContain("Viewing crew");
    expect(drawerMarkup).toContain("Overall status: Yellow");
    expect(drawerMarkup).toContain("Escalation: Crew Medical Officer");
    expect(drawerMarkup).toContain("Fatigue");
    expect(drawerMarkup).toContain("Slept less after maintenance.");
    expect(drawerMarkup).toContain("Heart rate differs from your normal");
    expect(drawerMarkup).toContain("84 bpm");
    expect(drawerMarkup).not.toContain("[ANSWER:");
    expect(drawerMarkup).not.toContain("SOURCE PENDING");
  });

  it("cleans editorial annotations while preserving the readable source", () => {
    const source =
      "TABLE: Heart rate [ANSWER: Lana, 14 Nov] - SOURCE PENDING (Ayesha); 2 days";

    const cleaned = cleanRuleSource(source);

    expect(cleaned).toContain("TABLE: Heart rate");
    expect(cleaned).toContain("2 days");
    expect(cleaned).not.toContain("[ANSWER:");
    expect(cleaned).not.toContain("SOURCE PENDING");
  });
});
