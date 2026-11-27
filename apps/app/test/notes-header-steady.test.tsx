// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import home from "../src/home/index.tsx";
import { NoteContent } from "../src/notes/content.vibe";
import { NoteEditor } from "../src/notes/editor.vibe";
import notes from "../src/notes/index.tsx";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { Machine as List } from "../gen/app__notes.effect.vibe";
import { Machine as Editor, canPinNew, waiting } from "../gen/app__notes__editor.effect.vibe";
import { button, closeAll, drawn, fill, later, only, open, press, pressOnTop, underAct, until } from "./alpha.tsx";
import { type Scene, scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const rendered = (assert: () => unknown) => vi.waitFor(async () => {
  await drawn(() => undefined);
  await assert();
}, { timeout: 10_000 });

/** The editor header's controls in order, each with whether it can be pressed. */
const header = () => [...button(/^Turn into /)?.parentElement?.querySelectorAll("button") ?? []]
  .map((control) => [control.getAttribute("aria-label") ?? control.textContent, !control.disabled] as const);

const menu = () => document.querySelector('[role=menu][aria-label="Note actions"]');

/** The rows of the open note's menu, each with whether it can be chosen. */
const rows = () => [...menu()?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []]
  .map((row) => [row.textContent?.trim(), row.getAttribute("aria-disabled") === null] as const);

async function choose(row: string) {
  await drawn(() => button("More")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })));
  await rendered(() => expect(rows()).toContainEqual([row, true]));
  await drawn(() => [...menu()?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []].find((item) => item.textContent?.trim() === row)?.click());
}

async function openNotes(world: Scene) {
  const { alpha } = await open(world, only("home", "view:Notes", "notice"));
  await rendered(async () => {
    expect((await home.runtime(alpha).runPromise(Home.use((machine) => machine.get()))).tiles.load.status).toBe("Loaded");
    expect(button("Notes")).toBeDefined();
  });
  await press("Notes");
  const runtime = notes.runtime(alpha);
  await until(alpha, runtime, List, (state) => state.read.status === "Loaded");
  return { alpha, runtime };
}

async function newNote(world: Scene) {
  const opened = await openNotes(world);
  await rendered(() => expect(button("New note")).toBeDefined());
  await press("New note");
  await until(opened.alpha, opened.runtime, Editor, (state) => state.showing && state.fresh);
  return opened;
}

describe(`The note's header stays steady while its saves land (spec/app/notes/actions.md, "The owner opens the menu over the note the editor shows saved, with nothing else of Notes over it"; spec/app/notes/editor.md, "More over a new note offers Share, Pin and Delete, as v119's did")`, () => {
  it("draws More enabled over a new note before its first save, and keeps it in place over a saved note on each edit before the autosave lands", async () => {
    const world = scene();
    const { alpha, runtime } = await newNote(world);

    await rendered(() => expect(header()).toEqual([["Back to notes", true], ["Turn into checklist", true], ["More", true], ["Done", true]]));

    await fill("Note", "Pack the spare charger");
    await later(alpha, 800);
    await until(alpha, runtime, Editor, (state) => !waiting(state) && state.showing && !state.fresh && state.note > 0);
    await rendered(() => expect(header()).toEqual([["Back to notes", true], ["Turn into checklist", true], ["More", true], ["Done", true]]));

    for (const words of ["Pick up the keys and the post", "Pick up the keys, the post and bread"]) {
      await fill("Note", words);
      await until(alpha, runtime, Editor, (state) => state.showing && waiting(state));
      await rendered(() => expect(header().map(([name]) => name)).toEqual(["Back to notes", "Turn into checklist", "More", "Done"]));
    }
  });
});

