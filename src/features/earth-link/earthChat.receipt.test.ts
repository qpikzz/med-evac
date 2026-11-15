import { describe, expect, it } from "vitest";
import { buildEarthDraftText, createAutoReceipt, createEarthChatMessage, pendingReceipts } from "./chat";

describe("Earth link: automatic receipt and red draft (audit 15 Nov 2026)", () => {
  const sent = createEarthChatMessage({
    id: "astro-01-1000-4", astronautId: "astro-01", sender: "astronaut",
    text: "Irregular heartbeat", missionDay: 40, createdAtMs: 1000,
  });

  it("no receipt while in transit; one receipt after arrival; none twice", () => {
    expect(pendingReceipts([sent], sent.arrivesAtMs - 1)).toEqual([]);
    const due = pendingReceipts([sent], sent.arrivesAtMs);
    expect(due.map((m) => m.id)).toEqual([sent.id]);
    const receipt = createAutoReceipt(sent);
    expect(receipt.sender).toBe("flight_surgeon");
    expect(receipt.createdAtMs).toBe(sent.arrivesAtMs);
    expect(receipt.arrivesAtMs).toBeGreaterThan(sent.arrivesAtMs);
    expect(pendingReceipts([sent, receipt], receipt.arrivesAtMs)).toEqual([]);
  });

  it("a real reply from the flight surgeon makes the receipt unnecessary", () => {
    const reply = createEarthChatMessage({
      id: "reply", astronautId: "astro-01", sender: "flight_surgeon", text: "On it", missionDay: 40, createdAtMs: 2000,
    });
    expect(pendingReceipts([sent, reply], sent.arrivesAtMs)).toEqual([]);
  });

  it("draft lists red before yellow with the rule titles", () => {
    const text = buildEarthDraftText(
      {
        overall_status: "red",
        indicators: [
          { indicator_id: "sleep_hours", status: "yellow", triggered: [{ title: "Not enough sleep this week", level: "yellow" }] },
          { indicator_id: "heart_rate", status: "red", triggered: [{ title: "Irregular heartbeat", level: "red" }] },
          { indicator_id: "mood", status: "green", triggered: [] },
        ],
      },
      { heart_rate: "Heart rate", sleep_hours: "Sleep" },
      40,
    );
    const lines = text.split("\n");
    expect(lines[0]).toBe("Day 40 check-up — overall RED.");
    expect(lines[1]).toMatch(/^RED · Heart rate: Irregular heartbeat/);
    expect(lines[2]).toMatch(/^YELLOW · Sleep/);
    expect(text).not.toMatch(/Mood/);
  });
});
