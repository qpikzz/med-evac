import { describe, expect, it } from "vitest";
import { crewAvatarVariantForProfile } from "./CrewAvatar";

describe("crewAvatarVariantForProfile", () => {
  it("uses the assigned variants for the seeded crew profiles", () => {
    expect(crewAvatarVariantForProfile("astro-01")).toBe("commander");
    expect(crewAvatarVariantForProfile("astro-02")).toBe("medical");
    expect(crewAvatarVariantForProfile("ground-01")).toBe("ground");
  });

  it("maps custom profile IDs deterministically to an avatar variant", () => {
    const profileId = "astro-03";
    const first = crewAvatarVariantForProfile(profileId);

    expect(crewAvatarVariantForProfile(profileId)).toBe(first);
    expect(["commander", "medical", "ground"]).toContain(first);
  });
});
