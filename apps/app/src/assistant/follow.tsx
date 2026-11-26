// spec/app/assistant/dock.md, "Story: Drag Ask Alpha where I want it"; spec/app/assistant/dock.md, "A short, slow pull of the bar or the pill leaves Ask Alpha where it was"; spec/app/assistant/dock.md, "A drag released asks the shell once for where it landed, and keeps a sheet's height"; spec/app/assistant/dock.md, "A sheet keeps the share of the screen it was left at"; spec/app/assistant/dock.md, "A keyboard closed while typing puts Ask Alpha back on the bar"
import {
  type AssistantPull, type AssistantRelease, useAssistantBarDrag, type ChatDrag, CLOSE_FADE_MS, CLOSE_MS, CLOSED_COMPOSER_BLOCK, dockOpacity, dragPaint, FALLBACK_BAR, FLOOR_GAP,
  moveDrag, PANEL_TRANSITION, pressDrag, RESIZE_TRANSITION, restingHeight, revealFrames, rowReveal, SHEET_EASE, sheetBounds, TAP_SLOP,
} from "@repo/ui";
import { type CSSProperties, type ReactNode, type RefObject, useCallback, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { isOpen, keptShare, landing, shareScale, stays } from "../../gen/app__assistant__dock.ts";
import type { useMachine as useDock } from "../../gen/app__assistant__dock.react.ts";
import { untimed } from "../runtime/reactor.vibe";

type Dock = ReturnType<typeof useDock>;
type Detent = Parameters<typeof isOpen>[0];
type Form = "open" | "bar" | "pill";
/** A press on Ask Alpha: where the finger went down, from which form, and v123's drag geometry (chat-overlay-motion-adapter.ts:239-263). */
type Held = { y: number; form: Form; start: Detent; drag: ChatDrag };
/** What a drag draws: the sheet under the finger, then, once released, the sheet settling until Ask Alpha reaches where it landed. */
type Painted = ReturnType<typeof dragPaint>;
type Live = { form: Form; start: Detent; drawn: boolean; painted: Painted; landed?: { detent: Detent; kept: number } };
/** A sheet shrinking onto the bar: from a tap (v123 resizeForTap, :520-536) or a drag released onto it (v123 retire, :603-640). */
type Leaving = { tap: boolean; height?: number; opacity?: number };
/** A sheet growing to where it rests: from the bar after a tap (v123 resizeForTap, :506-519), or from where a drag left it (v123 retire, :620-624). */
type Growing = { from?: number | "shown" };
type Seen = { detent: Detent; growing?: Growing; leaving?: Leaving };

/** v123's RESIZE_TRANSITION for a tap that opens the sheet, less its corners: the bar's square corners are not the sheet's, which v123 drew rounded from the start. */
const openingTransition = RESIZE_TRANSITION.split(", ").filter((part) => !part.startsWith("border-radius")).join(", ");

/** v123's PANEL_TRANSITION while a drag's height is carried by a Web Animation to a height the page lays out, such as the fitted sheet or the full screen. */
const settlingTransition = PANEL_TRANSITION.split(", ").filter((part) => !part.startsWith("height")).join(", ");

/** Whether the page runs Web Animations, which carry a sheet's opening and closing; a page without them changes at once. */
const animates = () => typeof HTMLElement !== "undefined" && typeof HTMLElement.prototype.animate === "function";

/** v123 composerBlock (:301-309): the sheet's composer, from its top to the sheet's bottom edge. */
function composerBlock(section: HTMLElement) {
  const composer = section.lastElementChild;
  return composer ? section.getBoundingClientRect().bottom - composer.getBoundingClientRect().top : CLOSED_COMPOSER_BLOCK;
}

/** The height a sheet needs above its composer before its header shows: the top spacer and the header itself. */
function headerFit(section: HTMLElement, block: number) {
  const header = section.querySelector<HTMLElement>("[data-alpha-chat-header]");
  return block + (header?.offsetTop ?? 0) + (header?.offsetHeight ?? 0);
}

/**
 * v123's direct paint of a drag (paintChatMotion, :781-823): the sheet's height, opacity and corners, the header hidden
 * until it fits (revealRows, :285-299), and the bar or pill under an open sheet showing as the sheet hands over to it.
 */
function paint(section: HTMLElement | null, d: ChatDrag) {
  if (!section) return;
  const { height, opacity, radius } = dragPaint(d);
  section.style.transition = "none";
  section.style.height = `${height}px`;
  section.style.opacity = String(opacity);
  section.style.borderRadius = radius;
  const header = section.querySelector<HTMLElement>("[data-alpha-chat-header]");
  const room = header?.parentElement ? header.parentElement.getBoundingClientRect().bottom - header.getBoundingClientRect().bottom : 0;
  if (header) header.style.opacity = String(rowReveal(room));
  const underlay = document.querySelector<HTMLElement>("[data-alpha-underlay]");
  if (underlay) underlay.style.opacity = String(dockOpacity(d));
}

/**
 * v123 retire (:603-640): the header and the bar or pill under the sheet shown in place again. The sheet's own height,
 * opacity and corners go back with the render that ends the drag, which drew them too.
 */
function unpaint(section: HTMLElement | null) {
  document.querySelector<HTMLElement>("[data-alpha-underlay]")?.style.removeProperty("opacity");
  section?.querySelector<HTMLElement>("[data-alpha-chat-header]")?.style.removeProperty("opacity");
}

/**
 * The sheet following the finger as v123's did (chat-overlay-motion-adapter.ts). A press notes Ask Alpha's form and
 * the floor (the input bar's height plus 28, :1022-1024); each move past the 8 point slop paints the sheet directly,
 * without a render; the release settles on v123's 420 ms curve, a short slow pull from the bar or the pill goes
 * nowhere, and a sheet put away by a drag or a tap shrinks onto the bar under it before the bar takes its place.
 */
export function useSheetFollow({ dock, detent, pill, comms, voice, canLand }: {
  dock: Dock;
  detent: Detent;
  pill: boolean;
  comms: boolean;
  voice: boolean;
  canLand: (detent: Detent) => boolean;
}) {
  const kept = dock.state?.kept ?? 0;
  const [live, setLive] = useState<Live | undefined>(undefined);
  const [seen, setSeen] = useState<Seen>({ detent });
  const heldRef = useRef<Held | undefined>(undefined);
  const sectionRef = useRef<HTMLElement | null>(null);
  const shownRef = useRef(0);
  const motionsRef = useRef<Animation[]>([]);
  if (seen.detent !== detent) {
    const tap = live === undefined && !voice && animates();
    setSeen({
      detent,
      growing: !tap || !isOpen(detent) ? seen.growing : isOpen(seen.detent) ? { from: "shown" } : {},
      leaving: seen.leaving ?? (tap && isOpen(seen.detent) && detent === "Bar" ? { tap: true } : undefined),
    });
  }
  const settle = (from: Painted) => {
    setLive(undefined);
    if (animates()) setSeen((s) => ({ ...s, growing: { from: from.height } }));
  };
  if (live?.landed && (detent !== live.start || (detent === live.landed.detent && kept === live.landed.kept))) settle(live.painted);
  const viewport = () => (comms ? window.innerHeight - 52 : window.innerHeight);
  const done = () => {
    heldRef.current = undefined;
    unpaint(sectionRef.current);
    setLive(undefined);
  };
  const drop = () => {
    done();
    void dock.send({ type: "shift", now: untimed });
  };
  const gesture: AssistantPull = {
    onPress: ({ y }) => {
      const form: Form = isOpen(detent) ? "open" : pill ? "pill" : "bar";
      const bar = document.querySelector<HTMLElement>("[data-alpha-input-bar]");
      const floor = (bar?.clientHeight || FALLBACK_BAR) + FLOOR_GAP;
      const shown = sectionRef.current?.getBoundingClientRect().height ?? 0;
      shownRef.current = shown;
      heldRef.current = { y, form, start: detent, drag: pressDrag(form, shown, floor, viewport()) };
      setLive(undefined);
      void dock.send({ type: "press", detent, now: untimed });
    },
    onDrag: ({ y }) => {
      const held = heldRef.current;
      if (!held) return;
      const first = !held.drag.moved;
      if (first && !dock.can({ type: "drag" })) return;
      if (!moveDrag(held.drag, y - held.y, held.form === "bar")) return;
      if (first) void dock.send({ type: "drag" });
      const drawn = held.form === "open" || held.drag.height > 0;
      // eslint-disable-next-line @eslint-react/dom-no-flush-sync -- v123 drew the sheet for the first move before the next frame (chat-overlay-motion-adapter.ts:822), so the bar never shows under the finger's first paint
      if (first || drawn !== live?.drawn) flushSync(() => setLive({ form: held.form, start: held.start, drawn, painted: dragPaint(held.drag) }));
      if (drawn) paint(sectionRef.current, held.drag);
    },
    onRelease: ({ direction, flick, quick, travel }: AssistantRelease) => {
      const held = heldRef.current;
      if (!held || !held.drag.moved || stays(held.start, held.form === "pill", Math.round(travel), quick)) return drop();
      const d = held.drag;
      const full = d.full;
      const height = Math.round(d.height);
      const landed = landing(held.start, direction === "up" ? "Up" : "Down", flick, height, d.floor, full);
      if (landed.detent !== held.start && !canLand(landed.detent)) return drop();
      heldRef.current = undefined;
      void dock.send({ type: "release", direction: direction === "up" ? "Up" : "Down", flick, height, floor: d.floor, full, now: untimed });
      const painted = dragPaint(d);
      unpaint(sectionRef.current);
      if (held.form === "open" && !isOpen(landed.detent) && animates()) {
        setSeen((s) => ({ ...s, leaving: { tap: false, height: painted.height, opacity: painted.opacity } }));
        setLive(undefined);
        return;
      }
      const next = { detent: landed.detent, kept: landed.detent === "Sheet" ? keptShare(landed.height, full) : landed.detent === "Full" ? kept : 0 };
      if (next.detent === held.start && next.kept === kept) {
        if (painted.height === 0) return done();
        heldRef.current = undefined;
        return settle(painted);
      }
      setLive({ form: held.form, start: held.start, drawn: true, painted, landed: next });
    },
    onCancel: drop,
  };

  const growing = seen.growing;
  const leaving = seen.leaving;
  /** v123 resizeForTap (:500-538) and retire (:603-640), run once on the sheet as it is drawn for the change. */
  const animate = useCallback((element: HTMLElement | null) => {
    sectionRef.current = element;
    if (!element || !animates()) return;
    // A cancelled motion rejects its `finished`; the motion that replaces it is the one that settles the sheet.
    for (const motion of motionsRef.current.splice(0)) {
      motion.finished.catch(() => undefined);
      motion.cancel();
    }
    if (!growing && !leaving) {
      shownRef.current = element.getBoundingClientRect().height;
      return;
    }
    const header = element.querySelector<HTMLElement>("[data-alpha-chat-header]");
    const block = composerBlock(element);
    const fit = headerFit(element, block);
    const resize = { duration: 420, easing: SHEET_EASE };
    const motions = motionsRef.current;
    const finish = () => setSeen((s) => ({ ...s, growing: undefined, leaving: undefined }));
    if (growing) {
      const target = element.getBoundingClientRect().height;
      const from = growing.from === "shown" ? shownRef.current : growing.from ?? block;
      const grow = element.animate([{ height: `${from}px`, minHeight: "0px", maxHeight: "none" }, { height: `${target}px`, minHeight: "0px", maxHeight: "none" }], { ...resize, fill: "forwards" });
      motions.push(grow);
      grow.finished.then(finish, finish);
      if (header) motions.push(header.animate(revealFrames(from, target, fit), resize));
      return;
    }
    if (!leaving) return;
    const from = leaving.height ?? element.getBoundingClientRect().height;
    const to = leaving.tap ? block : 0;
    const shrink = element.animate([{ height: `${from}px`, minHeight: "0px", maxHeight: "none" }, { height: `${to}px`, minHeight: "0px", maxHeight: "none" }], { ...resize, fill: "forwards" });
    if (header) motions.push(header.animate(revealFrames(from, to, fit), { ...resize, fill: "forwards" }));
    const fade = leaving.tap
      ? element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CLOSE_FADE_MS, delay: CLOSE_MS - CLOSE_FADE_MS, easing: "linear", fill: "forwards" })
      : element.animate([{ opacity: leaving.opacity ?? 1 }, { opacity: 0 }], { duration: 200, easing: "ease", fill: "forwards" });
    motions.push(shrink, fade);
    (leaving.tap ? fade : shrink).finished.then(finish, finish);
  }, [growing, leaving]);

  const { full, half } = sheetBounds(viewport());
  const resting = detent === "Sheet" && kept > 0 ? restingHeight(kept / shareScale, full, half) : undefined;
  const style: CSSProperties = live?.drawn
    ? { transition: live.landed ? PANEL_TRANSITION : "none", height: live.painted.height, opacity: live.painted.opacity, borderRadius: live.painted.radius }
    : leaving
      ? { transition: "none", ...(leaving.height === undefined ? {} : { height: leaving.height, opacity: leaving.opacity }) }
      : isOpen(detent) ? { transition: growing ? growing.from === undefined ? openingTransition : settlingTransition : PANEL_TRANSITION, ...(resting === undefined ? {} : { height: resting }) } : {};
  return {
    /** A drag or a settle draws the sheet, whatever Ask Alpha's detent says. */
    drawn: live?.drawn === true || leaving !== undefined,
    /** The bar or pill under a sheet pulled down onto it or shrinking onto it. */
    underlay: (live?.form === "open" && !live.landed) || leaving !== undefined,
    leaving: leaving !== undefined,
    style,
    ref: animate,
    gesture,
    done,
  };
}

