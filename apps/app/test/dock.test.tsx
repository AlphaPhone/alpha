// @vitest-environment happy-dom
import { Effect, Stream } from "effect";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Conversation } from "../gen/app__assistant.effect.vibe";
import { Machine as Composer } from "../gen/app__assistant__composer.effect.vibe";
import { Machine as Dock } from "../gen/app__assistant__dock.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { Machine as Canvas } from "../gen/app__shell__keyboard.effect.vibe";
import assistant from "../src/assistant/index.tsx";
import { button, closeAll, drawn, fill, only, open, pressOnTop, until, seen } from "./alpha.tsx";
import { closeAllDocks, mountDock } from "./dock-support.tsx";
import { scene } from "./fakes/scene.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(closeAllDocks);
afterEach(closeAll);

const underAct = async (work: () => Promise<void> | void) => {
  await act(async () => { await work(); });
};

const named = <T extends HTMLElement>(name: string) => document.querySelector<T>(`[aria-label="${name}"]`);

async function showAttachments() {
  await underAct(() => {
    named("Chat actions")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  const attach = [...document.querySelectorAll<HTMLElement>("[role=menuitem]")].find((item) => item.textContent === "Attach media");
  expect(attach).toBeDefined();
  await underAct(() => { attach?.click(); });
  await expect.poll(() => named("Attach files")).not.toBeNull();
}

describe("Ask Alpha dock and shell navigation", () => {
  // spec/app/assistant/attachments.md, "Story: Choose files to attach"; "Cancel closes the picker, and files still being read are not attached"
  it("reviews local Files and only attaches the confirmed selection to the draft", async () => {
    const { runtime } = await mountDock({ view: "Home", flush: underAct });
    await underAct(() => runtime.runPromise(Effect.flatMap(Conversation, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.context.revision > 0)))).then(() => undefined));
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
    await pick();
    await underAct(() => { named("Close attachments")?.click(); });
    expect(named("Attach files")).toBeNull();
    expect(named("Attached")).toBeNull();

    await showAttachments();
    await pick();
    await underAct(() => { named("Attach selected files")?.click(); });
    await expect.poll(() => named("Attach files")).toBeNull();
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

    await pressOnTop(keptPhoto.name);
    await expect.poll(() => button(`Remove ${keptPhoto.name} from the selection`)).toBeDefined();
    await pressOnTop("Attach selected files");
    await expect.poll(() => [named("Attach files") === null, named("Attached")?.textContent?.includes(keptPhoto.name)])
      .toEqual([true, true]);

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

  // spec/app/assistant/dock.md, "Focusing or tapping the composer on the bar opens Ask Alpha as a sheet"
  it("focusing the composer on the Browser bar opens half-open Sheet without reparenting and marks host chrome (spec/app/assistant/dock.md, \"Focusing or tapping the composer on the bar opens Ask Alpha as a sheet\")", async () => {
    const { runtime } = await mountDock({ view: "Browser", withToast: true, flush: underAct });
    const section = document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']");
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    expect(section?.getAttribute("data-alpha-detent")).toBe("bar");
    expect(document.querySelectorAll("[data-host-chrome]").length).toBeGreaterThanOrEqual(3);
    expect(textarea?.placeholder).toBe("Ask about this page");

    await act(async () => {
      textarea?.focus();
      await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    });
    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Canvas, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.field === "Composer"))));
    });

    expect(document.querySelector("textarea[data-alpha-composer]")).toBe(textarea);
    expect(document.activeElement).toBe(textarea);
    expect(section?.getAttribute("data-alpha-detent")).toBe("sheet");
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

  // spec/app/assistant/dock.md, "Focusing or tapping the composer on the bar opens Ask Alpha as a sheet"; spec/app/assistant/dock.md, "Ask Alpha put away forgets the height its sheet was left at"
  it("tapping Open conversation focuses the composer and Back lowers Sheet to Bar clearing kept height (spec/app/assistant/dock.md, \"Focusing or tapping the composer on the bar opens Ask Alpha as a sheet\")", async () => {
    const { runtime } = await mountDock({ view: "Home", withToast: true, flush: underAct });
    const openBtn = document.querySelector<HTMLButtonElement>("button[aria-label='Open conversation']");
    expect(openBtn).not.toBeNull();

    await act(async () => {
      openBtn?.click();
      await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet"))));
    });
    expect(document.activeElement).toBe(document.querySelector("textarea[data-alpha-composer]"));

    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Dock, (m) => m.send({ type: "press", detent: "Sheet", now: 100 })));
      await runtime.runPromise(Effect.flatMap(Dock, (m) => m.send({ type: "drag" })));
      await runtime.runPromise(Effect.flatMap(Dock, (m) => m.send({ type: "release", direction: "Up", flick: false, height: 420, floor: 80, full: 800, now: 200 })));
    });
    expect((await runtime.runPromise(Effect.flatMap(Dock, (m) => m.get()))).kept).toBe(420);

    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "goBack" })));
      await runtime.runPromise(Effect.flatMap(Dock, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.kept === 0))));
    });
    expect((await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()))).assistant).toBe("Bar");
  });

  // spec/app/assistant/dock.md, "Story: Drag Ask Alpha where I want it"; spec/app/assistant/dock.md, "A drag released asks the shell once for where it landed, and keeps a sheet's height"
  it("the sheet follows the finger from Alpha's mark on the bar and lands where the drag is released (spec/app/assistant/dock.md, \"Story: Drag Ask Alpha where I want it\")", async () => {
    const { runtime } = await mountDock({ view: "Home", flush: underAct });
    const section = () => document.querySelector<HTMLElement>("section[aria-label='Ask Alpha']");
    const at = (type: string, y: number, target: EventTarget = window) =>
      underAct(() => { target.dispatchEvent(new PointerEvent(type, { bubbles: true, clientY: y, pointerId: 5, pointerType: "touch" })); });
    const shell = () => runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()));
    const pressed = () => runtime.runPromise(Effect.flatMap(Dock, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.gesture === "Pressed"))));

    const mark = document.querySelector<HTMLElement>("button[aria-label='Open conversation']");
    expect(mark).not.toBeNull();
    await at("pointerdown", 700, mark ?? window);
    await underAct(async () => { await pressed(); });
    await at("pointermove", 650, mark ?? window);
    await at("pointermove", 500, mark ?? window);
    expect([section()?.getAttribute("data-alpha-detent"), section()?.style.height]).toEqual(["sheet", "302px"]);
    expect((await shell()).assistant).toBe("Bar");
    await at("pointerup", 500, mark ?? window);
    await act(async () => { await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Sheet")))); });

    // spec/app/assistant/dock.md, "A released drag lands on the bar, a sheet at a height, or the full screen": pulled to the floor by its handle, the open sheet follows and rests on the bar
    const handle = document.querySelector<HTMLElement>("button[aria-label='Resize chat']");
    expect(handle).not.toBeNull();
    await at("pointerdown", 400, handle ?? window);
    await underAct(async () => { await pressed(); });
    await at("pointermove", 500, handle ?? window);
    await at("pointermove", 740, handle ?? window);
    expect(section()?.style.height).toBe("102px");
    await at("pointerup", 740, handle ?? window);
    await act(async () => { await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Bar")))); });
    expect(section()?.getAttribute("data-alpha-detent")).toBe("bar");
  });

  // spec/app/assistant/dock.md, "Story: Drag Ask Alpha where I want it": as v121's chat scrim did, a tap or a drag on the page outside the open sheet lowers it when it ends
  it("a tap or a drag outside the open sheet lowers it to the bar (spec/app/assistant/dock.md, \"Story: Drag Ask Alpha where I want it\")", async () => {
    const { runtime } = await mountDock({ view: "Home", flush: underAct });
    const shell = () => runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()));
    const raise = () => act(async () => {
      await runtime.runPromise(Effect.flatMap(Shell, (m) => m.send({ type: "raise", detent: "Sheet" })));
    });
    const lowered = () => act(async () => { await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Bar")))); });
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
    const { runtime } = await mountDock({ view: "Calendar", flush: underAct });
    await act(async () => {
      document.querySelector<HTMLButtonElement>("[data-alpha-compact-dock] button[aria-label='Type']")?.click();
      await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Typing"))));
    });
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    await act(async () => { textarea?.focus(); });
    const scrim = document.querySelector("[data-alpha-chat-scrim]");
    expect(scrim).not.toBeNull();
    await act(async () => {
      scrim?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 40, clientY: 120, pointerId: 11, pointerType: "touch", isPrimary: true }));
      scrim?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 40, clientY: 120, pointerId: 11, pointerType: "touch", isPrimary: true }));
      await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Bar"))));
    });
    await act(async () => { await Effect.runPromise(Effect.sleep("50 millis")); });
    expect(await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()))).toMatchObject({ trail: ["Calendar"], assistant: "Bar" });
  });

  // spec/app/assistant/dock.md, "A keyboard closed while typing puts Ask Alpha back on the bar": a field left with no keyboard report rests it once, and the reported close after it takes no step Back out of the app
  it("leaving the field being typed in rests Ask Alpha once (spec/app/assistant/dock.md, \"A keyboard closed while typing puts Ask Alpha back on the bar\")", async () => {
    const { runtime } = await mountDock({ view: "Calendar", flush: underAct });
    await act(async () => {
      document.querySelector<HTMLButtonElement>("[data-alpha-compact-dock] button[aria-label='Type']")?.click();
      await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Typing"))));
    });
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea[data-alpha-composer]");
    await act(async () => { textarea?.focus(); });
    await act(async () => {
      textarea?.blur();
      await runtime.runPromise(Effect.flatMap(Shell, (m) => Stream.runHead(Stream.filter(m.changes, (s) => s.assistant === "Bar"))));
      await runtime.runPromise(Effect.flatMap(Canvas, (m) => m.send({ type: "keyboardReported", shown: true, voice: false })));
      await runtime.runPromise(Effect.flatMap(Canvas, (m) => m.send({ type: "keyboardReported", shown: false, voice: false })));
    });
    expect(await runtime.runPromise(Effect.flatMap(Shell, (m) => m.get()))).toMatchObject({ trail: ["Calendar"], assistant: "Bar" });
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
});
