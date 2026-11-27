// spec/app/shell/index.md, "The shell holds the apps opened on the way here, the Apps drawer, how far Ask Alpha is raised, and what this phone admits"; spec/app/shell/index.md, "Opening another communications app from the stage keeps Ask Alpha open"
// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { Machine as Home } from "../gen/app__home.effect.vibe";
import { Machine as Canvas } from "../gen/app__shell__keyboard.effect.vibe";
import { Machine as Phone } from "../gen/app__phone.effect.vibe";
import { Machine as Comms } from "../gen/app__phone__comms.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import type { Event as ShellEvent } from "../gen/app__shell.ts";
import home from "../src/home/index.tsx";
import { act } from "react";
import { closeAll, drawn, hardware, only, open, press, underAct, until } from "./alpha.tsx";
import { alphaImage, scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);
afterEach(() => { vi.restoreAllMocks(); });

const homeLayer = () => document.querySelector("[data-alpha-home-layer]");
/** The one layer the apps share, drawn right after Home's. */
const appLayer = () => homeLayer()?.nextElementSibling ?? null;
const homeHidden = () => homeLayer()?.classList.contains("invisible") === true;

const tab = (name: string) => drawn(() => {
  const match = Array.from(document.querySelectorAll("[role=tab]")).find((el) => el.textContent === name);
  if (!match) throw new Error(`missing tab ${name}`);
  match.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
});

/** Lay the window out `width` by `height`, as the phone measures its own, until the test ends. */
async function windowSize(width: number, height: number) {
  const entries = [["innerWidth", width], ["innerHeight", height]] as const;
  const previous = entries.map(([prop]) => [prop, Object.getOwnPropertyDescriptor(window, prop)] as const);
  onTestFinished(() => {
    for (const [prop, desc] of previous) if (desc) Object.defineProperty(window, prop, desc);
  });
  for (const [prop, value] of entries) Object.defineProperty(window, prop, { configurable: true, value });
  await drawn(() => window.dispatchEvent(new Event("resize")));
}

/** Where each slide of the app layer started, in order: v119's stage slide is 18% in from the side it comes from. */
function watchSlides(): () => string[] {
  const animate = vi.spyOn(Element.prototype, "animate");
  return () => animate.mock.calls.flatMap(([keyframes], at) =>
    animate.mock.contexts[at] === appLayer() && Array.isArray(keyframes) ? [String(keyframes[0]?.transform)] : []);
}

