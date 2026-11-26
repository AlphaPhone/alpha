// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Toasts } from "../gen/app__notices__toasts.effect.vibe";
import { Machine as Layers } from "../gen/app__shell__layers.effect.vibe";
import { keep, offer, say, withdraw } from "../src/notices/toasts.vibe";
import { button, closeAll, drawn, later, only, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

/** The toast region: the shell's one live status region, never another screen's quiet status such as Ask Alpha's composer while it connects. */
const region = () => document.querySelector("[data-alpha-toast-region][role=status][aria-live]");
const toast = () => region()?.textContent;
const live = () => region()?.getAttribute("aria-live");

describe("the toasts", () => {
  // spec/app/notices/toasts.md, "Story: Read a toast before it goes"; spec/app/notices/toasts.md, "Story: Keep an Undo in reach"; spec/app/notices/toasts.md, "Story: Keep what I must not miss"
  it("Read a toast before it goes, keep an Undo in reach and keep what I must not miss (spec/app/notices/toasts.md, \"Story: Read a toast before it goes\"; spec/app/notices/toasts.md, \"Story: Keep an Undo in reach\"; spec/app/notices/toasts.md, \"Story: Keep what I must not miss\")", async () => {
    const { alpha } = await open(scene());
    let undone = 0;

    // spec/app/notices/toasts.md, "A toast stays 1.9 seconds, a long one 50 milliseconds a character and half a second more up to 12 seconds, and a change is offered for Undo at least 10 seconds; all are stretched by Android's scale"
    await alpha.runtime.runPromise(say("Saved"));
    await until(alpha, alpha.runtime, Toasts, (t) => t.showing);
    expect([toast(), live()]).toEqual(["Saved", "polite"]);
    await later(alpha, 1_900);
    await until(alpha, alpha.runtime, Toasts, (t) => !t.showing);

    // spec/app/notices/toasts.md, "A toast is shown at once unless an Undo shows; behind an Undo, an Undo waits its turn and a plain toast waits, giving way to a newer plain one; nothing shows during startup, and what was raised then waits"
    await alpha.runtime.runPromise(offer("Deleted Lunch", "notes", 1, Effect.sync(() => { undone += 1; })));
    await alpha.runtime.runPromise(say("Couldn't share", true));
    await later(alpha, 30_000);
    expect(toast()).toContain("Deleted Lunch");

    // spec/app/notices/toasts.md, "Tapping Undo passes the tap on once, naming the change of the toast showing, and the next toast waiting is shown"
    await press("Undo");
    await until(alpha, alpha.runtime, Toasts, (t) => t.showing && !t.current.undo);
    expect([undone, toast(), live()]).toEqual([1, "Couldn't share", "assertive"]);

    // spec/app/notices/toasts.md, "The area that raised an Undo toast withdraws it, showing or waiting, once its change can no longer be undone"
    await alpha.runtime.runPromise(offer("Archived a message", "inbox", 2, Effect.sync(() => { undone += 1; })));
    await until(alpha, alpha.runtime, Toasts, (t) => t.current.undo);
    await alpha.runtime.runPromise(withdraw("inbox", 2));
    await until(alpha, alpha.runtime, Toasts, (t) => !t.current.undo);
    expect(undone).toBe(1);

    // spec/app/notices/toasts.md, "An area keeps a notice under its own name and number, once; at most three are listed, and a fourth pushes out the oldest"
    await alpha.runtime.runPromise(keep("Your recording was not saved", "camera", 1));
    await until(alpha, alpha.runtime, Toasts, (t) => t.kept.length === 1);
    await later(alpha, 12_000);
    await until(alpha, alpha.runtime, Toasts, (t) => !t.showing);

    // spec/app/notices/toasts.md, "A kept notice stays listed until the owner dismisses it"
    expect(Boolean(button("Dismiss Your recording was not saved"))).toBe(true);
    await press("Dismiss Your recording was not saved");
    await until(alpha, alpha.runtime, Toasts, (t) => t.kept.length === 0);

    // spec/app/notices/toasts.md, "Story: See a toast over a dialog"
    const dialog = document.body.appendChild(document.createElement("div"));
    dialog.setAttribute("role", "dialog");
    await alpha.runtime.runPromise(Layers.use((layers) => layers.send({ type: "openLayer", id: "confirm", kind: "DialogLayer", covers: true })));
    await until(alpha, alpha.runtime, Toasts, (t) => t.dialog === 1);
    await alpha.runtime.runPromise(say("Copied inside dialog"));
    await until(alpha, alpha.runtime, Toasts, (t) => t.showing && t.shownIn === 1);
    expect(dialog.querySelector("[role=status]")?.textContent).toBe("Copied inside dialog");
    await alpha.runtime.runPromise(Layers.use((layers) => layers.send({ type: "closeLayer", id: "confirm" })));
    dialog.remove();
  });

  it("Concurrent raises keep every toast message and focus holds a toast after pointer leave (spec/app/notices/toasts.md, \"Every toast raised is shown at once, or waits\"; spec/app/notices/toasts.md, \"A plain toast the owner is reading is held, and its whole time starts again when they let go\")", async () => {
    const { alpha } = await open(scene(), only("home", "notice"));
    const toastRegion = () => document.querySelector("[role=status][aria-live]")?.textContent;
    await alpha.runtime.runPromise(Effect.all([
      offer("Deleted note", "notes", 1, Effect.void),
      say("Second notice"),
    ], { concurrency: "unbounded" }));
    await until(alpha, alpha.runtime, Toasts, (t) => t.showing && t.current.undo);
    expect(toastRegion()).toContain("Deleted note");
    await press("Undo");
    await until(alpha, alpha.runtime, Toasts, (t) => t.showing && !t.current.undo);
    expect(toastRegion()).toBe("Second notice");

    const card = document.querySelector<HTMLElement>("[role=status][aria-live] > div");
    if (!card) throw new Error("no toast card");
    card.tabIndex = 0;
    await drawn(() => {
      card.focus();
      card.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    });
    await until(alpha, alpha.runtime, Toasts, (t) => t.held);
    await drawn(() => { card.dispatchEvent(new PointerEvent("pointerout", { bubbles: true })); });
    await later(alpha, 5_000);
    expect((await alpha.runtime.runPromise(Toasts.use((m) => m.get()))).showing).toBe(true);
    expect(toastRegion()).toBe("Second notice");
  });
});