describe(`More over a new note offers v119's Share, Pin and Delete (spec/app/notes/editor.md, "More over a new note offers Share, Pin and Delete, as v119's did")`, () => {
  it("Delete discards the new note, untouched or written, and nothing is saved", async () => {
    const world = scene();
    const { alpha, runtime } = await newNote(world);
    const saved = world.notes.notes.length;
    await drawn(() => button("More")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })));
    await rendered(() => expect(rows()).toEqual([["Share", true], ["Pin", true], ["Delete", true]]));
    await drawn(() => [...menu()?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []].find((item) => item.textContent?.trim() === "Delete")?.click());
    await until(alpha, runtime, Editor, (state) => !state.showing && !waiting(state));

    await press("New note");
    await until(alpha, runtime, Editor, (state) => state.showing && state.fresh);
    await fill("Note", "Pick up the keys");
    await until(alpha, runtime, Editor, (state) => waiting(state));
    await choose("Delete");
    await until(alpha, runtime, Editor, (state) => !state.showing && !waiting(state));
    await later(alpha, 800);
    expect(world.notes.notes.length).toBe(saved);
  });

  it("Pin saves the new note pinned, even one holding only its starting title", async () => {
    const world = scene();
    const { alpha, runtime } = await newNote(world);
    const beforeRevision = world.notes.revision;
    const beforeCount = world.notes.notes.length;
    await choose("Pin");
    await until(alpha, runtime, Editor, (state) => state.showing && !state.fresh && state.note > 0 && !waiting(state));
    expect(world.notes.revision).toBe(beforeRevision + 1);
    expect(world.notes.notes.length).toBe(beforeCount + 1);
    expect(world.notes.notes.filter((row) => row.title === "New note").map((row) => (row.format?.data as { readonly pinned?: boolean } | undefined)?.pinned)).toEqual([true]);
    expect(runtime.runSync(NoteContent).snapshot().draft?.pinned).toBeUndefined();
    await rendered(() => expect(header()).toContainEqual(["More", true]));
  });

  it("Pin follows Editor.canPinNew: enabled on a fresh editable note, disabled while Saving, and saves pinned in one write", async () => {
    const world = scene();
    const { alpha, runtime } = await newNote(world);
    const beforeRevision = world.notes.revision;
    const beforeCount = world.notes.notes.length;
    const initialEditor = await runtime.runPromise(Editor.use((machine) => machine.get()));
    expect(canPinNew(initialEditor, "Owner")).toBe(true);
    expect(canPinNew(initialEditor, "Phone")).toBe(false);
    expect(canPinNew(initialEditor, "Agent")).toBe(false);

    let releaseSave: (() => void) | undefined;
    world.notes.interactGate = new Promise<void>((resolve) => { releaseSave = resolve; });
    try {
      await choose("Pin");
      await until(alpha, runtime, Editor, (state) => state.showing && state.fresh && state.draft.sync === "Saving");
      const savingEditor = await runtime.runPromise(Editor.use((machine) => machine.get()));
      expect(canPinNew(savingEditor, "Owner")).toBe(false);

      await drawn(() => button("More")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })));
      await rendered(() => expect(rows()).toEqual([["Share", true], ["Unpin", false], ["Delete", false]]));
      await drawn(() => menu()?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
      await rendered(() => expect(menu()).toBeNull());

      await drawn(() => runtime.runPromise(NoteEditor.use((writer) => writer.pinNew(false))));
      expect(runtime.runSync(NoteContent).snapshot().draft?.pinned).toBe(true);
    } finally {
      delete world.notes.interactGate;
      releaseSave?.();
    }

    await until(alpha, runtime, Editor, (state) => state.showing && !state.fresh && state.note > 0 && !waiting(state));
    const savedEditor = await runtime.runPromise(Editor.use((machine) => machine.get()));
    expect(canPinNew(savedEditor, "Owner")).toBe(false);
    expect(world.notes.revision).toBe(beforeRevision + 1);
    expect(world.notes.notes.length).toBe(beforeCount + 1);
    expect(world.notes.notes.filter((row) => row.title === "New note").map((row) => (row.format?.data as { readonly pinned?: boolean } | undefined)?.pinned)).toEqual([true]);
    expect(runtime.runSync(NoteContent).snapshot().draft?.pinned).toBeUndefined();
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded" && state.version === world.notes.revision + 1);
    await drawn(() => button("More")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })));
    await rendered(() => expect(rows()).toContainEqual(["Unpin", true]));
  });

  it("Share saves the new note first, then reviews the saved note's text in the share panel", async () => {
    const world = scene();
    const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    try {
      const { alpha, runtime } = await newNote(world);
      await fill("Note", "Pick up the keys");
      await choose("Share");
      await until(alpha, runtime, Editor, (state) => state.showing && !state.fresh && state.note > 0 && !waiting(state));
      await rendered(() => expect(button("Close share")).toBeDefined());
      expect(world.notes.notes.filter((row) => row.title === "New note").map((row) => row.body.trim())).toEqual(["Pick up the keys"]);
      await pressOnTop("Copy text");
      await rendered(() => expect(copy).toHaveBeenCalledWith("New note\n\nPick up the keys"));
    } finally { copy.mockRestore(); }
  });

  it("Share over an untouched title-only new note saves it first and opens the share panel", async () => {
    const world = scene();
    const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    try {
      const { alpha, runtime } = await newNote(world);
      const beforeCount = world.notes.notes.length;
      await choose("Share");
      await until(alpha, runtime, Editor, (state) => state.showing && !state.fresh && state.note > 0 && !waiting(state));
      await rendered(() => expect(button("Close share")).toBeDefined());
      expect(world.notes.notes.length).toBe(beforeCount + 1);
      expect(world.notes.notes.filter((row) => row.title === "New note").map((row) => row.body.trim())).toEqual([""]);
      await pressOnTop("Copy text");
      await rendered(() => expect(copy).toHaveBeenCalledWith("New note"));
    } finally { copy.mockRestore(); }
  });
});
