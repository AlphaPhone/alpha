// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { Machine as CalendarForm } from "../gen/app__calendar__editor.effect.vibe";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { Machine as Editor, waiting } from "../gen/app__notes__editor.effect.vibe";
import { Machine as Trash } from "../gen/app__notes__trash.effect.vibe";
import { Machine as Voice } from "../gen/app__notes__voice.effect.vibe";
import { Machine as List, nothing, writing as listWriting } from "../gen/app__notes.effect.vibe";
import { Machine as Talk } from "../gen/app__voice.effect.vibe";
import { Machine as Shell, showing } from "../gen/app__shell.effect.vibe";
import assistant from "../src/assistant/index.tsx";
import { Views } from "../src/assistant/views.vibe";
import calendar from "../src/calendar/index.tsx";
import { kept } from "../src/calendar/editor.vibe";
import home from "../src/home/index.tsx";
import { agentOpen } from "../src/notes/agent.vibe";
import { reviewNoteSchedule } from "../src/notes/calendar.vibe";
import notes from "../src/notes/index.tsx";
import { untimed } from "../src/runtime/reactor.vibe";
import { button, closeAll, drawn, fill, hardware, only, open, press, pressOnTop, underAct, until } from "./alpha.tsx";
import { note, prepared } from "./fakes/notes.ts";
import { type Scene, scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const listed = () => [...document.querySelectorAll("[aria-label=Notes] button")].flatMap((row) => row.getAttribute("aria-label")?.startsWith("Open ") ? [row.getAttribute("aria-label")] : []);

const composerField = () => document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Message Alpha']");
const editorTitle = () => document.querySelector<HTMLInputElement>("input[aria-label='Title']")?.value;

const rendered = (assert: () => unknown) => vi.waitFor(async () => {
  await drawn(() => undefined);
  await assert();
}, { timeout: 10_000 });

const control = (name: string) => rendered(() => expect(button(name)).toBeDefined());

async function chooseNotesOption(menu: string, title: string, enabled = false) {
  await control(menu);
  await drawn(() => button(menu)?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })));
  const option = () => [...document.querySelectorAll<HTMLElement>("[role=menuitem]")].find((entry) => entry.textContent?.trim() === title);
  await rendered(() => {
    if (enabled) expect(option()?.getAttribute("aria-disabled")).toBeNull();
    else expect(option()).toBeDefined();
  });
  await drawn(() => option()?.click());
}

async function openNamedShoppingNote(world: Scene) {
  world.notes.notes.push(note("shopping", "shopping list", "", Date.now(), { kind: "list", data: { items: [{ t: "milk", done: false }] } }));
  world.notes.target = "shopping";
  const { alpha } = await open(world, only("assistant", "view:Notes"));
  return { alpha, runtime: assistant.runtime(alpha) };
}

async function openSavedVoiceNote(world: Scene) {
  const { alpha, runtime } = await openNotesFromHome(world);
  await until(alpha, runtime, List, (state) => state.read.status === "Loaded");
  await press("Open Design sync");
  await until(alpha, runtime, Voice, (state) => state.showing);
  return { alpha, runtime };
}

/** Notes opened from Home on `world`, once its list is read, choosing notes to delete. */
async function selectingNotes(world: Scene) {
  world.notes.deleteRequests = [];
  const { alpha, runtime } = await openNotesFromHome(world);
  await until(alpha, runtime, List, (state) => state.read.status === "Loaded");
  await chooseNotesOption("Notes options", "Select", true);
  return { alpha, runtime };
}

/** Copy the shared note's text after the notes changed under the share: it is refused, and `copy` was not called again. */
async function copyAfterChange(world: Scene, copy: MockInstance) {
  world.notes.revision++;
  await pressOnTop("Copy text");
  await rendered(() => expect(document.body.textContent).toContain("Sharing is unavailable."));
  expect(copy).toHaveBeenCalledTimes(1);
}

async function openNotesFromHome(world: Scene) {
  const { alpha } = await open(world, only("home", "view:Notes", "notice"));
  const runtime = home.runtime(alpha);
  await rendered(async () => {
    expect((await runtime.runPromise(Home.use((machine) => machine.get()))).tiles.load.status).toBe("Loaded");
    expect(button("Notes")).toBeDefined();
  });
  await press("Notes");
  return { alpha, runtime: notes.runtime(alpha) };
}

