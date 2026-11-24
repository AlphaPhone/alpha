// spec/shell/geometry.md, "Story: Type without the page turning sideways"; spec/shell/focus.md, "Story: Keep my place when the screen changes under me"; spec/shell/navigation.md, "Story: Go back one step at a time"
import { Effect, Queue, Stream } from "effect";

/** A window or document event as a stream of its `detail` (or the event itself), for as long as it is consumed. */
export function pageEvents(name: string, on: "window" | "document" = "window", capture = false): Stream.Stream<unknown> {
  return Stream.callback<unknown>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const target: EventTarget = on === "window" ? window : document;
        const listener = (event: Event) => { Queue.offerUnsafe(queue, event instanceof CustomEvent ? event.detail : event); };
        target.addEventListener(name, listener, capture);
        return () => target.removeEventListener(name, listener, capture);
      }),
      (stop) => Effect.sync(stop),
    ),
  );
}

/** The window's width, layout height and visual (keyboard-free of overlay) height in CSS pixels. @throws {never} */
export function windowSize(): { width: number; layoutHeight: number; visualHeight: number } {
  const width = Math.round(window.innerWidth);
  const layoutHeight = Math.round(window.innerHeight);
  const visualHeight = Math.round(Math.min(layoutHeight, window.visualViewport?.height ?? layoutHeight));
  return { width, layoutHeight, visualHeight };
}

/** Window and visual-viewport resizes, merged. */
export function resizes(): Stream.Stream<unknown> {
  return Stream.merge(pageEvents("resize"), Stream.callback<unknown>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const viewport = window.visualViewport;
        const listener = (event: Event) => { Queue.offerUnsafe(queue, event); };
        viewport?.addEventListener("resize", listener);
        return () => viewport?.removeEventListener("resize", listener);
      }),
      (stop) => Effect.sync(stop),
    ),
  ));
}

/** Sets or removes a `data-*` attribute on the root element. @throws {never} */
export function setRootData(name: string, value: string | undefined): void {
  const root = document.documentElement;
  if (value === undefined) delete root.dataset[name];
  else if (root.dataset[name] !== value) root.dataset[name] = value;
}

/** Sets or removes a CSS custom property on the root element. @throws {never} */
export function setRootProperty(name: string, value: string | undefined): void {
  const style = document.documentElement.style;
  if (value === undefined) style.removeProperty(name);
  else if (style.getPropertyValue(name) !== value) style.setProperty(name, value);
}

/** Toggles a class on the root element. @throws {never} */
export function setRootClass(name: string, on: boolean): void {
  document.documentElement.classList.toggle(name, on);
}

/** The measured text scale in percent: a hidden 100 px probe's line box over 100 px, whenever it changes. */
export function textScales(): Stream.Stream<number> {
  return Stream.callback<number>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const probe = document.createElement("div");
        probe.setAttribute("aria-hidden", "true");
        probe.dataset.alphaTextProbe = "";
        probe.style.cssText = "position:absolute;left:0;top:0;width:0;overflow:hidden;visibility:hidden;pointer-events:none;margin:0;padding:0;border:0;font-size:100px;line-height:1;white-space:nowrap;contain:layout";
        probe.textContent = "M";
        document.body.append(probe);
        const read = () => { const height = probe.offsetHeight; if (height) Queue.offerUnsafe(queue, Math.round(height)); };
        const observer = new ResizeObserver(read);
        observer.observe(probe);
        read();
        return () => { observer.disconnect(); probe.remove(); };
      }),
      (stop) => Effect.sync(stop),
    ),
  );
}

/** What kind of field holds focus now: the assistant's composer, another text field, or none. @throws {never} */
export function focusedField(): "ComposerField" | "OtherField" | "NoField" {
  const element = document.activeElement;
  if (!(element instanceof HTMLElement)) return "NoField";
  if (element.closest("[data-alpha-composer]")) return "ComposerField";
  if (element.isContentEditable) return "OtherField";
  if (element instanceof HTMLTextAreaElement) return element.readOnly ? "NoField" : "OtherField";
  if (element instanceof HTMLInputElement) {
    const nonText = ["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image", "hidden"];
    return element.readOnly || nonText.includes(element.type) ? "NoField" : "OtherField";
  }
  return "NoField";
}

