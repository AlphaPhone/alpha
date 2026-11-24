// spec/notes/collection.md, "Story: Read my notes under the account I am signed in as"; spec/notes/trash.md, "Story: Let deleted notes expire after three days when I choose that"; spec/notes/recordingOpen.md, "Story: Return to my recording from its notification"
// The resident agent's Notes routes in memory, faked once at the network boundary: the agent cannot run in a unit test.
import type { NoteFormat, NotesSnapshot, NotesTrashRecordingCleanup, StickyNote } from "@elizaos/plugin-notes/types";

interface Answer { readonly status: number; readonly data: unknown }

/** An in-memory resident with canonical Notes, three-day Trash and recording cleanup receipts. */
export class NotesAgentFake {
  notes: StickyNote[] = [];
  trash: { note: StickyNote; deletedAt: string }[] = [];
  revision = 0;
  creations = new Map<string, string>();
  cleanup: NotesTrashRecordingCleanup[] = [];
  threeDayTrash = true;
  failNextWrite = false;
  verifier: (audioId: string) => boolean = () => false;
  private next = 0;
  private clock = Date.parse("2026-11-20T10:00:00.000Z");

  private snapshot(): NotesSnapshot {
    return structuredClone({ notes: this.notes, revision: this.revision, trash: this.trash });
  }

  private time(): string {
    this.clock += 1000;
    return new Date(this.clock).toISOString();
  }

  private result(note: StickyNote): Answer {
    return { status: 200, data: { requestId: `r-${++this.next}`, success: true, result: { success: true, text: "Done", state: this.snapshot(), data: { note: structuredClone(note) } } } };
  }

  private refuse(status: number, error: string): Answer {
    return { status, data: { error } };
  }

  /** One JSON request, answered as the resident would. */
  json(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Answer {
    if (method === "GET" && path === "/api/notes/state") return { status: 200, data: { success: true, data: this.snapshot() } };
    if (path.startsWith("/api/notes/trash/") && !this.threeDayTrash) return this.refuse(404, "Not found");
    if (method === "GET" && path === "/api/notes/trash/recordings") return { status: 200, data: { success: true, data: structuredClone(this.cleanup) } };
    if (method === "POST" && path === "/api/notes/trash/recordings/complete") {
      const receipt = body as NotesTrashRecordingCleanup;
      const index = this.cleanup.findIndex((row) => row.operationId === receipt.operationId && row.audioId === receipt.audioId);
      if (index < 0) return { status: 200, data: { success: true, data: { acknowledged: false } } };
      if (!this.verifier(receipt.audioId)) return this.refuse(409, "The device has not confirmed recording erase.");
      this.cleanup.splice(index, 1);
      return { status: 200, data: { success: true, data: { acknowledged: true } } };
    }
    if (method === "POST" && path === "/api/notes/trash/erase") {
      const review = body as { scope: "all" | "entry"; expectedRevision: number; id?: string; deletedAt?: string };
      if (review.expectedRevision !== this.revision) return this.refuse(409, "Notes changed.");
      const erased = this.trash.filter((entry) => review.scope === "all" || (entry.note.id === review.id && entry.deletedAt === review.deletedAt));
      this.trash = this.trash.filter((entry) => !erased.includes(entry));
      const pending = erased.flatMap((entry) => {
        const audio = entry.note.format?.data.audio as { audioId?: string } | undefined;
        return audio?.audioId === undefined ? [] : [{ operationId: `00000000-0000-4000-8000-00000000000${this.cleanup.length + 1}`, noteId: entry.note.id, audioId: audio.audioId, deletedAt: entry.deletedAt }];
      });
      this.cleanup.push(...pending);
      this.revision += 1;
      return { status: 200, data: { success: true, data: { erased: erased.length, recordingCleanup: pending, state: this.snapshot() } } };
    }
    if (method === "POST" && path === "/api/notes/interact") return this.interact(body as { capability: string; params: Record<string, unknown> });
    return this.refuse(404, "Not found");
  }

  private interact({ capability, params }: { capability: string; params: Record<string, unknown> }): Answer {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      return this.refuse(503, "Notes is unavailable.");
    }
    const content = typeof params.content === "string" ? params.content : undefined;
    const split = (text: string) => {
      const index = text.indexOf("\n");
      return index < 0 ? { title: text, body: "" } : { title: text.slice(0, index), body: text.slice(index) };
    };
    if (capability === "create-note") {
      const creation = typeof params.creationId === "string" ? params.creationId : undefined;
      const known = creation === undefined ? undefined : this.notes.find((note) => note.id === this.creations.get(creation));
      if (known !== undefined) return this.result(known);
      const at = this.time();
      const note: StickyNote = { id: `note-${++this.next}`, ...split(content ?? ""), color: "yellow", createdAt: at, updatedAt: at,
        ...(params.format === undefined ? {} : { format: params.format as NoteFormat }) };
      this.notes.unshift(note);
      if (creation !== undefined) this.creations.set(creation, note.id);
      this.revision += 1;
      return this.result(note);
    }
    const id = String(params.id);
    if (capability === "update-note") {
      const note = this.notes.find((item) => item.id === id);
      if (note === undefined) return this.refuse(404, "Selected note is missing");
      if (params.expectedRevision !== this.revision) return this.refuse(409, "Selected note revision changed");
      Object.assign(note, content === undefined ? {} : split(content), params.format === undefined ? {} : { format: params.format as NoteFormat }, { updatedAt: this.time() });
      this.revision += 1;
      return this.result(note);
    }
    if (capability === "delete-note") {
      const index = this.notes.findIndex((item) => item.id === id);
      if (index < 0) return this.refuse(404, "Selected note is missing");
      const [note] = this.notes.splice(index, 1);
      this.trash.unshift({ note: note!, deletedAt: this.time() });
      this.revision += 1;
      return this.result(note!);
    }
    if (capability === "restore-note") {
      if (params.expectedRevision !== this.revision) return this.refuse(409, "Notes changed before the approved operation");
      const index = this.trash.findIndex((entry) => entry.note.id === id);
      if (index < 0) return this.refuse(404, "Selected note is missing");
      const [entry] = this.trash.splice(index, 1);
      this.notes.unshift(entry!.note);
      this.revision += 1;
      return this.result(entry!.note);
    }
    return this.refuse(400, "Unsupported Notes operation");
  }
}