/**
 * v123's chat scrim over the page outside an open sheet (scrimSw, :1269-1323): a tap, or a press that moves past the
 * slop and is then followed wherever it goes, lowers Ask Alpha when it ends. While the bar is typed in, it only leaves
 * the field, whose blur rests Ask Alpha once, so a second step Back never leaves the app.
 */
export function ChatScrim({ typing, field, onLower }: { typing: boolean; field: RefObject<HTMLTextAreaElement | null>; onLower: () => void }) {
  const pressRef = useRef<{ pointer: number; x: number; y: number; moved: boolean } | undefined>(undefined);
  return (
    <div
      aria-hidden
      data-alpha-chat-scrim=""
      className="fixed inset-0 z-dock touch-none"
      onPointerDown={(event) => {
        event.preventDefault();
        if (!event.isPrimary) return;
        pressRef.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      }}
      onPointerMove={(event) => {
        const press = pressRef.current;
        if (!press || press.pointer !== event.pointerId || press.moved || Math.hypot(event.clientX - press.x, event.clientY - press.y) < TAP_SLOP) return;
        press.moved = true;
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          return;
        }
      }}
      onPointerUp={(event) => {
        if (pressRef.current?.pointer !== event.pointerId) return;
        pressRef.current = undefined;
        const typed = field.current;
        if (typing && typed !== null && typed.ownerDocument.activeElement === typed) return typed.blur();
        onLower();
      }}
      onPointerCancel={() => { pressRef.current = undefined; }}
    />
  );
}

/** The strip above a full-screen sheet, which as v123's strip (template.html:4150) is also its handle: a drag down from it lowers the sheet, and its own taps stay taps. */
export function DragStrip({ gesture, children }: { gesture: AssistantPull; children: ReactNode }) {
  const drag = useAssistantBarDrag({ onStart: gesture.onPress, onDrag: gesture.onDrag, onRelease: gesture.onRelease, onCancel: gesture.onCancel, from: "strip" });
  return <div data-alpha-strip="" className="touch-none" {...drag}>{children}</div>;
}