/** Whether the addressed text's enabled Send control can be hit in the current viewport. @throws {never} */
export function talkSendVisible(proposalId: string): boolean {
  if (typeof document === "undefined") return false;
  for (const card of document.querySelectorAll<HTMLElement>("[data-alpha-proposal-id]")) {
    if (card.dataset.alphaProposalId !== proposalId) continue;
    const send = card.querySelector<HTMLButtonElement>("button[data-alpha-talk-send]");
    if (send === null || send.disabled) continue;
    const rect = send.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    if (send.contains(hit)) return true;
  }
  return false;
}

/** The focus key of the focused control: its `data-alpha-focus`, else its id, else empty. @throws {never} */
export function focusedKey(): string {
  const element = document.activeElement;
  if (!(element instanceof HTMLElement) || element === document.body) return "";
  return element.closest<HTMLElement>("[data-alpha-focus]")?.dataset.alphaFocus ?? element.id ?? "";
}

/** Blurs the focused control, as a keyboard Back does. @throws {never} */
export function blurActive(): void {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

const takesFocus = (element: HTMLElement) =>
  element.isConnected && !element.closest("[inert],[hidden]") && !element.matches(":disabled") && element.getClientRects().length > 0;

/** Whether the control with this focus key is shown and can take focus. @throws {never} */
export function focusable(key: string): boolean {
  if (!key) return false;
  const element = document.querySelector<HTMLElement>(`[data-alpha-focus="${CSS.escape(key)}"]`) ?? document.getElementById(key);
  return !!element && takesFocus(element);
}

/** Focuses the control with this focus key, without scrolling; false when it is not there. @throws {never} */
export function focusKey(key: string): boolean {
  const element = document.querySelector<HTMLElement>(`[data-alpha-focus="${CSS.escape(key)}"]`) ?? document.getElementById(key);
  if (!element || !takesFocus(element)) return false;
  element.focus({ preventScroll: true });
  return true;
}

/** Focuses a screen's focus target (`data-alpha-focus-target`); false while it is not rendered. @throws {never} */
export function focusTarget(target: "TargetSelf" | "TargetSearch" | "TargetHome" | "TargetTitle" | "TargetRegion"): boolean {
  const name = { TargetSelf: "self", TargetSearch: "search", TargetHome: "home", TargetTitle: "title", TargetRegion: "region" }[target];
  const element = Array.from(document.querySelectorAll<HTMLElement>(`[data-alpha-focus-target="${name}"]`)).find(takesFocus);
  if (!element) return false;
  if (!element.hasAttribute("tabindex") && !element.matches("button,input,textarea,select,a[href]")) element.tabIndex = -1;
  element.focus({ preventScroll: true });
  return true;
}

/** Whether the focused control is shown (not removed, hidden or inert). @throws {never} */
export function activeShown(): boolean {
  const element = document.activeElement;
  return element instanceof HTMLElement && element !== document.body && takesFocus(element);
}

/** Resolves after the next animation frame. */
export const nextFrame: Effect.Effect<void> = Effect.callback<void>((resume) => {
  const handle = requestAnimationFrame(() => resume(Effect.void));
  return Effect.sync(() => cancelAnimationFrame(handle));
});

/** The dock's footprint in canvas pixels: everything it covers, and the resting bar alone. @throws {never} */
export function dockFootprint(): { clearance: number; rest: number } | undefined {
  const screen = document.querySelector<HTMLElement>("[data-alpha-screen]");
  const docks = Array.from(document.querySelectorAll<HTMLElement>("[data-alpha-dock]")).flatMap(boxesOf);
  if (!screen || docks.length === 0) return undefined;
  const bottom = screen.getBoundingClientRect().bottom;
  const scale = screen.getBoundingClientRect().width / (screen.offsetWidth || 1) || 1;
  const top = Math.min(...docks.map((dock) => dock.getBoundingClientRect().top));
  const bars = Array.from(document.querySelectorAll<HTMLElement>("[data-alpha-dock-bar]")).flatMap(boxesOf);
  const clearance = Math.ceil((bottom - top) / scale);
  const rest = bars.length > 0 ? Math.ceil((bottom - Math.min(...bars.map((bar) => bar.getBoundingClientRect().top))) / scale) : clearance;
  return clearance > 0 && rest > 0 ? { clearance, rest: Math.min(rest, clearance) } : undefined;
}

function takesFocusOrShown(element: HTMLElement): boolean {
  return element.isConnected && !element.closest("[inert],[hidden]") && element.getClientRects().length > 0;
}

function boxesOf(element: HTMLElement): HTMLElement[] {
  if (!element.isConnected || element.closest("[inert],[hidden]")) return [];
  if (element.getClientRects().length > 0) return [element];
  return Array.from(element.children).flatMap((child) => child instanceof HTMLElement ? boxesOf(child) : []);
}

/** The bottom of the visible header (an app's, the library's, an open sheet's), in canvas pixels. @throws {never} */
export function headerBottom(): number {
  const screen = document.querySelector<HTMLElement>("[data-alpha-screen]");
  if (!screen) return 0;
  const box = screen.getBoundingClientRect();
  const scale = box.width / (screen.offsetWidth || 1) || 1;
  const headers = Array.from(document.querySelectorAll<HTMLElement>("[data-alpha-header]")).filter(takesFocusOrShown);
  return Math.max(0, ...headers.map((header) => Math.ceil((header.getBoundingClientRect().bottom - box.top) / scale)));
}

/** Layout changes that can move the dock or a header: resizes of the screen and of the dock's boxes, and DOM changes under the screen. */
export function layoutChanges(): Stream.Stream<unknown> {
  return Stream.callback<unknown>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const sizes = new ResizeObserver(() => { Queue.offerUnsafe(queue, undefined); });
        const watchDocks = () => {
          for (const box of Array.from(document.querySelectorAll<HTMLElement>("[data-alpha-dock]")).flatMap(boxesOf)) sizes.observe(box);
        };
        const changes = new MutationObserver(() => { watchDocks(); Queue.offerUnsafe(queue, undefined); });
        const screen = document.querySelector("[data-alpha-screen]") ?? document.body;
        sizes.observe(screen);
        watchDocks();
        changes.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["inert", "hidden", "data-alpha-dock", "data-alpha-dock-bar", "data-alpha-header"] });
        return () => { sizes.disconnect(); changes.disconnect(); };
      }),
      (stop) => Effect.sync(stop),
    ),
  );
}

