// spec/app/notes/index.md, "Story: See my notes"
import type { Route } from "./routes.ts";

/** One note of the store, as `@elizaos/plugin-notes` serves it at `/api/notes/state`. */
interface StickyNote {
  id: string;
  title: string;
  body: string;
  color: "yellow" | "green" | "rose" | "slate";
  format?: { kind: "text" | "list" | "voice" | "link"; data: Record<string, unknown> };
  createdAt: string;
  updatedAt: string;
}

/** The agent's notes store as the fake agent holds it; a journey changes it between steps. */
export interface NotesScene {
  notes: StickyNote[];
  revision: number;
  /** Whether a read of the store fails, as an agent without its notes answers. */
  failing: boolean;
}

const hour = 3_600_000;
const day = 24 * hour;
const iso = (at: number) => new Date(Math.floor(at / 1000) * 1000).toISOString();

/** A note of the store, made and last changed at `at`. */
function note(id: string, title: string, body: string, at: number, format?: StickyNote["format"]): StickyNote {
  return { id, title, body, color: "yellow", ...(format === undefined ? {} : { format }), createdAt: iso(at), updatedAt: iso(at) };
}

/** The reference phone's notes, newest first as its list shows them, with the times placed back from `now`. */
export function notesScene(now = Date.now()): NotesScene {
  const lastYear = new Date(now).getMonth() < 8 ? 1 : 0;
  const september = new Date(new Date(now).getFullYear() - lastYear, 8, 22, 18, 30).getTime();
  return {
    revision: 6,
    failing: false,
    notes: [
      note("enclave", "Enclave launch", "Confirm attestation flow\nShip the keys-on-device doc\nDry run Friday", now - 20 * 60_000, { kind: "text", data: { pinned: true } }),
      note("sync", "Design sync", "", now - hour, {
        kind: "voice",
        data: {
          audio: { durationMs: 408_000 },
          lines: [
            { s: "maya", t: "Okay, lock screen first. Notifications stay as icons until you unlock.", at: 0 },
            { s: "me", t: "Agreed. Voice still works locked, but the answers stay vague.", at: 42 },
            { s: "sam", t: "What about the chat over other apps?", at: 90 },
            { s: "maya", t: "Four heights. Pill, input, half, full. You drag between them.", at: 125 },
            { s: "me", t: "Let's cut the mark button from the recorder. Nobody used it.", at: 190 },
            { s: "sam", t: "I'll wire the new recorder into Notes by Thursday.", at: 242 },
            { s: "maya", t: "I'll send the prototype to the team tonight.", at: 315 },
            { s: "me", t: "And I'll book a review with Jordan for next week.", at: 390 },
          ],
          summary: ["Notifications stay as icons until unlock", "Voice works while locked; answers stay vague", "Chat has four heights: pill, input, half, full", "The recorder drops the mark button"],
          actions: [{ t: "Sam · wire the recorder into Notes by Thursday", done: false }, { t: "Maya · send the prototype to the team tonight", done: true }, { t: "Book a review with Jordan next week", done: false }],
        },
      }),
      note("groceries", "Groceries", "", now - 2 * hour, {
        kind: "list",
        data: { items: [{ t: "Oat milk", done: true }, { t: "Espresso beans", done: false }, { t: "Lemons", done: false }, { t: "Sourdough from Tartine", done: false }] },
      }),
      note("agents", "The case for on-device agents", "", now - 3 * day, {
        kind: "link",
        data: {
          url: "https://news.example/on-device-agents",
          domain: "news.example",
          clips: ["Keys held on the device change what an assistant can be trusted with.", "Latency drops below the threshold where talking feels like thinking.", "The phone becomes the agent's body, not just its screen."],
        },
      }),
      note("gifts", "Gift ideas · Priya", "Film camera, ceramics class.\nShe mentioned the print show at SFMOMA.", now - 4 * day),
      note("landlord", "Radiator", "Call the landlord Friday. Bedroom radiator clanks all night.", september),
    ],
  };
}

/** The agent's Notes routes: its store's state, as `@elizaos/plugin-notes` serves it. */
export function notesRoutes(scene: NotesScene): Route[] {
  return [
    (request, url) => {
      if (request.method !== "GET" || url.pathname !== "/api/notes/state") return;
      if (scene.failing) return Response.json({ error: "Notes are unavailable" }, { status: 503 });
      return Response.json({ success: true, data: { notes: scene.notes, revision: scene.revision } });
    },
  ];
}
