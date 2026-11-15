import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BodyMap from "./BodyMap";
import { mockDay40, mockRedHiddenLayer, mockRules, mockRulesRadiationMonitoringOnly } from "./mocks";
import { allLayerBadges, allZoneViews, monitoringOnlyIds, zoneAriaLabel } from "./status";

describe("BodyMap zone status", () => {
  it("AC1 Day 40: heart & brain yellow, others green, radiation monitoring only", () => {
    const views = allZoneViews(mockDay40, mockRulesRadiationMonitoringOnly);
    expect(views.heart.style).toBe("yellow");
    expect(views.brain.style).toBe("yellow");
    for (const id of ["blood", "immune", "skin", "musculoskeletal"] as const) {
      expect(views[id].style).toBe("green");
    }
    expect(views.radiation.style).toBe("monitoring");
  });

  it("AC2 red on hidden layer: immune red, Skin tab badge red", () => {
    const views = allZoneViews(mockRedHiddenLayer, mockRules);
    expect(views.immune.style).toBe("red");
    const badges = allLayerBadges(views);
    expect(badges.skin).toBe("red");
    expect(badges.organs).toBe("red");
    expect(badges.skeleton).toBe("green");
  });

  it("AC5 no result: every zone no_data (monitoring stays monitoring)", () => {
    const views = allZoneViews(null, mockRules);
    for (const view of Object.values(views)) {
      expect(view.style).toBe("no_data");
    }
  });

  it("uses the real rules.json literally: radiation_dose has enabled flag rules, so it is not monitoring-only", () => {
    expect(monitoringOnlyIds(mockRules).has("radiation_dose")).toBe(false);
    expect(monitoringOnlyIds(mockRulesRadiationMonitoringOnly).has("radiation_dose")).toBe(true);
  });

  it("aria-label reads status word and the engine's escalation text", () => {
    const views = allZoneViews(mockDay40, mockRulesRadiationMonitoringOnly);
    expect(zoneAriaLabel(views.heart, mockRules)).toBe("Heart: Watch — tell your crew medical officer");
  });
});

describe("BodyMap render", () => {
  it("renders caption and neutral zones with no result, and placeholder art without asset files", () => {
    const html = renderToStaticMarkup(
      createElement(BodyMap, { result: null, rules: mockRules, onSelect: () => {} }),
    );
    expect(html).toContain("No check-up yet today");
    expect(html).toContain("bm-art-placeholder");
    expect(html).not.toContain("bm-style-green");
  });

  it("shows status words, not colour only", () => {
    const html = renderToStaticMarkup(
      createElement(BodyMap, {
        result: mockDay40,
        rules: mockRulesRadiationMonitoringOnly,
        onSelect: () => {},
      }),
    );
    for (const word of ["Watch", "OK", "Monitoring"]) expect(html).toContain(word);
    expect(html).toContain("Monitoring only — limits are set by mission flight surgeons.");
    expect(html).not.toMatch(/https?:\/\//);
  });
});
