import { WEBAUTHN_TIMEOUT_MS } from "./constants";

export type WebAuthnOutcome =
  | { status: "ok" }
  | { status: "cancelled" }
  | { status: "unavailable"; message: string };

function randomChallenge(): ArrayBuffer {
  const challenge = new ArrayBuffer(32);
  globalThis.crypto.getRandomValues(new Uint8Array(challenge));
  return challenge;
}

export function isWebAuthnAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.credentials?.get === "function" &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

export async function requestPlatformCredential(): Promise<WebAuthnOutcome> {
  if (!isWebAuthnAvailable()) {
    return {
      status: "unavailable",
      message: "Windows Hello / WebAuthn is unavailable on this terminal. Use a demo badge below.",
    };
  }

  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge(),
        timeout: WEBAUTHN_TIMEOUT_MS,
        userVerification: "required",
      },
    });
    if (!credential) {
      return { status: "cancelled" };
    }
    return { status: "ok" };
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "Error";
    if (name === "NotAllowedError" || name === "AbortError") {
      return { status: "cancelled" };
    }
    return {
      status: "unavailable",
      message: "The platform authenticator could not complete the request. Use a demo badge below.",
    };
  }
}