/** The device's recorder, recording store and secure slots in memory, faked at the native bridge. */
export class DeviceFake {
  host = true;
  slots = new Map<string, string>();
  status: Record<string, unknown> = { state: "idle" };
  saved = new Map<string, { noteId: string; durationMs: number; transcript: string; deletedAt?: number; purged?: boolean }>();
  claims = 0;
  recordingOpen = false;
  segmentText: string | undefined = "Buy stamps";
  /** A recording stopped before it held any audio: its stop finishes no segment. */
  silent = false;
  refuseStart: string | undefined;
  speech: (args: Record<string, unknown>) => unknown = () => ({ text: "Buy stamps", local: false });
  playing: string | undefined;
  picked: Record<string, unknown> | undefined;
  opened: string[] = [];
  exported: { title: string; text: string }[] = [];
  released: string[][] = [];
  /** The earlier Alpha's connection store, when this phone still has one: what its `notes-records:v1:device` slot holds. */
  connection: { records?: string } | undefined;
  /** A native call, as `plugin.method`, that never answers while it is set. */
  stalled: string | undefined;

  available(plugin: string): boolean {
    if (plugin === "AlphaConnection") return this.connection !== undefined;
    return plugin === "AlphaNoteAudio" ? this.host : ["AlphaVoiceCloud", "ElizaSecureStore", "DailyApps", "AlphaMailAttachments", "AlphaNoteDocuments"].includes(plugin);
  }

  invoke(plugin: string, method: string, args: Record<string, unknown> = {}): unknown {
    if (plugin === "ElizaSecureStore" && method === "get") {
      const value = this.slots.get(String(args.key));
      return value === undefined ? { ok: false, error: "not_found" } : { ok: true, value };
    }
    if (plugin === "ElizaSecureStore" && method === "compareAndExchange") {
      const key = String(args.key);
      if ((this.slots.get(key) ?? null) !== args.expected) return { ok: false, error: "conflict", outcome: "Conflict" };
      if (args.value === null) this.slots.delete(key);
      else this.slots.set(key, String(args.value));
      return { ok: true, outcome: args.value === null ? "Removed" : "Written" };
    }
    if (plugin === "AlphaConnection" && method === "secureRead" && this.connection !== undefined) {
      return { value: args.slot === "notes-records:v1:device" ? this.connection.records ?? null : null };
    }
    if (plugin === "AlphaVoiceCloud") return this.voice(method, args);
    if (plugin === "AlphaNoteAudio") return this.audio(method, args);
    if (plugin === "DailyApps" && method === "perform") return this.picked === undefined ? { cancelled: true } : { selectionId: "selection-1" };
    if (plugin === "DailyApps" && method === "forgetSelected") return {};
    if (plugin === "AlphaMailAttachments") return this.attachments(method, args);
    if (plugin === "AlphaNoteDocuments" && method === "exportText") {
      this.exported.push({ title: String(args.title), text: String(args.text) });
      return { status: "exported", message: "Saved." };
    }
    throw Object.assign(new Error(`${plugin}.${method} is not installed`), { code: "unavailable" });
  }

