// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Machine as List } from "../gen/app__notes.effect.vibe";
import { Machine as Editor } from "../gen/app__notes__editor.effect.vibe";
import notes from "../src/notes/index.tsx";
import { closeAll, drawn, fill, open, press, underAct, until } from "./alpha.tsx";
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
    await until(alpha, runtime, List, (s) => s.read.status === "Loaded" && s.version === world.notes.revision);
  });
});