/** What a click's target is for touch feedback, read before the control's own handler runs. @throws {never} */
export function clickedControl(target: unknown): {
  role: "NotAControl" | "PlainButton" | "CheckboxSwitch" | "ButtonSwitch";
  disabled: boolean; inert: boolean; checked: boolean; inDialog: boolean; destructive: boolean;
} {
  const none = { role: "NotAControl" as const, disabled: false, inert: false, checked: false, inDialog: false, destructive: false };
  const element = target instanceof Event ? target.target : target;
  if (!(element instanceof Element)) return none;
  const control = element.closest<HTMLElement>('button,[role="switch"],[role="button"],input[type="checkbox"]');
  if (!control) return none;
  const disabled = control.matches(":disabled") || control.getAttribute("aria-disabled") === "true";
  const inert = !!control.closest("[inert]");
  const inDialog = !!control.closest('dialog,[role="dialog"],[role="alertdialog"]');
  const label = (control.textContent ?? "").trim();
  const destructive = control.dataset.destructive !== undefined || /^(Delete|Discard|Erase|Remove|Replace|Clear|Reset|Sign out)\b/.test(label);
  if (control instanceof HTMLInputElement) return { role: "CheckboxSwitch", disabled, inert, checked: control.checked, inDialog, destructive };
  if (control.getAttribute("role") === "switch") return { role: "ButtonSwitch", disabled, inert, checked: control.getAttribute("aria-checked") === "true", inDialog, destructive };
  return { role: "PlainButton", disabled, inert, checked: false, inDialog, destructive };
}

/** Whether a key event moves focus by keyboard: Tab or an arrow key. @throws {never} */
export function navigationKey(event: unknown): boolean {
  return event instanceof KeyboardEvent && (event.key === "Tab" || event.key.startsWith("Arrow"));
}

/** One value of this origin's storage, or null when it is missing or storage refuses. @throws {never} */
export function storedValue(key: string): string | null {
  try { return globalThis.localStorage.getItem(key); } catch { return null; }
}

