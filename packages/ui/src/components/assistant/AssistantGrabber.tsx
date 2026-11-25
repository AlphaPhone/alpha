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
  /** Called with the pointer's viewport `y` while dragging, for live sheet resize. */
  onDragMove?: (y: number) => void;
  /** Called when a drag starts (`true`) and ends or cancels (`false`). */
  onDragStateChange?: (dragging: boolean) => void;
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
const flickFreshnessMs = 80;
type Sample = { y: number; at: number };
type Track = { pointerId: number; start: number; prev: Sample; last: Sample; moved: boolean };

const capture = (element: HTMLElement, pointer: number) => {
  try {
    if (!element.hasPointerCapture?.(pointer)) element.setPointerCapture(pointer);
  } catch {
    return;
  }
};

const fast = (t: Track, now: number) => {
  const dt = t.last.at - t.prev.at;
  return t.moved && dt > 0 && now - t.last.at < flickFreshnessMs && Math.abs(t.last.y - t.prev.y) >= dt * flickPixelsPerMillisecond;
};

/**
 * The handle of Ask Alpha: it reports a finger pressing, dragging, lifting or released as plain facts with their time;
 * the dock's rules choose where Ask Alpha lands.
 * @model spec/app/assistant/dock.md
 */
export function AssistantGrabber({ variant = "handle", onPress, onDrag, onDragMove, onDragStateChange, onRelease, onLift, onCancel, onTap, className, ...props }: AssistantGrabberProps) {
  const trackRef = useRef<Track | undefined>(undefined);
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const t = trackRef.current;
    if (!t || t.pointerId !== event.pointerId) return;
    const y = event.clientY;
    const wasMoved = t.moved;
    t.moved ||= Math.abs(y - t.start) > slop;
    t.prev = t.last;
    t.last = { y, at: event.timeStamp };
    if (t.moved) {
      if (!wasMoved) onDragStateChange?.(true);
      onDrag?.({ y });
      onDragMove?.(y);
    }
  };
  const cancel = (event: PointerEvent<HTMLButtonElement>) => {
    const t = trackRef.current;
    if (!t || t.pointerId !== event.pointerId) return;
    trackRef.current = undefined;
    if (t.moved) onDragStateChange?.(false);
    onCancel?.({ now: event.timeStamp });
  };
  return (
    <button
      type="button"
      aria-label={variant === "mark" ? "Open conversation" : "Resize chat"}
      className={cn(focusRing, "flex size-11 shrink-0 touch-none justify-center", variant === "mark" ? "items-center overflow-hidden rounded-full bg-alpha text-alpha-foreground" : "cursor-grab items-start rounded-sm pt-1.5", className)}
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        capture(event.currentTarget, event.pointerId);
        const sample = { y: event.clientY, at: event.timeStamp };
        trackRef.current = { pointerId: event.pointerId, start: event.clientY, prev: sample, last: sample, moved: false };
        onPress?.({ now: event.timeStamp });
      }}
      onPointerMove={move}
      onPointerUp={(event) => {
        const t = trackRef.current;
        if (!t || t.pointerId !== event.pointerId) return;
        trackRef.current = undefined;
        const now = event.timeStamp;
        if (!t.moved) return onLift?.({ now });
        onDragStateChange?.(false);
        const y = event.clientY;
        const flick = fast(t, now);
        const direction = flick ? (t.last.y < t.prev.y ? "up" : "down") : (y < t.start ? "up" : "down");
        onRelease?.({ direction, flick, y, now });
      }}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onClick={(event) => onTap?.({ now: event.timeStamp, keyboard: event.detail === 0 })}
      {...props}
    >
      {variant === "mark" ? <Mark aria-hidden className="size-full shrink-0 scale-[1.18]" /> : <span aria-hidden className="h-1 w-10 rounded-full bg-muted-foreground/45" />}
    </button>
  );
}
