import { PIN_LENGTH, PIN_SALT_BYTES } from "./constants";

const PIN_PATTERN = new RegExp(`^\\d{${PIN_LENGTH}}$`);
const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function isValidPin(pin: string): boolean {
  return PIN_PATTERN.test(pin);
}

export function randomSalt(byteLength: number = PIN_SALT_BYTES): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const payload = encoder.encode(`${salt}:${pin}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", payload);
  return bytesToHex(new Uint8Array(digest));
}

export async function verifyPinHash(
  pin: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const candidate = await hashPin(pin, salt);
  return constantTimeEqual(candidate, expectedHash);
}