/** Removes one value of this origin's storage; false when storage refuses. @throws {never} */
export function forgetValue(key: string): boolean {
  try { globalThis.localStorage.removeItem(key); return true; } catch { return false; }
}

/** Whether the page is hidden now. @throws {never} */
export function pageHidden(): boolean {
  return document.hidden;
}

/** Reloads the page. @throws {never} */
export function reloadPage(): void {
  location.reload();
}

/** Today's local day number (days since the epoch in local time) for a time. @throws {never} */
export function localDay(at: number): number {
  const date = new Date(at);
  return Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) / 86_400_000);
}

/** The local midnight that starts the day after `at`. @throws {never} */
export function nextMidnight(at: number): number {
  const date = new Date(at);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
}

const LANDING = "#delegation-return";

/** The raw query of a delegation return: the one `delegation-return.html` handed over in the fragment, or the page's own on the landing's path; undefined on any other page. @throws {never} */
export function landingQuery(): string | undefined {
  if (location.hash.startsWith(LANDING)) return location.hash.slice(LANDING.length);
  if (location.pathname.endsWith("/delegation-return")) return location.search;
  return undefined;
}

/** Replaces the address with the landing's own, without the return's query, so a reopened landing says to go back to Alpha. @throws {never} */
export function scrubLanding(): void {
  history.replaceState(null, "", `${location.pathname}${LANDING}`);
}

/** Every open native modal dialog closes, or is removed when it cannot, so recovery is on top. @throws {never} */
export function takeOverFromDialogs(): void {
  for (const dialog of Array.from(document.querySelectorAll<HTMLDialogElement>("dialog[open]"))) {
    try { dialog.close(); } catch { dialog.remove(); }
    if (dialog.open) dialog.remove();
  }
}

/** Whether the app's React root has rendered anything yet. @throws {never} */
export function appRendered(): boolean {
  const root = document.getElementById("root");
  return !!root && root.childElementCount > 0;
}

/** A browser permission's state as the browser reports it; `unsupported` where the API is missing. */
export function browserPermissionStatus(key: "notifications" | "microphone" | "camera" | "location"): Effect.Effect<"granted" | "denied" | "prompt" | "unsupported"> {
  return Effect.promise(async () => {
    if (key === "notifications") {
      if (typeof Notification === "undefined") return "unsupported";
      return Notification.permission === "default" ? "prompt" : Notification.permission;
    }
    try {
      const state = (await navigator.permissions.query({ name: (key === "location" ? "geolocation" : key) as PermissionName })).state;
      return state;
    } catch { return "unsupported"; }
  });
}

/** Asks the browser for a permission from the owner's tap; media tracks stop at once and a position is discarded. */
export function browserPermissionRequest(key: "notifications" | "microphone" | "camera" | "location"): Effect.Effect<void> {
  return Effect.promise(async () => {
    try {
      if (key === "notifications") {
        await Promise.race([Notification.requestPermission(), new Promise((resolve) => setTimeout(resolve, 15_000))]);
      } else if (key === "location") {
        await new Promise<void>((resolve) => navigator.geolocation.getCurrentPosition(() => resolve(), () => resolve(), { enableHighAccuracy: false, maximumAge: 0, timeout: 10_000 }));
      } else {
        const stream = await navigator.mediaDevices.getUserMedia(key === "camera" ? { video: true, audio: false } : { audio: true, video: false });
        for (const track of stream.getTracks()) track.stop();
      }
    } catch { return; }
  });
}

/** The class of a thrown value: its constructor name, never its message. @throws {never} */
export function errorClass(error: unknown): string {
  if (error instanceof Error) return /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(error.name) ? error.name : "Error";
  return error === null ? "null" : typeof error;
}

/**
 * What a page `error` or `unhandledrejection` event says went wrong: the error or rejection reason it carries, else the event.
 * @throws {never}
 */
export function failureOf(event: unknown): unknown {
  if (typeof ErrorEvent !== "undefined" && event instanceof ErrorEvent) return event.error;
  if (typeof PromiseRejectionEvent !== "undefined" && event instanceof PromiseRejectionEvent) return event.reason;
  return event;
}
