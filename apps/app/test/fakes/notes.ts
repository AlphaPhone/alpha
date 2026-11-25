// spec/app/notes/index.md, "Story: See my notes"
import { parseNoteFormat } from "@elizaos/plugin-notes/format";
import type { NotesSnapshot, StickyNote } from "@elizaos/plugin-notes/types";
import { Schema } from "effect";
import type { Route } from "./routes.ts";

/** The agent's notes store as the fake agent holds it; a journey changes it between steps. */
export interface NotesScene {
  notes: StickyNote[];
  revision: number;
  owner: string;
  trash: NonNullable<NotesSnapshot["trash"]>;
  creations: Map<string, string>;
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
    owner: "agent-owner",
    trash: [],
    creations: new Map(),
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

const Interact = Schema.Struct({
  capability: Schema.Literals(["create-note", "update-note", "delete-note", "restore-note"]),
  params: Schema.Struct({
    id: Schema.optionalKey(Schema.String),
    content: Schema.optionalKey(Schema.String),
    format: Schema.optionalKey(Schema.Unknown),
    expectedRevision: Schema.optionalKey(Schema.Int),
    creationId: Schema.optionalKey(Schema.String),
  }),
});
const decoded = Schema.decodeUnknownOption(Interact);

function snapshot(scene: NotesScene): NotesSnapshot {
  return { notes: scene.notes, revision: scene.revision, trash: scene.trash };
}

function result(scene: NotesScene, row: StickyNote) {
  return Response.json({ requestId: "notes-fake", success: true, result: { success: true, text: row.title, state: snapshot(scene), data: { note: row } } });
}

function refused(status: number) {
  return Response.json({ error: "The Notes operation was refused" }, { status });
}

function contentOf(text: string): Pick<StickyNote, "title" | "body"> {
  const line = text.indexOf("\n");
  return line < 0 ? { title: text, body: "" } : { title: text.slice(0, line), body: text.slice(line) };
}

function interact(scene: NotesScene, input: unknown): Response {
  const found = decoded(input);
  if (found._tag === "None") return refused(400);
  const { capability, params } = found.value;
  if (scene.failing) return refused(503);
  if (params.expectedRevision !== undefined && params.expectedRevision !== scene.revision) return refused(409);
  const at = Date.now();
  const format = parseNoteFormat(params.format);
  if (capability === "create-note") {
    const oldId = params.creationId === undefined ? undefined : scene.creations.get(params.creationId);
    const old = scene.notes.find((item) => item.id === oldId);
    if (old !== undefined) return result(scene, old);
    const words = contentOf(params.content ?? "");
    const made = note(`fake-note-${scene.revision + 1}`, words.title, words.body, at, format);
    if (params.creationId !== undefined) scene.creations.set(params.creationId, made.id);
    scene.notes.unshift(made);
    scene.revision += 1;
    return result(scene, made);
  }
  const present = scene.notes.find((item) => item.id === params.id);
  if (capability === "restore-note") {
    const row = scene.trash.find((entry) => entry.note.id === params.id);
    if (row === undefined) return refused(404);
    scene.notes.unshift(row.note);
    scene.trash = scene.trash.filter((entry) => entry !== row);
    scene.revision += 1;
    return result(scene, row.note);
  }
  if (present === undefined) return refused(404);
  if (capability === "delete-note") {
    scene.notes = scene.notes.filter((item) => item !== present);
    scene.trash.push({ note: present, deletedAt: iso(at) });
    scene.revision += 1;
    return result(scene, present);
  }
  const edited: StickyNote = {
    ...present,
    ...(params.content === undefined ? {} : contentOf(params.content)),
    ...(format === undefined ? {} : { format }),
    updatedAt: iso(at),
  };
  scene.notes = scene.notes.map((item) => item === present ? edited : item);
  scene.revision += 1;
  return result(scene, edited);
}

/** The resident agent's Notes and owner routes. */
export function notesRoutes(scene: NotesScene): Route[] {
  return [
    async (request, url) => {
      if (request.method === "GET" && url.pathname === "/api/auth/me") {
        return Response.json({ identity: { kind: "owner", id: scene.owner }, access: { role: "OWNER", mode: "local" } });
      }
      if (request.method === "GET" && url.pathname === "/api/notes/state") {
        return scene.failing ? refused(503) : Response.json({ success: true, data: snapshot(scene) });
      }
      if (request.method === "POST" && url.pathname === "/api/notes/interact") return interact(scene, await request.json());
      return undefined;
    },
  ];
}