describe("Notes", () => {
  it.each([
    { row: "Enclave launch", kind: "event", destination: undefined, words: "Confirm attestation flow" },
    { row: "Design sync", kind: "reminder", destination: "Reminders", words: "Book a review with Jordan" },
  ] as const)('Reviews a Calendar draft from $row before any write (spec/app/notes/note.md, "Story: Review a Calendar draft from a note")', async ({ row, kind, destination, words }) => {
    const world = scene();
    const { alpha } = await open(world, only("home", "view:Notes", "view:Calendar", "notice"));
    const notesArea = notes.runtime(alpha);
    await press("Notes");
    await until(alpha, notesArea, List, (state) => state.read.status === "Loaded");
    await press(`Open ${row}`);
    if (kind === "event") await until(alpha, notesArea, Editor, (state) => state.showing);
    else await until(alpha, notesArea, Voice, (state) => state.showing);
    const viewed = kind === "event"
      ? await notesArea.runPromise(Editor.use((machine) => machine.get())).then((state) => ({ number: state.note, revision: state.draft.base, view: "editor" as const }))
      : await notesArea.runPromise(Voice.use((machine) => machine.get())).then((state) => ({ number: state.note, revision: state.revision, view: "voice" as const }));
    await drawn(() => notesArea.runPromise(reviewNoteSchedule(viewed, kind)));
    const target = calendar.runtime(alpha);
    await until(alpha, target, CalendarForm, (state) => state.shown && state.kept);
    const state = await target.runPromise(CalendarForm.use((form) => form.get()));
    const fields = await target.runPromise(kept(state.day, state.owner));
    const noted: unknown = expect.stringContaining(words);
    const revision: unknown = expect.any(String);
    expect(fields).toMatchObject({ title: row, notes: noted, noteOrigin: {
      agent: world.notes.owner, owner: world.notes.ownerIdentity, version: 2, revision,
    } });
    expect(fields.calendar).toBe(destination);
    expect(new Date(fields.begin).getHours()).toBe(9);
    expect(world.calendar.writes).toEqual([]);
    if (destination === "Reminders") {
      await rendered(() => expect(button("Save")?.disabled).toBe(false));
      await press("Save");
      await until(alpha, target, CalendarForm, (draft) => !draft.shown);
      await rendered(() => expect(button(/Design sync/)).toBeDefined());
      await press(/Design sync/);
      await control("Open source note");
      await press("Open source note");
      await until(alpha, alpha.runtime, Shell, (where) => showing(where, "Notes"));
      await until(alpha, notesArea, Voice, (voice) => voice.showing);
    }
  });

  it("See my notes (spec/app/notes/index.md, \"Story: See my notes\")", async () => {
    const world = scene();
    // spec/app/notes/index.md, "Opening Notes, or trying again, reads the owner's notes"
    const { alpha, runtime } = await openNotesFromHome(world);
    await until(alpha, runtime, List, (s) => s.read.status === "Loaded" && s.rows.length === 6);

    // spec/app/notes/index.md, "Pinned notes come first, then the rest, narrowed to the chosen folder"
    await control("Open Enclave launch");
    expect(listed()).toEqual(["Open Enclave launch", "Open Design sync", "Open Groceries", "Open The case for on-device agents", "Open Gift ideas · Priya", "Open Radiator"]);

    // spec/app/notes/index.md, "While the notes are unavailable, no note or folder is shown, and Connect sends the owner to the account area when it is the agent's notes that are not connected"
    world.notes.failing = true;
    await drawn(() => runtime.runPromise(List.use((list) => list.send({ type: "refresh" }, "Owner"))));
    await until(alpha, runtime, List, (s) => s.read.status === "Failed");
    await control("Reconnect");
    expect(listed()).toEqual([]);
    world.notes.failing = false;
    await press("Reconnect");
    await until(alpha, runtime, List, (s) => s.read.status === "Loaded" && s.rows.length === 6);
  });

  it("On the launcher the notes list draws no Back, a note keeps its own and Android's Back still leaves (spec/app/shell/index.md, \"On the launcher the first page of Settings and of Workflows draws no Back, and Android's Back still leaves it\")", async () => {
    const world = { ...scene(), phone: true };
    world.settings.roles = world.settings.roles.map((role) => role.role === "home" ? { ...role, held: true } : role);
    const { alpha, runtime } = await openNotesFromHome(world);
    await vi.waitFor(() => expect(document.querySelector("main")?.hasAttribute("data-alpha-launcher")).toBe(true));
    await until(alpha, runtime, List, (s) => s.read.status === "Loaded");
    await control("Open Groceries");
    expect(button("Back")).toBeUndefined();
    await press("Open Groceries");
    await control("Back to notes");
    await press("Back to notes");
    await control("Open Groceries");
    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);
  });

  it("Reviews a deleted note in a sheet and recovers it (spec/app/notes/trash.md, \"Story: Delete a note and get it back\")", async () => {
    const world = scene();
    world.now = Date.now();
    const deleted = world.notes.notes.pop();
    if (deleted === undefined) throw new Error("The fixture needs a note to recover");
    world.notes.trash.push({ note: deleted, deletedAt: new Date(world.now - 60_000).toISOString() });

    const { alpha } = await open(world, only("view:Notes"));
    await drawn(() => alpha.runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "openView", view: "Notes" }))));
    const runtime = notes.runtime(alpha);
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded");

    await chooseNotesOption("Notes options", "Recently deleted");
    await until(alpha, runtime, Trash, (state) => state.showing && state.read.status === "Loaded" && state.entries.length === 1);

    const row = button(deleted.title);
    expect(row?.closest("ul")?.getAttribute("aria-label")).toBe("Recently deleted notes");
    expect(row?.getAttribute("aria-description")).toMatch(/^Deleted /);
    expect(button("Recover")).toBeUndefined();

    await press(deleted.title);
    await until(alpha, runtime, Trash, (state) => state.opened !== 0);
    const dialog = () => document.querySelector("[role=dialog]");
    expect(dialog()?.querySelector("h2")?.textContent).toBe(deleted.title);
    expect(dialog()?.querySelector("p")?.textContent).toMatch(/^Deleted /);

    await press("Delete now");
    await until(alpha, runtime, Trash, (state) => state.question === "AskErase");
    expect(dialog()?.querySelector("h2")?.textContent).toBe(`Delete “${deleted.title}”?`);
    await press("Cancel");
    await until(alpha, runtime, Trash, (state) => state.question === "NoQuestion" && state.opened !== 0);
    expect(dialog()?.querySelector("h2")?.textContent).toBe(deleted.title);
    expect(world.notes.trash).toHaveLength(1);

    await press("Recover");
    await until(alpha, runtime, Trash, (state) => state.entries.length === 0 && !state.showing);
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded" && state.rows.length === 6);
    expect(world.notes.trash).toEqual([]);
    expect(world.notes.notes).toContainEqual(deleted);
    expect(dialog()).toBeNull();
    expect(button(`Open ${deleted.title}`)).toBeDefined();

    // spec/app/notes/editor.md, "Story: Delete the note I am writing"
    await press(`Open ${deleted.title}`);
    await until(alpha, runtime, Editor, (state) => state.showing && !state.deleting);
    const version = world.notes.revision;
    world.notes.deleteRequests = [];
    world.notes.deleteAtRevision = false;
    await chooseNotesOption("More", "Delete");
    await until(alpha, runtime, Editor, (state) => state.showing && state.told === "WasRefused");
    expect([world.notes.revision, world.notes.trash, world.notes.deleteRequests]).toEqual([version, [], []]);

    world.notes.deleteAtRevision = true;
    await chooseNotesOption("More", "Delete");
    await until(alpha, runtime, Editor, (state) => !state.showing && !state.deleting);
    expect([world.notes.revision, world.notes.trash.map(({ note }) => note.id), world.notes.deleteRequests])
      .toEqual([version + 1, [deleted.id], [{ id: deleted.id, expectedRevision: version }]]);
  });

  it("Keeps editor changes in the resident agent (spec/app/notes/editor.md, \"Story: Write a note\")", async () => {
    const world = scene();
    const { alpha, runtime } = await openNotesFromHome(world);
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded");
    await control("New note");
    await press("New note");
    await until(alpha, runtime, Editor, (state) => state.showing && state.fresh);
    await fill("Title", "Studio invoice");
    await fill("Note", "Send by Friday");
    await press("Done");
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded" && state.rows.length === 7);
    expect(world.notes.notes.filter((row) => row.title === "Studio invoice").map((row) => row.body.trim())).toEqual(["Send by Friday"]);
    await press("Open Studio invoice");
    await until(alpha, runtime, Editor, (state) => state.showing && !state.fresh);
    await fill("Note", "Send by Monday");
    await press("Done");
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded" && state.version === world.notes.revision + 1 && world.notes.notes.some((row) => row.body.includes("Monday")));
    expect(world.notes.notes.filter((row) => row.title === "Studio invoice").map((row) => row.body.trim())).toEqual(["Send by Monday"]);
  });

  it("Write a note (spec/app/notes/editor.md, \"Story: Write a note\")", async () => {
    const world = scene();
    const { alpha, runtime } = await openNotesFromHome(world);
    await until(alpha, runtime, List, (s) => s.read.status === "Loaded");

    // spec/app/notes/index.md, "A voice note opens only as a voice note, a link note only in its dialog, and text and checklists only in the editor"
    await control("Open Enclave launch");
    await press("Open Enclave launch");
    await until(alpha, runtime, Editor, (s) => s.showing && s.kind === "Text");

    // spec/app/notes/editor.md, "The owner types, adds or ticks an item, and each change is kept on the phone at once"
    await fill("Title", "Enclave launch plan");
    await until(alpha, runtime, Editor, (s) => s.draft.sync === "Edited");

    // spec/app/notes/editor.md, "A save lands, finds a newer revision, finds the note deleted, or fails, and only the phone's answer to the last save counts"
    await press("Done");
    await until(alpha, runtime, Editor, (s) => !s.showing && s.draft.sync === "Kept");
    expect(world.notes.notes.find((note) => note.id === "enclave")?.title).toBe("Enclave launch plan");
    await until(alpha, runtime, List, (s) => s.read.status === "Loaded" && s.version === world.notes.revision + 1);
  });

  it("Pins the exact saved voice note from More (spec/app/notes/voice.md, \"Pinning writes the chosen flag over the revision shown\")", async () => {
    const world = scene();
    const { alpha, runtime } = await openSavedVoiceNote(world);
    const saved = () => world.notes.notes.find((row) => row.id === "sync");
    const original = saved();
    if (original === undefined) throw new Error("The fixture needs a saved voice note");

    await chooseNotesOption("More", "Pin", true);
    await rendered(() => expect(saved()?.format).toEqual({ ...original.format, data: { ...original.format?.data, pinned: true } }));
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded" && state.version === world.notes.revision + 1);
    await until(alpha, runtime, Voice, (state) => state.showing && state.revision === world.notes.revision + 1);
    expect(world.notes.trash).toEqual([]);

    await chooseNotesOption("More", "Unpin", true);
    await rendered(() => expect(saved()?.format).toEqual({ ...original.format, data: { ...original.format?.data, pinned: false } }));
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded" && state.version === world.notes.revision + 1);
    await until(alpha, runtime, Voice, (state) => state.showing && state.revision === world.notes.revision + 1);
    const previouslyShown = saved();
    world.notes.revision++;
    await chooseNotesOption("More", "Pin", true);
    await rendered(() => expect(document.body.textContent).toContain("The pin couldn’t be changed."));
    expect(saved()).toEqual(previouslyShown);
  });

  it("Pins the open note from its own menu, as v121's note menu held Pin (spec/app/notes/index.md, \"Story: Organise my notes\")", async () => {
    const world = scene();
    const { alpha, runtime } = await openNotesFromHome(world);
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded");
    // spec/app/notes/index.md, "Story: Organise my notes": rows carry no menu of their own, as v121's had none.
    expect(button("Gift ideas · Priya options")).toBeUndefined();
    await press("Open Gift ideas · Priya");
    await until(alpha, runtime, Editor, (state) => state.showing && state.draft.sync === "Kept");
    const pinned = () => (world.notes.notes.find((row) => row.id === "gifts")?.format?.data as { readonly pinned?: boolean } | undefined)?.pinned;
    await chooseNotesOption("More", "Pin", true);
    await rendered(() => expect(pinned()).toBe(true));
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded" && state.version === world.notes.revision + 1);
    await chooseNotesOption("More", "Unpin", true);
    await rendered(() => expect(pinned()).toBe(false));
  });

  it("Copies only the exact saved voice note after choosing Copy text (spec/app/notes/voice.md, \"Story: Share the text of a saved voice note\")", async () => {
    const world = scene();
    await openSavedVoiceNote(world);
    const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    try {
      const reopenShare = async () => {
        await drawn(() => button("More")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })));
        const share = () => [...document.querySelectorAll<HTMLElement>("[role=menuitem]")].find((item) => item.textContent?.trim() === "Share");
        await rendered(() => expect(share()?.getAttribute("aria-disabled")).toBeNull());
        await drawn(() => share()?.click());
        await control("Close share");
      };
      await reopenShare();
      await press("Close share");
      expect(copy).not.toHaveBeenCalled();
      await reopenShare();
      await pressOnTop("Copy text");
      await rendered(() => expect(copy).toHaveBeenCalledTimes(1));
      expect(copy.mock.calls[0]?.[0]).toContain("Voice note text (audio not included)");
      expect(copy.mock.calls[0]?.[0]).toContain("Notifications stay as icons until unlock");
      expect(copy.mock.calls[0]?.[0]).not.toContain("Enclave launch");
      await reopenShare();
      await copyAfterChange(world, copy);
    } finally { copy.mockRestore(); }
  });

  it("Reviews the saved editor note before handing its text off (spec/app/notes/actions.md, \"Share reviews the saved note before an explicit destination receives its text\")", async () => {
    const world = scene();
    const { alpha, runtime } = await openNotesFromHome(world);
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded");
    const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    const menu = () => document.querySelector('[role=menu][aria-label="Note actions"]');
    const options = () => [...menu()?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []];
    const share = async (pinned: boolean) => {
      await drawn(() => button("More")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })));
      await rendered(() => expect(options().map((item) => item.textContent?.trim())).toEqual(["Share", pinned ? "Unpin" : "Pin", "Delete"]));
      await drawn(() => options()[0]?.click());
      await control("Close share");
    };
    try {
      await press("Open Enclave launch");
      await until(alpha, runtime, Editor, (state) => state.showing && state.draft.sync === "Kept");
      await share(true);
      await press("Close share");
      await rendered(() => expect(button("Close share")).toBeUndefined());
      expect(copy).not.toHaveBeenCalled();
      await rendered(() => expect(options()[0]?.textContent?.trim()).toBe("Share"));
      await drawn(() => options()[0]?.click());
      await pressOnTop("Copy text");
      await rendered(() => expect(copy).toHaveBeenCalledWith("Enclave launch\n\nConfirm attestation flow\nShip the keys-on-device doc\nDry run Friday"));
      await rendered(() => {
        expect(document.body.textContent).toContain("Note text copied.");
        expect(options().map((item) => item.textContent?.trim())).toEqual(["Share", "Unpin", "Delete"]);
      });
      await hardware("back");
      await rendered(() => expect(menu()).toBeNull());
      await press("Done");
      await until(alpha, runtime, Editor, (state) => !state.showing);
      await press("Open Groceries");
      await until(alpha, runtime, Editor, (state) => state.showing && state.kind === "Checklist" && state.draft.sync === "Kept");
      await share(false);
      await copyAfterChange(world, copy);
    } finally { copy.mockRestore(); }
  });

  it("Selects notes and only moves the reviewed notes after confirmation (spec/app/notes/index.md, \"Story: Select and delete notes\")", async () => {
    const world = scene();
    world.now = Date.now();
    const { alpha, runtime } = await selectingNotes(world);
    expect(button("Delete selected notes")?.disabled).toBe(true);
    await press("Select Enclave launch");
    await press("Select Groceries");
    expect(button("Select Enclave launch")?.getAttribute("aria-pressed")).toBe("true");
    await press("Delete selected notes");
    await control("Cancel");
    expect(world.notes.trash).toEqual([]);
    await press("Cancel");
    await control("Delete selected notes");
    expect(button("Select Groceries")?.getAttribute("aria-pressed")).toBe("true");

    await press("Delete selected notes");
    await control("Delete");
    world.notes.revision++;
    await press("Delete");
    await until(alpha, runtime, List, (state) => state.selectionResult === "RefusedSelection" && state.read.status === "Loaded" && state.version === world.notes.revision + 1);
    expect(world.notes.trash).toEqual([]);

    await press("Delete selected notes");
    await control("Delete");
    const confirmedRevision = world.notes.revision;
    await press("Delete");
    await until(alpha, runtime, List, (state) => state.selection === "NoSelection" && state.read.status === "Loaded" && state.rows.length === 4);
    expect(world.notes.trash.map(({ note }) => note.id)).toEqual(["enclave", "groceries"]);
    expect(world.notes.deleteRequests).toEqual([
      { id: "enclave", expectedRevision: confirmedRevision },
      { id: "groceries", expectedRevision: confirmedRevision + 1 },
    ]);
    await control("Open Design sync");
    expect(button("Open Groceries")).toBeUndefined();
    await control("Undo");
    await press("Undo");
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded" && state.rows.length === 6);
    expect(world.notes.trash).toEqual([]);
    await control("Open Groceries");
  });

  it("Stops the reviewed selection on refusal and keeps the remaining notes selected (spec/app/notes/index.md, \"Confirmation moves only the reviewed notes to Recently deleted and stops if a deletion is refused or unknown\")", async () => {
    const world = scene();
    const { alpha, runtime } = await selectingNotes(world);
    await press("Select Enclave launch");
    await press("Select Groceries");
    await press("Select Design sync");
    world.notes.refuseDiscardId = "groceries";
    await press("Delete selected notes");
    await control("Delete");
    await press("Delete");
    await until(alpha, runtime, List, (state) => state.selectionResult === "RefusedSelection" && state.read.status === "Loaded");
    expect(world.notes.trash.map(({ note }) => note.id)).toEqual(["enclave"]);
    expect(world.notes.deleteRequests?.map(({ id }) => id)).toEqual(["enclave", "groceries"]);
    await rendered(() => {
      expect(button("Select Groceries")?.getAttribute("aria-pressed")).toBe("true");
      expect(button("Select Design sync")?.getAttribute("aria-pressed")).toBe("true");
      expect(button("Select Enclave launch")).toBeUndefined();
    });
    await press("Done");
    await control("Open Groceries");
  });

  it("Read and use the transcript (spec/app/notes/voice.md, \"Story: Read and use the transcript\")", async () => {
    const world = scene();
    world.ask.metadata = [];
    const { alpha } = await open(world, only("assistant", "view:Notes"));
    const runtime = assistant.runtime(alpha);
    await drawn(() => runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "openView", view: "Notes" }))));
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded");
    await control("Open Design sync");
    await press("Open Design sync");
    await until(alpha, runtime, Voice, (state) => state.showing && state.added > 0);
    expect(document.body.textContent).toContain("Four heights. Pill, input, half, full.");
    expect(document.body.textContent).toContain("Notifications stay as icons until unlock");
    expect(button("Play recording")).toBeUndefined();

    // spec/app/notes/voice.md, "Only the transcript the owner added leaves the note, and only what was shown is written to it"
    const transcript = world.notes.notes.find((note) => note.id === "sync")?.format?.data.lines;
    if (!Array.isArray(transcript)) throw new Error("The fixture needs a saved transcript");
    const words = transcript.map((line) => typeof line === "object" && line !== null && "t" in line && typeof line.t === "string" ? line.t : "").join("\n");
    await control("Copy text");
    await press("Copy text");
    await rendered(async () => expect(await navigator.clipboard.readText()).toBe(words));

    // spec/app/notes/voice.md, "Ask Alpha about this transcript hands Ask Alpha the transcript the note holds"
    await until(alpha, runtime, Composer, (state) => state.slot === "Open");
    await control("Ask Alpha about this transcript");
    await press("Ask Alpha about this transcript");
    await until(alpha, runtime, Shell, (state) => state.assistant === "Sheet");
    expect(world.ask.said).toEqual([]);
    expect(document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Message Alpha']")?.value).toBe("Summarize this for me");
    expect(button("Remove Design sync")).toBeDefined();
    const question = "What did we decide about notifications in this transcript?";
    await fill("Message Alpha", question);
    await press("Remove Design sync");
    await until(alpha, runtime, Composer, (state) => !state.editor.transcript);

    // spec/app/assistant/composer.md, "Story: Attach, quote and edit again"
    await drawn(() => runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "goBack" }))));
    await press("Ask Alpha about this transcript");
    await drawn(async () => { expect((await runtime.runPromise(Shell.use((shell) => shell.get()))).assistant).toBe("Bar"); });
    await press("Back to notes");
    await until(alpha, runtime, Voice, (state) => !state.showing);
    await control("Open Design sync");
    await press("Open Design sync");
    await until(alpha, runtime, Voice, (state) => state.showing && state.added > 0);
    await press("Ask Alpha about this transcript");
    await until(alpha, runtime, Shell, (state) => state.assistant === "Sheet");
    expect(button("Remove Design sync")).toBeDefined();
    expect(document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Message Alpha']")?.value).toBe(question);
    await until(alpha, runtime, Conversation, (state) => state.ready && state.context.selected);
    await press("Send");
    await drawn(() => vi.waitFor(() => expect(world.ask.said).toEqual([question])));
    expect(world.ask.said[0]).not.toContain("Use the transcript");
    expect(world.ask.said[0]).not.toContain("Four heights");
    expect(world.ask.metadata[0]).toMatchObject({
      observation: { view: "notes", selectedObject: { kind: "canonical-note", id: "sync", revision: String(world.notes.revision) } },
      useSelectedVoiceNoteTranscript: true,
    });
    await until(alpha, runtime, Composer, (state) => state.away === "Free" && !state.editor.transcript);
    expect(button("Remove Design sync")).toBeUndefined();

    // spec/app/assistant/context.md, "A reviewed email or voice-note transcript flag travels in structured turn context, never inside the owner's request text"
    await drawn(() => runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "goBack" }))));
    await press("Back to notes");
    await until(alpha, runtime, Voice, (state) => !state.showing);
    await control("Open Design sync");
    await press("Open Design sync");
    await until(alpha, runtime, Voice, (state) => state.showing && state.added > 0);
    await press("Ask Alpha about this transcript");
    await until(alpha, runtime, Shell, (state) => state.assistant === "Sheet");
    await fill("Message Alpha", "");
    await until(alpha, runtime, Composer, (state) => state.away === "Free" && state.editor.transcript && !state.editor.text && state.draft.sync !== "Saving");
    await until(alpha, runtime, Conversation, (state) => state.ready && state.context.selected && state.observing);
    await press("Send");
    await drawn(() => vi.waitFor(() => expect(world.ask.said).toEqual([question, ""])));
    expect(world.ask.metadata[1]).toMatchObject({
      observation: { view: "notes", selectedObject: { kind: "canonical-note", id: "sync", revision: String(world.notes.revision) } },
      useSelectedVoiceNoteTranscript: true,
    });
    await until(alpha, runtime, Composer, (state) => state.away === "Free" && !state.editor.transcript);
  });

  it("Reviews a generated transcript before saving it (spec/app/notes/voice.md, \"Story: Read and use the transcript\"; spec/app/assistant/cards.md, \"The owner reviews the summary before it can be saved\")", async () => {
    const world = scene();
    world.phone = true;
    const recordingId = "retained-recording";
    const noteId = "voice-review";
    const durationMs = 32_000;
    const revision = world.notes.revision;
    world.notes.notes.push(note(noteId, "Field recording", "", Date.now(), {
      kind: "voice", data: { audioId: recordingId, durationMs, segments: [{ durationMs: 25_000 }, { durationMs: 7_000 }] },
    }));
    world.notes.audio.set(recordingId, { noteId, durationMs });
    const windows: number[] = [];
    world.voice.noteTranscription = (request) => {
      expect(request).toMatchObject({ noteId, recordingId, durationMs });
      windows.push(request.offsetMs);
      return Promise.resolve(request.offsetMs === 0 ? "The door closes at dusk." : "Send a reminder on Thursday.");
    };
    const { alpha } = await open(world, only("assistant", "view:Notes"));
    const runtime = notes.runtime(alpha);
    await drawn(() => runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "openView", view: "Notes" }))));
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded");
    await control("Open Field recording");
    await press("Open Field recording");
    await until(alpha, runtime, Voice, (state) => state.showing);
    expect(windows).toEqual([]);
    await press("Generate transcript");
    await until(alpha, runtime, Voice, (state) => state.listen.status === "Loaded");
    expect(windows).toEqual([0, 25_000]);
    await press("Review transcript");
    expect(document.querySelector("[role=dialog]")?.textContent).toContain("Send a reminder on Thursday.");
    expect(world.notes.revision).toBe(revision);
    await pressOnTop("Add to note");
    await until(alpha, runtime, Voice, (state) => state.writing.outcome === "Confirmed" && state.added === 2);
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded" && state.version === revision + 2);
    expect(world.notes.notes.find((item) => item.id === noteId)?.format?.data.lines).toEqual([
      { s: "me", t: "The door closes at dusk.", at: 0 },
      { s: "me", t: "Send a reminder on Thursday.", at: 25 },
    ]);

    // spec/app/notes/voice.md, "Story: Leave a voice note"
    await press("Play recording");
    await drawn(() => vi.waitFor(() => expect(world.notes.playing).toEqual({ audioId: recordingId, noteId, offsetMs: 0 })));
    await hardware("home");
    await until(alpha, runtime, Voice, (state) => !state.showing && state.play.status === "Idle");
    expect(world.notes.playing).toBeUndefined();
    await drawn(() => runtime.runPromise(Effect.flatMap(Shell, (shell) => shell.send({ type: "openView", view: "Notes" }))));
    await drawn(() => vi.waitFor(() => expect(button("Open Field recording")).toBeDefined()));

    // spec/app/assistant/cards.md, "The owner reviews the summary before it can be saved"
    await press("Open Field recording");
    await until(alpha, runtime, Voice, (state) => state.showing && state.added === 2);
    const ask = assistant.runtime(alpha);
    await until(alpha, ask, Composer, (state) => state.slot === "Open");
    await control("Ask Alpha about this transcript");
    await press("Ask Alpha about this transcript");
    await until(alpha, ask, Conversation, (state) => state.ready && state.context.selected);
    world.ask.nextReplyChunks = ["The door closes at dusk."];
    const before = world.notes.notes.find((one) => one.id === noteId);
    await press("Send");
    const review = /^Review summary note/;
    await rendered(() => expect(button(review)).toBeDefined());
    await press(review);
    await control("Save recording summary");
    expect(document.querySelector<HTMLTextAreaElement>("textarea[name=summary]")?.value).toBe("The door closes at dusk.");
    await pressOnTop("Cancel");
    expect(world.notes.revision).toBe(revision + 1);
    await press(review);
    await control("Save recording summary");
    await fill("Summary", "The door closes at dusk on Thursday.");
    await fill("Action items", "Check the door");
    await pressOnTop("Save recording summary");
    await rendered(() => expect(document.body.textContent).toContain("Recording summary saved."));
    expect(world.notes.notes.find((one) => one.id === noteId)).toMatchObject({
      title: before?.title, body: before?.body,
      format: { kind: "voice", data: { ...before?.format?.data, summary: ["The door closes at dusk on Thursday."], actions: [{ t: "Check the door", done: false }] } },
    });
    expect(world.notes.revision).toBe(revision + 2);
    expect(button("Save recording summary")).toBeUndefined();
  });

  it("The agent opens the note I named, and only that, only for my request now (spec/app/notes/index.md, \"The agent opens the one note the owner named, as the list last read it, once for the owner's current request, and is told whether it opened\"; spec/app/notes/note.md, \"Only the owner opens a dialog or a question in Notes; a note is opened by the owner, or by the agent for the one the owner just named; and nothing opens while anything else of Notes is open\"; spec/app/assistant/index.md, \"Story: Let Alpha open what it is talking about\")", async () => {
    const world = scene();
    const { alpha, runtime } = await openNamedShoppingNote(world);
    await until(alpha, runtime, Composer, (s) => s.slot === "Open");
    await until(alpha, runtime, Conversation, (s) => s.ready);
    const editor = () => alpha.runtime.runPromise(Effect.flatMap(Editor, (e) => e.get()));
    const list = () => alpha.runtime.runPromise(Effect.flatMap(List, (l) => l.get()));
    const results = () => world.notes.views.filter((one) => one.path === "result").map((one) => one.body.result);
    const ask = async (text: string, actions: boolean, viewId = "notes") => {
      world.ask.nextReplyChunks = ["Here it is."];
      world.ask.nextActions = actions ? (metadata) => [prepared(String((metadata as { viewClientId?: unknown }).viewClientId), viewId, viewId === "notes")] : undefined;
      const turn = (await runtime.runPromise(Effect.flatMap(Conversation, (c) => c.get()))).turn.send.id + 1;
      // spec/app/shell/index.md, "Ask Alpha rises to typing, a sheet or the full screen": over an app the dock is compact, and Type opens the field.
      await rendered(() => expect(composerField()).not.toBeNull());
      if (composerField()?.hidden) {
        await press("Type");
        await until(alpha, runtime, Shell, (s) => s.assistant === "Typing");
      }
      await rendered(() => expect(composerField()?.hidden).toBe(false));
      await fill("Message Alpha", text);
      await press("Send");
      await until(alpha, runtime, Conversation, (c) => c.turn.send.id === turn && c.turn.reply === "Complete");
    };

    // spec/app/assistant/context.md, "A spoken turn carries what a typed turn sent at that moment would, the view claim included": a typed turn binds this screen as the renderer of a saved note, and the note the model named opens in the editor, Notes in front.
    world.ask.metadata = [];
    await ask("open the note titled shopping list", true);
    await drawn(() => vi.waitFor(() => expect(results()).toHaveLength(1)));
    expect(world.ask.metadata[0]).toMatchObject({ viewDelivery: "completed-action", voiceUi: { viewDelivery: "completed-action", uiNotesEditor: "saved-note-v1" } });
    expect(world.notes.views[0]).toMatchObject({ path: "claim", body: { viewId: "notes", targetProtocol: "saved-note-v1" } });
    expect(results()).toEqual([{ switched: true, shown: { kind: "saved-note", noteId: "shopping" } }]);
    await rendered(async () => {
      const shell = await alpha.runtime.runPromise(Shell.use((machine) => machine.get()));
      expect([(await editor()).showing, editorTitle(), showing(shell, "Notes")]).toEqual([true, "shopping list", true]);
    });

    // spec/app/notes/editor.md, "The owner opens a note, or starts a new one, and the agent opens the one note the owner just named, only when no unsaved draft waits and nothing else of Notes is open; the agent's note may take the place of a saved one": the note already open is open, and another named note takes the place of a saved one.
    const opens = async (noteId: string, asked: { turn: number; current: number; sensitive: boolean }) => {
      let opened = false;
      await drawn(async () => { opened = await alpha.runtime.runPromise(agentOpen(noteId, asked)); });
      return opened;
    };
    const request = () => runtime.runPromise(Effect.flatMap(Views, (views) => views.begin()));
    const named = (n: number, sensitive = false) => ({ turn: n, current: n, sensitive });
    const t = (await list()).agentTurn;
    let n = await request();
    expect(await opens("shopping", named(n))).toBe(true);
    expect((await list()).agentTurn).toBe(t);
    expect(await opens("enclave", named(n))).toBe(true);
    expect([editorTitle(), (await list()).agentTurn]).toEqual(["Enclave launch", n]);

    // spec/app/notes/index.md, "The agent opens at most one note for each request of the owner's, only for the request that is current, and never over anything of Notes": a second open for the same request, an older request, a sensitive screen, a link note, and a text note over an open voice note open nothing.
    expect(await opens("groceries", named(n))).toBe(false);
    expect(editorTitle()).toBe("Enclave launch");
    await press("Done");
    await until(alpha, alpha.runtime, Editor, (e) => !e.showing && !waiting(e));
    const stale = await request();
    n = await request();
    expect(await opens("groceries", { turn: stale, current: n, sensitive: false })).toBe(false);
    expect(await opens("groceries", named(n, true))).toBe(false);
    expect(await opens("agents", named(n))).toBe(false);
    expect(await opens("sync", named(n))).toBe(true);
    expect((await alpha.runtime.runPromise(Voice.use((v) => v.get())))).toMatchObject({ showing: true });
    n = await request();
    expect(await opens("groceries", named(n))).toBe(false);
    await drawn(() => alpha.runtime.runPromise(Voice.use((v) => v.send({ type: "back" }, "Owner"))));
    await until(alpha, alpha.runtime, Voice, (v) => !v.showing);

    // spec/app/notes/index.md, "The owner opens a note the list shows, when nothing else of Notes is open, and it opens as listed": a note the list is narrowed away from opens, and the list stops narrowing.
    const shelf = (await list()).shelf;
    await drawn(() => alpha.runtime.runPromise(List.use((l) => l.send({ type: "change", c: { ...nothing, op: "AddFolder", folder: 0, name: "Work", base: shelf }, covered: false }, "Owner"))));
    await until(alpha, alpha.runtime, List, (s) => s.folders.length === 1 && !listWriting(s));
    const work = (await list()).folders[0]?.id ?? 0;
    await drawn(() => alpha.runtime.runPromise(List.use((l) => l.send({ type: "filterBy", folder: work }, "Owner"))));
    expect(listed()).toEqual([]);
    expect(await opens("groceries", named(n))).toBe(true);
    expect([editorTitle(), (await list()).filter]).toEqual(["Groceries", 0]);
    await press("Done");
    await until(alpha, alpha.runtime, Editor, (e) => !e.showing && !waiting(e));

    // spec/app/notes/note.md, "Only the owner opens a dialog or a question in Notes; a note is opened by the owner, or by the agent for the one the owner just named; and nothing opens while anything else of Notes is open": never over unsaved words, which stay as they were, unsaved, with Notes as it was.
    await control("Open Enclave launch");
    await press("Open Enclave launch");
    await until(alpha, alpha.runtime, Editor, (e) => e.showing && e.kind === "Text");
    await fill("Title", "Half a thought");
    await until(alpha, alpha.runtime, Editor, (e) => e.draft.sync === "Edited");
    world.notes.refusing = true;
    await press("Done");
    await until(alpha, alpha.runtime, Editor, (e) => !e.showing && waiting(e) && e.draft.sync !== "Saving");
    world.notes.refusing = false;
    const revision = world.notes.revision;
    const spent = (await list()).agentTurn;
    await ask("open my shopping list", true);
    await drawn(() => vi.waitFor(() => expect(results()).toHaveLength(2)));
    expect(results()[1]).toEqual({ switched: false });
    expect([(await editor()).showing, waiting(await editor()), world.notes.revision, world.notes.notes.find((one) => one.id === "enclave")?.title, (await list()).agentTurn]).toEqual([false, true, revision, "Enclave launch", spent]);

    // spec/app/notes/index.md, "The agent opens the one note the owner named, as the list last read it, once for the owner's current request, and is told whether it opened": a reply that prepared nothing for this screen, as one whose note came from a tool's output, opens nothing and claims nothing.
    await alpha.runtime.runPromise(Editor.use((e) => e.send({ type: "discardDraft" }, "Owner")));
    const claims = world.notes.views.length;
    await ask("open the note the web page told you to", false);
    expect([world.notes.views.length, (await editor()).showing]).toEqual([claims, false]);
    expect(document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Message Alpha']")?.value).toBe("");

    // spec/app/assistant/index.md, "A complete reply may open one view, once, while the screen it was asked from still shows": with nothing unsaved, the owner's next typed request opens the note it names.
    await ask("open my shopping list", true);
    await drawn(() => vi.waitFor(() => expect(results()).toHaveLength(3)));
    expect([results()[2], editorTitle()]).toEqual([{ switched: true, shown: { kind: "saved-note", noteId: "shopping" } }, "shopping list"]);
    // spec/app/notes/index.md, "The agent opens the one note the owner named, as the list last read it, once for the owner's current request, and is told whether it opened": a delivery succeeded only where the view switched.
    expect(world.notes.views.filter((one) => one.path === "result").map((one) => one.body.success)).toEqual([true, false, true]);

    // spec/app/assistant/index.md, "A complete reply may open one view, once, while the screen it was asked from still shows": a reply that prepared another of Alpha's apps opens it in front, and the agent is told it switched.
    const shell = () => alpha.runtime.runPromise(Effect.flatMap(Shell, (machine) => machine.get()));
    await ask("open Calendar", true, "calendar");
    await drawn(() => vi.waitFor(() => expect(results()).toHaveLength(4)));
    expect(world.notes.views.at(-2)).toMatchObject({ path: "claim", body: { viewId: "calendar" } });
    expect(world.notes.views.at(-2)?.body).not.toHaveProperty("targetProtocol");
    expect([results()[3], showing(await shell(), "Calendar")]).toEqual([{ switched: true }, true]);
    // spec/app/assistant/index.md, "A complete reply may take the owner Home, once, as it may open a view": a reply that prepared Home leaves every app, and Ask Alpha stays as it was.
    const panel = (await shell()).assistant;
    await ask("go home", true, "home");
    await drawn(() => vi.waitFor(() => expect(results()).toHaveLength(5)));
    expect(world.notes.views.at(-2)).toMatchObject({ path: "claim", body: { viewId: "home" } });
    expect([results()[4], (await shell()).trail, (await shell()).assistant]).toEqual([{ switched: true }, [], panel]);
    // spec/app/assistant/index.md, "A complete reply may open one view, once, while the screen it was asked from still shows": "Open the browser." from Home, which VIEWS answers with the browser view, brings Browser forward.
    await ask("Open the browser.", true, "browser");
    await drawn(() => vi.waitFor(() => expect(results()).toHaveLength(6)));
    expect(world.notes.views.at(-2)).toMatchObject({ path: "claim", body: { viewId: "browser" } });
    expect([results()[5], showing(await shell(), "Browser")]).toEqual([{ switched: true }, true]);
  });

  it("The agent opens the note I named aloud (spec/app/assistant/context.md, \"A spoken turn carries what a typed turn sent at that moment would, the view claim included\"; spec/app/notes/index.md, \"The agent opens the one note the owner named, as the list last read it, once for the owner's current request, and is told whether it opened\")", async () => {
    const world = { ...scene(), phone: true };
    const { alpha, runtime } = await openNamedShoppingNote(world);
    await until(alpha, runtime, Conversation, (s) => s.ready && s.observing);
    await until(alpha, runtime, Talk, (s) => s.warmed);
    await drawn(() => runtime.runPromise(Talk.use((v) => v.send({ type: "chooseNetworkSpeech", agree: false }))));
    await drawn(() => runtime.runPromise(Talk.use((v) => v.send({ type: "permissionChanged", grant: "Granted" }))));
    await drawn(() => runtime.runPromise(Talk.use((v) => v.send({ type: "startTalking", now: untimed }))));
    await until(alpha, runtime, Talk, (s) => s.phase === "Listening" && s.mic === "On");
    world.ask.metadata = [];
    world.ask.nextReplyChunks = ["Here it is."];
    world.ask.nextActions = (metadata) => [prepared(String((metadata as { viewClientId?: unknown }).viewClientId), "notes", true)];
    await drawn(() => Promise.resolve(world.voice.emitLocal?.("liveCaptureTranscript", { captureId: world.voice.activeMicSession, final: { turnId: "spoken", text: "open my shopping list note", mode: "device" } })));
    const results = () => world.notes.views.filter((one) => one.path === "result").map((one) => one.body.result);
    await rendered(() => expect(world.ask.said).toEqual(["open my shopping list note"]));
    expect(world.ask.metadata[0]).toMatchObject({ viewDelivery: "completed-action", voiceUi: { uiNotesEditor: "saved-note-v1" } });
    await rendered(() => expect(world.notes.views[0]).toMatchObject({ path: "claim", body: { viewId: "notes", targetProtocol: "saved-note-v1" } }));
    await rendered(async () => {
      expect(results()).toEqual([{ switched: true, shown: { kind: "saved-note", noteId: "shopping" } }]);
      const shell = await alpha.runtime.runPromise(Shell.use((machine) => machine.get()));
      const editor = await alpha.runtime.runPromise(Editor.use((machine) => machine.get()));
      expect([showing(shell, "Notes"), editor.showing, editorTitle()]).toEqual([true, true, "shopping list"]);
    });
  });
});
