// spec/app/platform/index.md, "Story: Talk to the resident agent"; spec/app/platform/index.md, "Story: Be told when to try again"; spec/app/platform/feed.md, "Story: Follow what my agent does on my screen"
import { type Faked, rejection } from "./phone.ts";
import { type Route, feed } from "./routes.ts";

/** What the fake agent holds for the platform's journeys: the live events it publishes, and who is listening. */
export interface PlatformScene {
  /** The open feeds of the agent's events, each with the topic and screen it was opened for. */
  readonly listening: Set<{ readonly topic: string; readonly clientId: string | null; readonly send: (data: unknown) => void }>;
  /** What the earlier Alpha kept in its connection plugin's encrypted slots, by slot. */
  readonly earlier: Map<string, string>;
  /** The earlier slots whose file the phone's key no longer opens, or that exceed the earlier Alpha's limit for them. */
  readonly unreadable: Set<string>;
  /** The streams the agent is still writing for `/api/platform/drip`, which says one thing and then waits. */
  readonly dripping: Set<object>;
  /** The requests the agent is still holding open for `/api/platform/hang` until aborted. */
  readonly hanging: Set<object>;
}

export function platformScene(): PlatformScene {
  return { listening: new Set(), earlier: new Map(), unreadable: new Set(), dripping: new Set(), hanging: new Set() };
}

const digest = "[a-f0-9]{64}";
/** The earlier page's own drafts and pending records, the only slots `AlphaConnectionPlugin.java` answers for (`AlphaEarlier.PAGE_SLOTS`). */
const pageSlots = new RegExp(`^(?:${[
  "inbox-drafts:v1:[\\s\\S]*", `inbox-operation:v1:${digest}`, "sms-draft:v1:(new|thread:[1-9][0-9]{0,18})",
  `assistant-draft:v1:${digest}`, "alpha-proposal:v1", "stage-session:v1", `workflow-draft:v1:${digest}`, "clock-handoff:v1:device",
  "reminder-creations:v1:device", "reminder-deletions:v1:device", `calendar-linked-sync:v1:${digest}`,
  "notes-draft:v1:device", "note-origins:v1:device", "notes-audio-deletions:v1:device",
].join("|")})$`);

/**
 * `AlphaConnectionPlugin.java`, which reads the earlier Alpha's encrypted slots where they are: `secureRead` answers
 * `{ value }`, null for an empty slot, and `secureCompareExchange` only clears a slot while it holds `expectedValue`.
 * Each refuses a slot the earlier page did not keep, and a read refuses a slot that cannot be opened.
 */
export function alphaConnection(scene: PlatformScene): Faked {
  return () => ({
    secureRead({ slot }: { slot: string }) {
      if (!pageSlots.test(slot) || scene.unreadable.has(slot)) return Promise.reject(rejection("Secure storage read failed"));
      return Promise.resolve({ value: scene.earlier.get(slot) ?? null });
    },
    secureCompareExchange({ slot, expectedValue, value }: { slot: string; expectedValue: string; value: string | null }) {
      if (!pageSlots.test(slot) || typeof expectedValue !== "string" || value !== null) return Promise.reject(rejection("Secure draft update failed"));
      if (scene.earlier.get(slot) !== expectedValue) return Promise.resolve({ status: "conflict" });
      scene.earlier.delete(slot);
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
    (request, url) => (request.method === "POST" && url.pathname === "/api/platform/drip" ? feed((send) => {
      const one = {};
      scene.dripping.add(one);
      send("first");
      return () => scene.dripping.delete(one);
    }) : undefined),
    (request, url) => (request.method === "PUT" && url.pathname === "/api/platform/hang" ? new Promise<Response>((_, reject) => {
      const one = {};
      scene.hanging.add(one);
      request.signal.addEventListener("abort", () => {
        scene.hanging.delete(one);
        reject(new DOMException("aborted", "AbortError"));
      }, { once: true });
    }) : undefined),
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
