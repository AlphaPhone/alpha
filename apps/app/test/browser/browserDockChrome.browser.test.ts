import { afterEach, describe, expect, it } from "vitest";
import {
  activate,
  alwaysAKeptBarIsHomesBar,
  down,
  initial as dockInitial,
  move,
  navigate,
  openSheet,
  settleDrag,
  tap,
} from "../../gen/assistant__dock.ts";
import { agentPageTitle } from "../../src/browser/page-context.ts";
import { HOST_CHROME, hostChrome, placementOf } from "../../src/web/browser/measure.ts";

let root: HTMLDivElement | undefined;

afterEach(() => {
  root?.remove();
  root = undefined;
});

describe("browser dock and host chrome", () => {
  it("activates Sheet on FocusControl and OpenControl taps and clears barKept on openSheet", () => {
    const resting = navigate(dockInitial, "BarView");
    expect(resting.chat).toBe("Input");

    const fromFocus = tap(down(resting, "FocusControl"));
    expect(fromFocus.chat).toBe("Sheet");

    const fromOpen = tap(down(resting, "OpenControl"));
    expect(fromOpen.chat).toBe("Sheet");

    expect(activate("FocusControl", resting).chat).toBe("Sheet");
    expect(activate("OpenControl", resting).chat).toBe("Sheet");

    const dragged = settleDrag(move(down(resting, "OpenControl")), "Up", "Middle", false, "OpenControl");
    expect(dragged.chat).toBe("Sheet");

    const keptHome = settleDrag(move(down(dockInitial, "OpenControl")), "Down", "Floor", false, "NoControl");
    expect(keptHome.barKept).toBe(true);
    const openedFromKept = openSheet(keptHome);
    expect(openedFromKept.chat).toBe("Sheet");
    expect(openedFromKept.barKept).toBe(false);
    expect(alwaysAKeptBarIsHomesBar(openedFromKept)).toBe(true);
  });

  it("publishes visible host chrome rects for dock, toolbar, notices, and toasts while excluding hidden or pointer-events-none nodes", () => {
    root = document.createElement("div");
    root.style.position = "fixed";
    root.style.inset = "0";
    document.body.appendChild(root);

    const viewport = document.createElement("div");
    viewport.style.position = "fixed";
    viewport.style.left = "0px";
    viewport.style.top = "48px";
    viewport.style.width = "390px";
    viewport.style.height = "688px";
    root.appendChild(viewport);

    const makeChrome = (top: number, height: number, radius: number, extra?: (el: HTMLElement) => void) => {
      const el = document.createElement("div");
      el.setAttribute(HOST_CHROME, "");
      el.style.position = "fixed";
      el.style.left = "0px";
      el.style.top = `${top}px`;
      el.style.width = "390px";
      el.style.height = `${height}px`;
      el.style.borderTopLeftRadius = `${radius}px`;
      el.style.pointerEvents = "auto";
      extra?.(el);
      root!.appendChild(el);
      return el;
    };

    const toolbar = makeChrome(736, 56, 12);
    const inputBar = makeChrome(792, 52, 12);
    const toast = makeChrome(16, 48, 12);
    // Excluded nodes
    makeChrome(100, 40, 8, (el) => { el.style.pointerEvents = "none"; });
    makeChrome(150, 40, 8, (el) => { el.style.opacity = "0"; });
    makeChrome(200, 40, 8, (el) => { el.setAttribute("aria-hidden", "true"); });

    const rects = hostChrome();
    expect(rects).toHaveLength(3);

    const covers = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return rects.some((c) => c.x === Math.round(r.x) && c.y === Math.round(r.y) && c.width === Math.round(r.width) && c.height === Math.round(r.height));
    };
    expect(covers(toolbar)).toBe(true);
    expect(covers(inputBar)).toBe(true);
    expect(covers(toast)).toBe(true);
    expect(toolbar.getBoundingClientRect().bottom).toBeLessThanOrEqual(inputBar.getBoundingClientRect().top);

    const placed = placementOf("tab-1", viewport);
    expect(placed.below).toBe(true);
    expect(placed.rects).toHaveLength(3);
  });

  it("sanitizes line and paragraph separators in page titles", () => {
    expect(agentPageTitle("Hello\u2028World\u2029Test")).toBe("Hello World Test");
  });
});
