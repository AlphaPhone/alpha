import { type ComponentProps, type PointerEvent, useRef } from "react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Mark } from "../Mark.tsx";

type Press = { now: number };

/** Where a released drag ended, which way it went, whether it was a flick, and when. */
export type AssistantRelease = { direction: "up" | "down"; flick: boolean; y: number; now: number };

export type AssistantGrabberProps = Omit<ComponentProps<"button">, "children" | "disabled" | "onClick" | "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onLostPointerCapture"> & {
  /** The resting dock opens by its mark. The sheet uses a resize handle. */
  variant?: "mark" | "handle";
  /** A finger came down on the handle; `now` is the event's time in milliseconds. */
  onPress?: (press: Press) => void;
  /** The finger moved past a few pixels: `y` is where it is, to follow it; called on each move from then on. */
  onDrag?: (drag: { y: number }) => void;
  /** A drag ended: its direction, whether it was fast enough to be a flick, and where it ended. */
  onRelease?: (release: AssistantRelease) => void;
  /** The finger lifted without having moved. */
  onLift?: (press: Press) => void;
  /** The gesture was taken away, by the system, a resize or the window losing focus: it asks for nothing. */
  onCancel?: (press: Press) => void;
  /** The click a button receives, which may be the late click of a gesture just ended. */
  onTap?: (press: Press & { keyboard: boolean }) => void;
};

const slop = 6;
const flickPixelsPerMillisecond = 1;
type Sample = { y: number; at: number };
type Track = { start: number; prev: Sample; last: Sample; moved: boolean };

const capture = (element: HTMLElement, pointer: number) => {
  try {
    if (!element.hasPointerCapture?.(pointer)) element.setPointerCapture(pointer);
  } catch {
    return;
  }
};

const fast = (t: Track) => t.moved && Math.abs(t.last.y - t.prev.y) >= (t.last.at - t.prev.at) * flickPixelsPerMillisecond;

/** What a drag on Ask Alpha's resting bar reports: that it began, where the finger is, and how it ended or was taken away. */
export type AssistantBarDrag = {
  /** The finger moved past a few pixels on the bar: a drag begins, as a press and a drag of the handle would. */
  onStart?: (press: Press) => void;
  /** Where the finger is, on each move once the drag began. */
  onDrag?: (drag: { y: number }) => void;
  /** The drag ended: its direction, whether it was a flick, and where it ended. */
  onRelease?: (release: AssistantRelease) => void;
  /** The drag was taken away by the system, a resize or the window losing focus. */
  onCancel?: (press: Press) => void;
};

/**
 * Pointer handlers that let the whole resting bar be dragged like its handle, as v121's bar was. Nothing is taken until
 * the finger moves past a few pixels, so a tap on the bar, its buttons or its field stays a tap; a press on the handle
 * itself is left to the handle.
 */
export function useAssistantBarDrag({ onStart, onDrag, onRelease, onCancel }: AssistantBarDrag) {
  const trackRef = useRef<(Track & { pointer: number }) | undefined>(undefined);
  const lost = (event: PointerEvent<HTMLElement>) => {
    const t = trackRef.current;
    if (!t || t.pointer !== event.pointerId) return;
    trackRef.current = undefined;
    if (t.moved) onCancel?.({ now: event.timeStamp });
  };
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (!event.isPrimary || event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest("[data-alpha-grabber]")) return;
      const sample = { y: event.clientY, at: event.timeStamp };
      trackRef.current = { start: event.clientY, prev: sample, last: sample, moved: false, pointer: event.pointerId };
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const t = trackRef.current;
      if (!t || t.pointer !== event.pointerId) return;
      const y = event.clientY;
      t.prev = t.last;
      t.last = { y, at: event.timeStamp };
      if (!t.moved && Math.abs(y - t.start) > slop) {
        t.moved = true;
        capture(event.currentTarget, event.pointerId);
        onStart?.({ now: event.timeStamp });
      }
      if (t.moved) onDrag?.({ y });
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const t = trackRef.current;
      if (!t || t.pointer !== event.pointerId) return;
      trackRef.current = undefined;
      if (!t.moved) return;
      const y = event.clientY;
      onRelease?.({ direction: y < t.start ? "up" : "down", flick: fast(t), y, now: event.timeStamp });
    },
    onPointerCancel: lost,
    onLostPointerCapture: lost,
  };
}

/**
 * The handle of Ask Alpha: it reports a finger pressing, dragging, lifting or released as plain facts with their time;
 * the dock's rules choose where Ask Alpha lands.
 * @model spec/app/assistant/dock.md
 */
export function AssistantGrabber({ variant = "handle", onPress, onDrag, onRelease, onLift, onCancel, onTap, className, ...props }: AssistantGrabberProps) {
  const trackRef = useRef<Track | undefined>(undefined);
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const t = trackRef.current;
    if (!t) return;
    const y = event.clientY;
    t.moved ||= Math.abs(y - t.start) > slop;
    t.prev = t.last;
    t.last = { y, at: event.timeStamp };
    if (t.moved) onDrag?.({ y });
  };
  return (
    <button
      type="button"
      aria-label={variant === "mark" ? "Open conversation" : "Resize chat"}
      data-alpha-grabber=""
      className={cn(focusRing, "flex size-11 shrink-0 touch-none justify-center", variant === "mark" ? "items-center overflow-hidden rounded-full bg-alpha text-alpha-foreground" : "cursor-grab items-start rounded-sm pt-1.5", className)}
      onPointerDown={(event) => {
        capture(event.currentTarget, event.pointerId);
        const sample = { y: event.clientY, at: event.timeStamp };
        trackRef.current = { start: event.clientY, prev: sample, last: sample, moved: false };
        onPress?.({ now: event.timeStamp });
      }}
      onPointerMove={move}
      onPointerUp={(event) => {
        const t = trackRef.current;
        trackRef.current = undefined;
        if (!t) return;
        const now = event.timeStamp;
        if (!t.moved) return onLift?.({ now });
        const y = event.clientY;
        onRelease?.({ direction: y < t.start ? "up" : "down", flick: fast(t), y, now });
      }}
      onPointerCancel={(event) => {
        if (trackRef.current) onCancel?.({ now: event.timeStamp });
        trackRef.current = undefined;
      }}
      onLostPointerCapture={(event) => {
        if (trackRef.current) onCancel?.({ now: event.timeStamp });
        trackRef.current = undefined;
      }}
      onClick={(event) => onTap?.({ now: event.timeStamp, keyboard: event.detail === 0 })}
      {...props}
    >
      {variant === "mark" ? <Mark aria-hidden className="size-[118%] shrink-0" /> : <span aria-hidden className="h-1 w-10 rounded-full bg-muted-foreground/45" />}
    </button>
  );
}
