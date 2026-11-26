// @vitest-environment happy-dom
import { Effect, Stream } from "effect";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Dock } from "../gen/app__assistant__dock.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Canvas } from "../gen/app__shell__keyboard.effect.vibe";
import type { Dock as DockState } from "../gen/app__assistant__dock.ts";
import type { Shell as ShellState } from "../gen/app__shell.ts";
import assistant from "../src/assistant/index.tsx";
import { button, closeAll, drawn, fill, only, open, pressOnTop, until, seen } from "./alpha.tsx";
import { closeAllDocks, mountDock } from "./dock-support.tsx";
import { scene } from "./fakes/scene.ts";
import tokens from "@repo/design-system/tokens.json" with { type: "json" };

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(closeAllDocks);
afterEach(closeAll);

const underAct = async (work: () => Promise<void> | void) => {
  await act(async () => { await work(); });
};

const named = <T extends HTMLElement>(name: string) => document.querySelector<T>(`[aria-label="${name}"]`);
const detent = () => document.querySelector<HTMLElement>('section[aria-label="Ask Alpha"]')?.dataset.alphaDetent;

async function showAttachments() {
  await underAct(() => {
    named("Chat actions")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  const attach = [...document.querySelectorAll<HTMLElement>("[role=menuitem]")].find((item) => item.textContent === "Attach media");
  expect(attach).toBeDefined();
  await underAct(() => { attach?.click(); });
  await expect.poll(() => named("Attach files")).not.toBeNull();
}

type DockRuntime = Awaited<ReturnType<typeof mountDock>>["runtime"];

/** Wait until the shell is in a state `ok` admits. */
const shellReaches = (runtime: DockRuntime, ok: (state: ShellState) => boolean) =>
  runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, ok))));

/** Wait until the dock is in a state `ok` admits. */
const dockReaches = (runtime: DockRuntime, ok: (state: DockState) => boolean) =>
  runtime.runPromise(Effect.flatMap(Dock, (m) => Stream.runHead(Stream.filter(m.changes, ok))));

/** Ask Alpha rests as the whole bar, not tucked into the pill. */
async function expectWholeBar(runtime: DockRuntime) {
  expect((await runtime.runPromise(Effect.flatMap(Dock, (m) => m.get()))).tucked).toBe(false);
  expect(document.querySelector("[data-alpha-input-bar]")).not.toBeNull();
  expect(document.querySelector("[data-alpha-compact-dock]")).toBeNull();
}

/** Wait until Ask Alpha rests at `detent`. */
const resting = (runtime: DockRuntime, detent: "Bar" | "Typing") => shellReaches(runtime, (s) => s.assistant === detent);

/** Ask Alpha rests on the bar and Calendar is still the app shown. */
const restsOverCalendar = async (runtime: Awaited<ReturnType<typeof mountDock>>["runtime"]) =>
  expect(await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()))).toMatchObject({ trail: ["Calendar"], assistant: "Bar" });

/** The dock mounted over Calendar, typing from its compact bar with the field focused. */
async function typingOverCalendar() {
  const { runtime } = await mountDock({ view: "Calendar", flush: underAct });
  await act(async () => {
    document.querySelector<HTMLButtonElement>("[data-alpha-compact-dock] button[aria-label='Type']")?.click();
    await resting(runtime, "Typing");
  });
  const textarea = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
  await drawn(() => { textarea?.focus(); });
  return { runtime, textarea };
}

