// @vitest-environment happy-dom
import { Effect } from "effect";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Editor, waiting } from "../gen/app__notes__editor.effect.vibe";
import { Machine as Voice } from "../gen/app__notes__voice.effect.vibe";
import { Machine as List, nothing, writing as listWriting } from "../gen/app__notes.effect.vibe";
import { Machine as Talk } from "../gen/app__voice.effect.vibe";
import { Machine as Shell, showing } from "../gen/app__shell.effect.vibe";
import assistant from "../src/assistant/index.tsx";
import { Views } from "../src/assistant/views.vibe";
import { agentOpen } from "../src/notes/agent.vibe";
import { numberOf } from "../src/notes/content.vibe";
import notes from "../src/notes/index.tsx";
import { untimed } from "../src/runtime/reactor.vibe";
import { closeAll, drawn, fill, only, open, press, underAct, until } from "./alpha.tsx";
import { note, prepared } from "./fakes/notes.ts";
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

  it("The agent opens the note I named, and only that, only for my request now (spec/app/notes/index.md, \"The agent opens the one note the owner named, as the list last read it, once for the owner's current request, and is told whether it opened\"; spec/app/notes/note.md, \"Only the owner opens a dialog or a question in Notes; a note is opened by the owner, or by the agent for the one the owner just named; and nothing opens while anything else of Notes is open\"; spec/app/assistant/index.md, \"Story: Let Alpha open what it is talking about\")", async () => {
    const world = scene();
    world.notes.notes.push(note("shopping", "shopping list", "", Date.now(), { kind: "list", data: { items: [{ t: "milk", done: false }] } }));
    world.notes.target = "shopping";
    const { alpha } = await open(world, only("assistant", "view:Notes"));
    const runtime = assistant.runtime(alpha);
    await until(alpha, runtime, Composer, (s) => s.slot === "Open");
    await until(alpha, runtime, Conversation, (s) => s.ready);
    const editor = () => alpha.runtime.runPromise(Effect.flatMap(Editor, (e) => e.get()));
    const list = () => alpha.runtime.runPromise(Effect.flatMap(List, (l) => l.get()));
    const title = () => document.querySelector<HTMLInputElement>("input[aria-label='Title']")?.value;
    const results = () => world.notes.views.filter((one) => one.path === "result").map((one) => one.body.result);
    const ask = async (text: string, actions: boolean) => {
      world.ask.nextReplyChunks = ["Here it is."];
      world.ask.nextActions = actions ? (metadata) => [prepared(String((metadata as { viewClientId?: unknown }).viewClientId), "notes", true)] : undefined;
      const turn = (await runtime.runPromise(Effect.flatMap(Conversation, (c) => c.get()))).turn.send.id + 1;
      act(() => {
        const box = document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Message Alpha']");
        if (!box) throw new Error("no composer");
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(box, text);
        box.dispatchEvent(new Event("input", { bubbles: true }));
      });
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
    expect([(await editor()).showing, title(), showing(await alpha.runtime.runPromise(Shell.use((shell) => shell.get())), "Notes")]).toEqual([true, "shopping list", true]);

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
    expect([title(), (await list()).agentTurn]).toEqual(["Enclave launch", n]);

    // spec/app/notes/index.md, "The agent opens at most one note for each request of the owner's, only for the request that is current, and never over anything of Notes": a second open for the same request, an older request, a sensitive screen, a link note, and a text note over an open voice note open nothing.
    expect(await opens("groceries", named(n))).toBe(false);
    expect(title()).toBe("Enclave launch");
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
    expect([title(), (await list()).filter]).toEqual(["Groceries", 0]);
    await press("Done");
    await until(alpha, alpha.runtime, Editor, (e) => !e.showing && !waiting(e));

    // spec/app/notes/note.md, "Only the owner opens a dialog or a question in Notes; a note is opened by the owner, or by the agent for the one the owner just named; and nothing opens while anything else of Notes is open": never over unsaved words, which stay as they were, unsaved, with Notes as it was.
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
    expect([results()[2], title()]).toEqual([{ switched: true, shown: { kind: "saved-note", noteId: "shopping" } }, "shopping list"]);
  });

  it("The agent opens the note I named aloud (spec/app/assistant/context.md, \"A spoken turn carries what a typed turn sent at that moment would, the view claim included\"; spec/app/notes/index.md, \"The agent opens the one note the owner named, as the list last read it, once for the owner's current request, and is told whether it opened\")", async () => {
    const world = { ...scene(), phone: true };
    for (const kind of ["draft", "folders"]) world.slots.add(`notes-${kind}:${numberOf("owner", world.notes.owner)}`);
    world.notes.notes.push(note("shopping", "shopping list", "", Date.now(), { kind: "list", data: { items: [{ t: "milk", done: false }] } }));
    world.notes.target = "shopping";
    const { alpha } = await open(world, only("assistant", "view:Notes"));
    const runtime = assistant.runtime(alpha);
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
    await drawn(() => vi.waitFor(() => expect(world.ask.said).toEqual(["open my shopping list note"])));
    expect(world.ask.metadata[0]).toMatchObject({ viewDelivery: "completed-action", voiceUi: { uiNotesEditor: "saved-note-v1" } });
    await drawn(() => vi.waitFor(() => expect(results()).toHaveLength(1)));
    expect(results()).toEqual([{ switched: true, shown: { kind: "saved-note", noteId: "shopping" } }]);
    expect([(await alpha.runtime.runPromise(Editor.use((e) => e.get()))).showing, document.querySelector<HTMLInputElement>("input[aria-label='Title']")?.value]).toEqual([true, "shopping list"]);
  });
});
