// spec/app/notes/index.md, "Story: See my notes"; spec/app/notes/index.md, "The agent opens the one note the owner named, as the list shows it now, once for the owner's current turn, and is told whether it opened"
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
  /** Whether a write to the store fails, as an agent that cannot reach its notes answers. */
  refusing: boolean;
  /** The note a claim of a prepared saved-note editor names, as eliza's view host hands it to the renderer it is bound to. */
  target?: string;
  /** Each claim and result a renderer sent eliza's views routes, in order. */
  readonly views: { readonly path: "claim" | "result"; readonly body: Record<string, unknown> }[];
}

/** What a VIEWS action that prepared a navigation for `clientId` hands back in a reply (`.eliza/packages/agent/src/views/show-action.vibe`). */
export function prepared(clientId: string, viewId: string, saved: boolean) {
  const navigationBinding = { requestId: `request-${viewId}`, clientId, viewId, viewType: "gui", installationId: "alpha" };
  return { action: "VIEWS", data: { actionName: "VIEWS", values: { mode: "show", viewId, ...(saved ? { subview: "saved-note-v1" } : {}), completedActionDelivered: false, completedActionHandoffId: navigationBinding.requestId, navigationPrepared: true, navigationBinding } } };
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
    refusing: false,
    views: [],
    notes: [
      note("enclave", "Enclave launch", "Confirm attestation flow\nShip the keys-on-device doc\nDry run Friday", now - 20 * 60_000, { kind: "text", data: { pinned: true } }),
      note("sync", "Design sync", "", now - hour, {
        kind: "voice",
        data: {
          audio: { durationMs: 408_000 },
          lines: [
            { s: "Maya Chen", t: "Okay, lock screen first. Notifications stay as icons until you unlock.", at: 0 },
            { s: "me", t: "Agreed. Voice still works locked, but the answers stay vague.", at: 42 },
            { s: "Sam Okafor", t: "What about the chat over other apps?", at: 90 },
            { s: "Maya Chen", t: "Four heights. Pill, input, half, full. You drag between them.", at: 125 },
            { s: "me", t: "Let's cut the mark button from the recorder. Nobody used it.", at: 190 },
            { s: "Sam Okafor", t: "I'll wire the new recorder into Notes by Thursday.", at: 242 },
            { s: "Maya Chen", t: "I'll send the prototype to the team tonight.", at: 315 },
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

/** What a write sends to `/api/notes/interact`, as `@elizaos/plugin-notes` takes it. */
interface Interaction {
  capability: string;
  params: { id?: string; content?: string; format?: StickyNote["format"]; expectedRevision?: number; creationId?: string };
}

const refusal = (status: number, code: string) => Response.json({ requestId: "fake", success: false, error: code, result: { success: false, text: code, code } }, { status });

/** Change the store as a write asks, and answer as the plugin does: the state after it and the note it changed. */
function interacted(scene: NotesScene, { capability, params }: Interaction, now: number): Response {
  const at = iso(now);
  const answered = (changed: StickyNote) => Response.json({ requestId: "fake", success: true, result: { success: true, text: "Updated.", state: { notes: scene.notes, revision: scene.revision }, data: { note: changed } } });
  const parts = (content: string) => {
    const newline = content.indexOf("\n");
    return newline < 0 ? { title: content, body: "" } : { title: content.slice(0, newline), body: content.slice(newline) };
  };
  if (capability === "create-note") {
    const made = scene.notes.find((one) => one.id === params.creationId);
    if (made) return answered(made);
    const note: StickyNote = { id: params.creationId ?? `note-${scene.revision + 1}`, ...parts(params.content ?? ""), color: "yellow", ...(params.format ? { format: params.format } : {}), createdAt: at, updatedAt: at };
    scene.notes.unshift(note);
    scene.revision += 1;
    return answered(note);
  }
  if (capability !== "update-note") return refusal(400, "NOTES_VALIDATION_FAILED");
  const note = scene.notes.find((one) => one.id === params.id);
  if (!note) return refusal(404, "NOTES_NOT_FOUND");
  if (params.expectedRevision !== undefined && params.expectedRevision !== scene.revision) return refusal(409, "NOTES_EDIT_CONFLICT");
  Object.assign(note, params.content === undefined ? {} : parts(params.content), params.format === undefined ? {} : { format: params.format }, { updatedAt: at });
  scene.revision += 1;
  return answered(note);
}

/** The agent's Notes routes: its store's state and its writes, as `@elizaos/plugin-notes` serves them. */
export function notesRoutes(scene: NotesScene): Route[] {
  return [
    (request, url) => {
      if (request.method !== "POST" || url.pathname !== "/api/notes/interact") return;
      if (scene.refusing) return Response.json({ error: "Notes are unavailable" }, { status: 503 });
      return request.json().then((body: Interaction) => interacted(scene, body, Date.now()));
    },
    (request, url) => {
      if (request.method !== "POST" || url.pathname !== "/api/views/interact-claim") return;
      return request.json().then((body: Record<string, unknown>) => {
        scene.views.push({ path: "claim", body });
        const saved = body.targetProtocol === "saved-note-v1" && scene.target !== undefined;
        return Response.json({ claimId: `claim-${scene.views.length}`, ...(saved ? { target: { kind: "saved-note", noteId: scene.target } } : {}) });
      });
    },
    (request, url) => {
      if (request.method !== "POST" || url.pathname !== "/api/views/interact-result") return;
      return request.json().then((body: Record<string, unknown>) => {
        scene.views.push({ path: "result", body });
        return Response.json({ ok: true });
      });
    },
    (request, url) => {
      if (request.method !== "GET" || url.pathname !== "/api/notes/state") return;
      if (scene.failing) return Response.json({ error: "Notes are unavailable" }, { status: 503 });
      return Response.json({ success: true, data: { notes: scene.notes, revision: scene.revision } });
    },
  ];
}
