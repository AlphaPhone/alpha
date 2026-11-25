// spec/app/notes/index.md, "The list holds the owner it shows, the notes and folders it last read with the store's revision, the folder it is narrowed to, and the folder numbers that are gone"; spec/app/notes/note.md, "A note made from a scan, a page or a recording carries the source it was made from"
import type { Folder, Row } from "../../gen/app__notes.ts";
import type { Kind, Origin, Source } from "../../gen/app__notes__note.ts";

/** One note of the agent's store, as `@elizaos/plugin-notes` keeps it. */
export interface Stored {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly format?: {
    readonly kind: "text" | "list" | "voice" | "link";
    readonly data: {
      readonly pinned?: boolean;
      readonly folderId?: string;
      readonly items?: ReadonlyArray<{ readonly t: string; readonly done?: boolean }>;
      readonly lines?: ReadonlyArray<{ readonly s?: string; readonly t: string; readonly at?: number }>;
      readonly summary?: ReadonlyArray<string>;
      readonly actions?: ReadonlyArray<{ readonly t: string; readonly done?: boolean }>;
      readonly audio?: { readonly durationMs?: number };
      readonly url?: string;
      readonly domain?: string;
      readonly clips?: ReadonlyArray<string>;
    };
  };
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A folder the phone keeps for its notes, which a note names in its format's `folderId`. */
export interface Filed {
  readonly id: string;
  readonly name: string;
}

const kinds: Record<NonNullable<Stored["format"]>["kind"], Kind> = { text: "Text", list: "Checklist", voice: "Voice", link: "Link" };
const origins: Record<Kind, Origin> = { Text: "Written", Checklist: "Written", Voice: "Recorded", Link: "FromPage" };

const numbers = new Map<string, number>();
const notes = new Map<number, Stored>();
const named = new Map<number, string>();
const ids = new Map<number, string>();
const pages = new Map<number, string>();

/** The number this session gives `key`, the same each time it is asked. @throws {never} */
function numbered(key: string): number {
  const known = numbers.get(key);
  if (known !== undefined) return known;
  const made = numbers.size + 1;
  numbers.set(key, made);
  return made;
}

/** The source a note points back to: its recording, its page, or nothing. @throws {never} */
function sourceOf(note: Stored, kind: Kind): Source {
  if (kind === "Voice") return { tie: "AudioLink", id: numbered(`audio:${note.id}`), mark: 0 };
  if (kind === "Link") {
    const url = note.format?.data.url ?? "";
    const page = numbered(`page:${url || note.id}`);
    pages.set(page, url);
    return { tie: "PageLink", id: page, mark: 0 };
  }
  return { tie: "NoLink", id: 0, mark: 0 };
}

/**
 * The notes and folders of a reading as the list numbers them; each note is kept to be shown by its number. A note's
 * revision is the store's, which every write passes, so a write over any older one is refused as overtaken.
 * @throws {never}
 */
export function keep(stored: ReadonlyArray<Stored>, filed: ReadonlyArray<Filed>, revision: number): { readonly rows: Row[]; readonly folders: Folder[] } {
  notes.clear();
  ids.clear();
  const folders = filed.map((folder) => ({ id: numbered(`folder:${folder.id}`), name: folder.name }));
  for (const folder of filed) named.set(numbered(`folder:${folder.id}`), folder.name);
  const rows = stored.map((note): Row => {
    const kind = kinds[note.format?.kind ?? "text"];
    const id = numbered(`note:${note.id}`);
    notes.set(id, note);
    ids.set(id, note.id);
    const folder = note.format?.data.folderId ?? "";
    return {
      id, revision: Math.max(1, revision), kind, origin: origins[kind], source: sourceOf(note, kind),
      folder: folder === "" ? 0 : numbered(`folder:${folder}`), pinned: note.format?.data.pinned === true,
    };
  });
  return { rows, folders };
}

/** The note the list shows under `id`, as the store last gave it. @throws {never} */
export function noteOf(id: number): Stored | undefined {
  return notes.get(id);
}

/** The name of the folder numbered `id`. @throws {never} */
export function folderName(id: number): string {
  return named.get(id) ?? "";
}

/** The store's own id of the note numbered `id`, as last read. @throws {never} */
export function storedId(id: number): string | undefined {
  return ids.get(id);
}

/** The number the list gives the store's note `id`. @throws {never} */
export function numberOf(id: string): number {
  return numbered(`note:${id}`);
}

/** The address of the page numbered `id`, or "". @throws {never} */
export function pageOf(id: number): string {
  return pages.get(id) ?? "";
}
