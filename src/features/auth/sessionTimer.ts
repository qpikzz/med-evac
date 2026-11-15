import { EPHEMERAL_TIMEOUT_MS } from "./constants";

export interface InactivityTimer {
  start(): void;
  poke(): void;
  stop(): void;
  isActive(): boolean;
}

export function createInactivityTimer(
  onTimeout: () => void,
  timeoutMs: number = EPHEMERAL_TIMEOUT_MS,
): InactivityTimer {
  let handle: ReturnType<typeof setTimeout> | null = null;
  let active = false;

  function clear(): void {
    if (handle !== null) {
      clearTimeout(handle);
      handle = null;
    }
  }

  function poke(): void {
    if (!active) {
      return;
    }
    clear();
    handle = setTimeout(() => {
      handle = null;
      if (!active) {
        return;
      }
      active = false;
      onTimeout();
    }, timeoutMs);
  }

  return {
    start() {
      if (!active) {
        active = true;
      }
      poke();
    },
    poke,
    stop() {
      active = false;
      clear();
    },
    isActive() {
      return active;
    },
  };
}
