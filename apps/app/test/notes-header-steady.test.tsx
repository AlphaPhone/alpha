// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { Machine as Editor, waiting } from "../gen/app__notes__editor.effect.vibe";
import { Machine as List } from "../gen/app__notes.effect.vibe";
import home from "../src/home/index.tsx";
import notes from "../src/notes/index.tsx";
import { button, closeAll, drawn, fill, later, only, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const rule = "spec/app/notes/actions.md, \"The owner opens the menu over the note the editor shows saved, with nothing else of Notes over it\"";

const rendered = (assert: () => unknown) => vi.waitFor(async () => {
  await drawn(() => undefined);
  await assert();
}, { timeout: 10_000 });

/** The editor header's controls in order, each with whether it can be pressed. */
const header = () => [...button("Turn into checklist")?.parentElement?.querySelectorAll("button") ?? []]
  .map((control) => [control.getAttribute("aria-label") ?? control.textContent, !control.disabled] as const);

describe(`The new note's header stays steady while its first save lands (${rule})`, () => {
  it("draws More disabled beside the checklist button before the first save, so the button does not move when More turns on", async () => {
    const world = scene();
    const { alpha } = await open(world, only("home", "view:Notes", "notice"));
    await rendered(async () => {
      expect((await home.runtime(alpha).runPromise(Home.use((machine) => machine.get()))).tiles.load.status).toBe("Loaded");
      expect(button("Notes")).toBeDefined();
    });
    await press("Notes");
    const runtime = notes.runtime(alpha);
    await until(alpha, runtime, List, (state) => state.read.status === "Loaded");
    await rendered(() => expect(button("New note")).toBeDefined());
    await press("New note");
    await until(alpha, runtime, Editor, (state) => state.showing && state.fresh);

    await rendered(() => expect(header()).toEqual([["Back to notes", true], ["Turn into checklist", true], ["More", false], ["Done", true]]));

    await fill("Note", "Pick up the keys");
    await later(alpha, 800);
    await until(alpha, runtime, Editor, (state) => state.showing && !state.fresh && state.note > 0 && !waiting(state));
    await rendered(() => expect(header()).toEqual([["Back to notes", true], ["Turn into checklist", true], ["More", true], ["Done", true]]));
  });
});
