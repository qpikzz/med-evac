import type { EarthMessage } from "./message";

export interface EarthLinkTransport {
  send(msg: EarthMessage): Promise<void>;
  onMessage(cb: (msg: EarthMessage) => void): () => void;
}

export function createInMemoryTransport(): EarthLinkTransport {
  const listeners = new Set<(msg: EarthMessage) => void>();

  return {
    async send(msg: EarthMessage): Promise<void> {
      for (const listener of [...listeners]) {
        listener(msg);
      }
    },

    onMessage(cb: (msg: EarthMessage) => void): () => void {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
}

const EVENT_NAME = "orbita:earth-link:message";

export function createTauriTransport(): EarthLinkTransport {
  const listeners = new Set<(msg: EarthMessage) => void>();
  let unlisten: (() => void) | null = null;
  let starting = false;

  async function start(): Promise<void> {
    if (starting || unlisten !== null) {
      return;
    }
    starting = true;
    try {
      const { listen } = await import("@tauri-apps/api/event");
      unlisten = await listen<EarthMessage>(EVENT_NAME, (event) => {
        for (const listener of [...listeners]) {
          listener(event.payload);
        }
      });
    } finally {
      starting = false;
    }
  }

  return {
    async send(msg: EarthMessage): Promise<void> {
      const { emit } = await import("@tauri-apps/api/event");
      await emit(EVENT_NAME, msg);
    },

    onMessage(cb: (msg: EarthMessage) => void): () => void {
      listeners.add(cb);
      void start();
      return () => {
        listeners.delete(cb);
        if (listeners.size === 0 && unlisten !== null) {
          unlisten();
          unlisten = null;
        }
      };
    },
  };
}