describe("Ask Alpha dock and shell navigation", () => {
  // spec/app/assistant/attachments.md, "Story: Choose files to attach"; spec/app/assistant/attachments.md, "Cancel closes the picker, and files still being read are not attached"
  it("reviews local Files and only attaches the confirmed selection to the draft", async () => {
    const { alpha } = await open(scene(), only("home", "assistant", "notice"));
    const runtime = assistant.runtime(alpha);
    await until(alpha, runtime, Composer, (state) => state.slot === "Open");
    await until(alpha, runtime, Conversation, (state) => state.context.revision > 0);
    const file = new File(["notes for the appointment"], "appointment.txt", { type: "text/plain" });
    const pick = async () => {
      const source = [...document.querySelectorAll<HTMLButtonElement>('[aria-label="Attachment sources"] button')].find((item) => item.textContent === "Files");
      expect(source).toBeDefined();
      await underAct(() => { source?.click(); });
      await expect.poll(() => named("Select files")).not.toBeNull();
      const input = named<HTMLInputElement>("Select files");
      await underAct(() => {
        if (!input) return;
        Object.defineProperty(input, "files", { value: [file] });
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await expect.poll(() => named("Remove appointment.txt from the selection")).not.toBeNull();
      expect(named("Attached")).toBeNull();
    };

    await showAttachments();
    expect(detent()).toBe("bar");
    await pick();
    await underAct(() => { named("Close attachments")?.click(); });
    expect(named("Attach files")).toBeNull();
    expect(named("Attached")).toBeNull();
    expect(detent()).toBe("bar");

    await showAttachments();
    await pick();
    await underAct(() => { named("Attach selected files")?.click(); });
    await expect.poll(() => named("Attach files")).toBeNull();
    await expect.poll(detent).toBe("sheet");
    expect(named("Attached")?.textContent).toContain("appointment.txt");
    expect(document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]")?.value).toBe("");
  });

  it('Stages only unchanged on-device media in the open Ask draft (spec/app/assistant/attachments.md, "Story: Choose files to attach"; spec/app/assistant/attachments.md, "Only the newest listing is shown; a denied folder asks for access, and one that fails offers Retry"; spec/app/assistant/attachments.md, "Attach reads the chosen files once, and adds only those within the type, name and size limits")', async () => {
    const world = { ...scene(), phone: true };
    world.photos.access = { scope: "full", images: "full", videos: "denied" };
    const [changedPhoto, keptPhoto, laterPhoto] = world.photos.rows;
    const path = "Documents/notes.txt";
    const original = world.files.stored.find((file) => file.path === path);
    if (!changedPhoto || !keptPhoto || !laterPhoto || !original) throw new Error("Missing picker fixtures");
    changedPhoto.name = "Park.png";
    world.files.texts[path] = "draft note";

    const { alpha } = await open(world, only("home", "assistant", "notice"));
    await until(alpha, assistant.runtime(alpha), Composer, (state) => state.slot === "Open");
    await until(alpha, assistant.runtime(alpha), Conversation, (state) => state.context.revision > 0);
    await showAttachments();
    await expect.poll(() => [button(changedPhoto.name) !== undefined, button(keptPhoto.name) !== undefined, button("More photos") !== undefined])
      .toEqual([true, true, true]);
    expect(button(laterPhoto.name)).toBeUndefined();

    // spec/app/assistant/attachments.md, "What Android reports is believed: files are listed as soon as access allows, and dropped as soon as it is taken away": returning from another screen reports revoked photo access.
    world.photos.access = { scope: "denied", images: "denied", videos: "denied" };
    await seen(false);
    await seen(true);
    await expect.poll(() => [button(changedPhoto.name), button(keptPhoto.name), Boolean(button("Allow photos access"))]).toEqual([undefined, undefined, true]);
    await pressOnTop("Allow photos access");
    await expect.poll(() => [Boolean(button(changedPhoto.name)), world.photos.promptCount]).toEqual([true, 1]);

    await pressOnTop(changedPhoto.name);
    await expect.poll(() => button(`Remove ${changedPhoto.name} from the selection`)).toBeDefined();
    changedPhoto.revision = "replacement-photo-revision";
    await pressOnTop("Attach selected files");
    await expect.poll(() => named("Attach files")?.querySelector("[role=alert]")?.textContent).toContain(changedPhoto.name);
    expect(named("Attached")).toBeNull();
    expect(detent()).toBe("bar");

    await pressOnTop(keptPhoto.name);
    await expect.poll(() => button(`Remove ${keptPhoto.name} from the selection`)).toBeDefined();
    await pressOnTop("Attach selected files");
    await expect.poll(() => [named("Attach files") === null, named("Attached")?.textContent?.includes(keptPhoto.name)])
      .toEqual([true, true]);
    await expect.poll(detent).toBe("sheet");

    await showAttachments();
    await expect.poll(() => button(keptPhoto.name)).toBeDefined();
    const started = Promise.withResolvers<void>();
    const late = Promise.withResolvers<void>();
    world.photos.listPermittedGate = (query) => {
      if (query !== "Original") return undefined;
      started.resolve();
      return late.promise;
    };
    try {
      await fill("Search photos", "Original");
      await started.promise;
      await pressOnTop("Files");
      await expect.poll(() => button("Documents")).toBeDefined();
      await pressOnTop("Documents");
      await expect.poll(() => button("notes.txt")).toBeDefined();
      await drawn(async () => { late.resolve(); await late.promise; });
      expect(button(laterPhoto.name)).toBeUndefined();
      expect(button("notes.txt")).toBeDefined();
    } finally {
      late.resolve();
    }

    await pressOnTop("notes.txt");
    await expect.poll(() => button("Remove notes.txt from the selection")).toBeDefined();
    world.files.stored.splice(world.files.stored.indexOf(original), 1, { ...original });
    await pressOnTop("Attach selected files");
    await expect.poll(() => named("Attach files")?.querySelector("[role=alert]")?.textContent).toContain("notes.txt");
    expect(named("Attached")?.textContent).not.toContain("notes.txt");

    await pressOnTop("notes.txt");
    await expect.poll(() => button("Remove notes.txt from the selection")).toBeDefined();
    await pressOnTop("Attach selected files");
    await expect.poll(() => [named("Attach files") === null, named("Attached")?.textContent?.includes("notes.txt")])
      .toEqual([true, true]);
    expect(named("Attached")?.textContent).toContain(keptPhoto.name);
    expect([named<HTMLTextAreaElement>("Message Alpha")?.value, world.ask.kept.size, world.ask.said]).toEqual(["", 0, []]);
  });

  // spec/app/assistant/dock.md, "Focusing the composer on the bar raises Ask Alpha to typing"
  it("focusing the composer on the Browser bar types in place without reparenting and marks host chrome (spec/app/assistant/dock.md, \"Focusing the composer on the bar raises Ask Alpha to typing\")", async () => {
    const { runtime } = await mountDock({ view: "Browser", withToast: true, flush: underAct });
    const section = document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']");
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    expect(section?.getAttribute("data-alpha-detent")).toBe("bar");
    expect(document.querySelectorAll("[data-host-chrome]").length).toBeGreaterThanOrEqual(3);
    expect(textarea?.placeholder).toBe("Ask about this page");

    await act(async () => {
      textarea?.focus();
      await shellReaches(runtime, (s) => s.assistant === "Typing");
    });
    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Canvas, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.field === "Composer"))));
    });

    expect(document.querySelector("textarea[data-alpha-composer]")).toBe(textarea);
    expect(document.activeElement).toBe(textarea);
    expect(section?.getAttribute("data-alpha-detent")).toBe("bar");
  });

  // spec/app/shell/index.md, "Ask Alpha rises to typing, a sheet or the full screen"
  it.each(["Calendar", "Settings"] as const)("opens the wide composer from %s's compact dock without opening the sheet", async (view) => {
    const { runtime } = await mountDock({ view, flush: underAct });
    const dock = document.querySelector("[data-alpha-compact-dock]");
    const field = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    expect(field?.hidden).toBe(true);
    expect(Array.from(dock?.querySelectorAll("button") ?? [], (button) => button.getAttribute("aria-label"))).toEqual(["Open conversation", "Type", "Talk"]);

    await act(async () => {
      dock?.querySelector<HTMLButtonElement>("button[aria-label='Type']")?.click();
      await runtime.runPromise(Effect.flatMap(Shell, (machine) => Stream.runHead(Stream.filter(machine.changes, (state) => state.assistant === "Typing"))));
    });

    expect(field).toBe(document.querySelector("textarea[data-alpha-composer]"));
    expect(document.activeElement).toBe(field);
    expect(field?.hidden).toBe(false);
    expect(document.querySelector("section[aria-label='Ask Alpha']")?.getAttribute("data-alpha-detent")).toBe("bar");

    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Canvas, (machine) => Stream.runHead(Stream.filter(machine.changes, (state) => state.field === "Composer"))));
      await runtime.runPromise(Effect.flatMap(Canvas, (machine) => machine.send({ type: "keyboardReported", shown: true, voice: false })));
      await runtime.runPromise(Effect.flatMap(Canvas, (machine) => machine.send({ type: "keyboardReported", shown: false, voice: false })));
      await runtime.runPromise(Effect.flatMap(Shell, (machine) => Stream.runHead(Stream.filter(machine.changes, (state) => state.assistant === "Bar"))));
    });
    expect(field?.hidden).toBe(true);

    await act(async () => {
      document.querySelector<HTMLButtonElement>("button[aria-label='Open conversation']")?.click();
      await runtime.runPromise(Effect.flatMap(Shell, (machine) => Stream.runHead(Stream.filter(machine.changes, (state) => state.assistant === "Sheet"))));
    });

    expect(document.querySelector("section[aria-label='Ask Alpha']")?.getAttribute("data-alpha-detent")).toBe("sheet");
  });

  // spec/app/assistant/dock.md, "A tap of Alpha's mark opens the sheet, and a tap of the open sheet's handle fills the screen"; spec/app/assistant/dock.md, "Ask Alpha put away forgets the height its sheet was left at"
  it("tapping Open conversation opens Sheet without the keyboard, its handle fills the screen, and Back lowers Sheet to Bar clearing kept height (spec/app/assistant/dock.md, \"A tap of Alpha's mark opens the sheet, and a tap of the open sheet's handle fills the screen\")", async () => {
    const { runtime } = await mountDock({ view: "Home", withToast: true, flush: underAct });
    const openBtn = document.querySelector<HTMLButtonElement>("button[aria-label='Open conversation']");
    expect(openBtn).not.toBeNull();

    await act(async () => {
      openBtn?.click();
      await shellReaches(runtime, (s) => s.assistant === "Sheet");
    });
    expect(document.activeElement).not.toBe(document.querySelector("textarea[data-alpha-composer]"));

    await act(async () => {
      document.querySelector<HTMLButtonElement>("button[aria-label='Resize chat']")?.click();
      await shellReaches(runtime, (s) => s.assistant === "Full");
      await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "goBack" })));
    });
    expect((await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()))).assistant).toBe("Sheet");

    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Dock, (m) => m.send({ type: "press", detent: "Sheet", now: 100 })));
      await runtime.runPromise(Effect.flatMap(Dock, (m) => m.send({ type: "drag" })));
      await runtime.runPromise(Effect.flatMap(Dock, (m) => m.send({ type: "release", direction: "Up", flick: false, height: 420, floor: 80, full: 800, now: 200 })));
    });
    expect((await runtime.runPromise(Effect.flatMap(Dock, (m) => m.get()))).kept).toBe(525);

    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "goBack" })));
      await dockReaches(runtime, (s) => s.kept === 0);
    });
    expect((await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()))).assistant).toBe("Bar");
  });

  // spec/app/assistant/dock.md, "Story: Drag Ask Alpha where I want it"; spec/app/assistant/dock.md, "A drag released asks the shell once for where it landed, and keeps a sheet's height"
  it("the sheet follows the finger from Alpha's mark on the bar and lands where the drag is released (spec/app/assistant/dock.md, \"Story: Drag Ask Alpha where I want it\")", async () => {
    const { runtime } = await mountDock({ view: "Home", flush: underAct });
    const section = () => document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']");
    const at = (type: string, y: number, target: EventTarget = window) =>
      underAct(() => { target.dispatchEvent(new PointerEvent(type, { bubbles: true, clientY: y, pointerId: 5, pointerType: "touch", isPrimary: true })); });
    const shell = () => runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()));
    const pressed = () => dockReaches(runtime, (s) => s.gesture !== "Idle");

    const mark = document.querySelector<HTMLElement>("button[aria-label='Open conversation']");
    expect(mark).not.toBeNull();
    await at("pointerdown", 700, mark ?? window);
    await at("pointermove", 650, mark ?? window);
    await underAct(async () => { await pressed(); });
    await at("pointermove", 500, section() ?? window);
    expect([section()?.getAttribute("data-alpha-detent"), section()?.style.height]).toEqual(["sheet", "290px"]);
    expect((await shell()).assistant).toBe("Bar");
    await at("pointerup", 500, section() ?? window);
    await act(async () => { await shellReaches(runtime, (s) => s.assistant === "Sheet"); });

    // spec/app/assistant/dock.md, "A released drag lands on the bar, a sheet at a height, or the full screen": pulled to the floor by its handle, the open sheet follows and rests on the bar
    const handle = document.querySelector<HTMLElement>("button[aria-label='Resize chat']");
    expect(handle).not.toBeNull();
    await at("pointerdown", 400, handle ?? window);
    await underAct(async () => { await pressed(); });
    await at("pointermove", 500, handle ?? window);
    await at("pointermove", 740, handle ?? window);
    expect([section()?.style.height, section()?.style.opacity]).toEqual(["0px", "0"]);
    await at("pointerup", 740, handle ?? window);
    await act(async () => { await shellReaches(runtime, (s) => s.assistant === "Bar"); });
    // spec/app/assistant/dock.md, "Story: Drag Ask Alpha where I want it": as v119's retire did (45f6bed30 chat-overlay-motion-adapter.ts:613-651), the bar is Ask Alpha at once while the sheet fades over it
    await act(async () => { await Effect.runPromise(Effect.sleep("700 millis")); });
    expect(section()?.getAttribute("data-alpha-detent")).toBe("bar");
  });

  // spec/app/assistant/dock.md, "Story: Drag Ask Alpha where I want it": a sheet put away hands over to the bar at once, whose Talk is its own button and never the sheet's black one
  it("puts the sheet away onto a bar whose Talk was never the sheet's (spec/app/assistant/dock.md, \"Story: Drag Ask Alpha where I want it\")", async () => {
    const { runtime } = await mountDock({ view: "Home", flush: underAct, speech: { onTalk: () => undefined } });
    const section = () => document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']");
    const settled = (detent: "Sheet" | "Bar") => act(async () => { await shellReaches(runtime, (s) => s.assistant === detent); });
    await underAct(() => { named<HTMLButtonElement>("Open conversation")?.click(); });
    await settled("Sheet");
    const sheetTalk = section()?.querySelector<HTMLButtonElement>("button[aria-label='Talk']");
    expect(sheetTalk?.className).toContain("bg-foreground");
    await underAct(() => { named<HTMLButtonElement>("Minimize chat")?.click(); });
    await settled("Bar");
    const barTalk = section()?.querySelector<HTMLButtonElement>("button[aria-label='Talk']");
    expect([section()?.getAttribute("data-alpha-detent"), barTalk === sheetTalk, barTalk?.className.includes("bg-foreground")]).toEqual(["bar", false, false]);
    expect(section()?.hasAttribute("inert")).toBe(false);
  });

  // spec/app/assistant/dock.md, "Story: Drag Ask Alpha where I want it": as v121's chat scrim did, a tap or a drag on the page outside the open sheet lowers it when it ends
  it("a tap or a drag outside the open sheet lowers it to the bar (spec/app/assistant/dock.md, \"Story: Drag Ask Alpha where I want it\")", async () => {
    const { runtime } = await mountDock({ view: "Home", flush: underAct });
    const shell = () => runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()));
    const raise = () => act(async () => {
      await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "raise", detent: "Sheet" })));
    });
    const lowered = () => act(async () => { await shellReaches(runtime, (s) => s.assistant === "Bar"); });
    const on = (target: Element | null, type: string, y: number) =>
      underAct(() => { target?.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: 40, clientY: y, pointerId: 9, pointerType: "touch", isPrimary: true })); });
    const scrim = () => document.querySelector("[data-alpha-chat-scrim]");

    await raise();
    expect((await shell()).assistant).toBe("Sheet");
    await on(scrim(), "pointerdown", 120);
    await on(scrim(), "pointerup", 120);
    await lowered();

    await raise();
    expect(scrim()).not.toBeNull();
    await on(scrim(), "pointerdown", 120);
    await on(scrim(), "pointermove", 160);
    await on(scrim(), "pointermove", 260);
    expect((await shell()).assistant).toBe("Sheet");
    await on(scrim(), "pointerup", 260);
    await lowered();
  });

  // spec/app/assistant/dock.md, "A keyboard closed while typing puts Ask Alpha back on the bar": typing in an app, a tap beside the bar only leaves the field, so Ask Alpha rests once and the app stays
  it("a tap beside the bar being typed in rests it without leaving the app (spec/app/assistant/dock.md, \"A keyboard closed while typing puts Ask Alpha back on the bar\")", async () => {
    const { runtime } = await typingOverCalendar();
    const scrim = document.querySelector("[data-alpha-chat-scrim]");
    expect(scrim).not.toBeNull();
    await act(async () => {
      scrim?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 40, clientY: 120, pointerId: 11, pointerType: "touch", isPrimary: true }));
      scrim?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 40, clientY: 120, pointerId: 11, pointerType: "touch", isPrimary: true }));
      await resting(runtime, "Bar");
    });
    await act(async () => { await Effect.runPromise(Effect.sleep("50 millis")); });
    await restsOverCalendar(runtime);
  });

  // spec/app/assistant/dock.md, "A keyboard closed while typing puts Ask Alpha back on the bar": a field left with no keyboard report rests it once, and the reported close after it takes no step Back out of the app
  it("leaving the field being typed in rests Ask Alpha once (spec/app/assistant/dock.md, \"A keyboard closed while typing puts Ask Alpha back on the bar\")", async () => {
    const { runtime, textarea } = await typingOverCalendar();
    await act(async () => {
      textarea?.blur();
      await resting(runtime, "Bar");
      await runtime.runPromise(Effect.flatMap(Canvas, (m) => m.send({ type: "keyboardReported", shown: true, voice: false })));
      await runtime.runPromise(Effect.flatMap(Canvas, (m) => m.send({ type: "keyboardReported", shown: false, voice: false })));
    });
    await restsOverCalendar(runtime);
  });

  // spec/app/shell/index.md, "Agent navigation shows an admitted app or Home without lowering Ask Alpha"
  it("agent navigation moves between admitted apps and Home while keeping Ask Alpha raised (spec/app/shell/index.md, \"Agent navigation shows an admitted app or Home without lowering Ask Alpha\")", async () => {
    const { runtime } = await mountDock({ view: "Home", withToast: true, flush: underAct });
    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "raise", detent: "Sheet" })));
      await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "agentOpenView", view: "Browser" })));
    });
    expect(await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()))).toMatchObject({ trail: ["Browser"], assistant: "Sheet" });

    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "agentGoHome" })));
    });
    expect(await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()))).toMatchObject({ trail: [], assistant: "Sheet" });
  });

  // spec/app/assistant/dock.md, "Pulled down from the bar or from typing, Ask Alpha rests on the bar"; spec/app/assistant/dock.md, "Inside an app other than the Browser, Ask Alpha at rest is the pill; Type raises it to typing, where the whole bar shows, and a swipe up from it opens the sheet"
  it("swiping down on the resting bar tucks Home and Browser into the pill, Type untucks it, and closing an open sheet rests on the bar first", async () => {
    const { runtime } = await mountDock({ view: "Home", flush: underAct, speech: { onTalk: () => undefined } });
    const dockState = () => runtime.runPromise(Effect.flatMap(Dock, (m) => m.get()));
    const shellState = () => runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()));
    const swipeDown = async (target: Element | null, pointerId: number) => {
      expect(target).not.toBeNull();
      const send = (type: string, y: number) =>
        underAct(() => { target?.dispatchEvent(new PointerEvent(type, { bubbles: true, clientY: y, pointerId, pointerType: "touch", isPrimary: true })); });
      await send("pointerdown", 700);
      await send("pointermove", 720);
      await send("pointermove", 770);
      await send("pointerup", 770);
    };

    expect(document.querySelector("[data-alpha-input-bar]")).not.toBeNull();
    expect(document.querySelector("[data-alpha-compact-dock]")).toBeNull();
    expect((await dockState()).tucked).toBe(false);

    const mark = named("Open conversation");
    const bar = document.querySelector<HTMLElement>("[data-alpha-input-bar]");
    expect(mark).not.toBeNull();
    await underAct(() => { mark?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientY: 700, pointerId: 21, pointerType: "touch", isPrimary: true })); });
    await underAct(() => { mark?.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientY: 740, pointerId: 21, pointerType: "touch", isPrimary: true })); });
    expect(bar?.style.transform).toBe("translateY(40px)");
    expect(Number(bar?.style.opacity)).toBeLessThan(1);
    expect(detent()).toBe("bar");
    await underAct(() => { mark?.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientY: 770, pointerId: 21, pointerType: "touch", isPrimary: true })); });
    await underAct(() => { mark?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientY: 770, pointerId: 21, pointerType: "touch", isPrimary: true })); });
    await expect.poll(async () => (await dockState()).tucked).toBe(true);
    expect((await shellState()).assistant).toBe("Bar");
    expect(Array.from(document.querySelectorAll("[data-alpha-compact-dock] button"), (btn) => btn.getAttribute("aria-label")))
      .toEqual(["Open conversation", "Type", "Talk"]);
    expect(document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]")?.hidden).toBe(true);

    const pillType = document.querySelector<HTMLButtonElement>("[data-alpha-compact-dock] button[aria-label='Type']");
    await underAct(() => { pillType?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientY: 760, pointerId: 24, pointerType: "touch", isPrimary: true })); });
    await underAct(() => { pillType?.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientY: 800, pointerId: 24, pointerType: "touch", isPrimary: true })); });
    expect(detent()).toBe("bar");
    await underAct(() => { pillType?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientY: 800, pointerId: 24, pointerType: "touch", isPrimary: true })); });
    expect(detent()).toBe("bar");

    await act(async () => {
      document.querySelector<HTMLButtonElement>("[data-alpha-compact-dock] button[aria-label='Type']")?.click();
      await resting(runtime, "Typing");
    });
    await expect.poll(async () => (await dockState()).tucked).toBe(false);
    const field = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    expect(document.querySelector("[data-alpha-compact-dock]")).toBeNull();
    expect(field?.hidden).toBe(false);
    expect(document.activeElement).toBe(field);

    await act(async () => {
      field?.blur();
      await resting(runtime, "Bar");
    });
    await expectWholeBar(runtime);

    await act(async () => {
      field?.focus();
      await resting(runtime, "Typing");
    });
    await swipeDown(field, 22);
    await expect.poll(async () => [(await shellState()).assistant, (await dockState()).tucked]).toEqual(["Bar", true]);
    expect(document.activeElement).not.toBe(field);
    expect(document.querySelector("[data-alpha-compact-dock]")).not.toBeNull();

    await act(async () => { await Effect.runPromise(Effect.sleep("450 millis")); });
    await act(async () => {
      named<HTMLButtonElement>("Open conversation")?.click();
      await shellReaches(runtime, (s) => s.assistant === "Sheet");
    });
    await expect.poll(async () => (await dockState()).tucked).toBe(false);
    await act(async () => {
      named<HTMLButtonElement>("Minimize chat")?.click();
      await resting(runtime, "Bar");
    });
    await expectWholeBar(runtime);

    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "openView", view: "Browser" })));
    });
    const browserField = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    await act(async () => {
      browserField?.focus();
      await resting(runtime, "Typing");
    });
    await swipeDown(browserField, 23);
    await expect.poll(async () => [(await shellState()).trail, (await shellState()).assistant, (await dockState()).tucked])
      .toEqual([["Browser"], "Bar", true]);
    expect(document.querySelector("[data-alpha-compact-dock]")).not.toBeNull();

    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "goBack" })));
    });
    await expect.poll(async () => [(await shellState()).trail, (await dockState()).tucked]).toEqual([[], false]);
    expect(document.querySelector("[data-alpha-input-bar]")).not.toBeNull();
  });

  // spec/app/assistant/dock.md, "A short, slow pull of the bar or the pill leaves Ask Alpha where it was"
  it("a short slow pull down while Typing keeps Typing and focus intact, clears inline paint, and respects reduced motion", async () => {
    const { runtime } = await mountDock({ view: "Home", flush: underAct, speech: { onTalk: () => undefined } });
    const dockState = () => runtime.runPromise(Effect.flatMap(Dock, (m) => m.get()));
    const shellState = () => runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()));
    const field = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    const bar = document.querySelector<HTMLElement>("[data-alpha-input-bar]");
    expect(field).not.toBeNull();
    expect(bar).not.toBeNull();

    await act(async () => {
      field?.focus();
      await resting(runtime, "Typing");
    });
    expect(document.activeElement).toBe(field);

    const slowShortPull = async (pointerId: number, checkMidDrag = false) => {
      const send = (type: string, y: number) =>
        underAct(() => { field?.dispatchEvent(new PointerEvent(type, { bubbles: true, clientY: y, pointerId, pointerType: "touch", isPrimary: true })); });
      await send("pointerdown", 700);
      await act(async () => { await Effect.runPromise(Effect.sleep("50 millis")); });
      await send("pointermove", 712);
      if (checkMidDrag) {
        expect(document.activeElement).toBe(field);
        expect((await shellState()).assistant).toBe("Typing");
        expect(bar?.style.transform).toBe("translateY(12px)");
        expect(Number(bar?.style.opacity)).toBeLessThan(1);
      }
      await act(async () => { await Effect.runPromise(Effect.sleep("50 millis")); });
      await send("pointerup", 712);
      await act(async () => { await Effect.runPromise(Effect.sleep("50 millis")); });
    };

    await slowShortPull(31, true);
    expect((await shellState()).assistant).toBe("Typing");
    expect((await dockState()).tucked).toBe(false);
    expect(document.activeElement).toBe(field);
    expect(document.querySelector("[data-alpha-compact-dock]")).toBeNull();
    expect([bar?.style.transform, bar?.style.opacity, bar?.style.transition, bar?.style.animation]).toEqual(["", "", "", ""]);

    const animateDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "animate");
    let animateCalls = 0;
    let reduced = true;
    /** A slow short pull leaves Ask Alpha typing in the focused field with the bar unstyled, after `animations` animations in all. */
    const pullStaysTyping = async (pointerId: number, animations: number) => {
      await slowShortPull(pointerId);
      expect(animateCalls).toBe(animations);
      expect((await shellState()).assistant).toBe("Typing");
      expect(document.activeElement).toBe(field);
      expect([bar?.style.transform, bar?.style.opacity, bar?.style.transition, bar?.style.animation]).toEqual(["", "", "", ""]);
    };
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      writable: true,
      value: () => {
        animateCalls += 1;
        return { finished: Promise.resolve(), cancel: () => undefined };
      },
    });
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    Object.defineProperty(reducedQuery, "matches", { configurable: true, get: () => reduced });
    const originalMatch = window.matchMedia.bind(window);
    const media = vi.spyOn(window, "matchMedia").mockImplementation((query) => query === "(prefers-reduced-motion: reduce)" ? reducedQuery : originalMatch(query));
    try {
      await pullStaysTyping(32, 0);

      reduced = false;
      await pullStaysTyping(33, 1);
    } finally {
      media.mockRestore();
      if (animateDescriptor) Object.defineProperty(HTMLElement.prototype, "animate", animateDescriptor);
      else Reflect.deleteProperty(HTMLElement.prototype, "animate");
    }
  });

  // spec/app/assistant/dock.md, "Pulled down from the bar or from typing, Ask Alpha rests on the bar"; spec/app/assistant/dock.md, "Inside an app other than the Browser, Ask Alpha at rest is the pill; Type raises it to typing, where the whole bar shows, and a swipe up from it opens the sheet"
  it("swiping down while Typing inside Notes settles cleanly to the pill with zero leftover inline styles", async () => {
    const { runtime } = await mountDock({ view: "Notes", flush: underAct, speech: { onTalk: () => undefined } });
    const dockState = () => runtime.runPromise(Effect.flatMap(Dock, (m) => m.get()));
    const shellState = () => runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()));

    expect(document.querySelector("[data-alpha-pill]")).not.toBeNull();
    expect(document.querySelector("[data-alpha-input-bar]")).toBeNull();

    await act(async () => {
      document.querySelector<HTMLButtonElement>("[data-alpha-compact-dock] button[aria-label='Type']")?.click();
      await resting(runtime, "Typing");
    });
    const field = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    const dockEl = document.querySelector<HTMLElement>("[data-alpha-input-bar]");
    expect(field).not.toBeNull();
    expect(dockEl).not.toBeNull();
    expect(document.activeElement).toBe(field);

    const send = (type: string, y: number, pointerId: number) =>
      underAct(() => { field?.dispatchEvent(new PointerEvent(type, { bubbles: true, clientY: y, pointerId, pointerType: "touch", isPrimary: true })); });

    await send("pointerdown", 700, 41);
    await send("pointermove", 720, 41);
    await send("pointermove", 770, 41);
    expect(document.activeElement).toBe(field);
    expect((await shellState()).assistant).toBe("Typing");
    expect(dockEl?.hasAttribute("data-alpha-input-bar")).toBe(true);
    expect(dockEl?.hasAttribute("data-alpha-pill")).toBe(false);
    expect(dockEl?.style.transform).toBe("translateY(70px)");
    expect(Number(dockEl?.style.opacity)).toBeLessThan(1);

    await send("pointerup", 770, 41);
    await expect.poll(async () => [(await shellState()).trail, (await shellState()).assistant, (await dockState()).tucked])
      .toEqual([["Notes"], "Bar", true]);
    expect(document.activeElement).not.toBe(field);
    const pill = document.querySelector<HTMLElement>("[data-alpha-pill]");
    expect(pill).toBe(dockEl);
    expect([pill?.style.transform, pill?.style.opacity, pill?.style.transition, pill?.style.animation]).toEqual(["", "", "", ""]);

    await act(async () => { await Effect.runPromise(Effect.sleep("450 millis")); });
    await act(async () => {
      document.querySelector<HTMLButtonElement>("[data-alpha-compact-dock] button[aria-label='Type']")?.click();
      await resting(runtime, "Typing");
    });
    const barAgain = document.querySelector<HTMLElement>("[data-alpha-input-bar]");
    expect(barAgain).toBe(dockEl);
    expect([barAgain?.style.transform, barAgain?.style.opacity, barAgain?.style.transition, barAgain?.style.animation]).toEqual(["", "", "", ""]);

    // spec/app/assistant/dock.md, "Inside an app other than the Browser, Ask Alpha at rest is the pill; Type raises it to typing, where the whole bar shows, and a swipe up from it opens the sheet": even if an external blur swaps the bar to the pill mid-drag, releasing clears paint on the exact painted element.
    await send("pointerdown", 700, 42);
    await send("pointermove", 730, 42);
    expect(barAgain?.style.transform).toBe("translateY(30px)");
    await act(async () => {
      field?.blur();
      await resting(runtime, "Bar");
    });
    expect(barAgain?.hasAttribute("data-alpha-pill")).toBe(true);
    await send("pointerup", 730, 42);
    expect([barAgain?.style.transform, barAgain?.style.opacity, barAgain?.style.transition, barAgain?.style.animation]).toEqual(["", "", "", ""]);
  });

  // spec/app/assistant/dock.md, "Pulled down from the bar or from typing, Ask Alpha rests on the bar": the bar keeps the finger's paint until the pill is drawn in its place, which then has no entrance, as v119's
  it("a bar swiped down to the pill never shows at rest first", async () => {
    const { runtime } = await mountDock({ view: "Home", flush: underAct, speech: { onTalk: () => undefined } });
    const bar = document.querySelector<HTMLElement>("[data-alpha-input-bar]");
    const mark = named("Open conversation");
    expect([bar, mark].includes(null)).toBe(false);
    if (!bar || !mark) return;
    const risen: Parameters<HTMLElement["animate"]>[] = [];
    bar.animate = (...args: Parameters<HTMLElement["animate"]>) => {
      risen.push(args);
      return { finished: Promise.resolve(), cancel: () => undefined } as unknown as Animation;
    };
    const cleared: boolean[] = [];
    const removeProperty = bar.style.removeProperty.bind(bar.style);
    bar.style.removeProperty = (name: string) => {
      if (name === "transform" && bar.style.transform !== "") cleared.push(bar.hasAttribute("data-alpha-pill"));
      return removeProperty(name);
    };
    const send = (type: string, y: number) =>
      underAct(() => { mark.dispatchEvent(new PointerEvent(type, { bubbles: true, clientY: y, pointerId: 51, pointerType: "touch", isPrimary: true })); });
    await send("pointerdown", 700);
    await send("pointermove", 740);
    await send("pointermove", 770);
    expect(bar.style.transform).toBe("translateY(70px)");
    await send("pointerup", 770);
    await expect.poll(async () => (await runtime.runPromise(Effect.flatMap(Dock, (m) => m.get()))).tucked).toBe(true);
    await vi.waitFor(() => expect(bar.hasAttribute("data-alpha-pill")).toBe(true));
    expect([cleared, bar.style.transform, bar.style.opacity, risen]).toEqual([[true], "", "", []]);
  });

  // spec/app/assistant/dock.md, "Inside an app other than the Browser, Ask Alpha at rest is the pill; Type raises it to typing, where the whole bar shows, and a swipe up from it opens the sheet": the bar Type raises from the pill rises on the design system's rise
  it("Type raises the pill to the bar on the rise token", async () => {
    const { runtime } = await mountDock({ view: "Calendar", flush: underAct });
    const pill = document.querySelector<HTMLElement>("[data-alpha-pill]");
    expect(pill).not.toBeNull();
    if (!pill) return;
    const risen: Parameters<HTMLElement["animate"]>[] = [];
    pill.animate = (...args: Parameters<HTMLElement["animate"]>) => {
      risen.push(args);
      return { finished: Promise.resolve(), cancel: () => undefined } as unknown as Animation;
    };
    await act(async () => {
      document.querySelector<HTMLButtonElement>("[data-alpha-compact-dock] button[aria-label='Type']")?.click();
      await resting(runtime, "Typing");
    });
    expect(pill.hasAttribute("data-alpha-input-bar")).toBe(true);
    const [frames, options] = risen.at(-1) ?? [];
    const [from] = Array.isArray(frames) ? frames : [];
    const timing = typeof options === "object" ? options : undefined;
    expect(risen).toHaveLength(1);
    expect(tokens.keyframes.rise).toContain(`transform:${String(from?.transform)}`);
    expect(tokens.animate.rise).toContain(`${String(timing?.duration)}ms ${String(timing?.easing)}`);
  });

  // spec/app/assistant/dock.md, "Pulled down from the bar or from typing, Ask Alpha rests on the bar"
  it("swiping down from an open Sheet rests on the wide Bar first without tucking to the pill", async () => {
    const { runtime } = await mountDock({ view: "Home", flush: underAct, speech: { onTalk: () => undefined } });
    const dockState = () => runtime.runPromise(Effect.flatMap(Dock, (m) => m.get()));
    const shellState = () => runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()));
    const pressed = () => dockReaches(runtime, (s) => s.gesture !== "Idle");

    await act(async () => {
      named<HTMLButtonElement>("Open conversation")?.click();
      await shellReaches(runtime, (s) => s.assistant === "Sheet");
    });
    const handle = document.querySelector<HTMLElement>("button[aria-label='Resize chat']");
    expect(handle).not.toBeNull();
    const at = (type: string, y: number) =>
      underAct(() => { handle?.dispatchEvent(new PointerEvent(type, { bubbles: true, clientY: y, pointerId: 51, pointerType: "touch", isPrimary: true })); });
    await at("pointerdown", 400);
    await underAct(async () => { await pressed(); });
    await at("pointermove", 500);
    await at("pointermove", 740);
    await at("pointerup", 740);
    await act(async () => { await resting(runtime, "Bar"); });
    expect((await shellState()).assistant).toBe("Bar");
    await expectWholeBar(runtime);
  });

  // spec/app/assistant/search.md, "Story: Search my conversations"; spec/app/assistant/attachments.md, "Story: Choose files to attach"
  it("the Chat actions menu offers only Attach media and Search chat on the resting bar and open sheet", async () => {
    const { runtime } = await mountDock({ view: "Home", flush: underAct });
    const menuItems = () => [...document.querySelectorAll<HTMLElement>("[role=menuitem]")].map((item) => item.textContent);
    const offersAttachAndSearch = async () => {
      await underAct(() => {
        named("Chat actions")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      });
      expect(menuItems()).toEqual(["Attach media", "Search chat"]);
    };

    await offersAttachAndSearch();
    await underAct(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    await act(async () => {
      named<HTMLButtonElement>("Open conversation")?.click();
      await shellReaches(runtime, (s) => s.assistant === "Sheet");
    });
    await offersAttachAndSearch();
  });
});