  private voice(method: string, args: Record<string, unknown>): unknown {
    const binding = { ownerDigest: String(args.ownerDigest ?? ""), folderId: (args.folderId as string | null | undefined) ?? null };
    if (method === "noteRecordingStatus") return this.status;
    if (method === "consumeNoteRecordingOpen") { const open = this.recordingOpen; this.recordingOpen = false; return { open }; }
    if (method === "clearNoteRecordingOpen") { this.recordingOpen = false; return {}; }
    if (method === "startNoteRecording" && this.refuseStart !== undefined) throw Object.assign(new Error("The recorder refused"), { code: this.refuseStart });
    if (method === "pauseNoteRecording") { this.status = { ...this.status, state: "paused" }; return this.status; }
    if (method === "resumeNoteRecording") { this.status = { ...this.status, state: "recording" }; return this.status; }
    if (method === "startNoteRecording") {
      this.status = { state: "recording", recordingId: "rec_9", binding, durationMs: 0, segments: [] };
      return this.status;
    }
    if (method === "stopNoteRecording") {
      this.status = this.silent ? { ...this.status, state: "stopped", stopReason: "user", durationMs: 0, segments: [] }
        : { ...this.status, state: "stopped", stopReason: "user", durationMs: 3000, segments: [{ segmentId: "s1", durationMs: 3000, ...(this.segmentText === undefined ? {} : { text: this.segmentText }) }] };
      return this.status;
    }
    if (method === "claimCanonicalNoteSave") {
      this.claims += 1;
      this.status = { ...this.status, canonicalSavePending: true };
      return { claimed: this.claims === 1 };
    }
    if (method === "saveNoteRecording") {
      const durationMs = Number((this.status as { durationMs?: number }).durationMs ?? 0);
      this.saved.set(String(args.recordingId), { noteId: String(args.noteId), durationMs, transcript: String(args.transcript) });
      return { audioId: args.recordingId, noteId: args.noteId, durationMs, transcript: args.transcript };
    }
    if (method === "discardNoteRecording") { this.status = { state: "idle" }; return this.status; }
    if (method === "transcribeRecording" || method === "transcribeOwnRecording") return this.speech(args);
    if (method === "transcribeLocalRecording") return { text: "Buy stamps", local: true };
    return this.status;
  }

  private attachments(method: string, args: Record<string, unknown>): unknown {
    if (method === "readSelected") return this.picked ?? {};
    if (method === "openReviewed") { this.opened.push(String(args.sha256)); return {}; }
    if (method === "openSourceReference") { this.opened.push(String(args.reference)); return {}; }
    if (method === "releaseSourceReferences") { this.released.push([...(args.keep as string[])]); return { removed: 0, released: 0, remaining: (args.keep as string[]).length }; }
    return undefined;
  }

  private audio(method: string, args: Record<string, unknown>): unknown {
    const audioId = String(args.audioId);
    const row = this.saved.get(audioId);
    if (method === "describe") {
      if (row === undefined || row.purged) throw Object.assign(new Error("Recording unavailable"), { code: "not-found" });
      return { audioId, noteId: row.noteId, durationMs: row.durationMs, ...(row.deletedAt === undefined ? {} : { deletedAt: row.deletedAt }) };
    }
    if (method === "play") { if (row === undefined || row.purged || row.deletedAt !== undefined) throw Object.assign(new Error("Recording unavailable"), { code: "not-found" }); this.playing = audioId; return {}; }
    if (method === "stop") { this.playing = undefined; return {}; }
    if (method === "state") return this.playing === undefined ? { playing: false, positionMs: 0 } : { playing: true, audioId: this.playing, positionMs: 1000 };
    if (method === "deletionStatus") return { audioId, noteId: row?.noteId ?? "", operationId: args.operationId, status: row?.purged ? "purged" : row?.deletedAt !== undefined ? "removed" : "unknown" };
    if (method === "remove" && row !== undefined) { row.deletedAt = 1; return { audioId, noteId: row.noteId, operationId: args.operationId, status: "removed" }; }
    if (method === "purge" && row !== undefined) { row.purged = true; return { audioId, noteId: row.noteId, operationId: args.operationId, status: "purged" }; }
    return undefined;
  }
}
