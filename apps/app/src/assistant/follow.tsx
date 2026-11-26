// spec/app/assistant/dock.md, "Story: Drag Ask Alpha where I want it"; spec/app/assistant/dock.md, "A short, slow pull of the bar or the pill leaves Ask Alpha where it was"; spec/app/assistant/dock.md, "A drag released asks the shell once for where it landed, and keeps a sheet's height"; spec/app/assistant/dock.md, "A sheet keeps the share of the screen it was left at"; spec/app/assistant/dock.md, "A keyboard closed while typing puts Ask Alpha back on the bar"
import {
  type AssistantPull, type AssistantRelease, barDismissPaint, useAssistantBarDrag, type ChatDrag, CLOSE_FADE_MS, CLOSE_MS, CLOSED_COMPOSER_BLOCK, dockOpacity, dragPaint, FALLBACK_BAR, FLOOR_GAP,
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
/** A press on Ask Alpha: where the finger went down, from which form, and v119's drag geometry (45f6bed30 chat-overlay-motion-adapter.ts:235-259). */
type Held = { y: number; form: Form; start: Detent; drag: ChatDrag };
/** What a drag draws: the sheet under the finger, then, once released, the sheet settling until Ask Alpha reaches where it landed. */
type Painted = ReturnType<typeof dragPaint>;
type Live = { form: Form; start: Detent; drawn: boolean; painted: Painted; landed?: { detent: Detent; kept: number } };
/** A sheet shrinking onto the bar: from a tap (v119 resizeForTap, :530-546) or a drag released onto it (v119 retire, :613-651). */
type Leaving = { tap: boolean; height?: number; opacity?: number };
/** A sheet growing to where it rests: from the bar after a tap (v119 resizeForTap, :516-529), or from where a drag left it (v119 retire, :630-634). */
type Growing = { from?: number | "shown" };
type Seen = { detent: Detent; growing?: Growing; leaving?: Leaving };

/** v119's RESIZE_TRANSITION for a tap that opens the sheet, less its corners: the bar's square corners are not the sheet's, which v119 drew rounded from the start. */
const openingTransition = RESIZE_TRANSITION.split(", ").filter((part) => !part.startsWith("border-radius")).join(", ");

/** v119's PANEL_TRANSITION while a drag's height is carried by a Web Animation to a height the page lays out, such as the fitted sheet or the full screen. */
const settlingTransition = PANEL_TRANSITION.split(", ").filter((part) => !part.startsWith("height")).join(", ");

/** Whether the page runs Web Animations, which carry a sheet's opening and closing; a page without them changes at once. */
const animates = () => typeof HTMLElement !== "undefined" && typeof HTMLElement.prototype.animate === "function";

/** v119 composerBlock (:297-305): the sheet's composer, from its top to the sheet's bottom edge. */
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
 * v119's direct paint of a drag (paintChatMotion, :793-836): the sheet's height, opacity and corners, the header hidden
 * until it fits (revealRows, :281-295), and the bar or pill under an open sheet showing as the sheet hands over to it.
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
 * The sheet as it was drawn when it was put away, left over the bar as v119 left its panel over the bar already in place
 * (resizeForTap, :530-546; retire, :613-651): a copy that takes no input, scrolled and filled as the sheet was, so the
 * bar under it is Ask Alpha at once and keeps its own controls, never the sheet's. v119 had one field, which a tap moved
 * to the bar at once (:1356-1360), so a sheet a tap puts away shrinks with its field empty.
 */
function ghostOf(section: HTMLElement, tap: boolean) {
  const ghost = section.cloneNode(true) as HTMLElement;
  for (const named of [ghost, ...ghost.querySelectorAll("[id], [aria-label]")]) {
    named.removeAttribute("id");
    named.removeAttribute("aria-label");
  }
  ghost.removeAttribute("data-alpha-detent");
  ghost.setAttribute("data-alpha-ghost", "");
  ghost.setAttribute("aria-hidden", "true");
  ghost.inert = true;
  ghost.style.pointerEvents = "none";
  section.after(ghost);
  const drawn = [section, ...section.querySelectorAll<HTMLElement>("*")];
  const copied = [ghost, ...ghost.querySelectorAll<HTMLElement>("*")];
  drawn.forEach((element, at) => {
    const copy = copied[at];
    if (!copy) return;
    if (element.scrollTop) copy.scrollTop = element.scrollTop;
    if (element instanceof HTMLTextAreaElement && copy instanceof HTMLTextAreaElement) copy.value = tap ? "" : element.value;
  });
  if (tap) for (const field of ghost.querySelectorAll("textarea")) field.placeholder = "";
  return ghost;
}

/** Whether the owner asked for reduced motion, matching AssistantComposer's dock entrance check. */
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/** Clears inline styles applied while dragging the resting bar downward. */
function clearBarDismiss(bar: HTMLElement) {
  bar.style.removeProperty("transition");
  bar.style.removeProperty("animation");
  bar.style.removeProperty("transform");
  bar.style.removeProperty("opacity");
}

/** COA:339-346 direct paint for pulling the resting bar down toward the pill: follows the finger downward and fades out. */
function paintBarDismiss(paintedBar: RefObject<HTMLElement | null>, d: ChatDrag) {
  const bar = document.querySelector<HTMLElement>("[data-alpha-input-bar]");
  if (paintedBar.current && paintedBar.current !== bar) {
    clearBarDismiss(paintedBar.current);
    paintedBar.current = null;
  }
  if (!bar) return;
  const dismiss = barDismissPaint(d);
  if (!dismiss) {
    clearBarDismiss(bar);
    paintedBar.current = null;
    return;
  }
  paintedBar.current = bar;
  bar.style.transition = "none";
  bar.style.animation = "none";
  bar.style.transform = `translateY(${dismiss.translateY}px)`;
  bar.style.opacity = String(dismiss.opacity);
}

/** Clears downward bar-drag styling on the exact element painted; if `spring` is true, eases the bar smoothly back to rest. */
function unpaintBar(paintedBar: RefObject<HTMLElement | null>, spring = false) {
  const bar = paintedBar.current ?? document.querySelector<HTMLElement>("[data-alpha-input-bar]");
  paintedBar.current = null;
  if (!bar) return;
  const fromTransform = bar.style.transform;
  const fromOpacity = bar.style.opacity;
  clearBarDismiss(bar);
  if (spring && (fromTransform || fromOpacity) && animates() && !reducedMotion()) {
    const motion = bar.animate(
      [{ transform: fromTransform || "none", opacity: fromOpacity ? Number(fromOpacity) : 1 }, { transform: "none", opacity: 1 }],
      { duration: 240, easing: SHEET_EASE },
    );
    motion.finished.catch(() => undefined);
  }
}

/**
 * v119 retire (:613-651): the header and the bar or pill under the sheet shown in place again. The sheet's own height,
 * opacity and corners go back with the render that ends the drag, which drew them too.
 */
function unpaint(section: HTMLElement | null, paintedBar: RefObject<HTMLElement | null>, springBar = false, keepBar = false) {
  document.querySelector<HTMLElement>("[data-alpha-underlay]")?.style.removeProperty("opacity");
  section?.querySelector<HTMLElement>("[data-alpha-chat-header]")?.style.removeProperty("opacity");
  if (!keepBar) unpaintBar(paintedBar, springBar);
}

/**
 * The sheet following the finger as v119's did (45f6bed30 chat-overlay-motion-adapter.ts). A press notes Ask Alpha's form and
 * the floor (the input bar's height plus 28, :1037-1039); each move past the 8 point slop paints the sheet directly,
 * without a render; the release settles on v119's 420 ms curve, a short slow pull from the bar or the pill goes
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
  /** A sheet a drag put away is still fading over the bar, whose field shows its words only once it has gone. */
  const [handing, setHanding] = useState(false);
  const heldRef = useRef<Held | undefined>(undefined);
  const sectionRef = useRef<HTMLElement | null>(null);
  const shownRef = useRef(0);
  const motionsRef = useRef<Animation[]>([]);
  const ghostRef = useRef<HTMLElement | undefined>(undefined);
  const barRef = useRef(0);
  const paintedBarRef = useRef<HTMLElement | null>(null);
  /**
   * A bar pulled down to tuck keeps the finger's paint until the commit that draws it as something else, the pill, clears
   * it, as v119's bar left with the drag (COA:640-648), so it never shows at rest for a frame first. The watch runs
   * before the next frame is painted; a refused release drops the paint, and a new press takes it back.
   */
  const tuckingRef = useRef<MutationObserver | undefined>(undefined);
  const stopTucking = () => {
    tuckingRef.current?.disconnect();
    tuckingRef.current = undefined;
  };
  const handOver = () => {
    stopTucking();
    unpaintBar(paintedBarRef, false);
  };
  if (seen.detent !== detent) {
    const tap = live === undefined && !voice && !comms && animates();
    const leaving = seen.leaving ?? (tap && isOpen(seen.detent) && detent === "Bar" ? { tap: true, height: sectionRef.current?.getBoundingClientRect().height || undefined } : undefined);
    setSeen({
      detent,
      growing: leaving ? undefined : !tap || !isOpen(detent) ? seen.growing : isOpen(seen.detent) ? { from: "shown" } : {},
      leaving,
    });
  }
  const settle = (from: Painted) => {
    setLive(undefined);
    if (animates()) setSeen((s) => ({ ...s, growing: { from: from.height } }));
  };
  if (live?.landed && (detent !== live.start || (detent === live.landed.detent && kept === live.landed.kept))) settle(live.painted);
  const viewport = () => (comms ? window.innerHeight - 52 : window.innerHeight);
  const done = (springBar = false) => {
    heldRef.current = undefined;
    unpaint(sectionRef.current, paintedBarRef, springBar, tuckingRef.current !== undefined);
    setLive(undefined);
  };
  const drop = () => {
    stopTucking();
    done(true);
    void dock.send({ type: "shift", now: untimed });
  };
  /** v119's floor (chat-overlay-motion-adapter.ts:1037-1039): the input bar's height, measured where it was last drawn, plus 28. */
  const floorOf = () => {
    const bar = document.querySelector<HTMLElement>("[data-alpha-input-bar]")?.clientHeight ?? 0;
    if (bar > 0) barRef.current = bar;
    return (barRef.current || FALLBACK_BAR) + FLOOR_GAP;
  };
  const gesture: AssistantPull = {
    onPress: ({ y }) => {
      if (paintedBarRef.current) handOver();
      const form: Form = isOpen(detent) ? "open" : pill ? "pill" : "bar";
      const floor = floorOf();
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
      if (first && voice) return;
      if (!moveDrag(held.drag, y - held.y)) return;
      if (first) void dock.send({ type: "drag" });
      const drawn = held.form === "open" || held.drag.height > 0;
      // eslint-disable-next-line @eslint-react/dom-no-flush-sync -- v119 drew the sheet for the first move before the next frame (chat-overlay-motion-adapter.ts:836), so the bar never shows under the finger's first paint
      if (first || drawn !== live?.drawn) flushSync(() => setLive({ form: held.form, start: held.start, drawn, painted: dragPaint(held.drag) }));
      if (drawn) {
        unpaintBar(paintedBarRef, false);
        paint(sectionRef.current, held.drag);
      } else if (held.form === "bar") {
        paintBarDismiss(paintedBarRef, held.drag);
      }
    },
    onRelease: ({ direction, flick, quick, travel, y }: AssistantRelease) => {
      const held = heldRef.current;
      if (held && !held.drag.moved && !voice && moveDrag(held.drag, y - held.y)) void dock.send({ type: "drag" });
      if (!held || !held.drag.moved || stays(held.start, held.form === "pill", Math.round(travel), quick)) return drop();
      const d = held.drag;
      const full = d.full;
      const height = Math.round(d.height);
      const landed = landing(held.start, direction === "up" ? "Up" : "Down", flick, height, d.floor, full);
      if (landed.detent !== held.start && !canLand(landed.detent)) return drop();
      heldRef.current = undefined;
      void dock.send({ type: "release", direction: direction === "up" ? "Up" : "Down", flick, height, floor: d.floor, full, now: untimed }).then((sent) => {
        if (sent._tag === "Success" || heldRef.current !== undefined) return;
        setSeen((s) => ({ ...s, leaving: undefined }));
        drop();
      });
      if (held.form === "bar" && !isOpen(landed.detent) && document.activeElement instanceof HTMLTextAreaElement && document.activeElement.matches("[data-alpha-composer]")) {
        document.activeElement.blur();
      }
      const painted = dragPaint(d);
      // spec/app/assistant/dock.md, "Pulled down from the bar or from typing, Ask Alpha rests on the bar"
      const tucking = paintedBarRef.current;
      stopTucking();
      if (!comms && held.form === "bar" && direction === "down" && !isOpen(held.start) && !isOpen(landed.detent) && tucking && !tucking.hasAttribute("data-alpha-pill") && typeof MutationObserver !== "undefined") {
        const watch = new MutationObserver(handOver);
        watch.observe(tucking, { attributes: true, attributeFilter: ["data-alpha-pill", "data-alpha-input-bar", "hidden"] });
        tuckingRef.current = watch;
      }
      unpaint(sectionRef.current, paintedBarRef, false, tuckingRef.current !== undefined);
      if (held.form === "open" && !isOpen(landed.detent) && !comms && animates()) {
        setSeen((s) => ({ ...s, growing: undefined, leaving: { tap: false, height: painted.height, opacity: painted.opacity } }));
        setLive(undefined);
        return;
      }
      const next = { detent: landed.detent, kept: landed.detent === "Sheet" ? keptShare(landed.height, full) : landed.detent === "Full" ? kept : 0 };
      if (!isOpen(held.start) && !isOpen(landed.detent) && painted.height === 0) return done();
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
  /** A sheet put away is handed to the bar once Ask Alpha rests there, and not before, so it never shows open again. */
  const handed = leaving && !isOpen(detent) ? leaving : undefined;
  /** v119 resizeForTap (:507-548) and retire (:613-651), run once on the sheet as it is drawn for the change. */
  const animate = useCallback((element: HTMLElement | null) => {
    sectionRef.current = element;
    if (!element || !animates()) return;
    const drawnHeight = element.getBoundingClientRect().height;
    for (const motion of motionsRef.current.splice(0)) {
      motion.finished.catch(() => undefined);
      motion.cancel();
    }
    if (!growing && !handed) {
      shownRef.current = element.getBoundingClientRect().height;
      floorOf();
      return;
    }
    const header = element.querySelector<HTMLElement>("[data-alpha-chat-header]");
    const block = composerBlock(element);
    const fit = headerFit(element, block);
    const resize = { duration: 420, easing: SHEET_EASE };
    const motions = motionsRef.current;
    const finish = () => setSeen((s) => ({ ...s, growing: undefined, leaving: undefined }));
    const dropGhost = () => {
      ghostRef.current?.remove();
      ghostRef.current = undefined;
      setHanding(false);
    };
    if (growing) {
      dropGhost();
      const target = element.getBoundingClientRect().height;
      const from = growing.from === "shown" ? shownRef.current : growing.from ?? block;
      const grow = element.animate([{ height: `${from}px`, minHeight: "0px", maxHeight: "none" }, { height: `${target}px`, minHeight: "0px", maxHeight: "none" }], { ...resize, fill: "forwards" });
      motions.push(grow);
      grow.finished.then(finish, finish);
      if (header) motions.push(header.animate(revealFrames(from, target, fit), { duration: resize.duration, easing: "linear" }));
      return;
    }
    if (!handed) return;
    const from = handed.height ?? drawnHeight;
    const to = handed.tap ? block : 0;
    const ghost = ghostOf(element, handed.tap);
    ghostRef.current?.remove();
    ghostRef.current = ghost;
    const ghostHeader = ghost.querySelector<HTMLElement>("[data-alpha-chat-header]");
    ghost.animate([{ height: `${from}px`, minHeight: "0px", maxHeight: "none" }, { height: `${to}px`, minHeight: "0px", maxHeight: "none" }], { ...resize, fill: "forwards" });
    ghostHeader?.animate(revealFrames(from, to, fit), { duration: resize.duration, easing: "linear", fill: "forwards" });
    const fade = handed.tap
      ? ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CLOSE_FADE_MS, delay: CLOSE_MS - CLOSE_FADE_MS, easing: "linear", fill: "forwards" })
      : ghost.animate([{ opacity: handed.opacity ?? 1 }, { opacity: 0 }], { duration: 200, easing: "ease", fill: "forwards" });
    const gone = () => {
      ghost.remove();
      if (ghostRef.current === ghost) dropGhost();
    };
    fade.finished.then(gone, gone);
    setHanding(!handed.tap);
    finish();
  }, [growing, handed]);

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
    /** The bar's field shows no words: a sheet a drag put away is still fading over it. */
    quiet: handing,
    style,
    ref: animate,
    gesture,
    done,
  };
}

/**
 * v119's chat scrim over the page outside an open sheet (scrimSw, :1284-1338): a tap, or a press that moves past the
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

/** The strip above a full-screen sheet, which as v119's strip (template.html:4449) is also its handle: a drag down from it lowers the sheet, and its own taps stay taps. */
export function DragStrip({ gesture, children }: { gesture: AssistantPull; children: ReactNode }) {
  const drag = useAssistantBarDrag({ onStart: gesture.onPress, onDrag: gesture.onDrag, onRelease: gesture.onRelease, onCancel: gesture.onCancel, from: "strip" });
  return <div data-alpha-strip="" className="touch-none" {...drag}>{children}</div>;
}
