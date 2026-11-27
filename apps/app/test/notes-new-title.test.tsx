// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { Machine as Editor, waiting } from "../gen/app__notes__editor.effect.vibe";
import { Machine as List } from "../gen/app__notes.effect.vibe";
import home from "../src/home/index.tsx";
import { empty } from "../src/notes/content.vibe";
import { startingTitle } from "../src/notes/editor.vibe";
import notes from "../src/notes/index.tsx";
import { button, closeAll, fill, later, only, open, press, underAct, until } from "./alpha.tsx";
import { note } from "./fakes/notes.ts";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const editorTitle = () => document.querySelector<HTMLInputElement>("input[aria-label='Title']")?.value;

async function beginNewNote(alpha: Awaited<ReturnType<typeof open>>["alpha"], runtime: ReturnType<typeof notes.runtime>) {
  await vi.waitFor(() => expect(button("New note")).toBeDefined(), { timeout: 10_000 });
  await press("New note");
  await until(alpha, runtime, Editor, (state) => state.showing && state.fresh);
  await vi.waitFor(() => expect(editorTitle()).toBeDefined(), { timeout: 10_000 });
}

async function startFreshNote(world = scene()) {
  const { alpha } = await open(world, only("home", "view:Notes", "notice"));
  await until(alpha, home.runtime(alpha), Home, (m) => m.tiles.load.status === "Loaded");
  await vi.waitFor(() => expect(button("Notes")).toBeDefined(), { timeout: 10_000 });
  await press("Notes");
  const runtime = notes.runtime(alpha);
  await until(alpha, runtime, List, (state) => state.read.status === "Loaded");
  await beginNewNote(alpha, runtime);
  return { world, alpha, runtime };
}

const collectionOf = (titles: readonly string[], deleted: readonly string[] = []) => ({
  ...empty(),
  noteByNumber: new Map(titles.map((title, index) => [index + 1, note(`n${index}`, title, "", 0)])),
  trash: deleted.map((title, index) => ({ note: note(`t${index}`, title, "", 0), deletedAt: new Date(0).toISOString() })),
});

describe(`A new note starts titled New note (spec/app/notes/editor.md, "The owner opens a note, or starts a new one, and the agent opens the one note the owner just named, only when no unsaved draft waits and nothing else of Notes is open; the agent's note may take the place of a saved one")`, () => {
  it("numbers past every note and deleted note titled New note, as v119's nextDefaultNoteTitle, and leaves other titles alone", () => {
    expect(startingTitle(collectionOf([]))).toBe("New note");
    expect(startingTitle(collectionOf(["Groceries", "New notes", "New note 0", "New note x", "Newnote 4"]))).toBe("New note");
    expect(startingTitle(collectionOf(["New note"]))).toBe("New note 2");
    expect(startingTitle(collectionOf([" new NOTE  "]))).toBe("New note 2");
    expect(startingTitle(collectionOf(["New note", "New note #4"]))).toBe("New note 5");
    expect(startingTitle(collectionOf(["New note 2"], ["New note 3"]))).toBe("New note 4");
  });

  it("the editor opens titled New note, and a note written under it is saved with that title; the next starts at New note 2", async () => {
    const { world, alpha, runtime } = await startFreshNote();
    const before = world.notes.notes.length;
    expect(editorTitle()).toBe("New note");
    expect(document.querySelector<HTMLInputElement>("input[aria-label='Title']")?.placeholder).toBe("Title");

    await fill("Note", "Pick up the keys");
    await later(alpha, 800);
    await until(alpha, runtime, Editor, (state) => state.showing && !state.fresh && state.note > 0 && !waiting(state));
    expect(world.notes.notes.filter((row) => row.title === "New note").map((row) => row.body.trim())).toEqual(["Pick up the keys"]);
    await vi.waitFor(() => expect(button("More")).toBeDefined(), { timeout: 10_000 });
    await press("Done");
    await until(alpha, runtime, Editor, (state) => !state.showing);
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded" && state.rows.length === before + 1);

    await beginNewNote(alpha, runtime);
    expect(editorTitle()).toBe("New note 2");
  });

  it("a title the owner types replaces New note", async () => {
    const { world, alpha, runtime } = await startFreshNote();
    await fill("Title", "Studio invoice");
    await fill("Note", "Send by Friday");
    await press("Done");
    await until(alpha, runtime, Editor, (state) => !state.showing && !waiting(state));
    expect(world.notes.notes.filter((row) => row.title === "Studio invoice").map((row) => row.body.trim())).toEqual(["Send by Friday"]);
    expect(world.notes.notes.some((row) => row.title === "New note")).toBe(false);
  });
});

describe('A new note holding only its starting title is not kept (spec/app/notes/editor.md, "Closing the editor keeps an unsaved draft for later, and lets go of a saved one")', () => {
  async function closeUnchanged(alpha: Awaited<ReturnType<typeof open>>["alpha"], runtime: ReturnType<typeof notes.runtime>, world: ReturnType<typeof scene>, before: string[]) {
    await press("Done");
    await until(alpha, runtime, Editor, (state) => !state.showing && !waiting(state) && !state.fresh);
    expect(world.notes.notes.map((row) => row.id)).toEqual(before);
  }

  it("closing an untouched new note makes no note and leaves no draft waiting", async () => {
    const { world, alpha, runtime } = await startFreshNote();
    const before = world.notes.notes.map((row) => row.id);
    await closeUnchanged(alpha, runtime, world, before);
  });

  it("words typed and erased again leave nothing to save, so the pause saves nothing and Done lets the draft go", async () => {
    const { world, alpha, runtime } = await startFreshNote();
    const before = world.notes.notes.map((row) => row.id);
    await fill("Note", "x");
    await fill("Note", "");
    await until(alpha, runtime, Editor, (state) => waiting(state) && state.draft.edits >= 2);
    await later(alpha, 800);
    expect(world.notes.notes.map((row) => row.id)).toEqual(before);
    await closeUnchanged(alpha, runtime, world, before);
  });

  it("a new note emptied of its starting title as well still waits as an unsaved draft, as before", async () => {
    const { alpha, runtime } = await startFreshNote();
    await fill("Title", "");
    await press("Done");
    await until(alpha, runtime, Editor, (state) => !state.showing && waiting(state));
  });
});
