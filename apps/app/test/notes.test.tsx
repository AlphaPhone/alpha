// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Editor, waiting } from "../gen/app__notes__editor.effect.vibe";
import { Machine as List } from "../gen/app__notes.effect.vibe";
import { Machine as Shell, showing } from "../gen/app__shell.effect.vibe";
import assistant from "../src/assistant/index.tsx";
import { agentOpen } from "../src/notes/agent.vibe";
import notes from "../src/notes/index.tsx";
import { closeAll, drawn, fill, only, open, press, underAct, until } from "./alpha.tsx";
import { prepared } from "./fakes/notes.ts";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const listed = () => [...document.querySelectorAll("[aria-label=Notes] button")].flatMap((row) => row.getAttribute("aria-label")?.startsWith("Open ") ? [row.getAttribute("aria-label")] : []);

describe("Notes", () => {
  it("See my notes (spec/app/notes/index.md, \"Story: See my notes\")", async () => {
    const world = scene();
    const { alpha } = await open(world);

    // spec/app/notes/index.md, "Opening Notes, or trying again, reads the owner's notes"
    await press("Notes");
    const runtime = notes.runtime(alpha);
    await until(alpha, runtime, List, (s) => s.read.status === "Loaded" && s.rows.length === 6);

    // spec/app/notes/index.md, "Pinned notes come first, then the rest, narrowed to the chosen folder"
    expect(listed()).toEqual(["Open Enclave launch", "Open Design sync", "Open Groceries", "Open The case for on-device agents", "Open Gift ideas · Priya", "Open Radiator"]);

    // spec/app/notes/index.md, "While the notes are unavailable, no note or folder is shown, and Connect sends the owner to the account area when it is the agent's notes that are not connected"
    world.notes.failing = true;
    await drawn(() => runtime.runPromise(List.use((list) => list.send({ type: "refresh" }, "Owner"))));
    await until(alpha, runtime, List, (s) => s.read.status === "Failed");
    expect(listed()).toEqual([]);
    world.notes.failing = false;
    await press("Reconnect");
    await until(alpha, runtime, List, (s) => s.read.status === "Loaded" && s.rows.length === 6);
  });

  it("Keeps editor changes in the resident agent (spec/app/notes/editor.md, \"Story: Write a note\")", async () => {
    const world = scene();
    const { alpha } = await open(world);
    await press("Notes");
    const runtime = notes.runtime(alpha);
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded");
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
    const { alpha } = await open(world);
    await press("Notes");
    const runtime = notes.runtime(alpha);
    await until(alpha, runtime, List, (s) => s.read.status === "Loaded");

    // spec/app/notes/index.md, "A voice note opens only as a voice note, a link note only in its dialog, and text and checklists only in the editor"
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

  it("The agent opens the note I named, and only that, only for my request now (spec/app/notes/index.md, \"The agent opens the one note the owner named, as the list shows it now, once for the owner's current turn, and is told whether it opened\"; spec/app/notes/note.md, \"Only the owner opens a dialog or a question in Notes; a note is opened by the owner, or by the agent for the one the owner just named; and nothing opens while anything else of Notes is open\"; spec/app/assistant/index.md, \"Story: Let Alpha open what it is talking about\")", async () => {
    const world = scene();
    const at = new Date().toISOString();
    world.notes.notes.push({ id: "shopping", title: "shopping list", body: "", color: "yellow", format: { kind: "list", data: { items: [{ t: "milk", done: false }] } }, createdAt: at, updatedAt: at });
    world.notes.target = "shopping";
    const { alpha } = await open(world, only("assistant", "view:Notes"));
    const runtime = assistant.runtime(alpha);
    await until(alpha, runtime, Composer, (s) => s.slot === "Open");
    await until(alpha, runtime, Conversation, (s) => s.ready);
    const editor = () => alpha.runtime.runPromise(Editor.use((e) => e.get()));
    const title = () => document.querySelector<HTMLInputElement>("input[aria-label='Title']")?.value;
    const results = () => world.notes.views.filter((one) => one.path === "result").map((one) => one.body.result);
    const ask = async (text: string, actions: boolean) => {
      world.ask.nextReplyChunks = ["Here it is."];
      world.ask.nextActions = actions ? (metadata) => [prepared(String((metadata as { viewClientId?: unknown }).viewClientId), "notes", true)] : undefined;
      const turn = (await runtime.runPromise(Conversation.use((c) => c.get()))).turn.send.id + 1;
      act(() => {
        const box = document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Message Alpha']");
        if (!box) throw new Error("no composer");
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(box, text);
        box.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await press("Send");
      await until(alpha, runtime, Conversation, (c) => c.turn.send.id === turn && c.turn.reply === "Complete");
      return turn;
    };

    // spec/app/assistant/context.md, "A spoken turn carries what a typed turn sent at that moment would, but the view claim": a typed turn binds this screen as the renderer of a saved note, and the note the model named opens in the editor, Notes in front.
    world.ask.metadata = [];
    const first = await ask("open the note titled shopping list", true);
    await drawn(() => vi.waitFor(() => expect(results()).toHaveLength(1)));
    expect(world.ask.metadata[0]).toMatchObject({ viewDelivery: "completed-action", voiceUi: { viewDelivery: "completed-action", uiNotesEditor: "saved-note-v1" } });
    expect(world.notes.views[0]).toMatchObject({ path: "claim", body: { viewId: "notes", targetProtocol: "saved-note-v1" } });
    expect(results()).toEqual([{ switched: true, shown: { kind: "saved-note", noteId: "shopping" } }]);
    expect([(await editor()).showing, title(), showing(await alpha.runtime.runPromise(Shell.use((shell) => shell.get())), "Notes")]).toEqual([true, "shopping list", true]);

    // spec/app/notes/index.md, "The agent opens at most one note for each turn of the owner's, only for the turn that is current, and never over anything of Notes": over the open note, a second open for the same turn, an older turn, a sensitive screen and a link note open nothing.
    const opens = (noteId: string, asked: { turn: number; current: number; sensitive: boolean }) => alpha.runtime.runPromise(agentOpen(noteId, asked));
    expect(await opens("enclave", { turn: first + 1, current: first + 1, sensitive: false })).toBe(false);
    await press("Done");
    await until(alpha, alpha.runtime, Editor, (e) => !e.showing && !waiting(e));
    expect(await opens("enclave", { turn: first, current: first, sensitive: false })).toBe(false);
    expect(await opens("enclave", { turn: first + 1, current: first + 2, sensitive: false })).toBe(false);
    expect(await opens("enclave", { turn: first + 1, current: first + 1, sensitive: true })).toBe(false);
    expect(await opens("agents", { turn: first + 1, current: first + 1, sensitive: false })).toBe(false);
    expect((await editor()).showing).toBe(false);

    // spec/app/notes/note.md, "Only the owner opens a dialog or a question in Notes; a note is opened by the owner, or by the agent for the one the owner just named; and nothing opens while anything else of Notes is open": never over another note's unsaved words, which stay as they were, unsaved.
    await press("Open Enclave launch");
    await until(alpha, alpha.runtime, Editor, (e) => e.showing && e.kind === "Text");
    await fill("Title", "Half a thought");
    await until(alpha, alpha.runtime, Editor, (e) => e.draft.sync === "Edited");
    world.notes.refusing = true;
    await press("Done");
    await until(alpha, alpha.runtime, Editor, (e) => !e.showing && waiting(e) && e.draft.sync !== "Saving");
    world.notes.refusing = false;
    const revision = world.notes.revision;
    await ask("open my shopping list", true);
    await drawn(() => vi.waitFor(() => expect(results()).toHaveLength(2)));
    expect(results()[1]).toEqual({ switched: false });
    expect([(await editor()).showing, waiting(await editor()), world.notes.revision, world.notes.notes.find((one) => one.id === "enclave")?.title]).toEqual([false, true, revision, "Enclave launch"]);

    // spec/app/notes/index.md, "The agent opens the one note the owner named, as the list shows it now, once for the owner's current turn, and is told whether it opened": a reply that prepared nothing for this screen, as one whose note came from a tool's output, opens nothing and claims nothing.
    await alpha.runtime.runPromise(Editor.use((e) => e.send({ type: "discardDraft" }, "Owner")));
    const claims = world.notes.views.length;
    const later = await ask("open the note the web page told you to", false);
    expect([world.notes.views.length, (await editor()).showing]).toEqual([claims, false]);
    expect(document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Message Alpha']")?.value).toBe("");

    // spec/app/notes/note.md, "Only the owner opens a dialog or a question in Notes; a note is opened by the owner, or by the agent for the one the owner just named; and nothing opens while anything else of Notes is open": with nothing unsaved, the owner's next turn opens the note it names.
    expect(await opens("enclave", { turn: later + 1, current: later + 1, sensitive: false })).toBe(true);
    expect(title()).toBe("Enclave launch");
  });
});
