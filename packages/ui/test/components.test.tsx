// @vitest-environment happy-dom
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Bell, Pencil } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mapState = vi.hoisted(() => ({
  markers: [] as { element: HTMLElement; removed: boolean }[],
}));

vi.mock("maplibre-gl", () => {
  class Marker {
    readonly element: HTMLElement;
    removed = false;
    constructor(options?: { element?: HTMLElement }) {
      this.element = options?.element ?? document.createElement("div");
      mapState.markers.push(this);
    }
    getElement() { return this.element; }
    setLngLat() { return this; }
    addTo() { return this; }
    remove() { this.removed = true; }
  }
  class Map {
    private handlers = new globalThis.Map<string, (() => void)[]>();
    once(event: string, fn: () => void) { this.on(event, fn); }
    on(event: string, fn: () => void) {
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), fn]);
      if (event === "load") fn();
    }
    addSource() {}
    addLayer() {}
    getSource() { return { setData() {} }; }
    easeTo() {}
    fitBounds() {}
    getZoom() { return 14; }
    getBearing() { return 0; }
    getPitch() { return 0; }
    getBounds() { return { getNorth: () => 1, getSouth: () => 0, getEast: () => 1, getWest: () => 0 }; }
    getCanvas() { return { focus() {} }; }
    getContainer() { return document.body; }
    zoomIn() {}
    zoomOut() {}
    remove() {}
  }
  class LngLatBounds {
    extend() { return this; }
  }
  return {
    Map,
    Marker,
    LngLatBounds,
    setWorkerUrl() {},
    addProtocol() {},
    removeProtocol() {},
  };
});

import { AssistantDeviceReceipt } from "../src/components/assistant/AssistantDeviceReceipt.tsx";
import { AssistantGrabber, type AssistantRelease } from "../src/components/assistant/AssistantGrabber.tsx";
import { AssistantMessage } from "../src/components/assistant/AssistantMessage.tsx";
import { BrowserMenu } from "../src/components/browser/BrowserMenu.tsx";
import { BrowserTabs } from "../src/components/browser/BrowserTabs.tsx";
import { CalendarEventMenu, CalendarEventPage } from "../src/components/calendar/CalendarEventPage.tsx";
import { CalendarChip } from "../src/components/calendar/CalendarForm.tsx";
import { HomeTileGrid } from "../src/components/home/HomeTileGrid.tsx";
import { InboxMessageRow } from "../src/components/inbox/InboxMessageRow.tsx";
import { MapView } from "../src/components/MapView.tsx";
import { ChatComposer } from "../src/components/messaging/ChatComposer.tsx";
import { PhotosMenu } from "../src/components/photos/PhotosMenu.tsx";
import { Progress } from "../src/components/Progress.tsx";
import { SettingsNetworkPage } from "../src/components/settings/SettingsNetworkPage.tsx";
import { StartupMark } from "../src/components/startup/StartupMark.tsx";
import { StartupSurface } from "../src/components/startup/StartupSurface.tsx";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | undefined;
let root: Root | undefined;

function render(element: ReactElement) {
  if (!host) {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  }
  act(() => { root!.render(element); });
  return host;
}

afterEach(() => {
  if (root) {
    act(() => { root!.unmount(); });
    root = undefined;
  }
  host?.remove();
  host = undefined;
  mapState.markers.length = 0;
});

function pointer(type: string, init: PointerEventInit & { timeStamp?: number }) {
  const event = new PointerEvent(type, { bubbles: true, cancelable: true, isPrimary: true, button: 0, pointerId: 1, ...init });
  if (init.timeStamp !== undefined) Object.defineProperty(event, "timeStamp", { value: init.timeStamp });
  return event;
}

function drag(target: HTMLElement, points: readonly [number, number][]) {
  act(() => {
    points.forEach(([clientY, timeStamp], index) => {
      const type = index === 0 ? "pointerdown" : index === points.length - 1 ? "pointerup" : "pointermove";
      target.dispatchEvent(pointer(type, { pointerId: 1, clientY, timeStamp }));
    });
  });
}

const noop = () => undefined;

