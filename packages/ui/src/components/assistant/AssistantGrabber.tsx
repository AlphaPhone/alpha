import { type ComponentProps, type PointerEvent, useLayoutEffect, useRef } from "react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Mark } from "../Mark.tsx";

/** Where the finger came down, and when (the event's time in milliseconds). */
type Press = { now: number; y: number };

/** Where a released drag ended, which way it went, whether it was a flick, and when. */
export type AssistantRelease = { direction: "up" | "down"; flick: boolean; y: number; now: number };

/** What a finger on Ask Alpha's handle reports: plain facts with their time. */
export type AssistantDrag = {
  /** A finger came down on the handle. */
  onPress?: (press: Press) => void;
  /** The finger moved past a few pixels: `y` is where it is, to follow it; called on each move from then on. */
  onDrag?: (drag: { y: number }) => void;
  /** A drag ended: its direction, whether it was fast enough to be a flick, and where it ended. */
  onRelease?: (release: AssistantRelease) => void;
  /** The finger lifted without having moved. */
  onLift?: (press: Omit<Press, "y">) => void;
  /** The gesture was taken away, by the system, a resize or the window losing focus: it asks for nothing. */
  onCancel?: (press: Omit<Press, "y">) => void;
};

export type AssistantGrabberProps = Omit<ComponentProps<"button">, "children" | "disabled" | "onClick" | "onDrag" | "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onLostPointerCapture"> & AssistantDrag & {
  /** The resting dock opens by its mark. The sheet uses a resize handle. */
  variant?: "mark" | "handle";
  /** The click a button receives, which may be the late click of a gesture just ended. */
  onTap?: (press: Omit<Press, "y"> & { keyboard: boolean }) => void;
};

const slop = 6;
const flickPixelsPerMillisecond = 1;
type Sample = { y: number; at: number };
type Track = { pointer: number; start: number; prev: Sample; last: Sample; moved: boolean };

const capture = (element: Element, pointer: number) => {
  try {
    if (!element.hasPointerCapture?.(pointer)) element.setPointerCapture(pointer);
  } catch {
    return;
  }
};

const fast = (t: Track) => t.moved && Math.abs(t.last.y - t.prev.y) >= (t.last.at - t.prev.at) * flickPixelsPerMillisecond;

/**
 * The pointer handlers of Ask Alpha's handle, as v121's grabber: a press, a drag that follows the finger, a release
 * with its flick, a lift that did not move. The finger is held from the first touch and followed on the window, so the
 * gesture lives on when the handle it started on is redrawn in the sheet it opens; its listeners go with the release.
 */
function useAssistantDrag(callbacks: AssistantDrag) {
  const latestRef = useRef(callbacks);
  useLayoutEffect(() => {
    latestRef.current = callbacks;
  });
  const trackRef = useRef<{ track: Track; stop: () => void } | undefined>(undefined);
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || trackRef.current) return;
      capture(event.currentTarget, event.pointerId);
      const view = event.currentTarget.ownerDocument.defaultView ?? window;
      const sample = { y: event.clientY, at: event.timeStamp };
      const t: Track = { pointer: event.pointerId, start: event.clientY, prev: sample, last: sample, moved: false };
      const mine = (e: globalThis.PointerEvent) => e.pointerId === t.pointer && trackRef.current?.track === t;
      const move = (e: globalThis.PointerEvent) => {
        if (!mine(e)) return;
        const y = e.clientY;
        if (!t.moved && Math.abs(y - t.start) > slop) t.moved = true;
        t.prev = t.last;
        t.last = { y, at: e.timeStamp };
        if (t.moved) latestRef.current.onDrag?.({ y });
      };
      const up = (e: globalThis.PointerEvent) => {
        if (!mine(e)) return;
        stop();
        if (!t.moved) return latestRef.current.onLift?.({ now: e.timeStamp });
        const y = e.clientY;
        latestRef.current.onRelease?.({ direction: y < t.start ? "up" : "down", flick: fast(t), y, now: e.timeStamp });
      };
      const cancel = (e: globalThis.PointerEvent) => {
        if (!mine(e)) return;
        stop();
        latestRef.current.onCancel?.({ now: e.timeStamp });
      };
      const stop = () => {
        trackRef.current = undefined;
        view.removeEventListener("pointermove", move);
        view.removeEventListener("pointerup", up);
        view.removeEventListener("pointercancel", cancel);
      };
      trackRef.current = { track: t, stop };
      view.addEventListener("pointermove", move);
      view.addEventListener("pointerup", up);
      view.addEventListener("pointercancel", cancel);
      latestRef.current.onPress?.({ now: event.timeStamp, y: event.clientY });
    },
  };
}

/**
 * The handle of Ask Alpha: it reports a finger pressing, dragging, lifting or released as plain facts with their time;
 * the dock's rules choose where Ask Alpha lands.
 * @model spec/app/assistant/dock.md
 */
export function AssistantGrabber({ variant = "handle", onPress, onDrag, onRelease, onLift, onCancel, onTap, className, ...props }: AssistantGrabberProps) {
  const handlers = useAssistantDrag({ onPress, onDrag, onRelease, onLift, onCancel });
  return (
    <button
      type="button"
      data-alpha-grabber=""
      aria-label={variant === "mark" ? "Open conversation" : "Resize chat"}
      className={cn(focusRing, "flex size-11 shrink-0 touch-none justify-center", variant === "mark" ? "items-center overflow-hidden rounded-full bg-alpha text-alpha-foreground" : "cursor-grab items-start rounded-sm px-0.5 pt-1.5", className)}
      {...handlers}
      onClick={(event) => onTap?.({ now: event.timeStamp, keyboard: event.detail === 0 })}
      {...props}
    >
      {variant === "mark" ? <Mark aria-hidden className="size-[118%] shrink-0" /> : <span aria-hidden className="h-1 w-10 rounded-full bg-muted-foreground/45" />}
    </button>
  );
}