describe("The app layer (spec/app/shell/index.md, \"Story: Move between Home and the apps\")", () => {
  it("rises from Home each time an app opens from Home, and Home is hidden once the rise is over, however it ended", async () => {
    const { alpha } = await open({ ...scene(), phone: true });
    await press("Notes");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Notes");
    expect([homeHidden(), appLayer()?.classList.contains("motion-safe:animate-rise")]).toEqual([false, true]);
    await drawn(() => appLayer()?.dispatchEvent(new AnimationEvent("animationend", { bubbles: true, animationName: "rise" })));
    expect(homeHidden()).toBe(true);

    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);
    await press("Notes");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Notes");
    const layer = appLayer();
    if (!(layer instanceof HTMLElement)) throw new Error("no app layer");
    // spec/app/shell/index.md, "The shell holds the apps opened on the way here, the Apps drawer, how far Ask Alpha is raised, and what this phone admits": the app rises from Home again, with Home under it until the rise is over.
    expect([homeHidden(), layer.classList.contains("motion-safe:animate-rise")]).toEqual([false, true]);
    // spec/app/shell/index.md, "The shell holds the apps opened on the way here, the Apps drawer, how far Ask Alpha is raised, and what this phone admits": the rise stops before its end, as when its animation is taken away, and no animationend ever follows.
    await drawn(() => {
      layer.style.animation = "none";
      layer.dispatchEvent(new AnimationEvent("animationcancel", { bubbles: true, animationName: "rise" }));
    });
    await vi.waitFor(() => expect(homeHidden()).toBe(true), { timeout: 1_500 });
  });

  it("slides a communications app in from the side while Ask Alpha rests at its sheet, and swaps at once for Phone's own tabs or with Ask Alpha closed", async () => {
    const { alpha, slides, trail } = await stagedPhone(false);

    // spec/app/shell/index.md, "Opening another communications app from the stage keeps Ask Alpha open": with Ask Alpha at rest, Contacts and back swap at once.
    await tab("Contacts");
    await trail("Phone,Contacts");
    await tab("Recents");
    await trail("Phone");
    expect(slides()).toEqual([]);

    await press("Open Alpha");
    await until(alpha, alpha.runtime, Shell, (s) => s.assistant === "Sheet");
    // spec/app/shell/index.md, "Opening another communications app from the stage keeps Ask Alpha open": opening Contacts over Phone slides it in from the right (45f6bed30 prototype/model.js:5766, phone.css:414,416).
    await tab("Contacts");
    await trail("Phone,Contacts");
    expect(slides()).toEqual(["translateX(18%)"]);
    // spec/app/shell/index.md, "Opening another communications app from the stage keeps Ask Alpha open": returning to Phone slides it in from the left (45f6bed30 prototype/model.js:5775, phone.css:415,417).
    await press("Return to Phone");
    await trail("Phone");
    expect(slides()).toEqual(["translateX(18%)", "translateX(-18%)"]);
    await tab("Contacts");
    await trail("Phone,Contacts");
    // spec/app/shell/index.md, "Opening another communications app from the stage keeps Ask Alpha open": Phone's own tabs on its Contacts tab swap at once, as v119's did (45f6bed30 prototype/phone-adapter.ts:263-270).
    await tab("Recents");
    await trail("Phone");
    expect(slides()).toEqual(["translateX(18%)", "translateX(-18%)", "translateX(18%)"]);
    // spec/app/shell/index.md, "Opening another communications app from the stage keeps Ask Alpha open": under reduced motion nothing slides (45f6bed30 prototype/phone.css:418).
    const motion = window.matchMedia.bind(window);
    const reduced = vi.spyOn(window, "matchMedia").mockImplementation((query) => query === "(prefers-reduced-motion: reduce)" ? { ...motion(query), matches: true } : motion(query));
    await tab("Contacts");
    await trail("Phone,Contacts");
    await press("Return to Phone");
    await trail("Phone");
    expect(slides()).toEqual(["translateX(18%)", "translateX(-18%)", "translateX(18%)"]);
    reduced.mockRestore();

    // spec/app/shell/index.md, "Opening another communications app from the stage keeps Ask Alpha open": in landscape the app sits beside the sheet, and swaps at once, as v119's stage did (45f6bed30 prototype/model.js:6286).
    await windowSize(915, 412);
    await until(alpha, alpha.runtime, Canvas, (s) => s.landscape);
    await tab("Contacts");
    await trail("Phone,Contacts");
    expect(slides()).toEqual(["translateX(18%)", "translateX(-18%)", "translateX(18%)"]);
  });

  /** Phone open from Home in portrait, with Ask Alpha raised to its sheet unless `raised` is false, and a watch on the app layer's slides. */
  async function stagedPhone(raised = true) {
    await windowSize(412, 915);
    const world = { ...alphaImage(), now: 1_700_000_400_000 };
    const { alpha } = await open(world, only("home", "assistant", "notice", "phone/stage", "view:Phone", "view:Contacts", "view:Messages"));
    await until(alpha, alpha.runtime, Shell, (s) => s.image && s.contacts);
    await until(alpha, home.runtime(alpha), Home, (s) => s.tiles.load.status === "Loaded");
    await drawn(() => {
      const tile = document.querySelector<HTMLButtonElement>("[data-home-tile='view:Phone']");
      if (!tile) throw new Error("no Phone tile on Home");
      tile.click();
    });
    await until(alpha, alpha.runtime, Phone, (s) => s.front);
    await until(alpha, alpha.runtime, Canvas, (s) => !s.landscape);
    const slides = watchSlides();
    if (raised) {
      await press("Open Alpha");
      await until(alpha, alpha.runtime, Shell, (s) => s.assistant === "Sheet");
    }
    const trail = (shown: string) => until(alpha, alpha.runtime, Shell, (s) => s.trail.join(",") === shown);
    return { world, alpha, slides, trail };
  }

  it("slides back to Phone on Back after the Contacts tab is chosen again on Contacts, since only a return chosen from the tabs swaps at once", async () => {
    const { slides, trail } = await stagedPhone();
    await tab("Contacts");
    await trail("Phone,Contacts");
    // spec/app/shell/index.md, "Opening another communications app from the stage keeps Ask Alpha open": choosing Contacts again on Contacts changes nothing, so the Back after it slides as v119's back() did (45f6bed30 prototype/model.js:6018, :5770-5776).
    await tab("Contacts");
    await drawn(() => {});
    await hardware("back");
    await trail("Phone");
    expect(slides()).toEqual(["translateX(18%)", "translateX(-18%)"]);
  });

  it("slides back to Phone on Back after an earlier return from the tabs, since that return's mark ends with it", async () => {
    const { alpha, slides, trail } = await stagedPhone(false);
    const shell = (event: ShellEvent) => alpha.runtime.runPromise(Effect.flatMap(Shell, (machine) => machine.send(event)));
    await tab("Contacts");
    await trail("Phone,Contacts");
    await tab("Recents");
    await trail("Phone");
    // spec/app/shell/index.md, "Opening another communications app from the stage keeps Ask Alpha open": Contacts opens and Ask Alpha rises with no tap in between, and Back then slides as v119's back() did (45f6bed30 prototype/model.js:6018, :5770-5776).
    await shell({ type: "openView", view: "Contacts" });
    await trail("Phone,Contacts");
    await shell({ type: "raise", detent: "Sheet" });
    await until(alpha, alpha.runtime, Shell, (s) => s.assistant === "Sheet");
    await hardware("back");
    await trail("Phone");
    expect(slides()).toEqual(["translateX(-18%)"]);
  });

  it("slides Phone in over Contacts after a trip Home, since a mark made on Contacts before going Home ends there", async () => {
    const { alpha, slides, trail } = await stagedPhone();
    const shell = (event: ShellEvent) => alpha.runtime.runPromise(Effect.flatMap(Shell, (machine) => machine.send(event)));
    await tab("Contacts");
    await trail("Phone,Contacts");
    // spec/app/shell/index.md, "Opening another communications app from the stage keeps Ask Alpha open": a secondary press on Recents marks a return from the tabs but chooses nothing, so Contacts stays.
    await drawn(() => {
      const recents = Array.from(document.querySelectorAll("[role=tab]")).find((el) => el.textContent === "Recents");
      if (!recents) throw new Error("missing tab Recents");
      recents.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 2 }));
    });
    await trail("Phone,Contacts");
    await hardware("home");
    await trail("");
    // spec/app/shell/index.md, "Opening another communications app from the stage keeps Ask Alpha open": going Home ends that mark, so Phone opened over Contacts from there slides in as v119's stage did (45f6bed30 prototype/model.js:5759-5785).
    await shell({ type: "openView", view: "Contacts" });
    await trail("Contacts");
    await shell({ type: "raise", detent: "Sheet" });
    await until(alpha, alpha.runtime, Shell, (s) => s.assistant === "Sheet");
    await shell({ type: "openCommsView", view: "Phone" });
    await trail("Contacts,Phone");
    expect(slides()).toEqual(["translateX(18%)"]);
  });

  it("swaps at once while an emergency call is live, as v119 never staged one", async () => {
    const { world, alpha, slides, trail } = await stagedPhone();
    world.telephony.live = [{ id: "possible-emergency", state: "active", connectedAt: world.now }];
    world.telephony.emergency = null;
    act(() => world.telephony.report());
    await until(alpha, alpha.runtime, Comms, (s) => s.emergency);
    // spec/app/shell/index.md, "Opening another communications app from the stage keeps Ask Alpha open": an emergency call is never staged, so nothing slides over it (45f6bed30 prototype/model.js:6286).
    await tab("Contacts");
    await trail("Phone,Contacts");
    expect(slides()).toEqual([]);
  });
});