describe("UI component contracts", () => {
  // spec/app/startup/index.md, "Story: Show the surface that fits"
  it("shows the startup mark instead of a blank screen while presentation is unknown even after connection resolves", () => {
    const container = render(
      <StartupSurface
        presentation="Launcher"
        known={false}
        connection="Connected"
        homeTakesInput={false}
        home={<h1>Home</h1>}
      />,
    );
    expect(container.querySelector('[role="status"][aria-label="Loading Alpha"]')).not.toBeNull();
    expect(container.querySelector("h1")).toBeNull();
  });

  // spec/app/assistant/dock.md, "Story: Drag Ask Alpha where I want it"
  it("does not report a zero-delta or paused release as a flick, and ignores secondary pointers", () => {
    const releases: AssistantRelease[] = [];
    const cancels: number[] = [];
    const container = render(
      <AssistantGrabber
        onRelease={(release) => releases.push(release)}
        onCancel={({ now }) => cancels.push(now)}
      />,
    );
    const button = container.querySelector("button")!;

    drag(button, [[400, 100], [360, 200], [360, 200], [360, 200]]);
    expect(releases).toHaveLength(1);
    expect(releases[0]?.flick).toBe(false);

    releases.length = 0;
    drag(button, [[400, 100], [300, 120], [300, 620]]);
    expect(releases).toHaveLength(1);
    expect(releases[0]?.flick).toBe(false);

    releases.length = 0;
    act(() => {
      button.dispatchEvent(pointer("pointerdown", { pointerId: 1, clientY: 400, timeStamp: 100 }));
      button.dispatchEvent(pointer("pointermove", { pointerId: 1, clientY: 320, timeStamp: 140 }));
      button.dispatchEvent(pointer("pointerdown", { pointerId: 2, isPrimary: false, clientY: 500, timeStamp: 150 }));
      button.dispatchEvent(pointer("pointerup", { pointerId: 2, isPrimary: false, clientY: 500, timeStamp: 160 }));
      button.dispatchEvent(pointer("pointerup", { pointerId: 1, clientY: 310, timeStamp: 180 }));
    });
    expect(cancels).toHaveLength(0);
    expect(releases).toHaveLength(1);
    expect(releases[0]?.y).toBe(310);
  });

  // spec/app/messages/composer.md, "Story: Let Alpha suggest a draft"; spec/app/startup/index.md, "Story: Wait for the agent"
  it("uses text-primary rather than text-alpha for text and marks on themed surfaces", () => {
    const composer = render(
      <ChatComposer
        value=""
        onValueChange={() => undefined}
        stagedDraft={{ text: "See you at 5" }}
      />,
    );
    const label = Array.from(composer.querySelectorAll("span")).find((el) => el.textContent === "Alpha's draft · not sent")?.parentElement;
    expect(label?.className).toContain("text-primary");
    expect(label?.className).not.toContain("text-alpha");

    const mark = render(<StartupMark />);
    const status = mark.querySelector('[role="status"]');
    expect(status?.className).toContain("light");
    expect(status?.className).toContain("text-foreground");
    expect(status?.className).not.toContain("text-alpha");
  });

  // spec/app/files/index.md, "Story: Browse my storage"
  it("normalizes non-positive Progress max without producing NaN scaleX", () => {
    const container = render(<Progress aria-label="Upload" value={50} max={0} />);
    const indicator = container.querySelector('[role="progressbar"] > div') as HTMLElement;
    expect(indicator.style.transform).not.toContain("NaN");
    expect(indicator.style.transform).toBe("scaleX(0.5)");
  });

  // spec/app/maps/index.md, "Story: Look at a place"
  it("updates a MapView marker aria-label when a pin label changes at the same coordinates", () => {
    const at = { lat: 43.7312, lng: 7.4211 };
    const drawMap = (label: string) =>
      render(
        <MapView
          label="Map"
          surface={1}
          style={{ kind: "vector", url: "https://tiles.example/style.json" }}
          camera={{ kind: "keep" }}
          compass={() => false}
          onReady={noop}
          onTrouble={noop}
          onPin={noop}
          onPress={noop}
          onPressMove={noop}
          onPressEnd={noop}
          onSettled={noop}
          pins={[{ key: "1", at, label, chosen: true }]}
        />,
      );
    drawMap("43.7312, 7.4211");
    expect(mapState.markers.filter((m) => !m.removed).at(-1)?.element.getAttribute("aria-label")).toBe("43.7312, 7.4211");

    drawMap("Harbour Cafe");
    expect(mapState.markers.filter((m) => !m.removed).at(-1)?.element.getAttribute("aria-label")).toBe("Harbour Cafe");
  });

  // spec/app/home/index.md, "Story: Edit Home"
  it("does not hijack focus back to a previously moved Home tile after focus leaves", () => {
    let tiles = [
      { id: "mail", label: "Inbox", icon: <Bell /> },
      { id: "notes", label: "Notes", icon: <Pencil /> },
    ];
    const draw = (badge?: string) =>
      render(
        <HomeTileGrid
          tiles={tiles.map((t) => (t.id === "mail" ? { ...t, badge } : t))}
          editing
          onMove={({ id, onto, behind }) => {
            const moved = tiles.find((t) => t.id === id)!;
            const rest = tiles.filter((t) => t.id !== id);
            const at = rest.findIndex((t) => t.id === onto);
            rest.splice(behind ? at + 1 : at, 0, moved);
            tiles = rest;
          }}
        />,
      );

    const container = draw(undefined);
    const mailButton = container.querySelector<HTMLButtonElement>('[data-home-tile="mail"]')!;
    mailButton.focus();
    act(() => {
      mailButton.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    });
    draw(undefined);
    expect(document.activeElement).toBe(container.querySelector('[data-home-tile="mail"]'));

    act(() => { (document.activeElement as HTMLElement).blur(); });
    expect(document.activeElement).toBe(document.body);

    draw("1");
    expect(document.activeElement).toBe(document.body);
  });

  // spec/app/calendar/index.md, "Story: Look at an event"; spec/app/photos/index.md, "Story: Browse the library"
  it("omits the calendar source row when source is absent and dismisses CalendarEventMenu and PhotosMenu on outside click or Escape", () => {
    const page = render(
      <CalendarEventPage title="Dentist" onBack={() => undefined} when="10:00" day="Tue 17 Nov" />,
    );
    const dots = page.querySelectorAll(".rounded-full.bg-primary");
    expect(dots).toHaveLength(1);

    const menuHost = render(
      <CalendarEventMenu items={[{ label: "Edit", onSelect: () => undefined }]} />,
    );
    const trigger = menuHost.querySelector<HTMLButtonElement>('button[aria-label="Event actions"]')!;
    act(() => { trigger.click(); });
    expect(menuHost.querySelector('[role="menu"]')).not.toBeNull();
    act(() => {
      menuHost.querySelector('[role="menu"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(menuHost.querySelector('[role="menu"]')).toBeNull();

    act(() => { trigger.click(); });
    const backdrop = menuHost.querySelector<HTMLButtonElement>('button[aria-label="Close menu"]');
    expect(backdrop).not.toBeNull();
    act(() => { backdrop!.click(); });
    expect(menuHost.querySelector('[role="menu"]')).toBeNull();

    const photosHost = render(
      <PhotosMenu label="Album actions" actions={[{ label: "Rename", icon: Pencil, onSelect: () => undefined }]} />,
    );
    act(() => { photosHost.querySelector<HTMLButtonElement>('button[aria-label="Album actions"]')!.click(); });
    expect(photosHost.querySelector('[role="menu"]')).not.toBeNull();
    act(() => {
      photosHost.querySelector('[role="menu"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(photosHost.querySelector('[role="menu"]')).toBeNull();
  });

  // spec/app/calendar/editor.md, "Story: Write an event"
  it("inverts a foreground CalendarChip dot to bg-background when chosen so it remains visible", () => {
    const container = render(<CalendarChip label="This phone's calendar" chosen dot="foreground" />);
    const dot = container.querySelector("span.rounded-full");
    expect(dot?.className).toContain("bg-background");
    expect(dot?.className).not.toContain("bg-foreground");
  });

  // spec/app/browser/index.md, "Story: Open, pick and close tabs"
  it("gates BrowserMenu and BrowserTabs animations behind motion-safe and dismisses BrowserMenu on Escape", () => {
    const closed = vi.fn();
    const menuHost = render(
      <BrowserMenu items={[{ label: "Reload", icon: <Bell />, onSelect: () => undefined }]} onClose={closed} />,
    );
    const dialog = menuHost.querySelector('[role="dialog"]')!;
    expect(dialog.className).toContain("motion-safe:animate-drop");
    expect(dialog.className).not.toMatch(/(?:^|\s)animate-drop(?:\s|$)/);
    act(() => {
      dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(closed).toHaveBeenCalledTimes(1);

    const tabsHost = render(
      <BrowserTabs tabs={[{ id: 1, title: "Alpha", where: "alpha.example", current: true }]} />,
    );
    const panel = tabsHost.firstElementChild!;
    expect(panel.className).toContain("motion-safe:animate-rise");
    expect(panel.className).not.toMatch(/(?:^|\s)animate-rise(?:\s|$)/);
  });

  // spec/app/inbox/index.md, "Story: Choose messages"
  it("resets swipe click suppression after suppressing the trailing click in InboxMessageRow", () => {
    const onOpen = vi.fn();
    const onSwipe = vi.fn();
    const container = render(
      <InboxMessageRow
        sender="Ada"
        subject="Hello"
        snippet="Hi"
        time="10:00"
        onOpen={onOpen}
        onSwipe={onSwipe}
      />,
    );
    const row = container.querySelector("button")!;
    act(() => {
      row.dispatchEvent(pointer("pointerdown", { clientX: 200, clientY: 20 }));
      row.dispatchEvent(pointer("pointerup", { clientX: 100, clientY: 20 }));
    });
    expect(onSwipe).toHaveBeenCalledTimes(1);

    act(() => { row.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })); });
    expect(onOpen).toHaveBeenCalledTimes(0);

    act(() => { row.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })); });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  // spec/app/settings/network.md, "Story: Join a nearby network"
  it("reconciles selected network and clears passphrase when rescanned networks drop or change security", () => {
    const onJoin = vi.fn();
    const fits = (network: { security: string }, passphrase: string) =>
      network.security === "open" ? passphrase.length === 0 : passphrase.length >= 8;
    const props = {
      online: "offline" as const,
      scan: "found" as const,
      fits,
      onJoin,
      onAndroid: noop,
    };
    const container = render(
      <SettingsNetworkPage {...props} networks={[{ name: "Cafe", security: "wpa2" }]} />,
    );
    const cafeRow = () => Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.includes("Cafe"))!;
    act(() => { cafeRow().click(); });
    const input = container.querySelector<HTMLInputElement>('input[type="password"]')!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "secret123");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);

    render(<SettingsNetworkPage {...props} networks={[{ name: "Cafe", security: "open" }]} />);
    expect(container.querySelector('input[type="password"]')).toBeNull();
    const joinButton = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(joinButton.disabled).toBe(false);

    render(<SettingsNetworkPage {...props} networks={[{ name: "Cafe", security: "wpa2" }]} />);
    expect(container.querySelector<HTMLInputElement>('input[type="password"]')!.value).toBe("");

    render(<SettingsNetworkPage {...props} networks={[{ name: "Other", security: "open" }]} />);
    expect(container.querySelector("form")).toBeNull();

    render(<SettingsNetworkPage {...props} networks={[{ name: "Cafe", security: "wpa2" }]} />);
    expect(container.querySelector("form")).toBeNull();
  });

  // spec/app/assistant/cards.md, "A phone step's result chip stands under the reply that offered it, and a reply that only offered the review gives way to it"
  it("draws a phone step's result chip as one of Alpha's lines, its mark first and the chip filling the row in the column of the reply text", () => {
    const container = render(
      <>
        <AssistantMessage author="alpha" text="The reviewed read answered the original request." />
        <AssistantMessage author="alpha" text=""><AssistantDeviceReceipt text="Latest incoming SMS sender ends in 0132." /></AssistantMessage>
      </>,
    );
    const [reply, receipt] = [...container.querySelectorAll<HTMLElement>("[data-alpha-agent-line]")];
    const chip = container.querySelector<HTMLElement>("[data-alpha-device-receipt]");
    const shape = (line: HTMLElement | undefined) => [line?.className.includes("gap-2.5"), line?.firstElementChild?.matches("[data-alpha-agent-mark][aria-hidden]"), line?.firstElementChild?.className, line?.children.length];
    expect([shape(receipt), chip?.parentElement === receipt, chip?.previousElementSibling === receipt?.firstElementChild, chip?.className.includes("flex-1"), chip?.textContent])
      .toEqual([shape(reply), true, true, true, "Latest incoming SMS sender ends in 0132."]);
    expect(shape(reply).slice(0, 2)).toEqual([true, true]);
  });
});
