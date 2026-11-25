// spec/app/notes/editor.md, "The owner types, adds or ticks an item, and each change is kept on the phone at once"; spec/app/notes/editor.md, "Closing the editor keeps an unsaved draft for later, and lets go of a saved one"
import type { Stored } from "./shown.ts";

/** One item of a checklist as it is typed. */
export interface Item {
  /** Names the item on screen while its words change. */
  readonly key: string;
  readonly text: string;
  readonly done: boolean;
}

/** What the owner has typed into the note open in the editor: the spec counts its edits, this holds its words. */
export interface Words {
  readonly title: string;
  readonly body: string;
  readonly items: ReadonlyArray<Item>;
  /** The item being typed below a checklist, which joins it when added. */
  readonly next: string;
  /** What the store held besides the words, kept as it was: a note's pin, its folder. */
  readonly data: Readonly<Record<string, unknown>>;
}

const blank: Words = { title: "", body: "", items: [], next: "", data: {} };
let words: Words = blank;
const listeners = new Set<() => void>();

/** The words of a note as the store holds them: its first line the title, the rest its body or items. @throws {never} */
export function wordsOf(note: Stored): Words {
  const { items = [], ...data } = note.format?.data ?? {};
  return { title: note.title, body: note.body.replace(/^\n/, ""), items: items.map((item, at) => ({ key: `${note.id}:${at}`, text: item.t, done: item.done === true })), next: "", data };
}

/** The words in the editor now. @throws {never} */
export function current(): Words {
  return words;
}

/** Put `next` in the editor, and tell the screen. @throws {never} */
export function put(next: Words): void {
  words = next;
  for (const listener of listeners) listener();
}

/** Empty the editor. @throws {never} */
export function cleared(): void {
  put(blank);
}

/** Hear each change of the words. @throws {never} */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The words as the store takes them: the text of a note, its first line its title, and a checklist's format. @throws {never} */
export function written(kind: "Text" | "Checklist", typed: Words): { readonly content: string; readonly format?: { readonly kind: "list" | "text"; readonly data: Record<string, unknown> } } {
  const title = typed.title.trim() === "" ? "Untitled" : typed.title.replace(/\n/g, " ");
  if (kind === "Checklist") return { content: title, format: { kind: "list", data: { ...typed.data, items: typed.items.map((item) => ({ t: item.text, done: item.done })) } } };
  return { content: `${title}\n${typed.body}`, ...(Object.keys(typed.data).length === 0 ? {} : { format: { kind: "text", data: { ...typed.data } } }) };
}
