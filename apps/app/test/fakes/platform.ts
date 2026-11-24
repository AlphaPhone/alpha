// spec/app/platform/index.md, "Story: Talk to the resident agent"; spec/app/platform/index.md, "Story: Be told when to try again"; spec/app/platform/feed.md, "Story: Follow what my agent does on my screen"
import { type Faked, rejection } from "./phone.ts";
import { type Route, feed } from "./routes.ts";

/** What the fake agent holds for the platform's journeys: the live events it publishes, and who is listening. */
export interface PlatformScene {
  /** The open feeds of the agent's events, each with the topic and screen it was opened for. */
  readonly listening: Set<{ readonly topic: string; readonly clientId: string | null; readonly send: (data: unknown) => void }>;
  /** What the earlier Alpha kept in its connection plugin's encrypted slots, by slot. */
  readonly earlier: Map<string, string>;
}

export function platformScene(): PlatformScene {
  return { listening: new Set(), earlier: new Map() };
}

/**
 * `AlphaConnectionPlugin.java` of the earlier Alpha, which the APK keeps for its encrypted slots: `secureRead` answers
 * `{ value }`, null for an empty slot, and `secureCompareExchange` replaces a slot only while it holds `expectedValue`.
 */
export function alphaConnection(scene: PlatformScene): Faked {
  return () => ({
    secureRead: ({ slot }: { slot: string }) => Promise.resolve({ value: scene.earlier.get(slot) ?? null }),
    secureCompareExchange({ slot, expectedValue, value }: { slot: string; expectedValue: string; value: string | null }) {
      if (typeof slot !== "string") return Promise.reject(rejection("Secure draft update failed"));
      if (scene.earlier.get(slot) !== expectedValue) return Promise.resolve({ status: "conflict" });
      if (value === null) scene.earlier.delete(slot);
      else scene.earlier.set(slot, value);
      return Promise.resolve({ status: "saved" });
    },
  });
}

/** The agent publishes `event` on `topic` to every feed of it. */
export function publish(scene: PlatformScene, topic: string, event: unknown) {
  for (const one of scene.listening) if (one.topic === topic) one.send(event);
}

/** A refusal of `status` that asks for a wait of 30 seconds, in its header and in its body as eliza's agent writes it. */
export const busy = (status: number) => Response.json({ error: "busy", retryAfter: 30 }, { status, headers: { "retry-after": "30" } });

/** A body of `size` bytes, streamed as one event of that length. */
const flood = (size: number) => new Response(`data: "${"a".repeat(size)}"\n\n`, { headers: { "content-type": "text/event-stream" } });

export function platformRoutes(scene: PlatformScene): Route[] {
  return [
    (request, url) => (request.method === "GET" && url.pathname === "/api/platform/heard"
      ? Response.json(Object.fromEntries([...request.headers].filter(([name]) => name.startsWith("x-eliza")))) : undefined),
    (request, url) => (request.method === "GET" && url.pathname === "/api/platform/busy" ? busy(Number(url.searchParams.get("status"))) : undefined),
    (request, url) => (request.method === "POST" && url.pathname === "/api/platform/flood" ? flood(Number(url.searchParams.get("size"))) : undefined),
    (request, url) => {
      if (request.method !== "GET" || url.pathname !== "/api/events") return undefined;
      return feed((send) => {
        const one = { topic: url.searchParams.get("topic") ?? "", clientId: url.searchParams.get("clientId"), send };
        scene.listening.add(one);
        return () => scene.listening.delete(one);
      });
    },
  ];
}
