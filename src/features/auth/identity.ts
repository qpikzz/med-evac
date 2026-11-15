import { UNKNOWN_BADGE_BYTES } from "./constants";

export function initials(name: string): string {
  const parts = name
    .replace(/\(.*?\)/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const letters = parts
    .filter((part) => !part.endsWith("."))
    .map((part) => part[0]?.toUpperCase() ?? "");
  if (letters.length === 0) {
    return name.slice(0, 2).toUpperCase();
  }
  return letters.slice(0, 2).join("");
}

export function createUnknownBadgeId(): string {
  const bytes = new Uint8Array(UNKNOWN_BADGE_BYTES);
  globalThis.crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `orbita-nfc-demo-${hex}`;
}
