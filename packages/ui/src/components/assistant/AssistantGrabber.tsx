import { type ComponentProps, type PointerEvent, useRef } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

type Press = { now: number };

/** Where a released drag ended, which way it went, whether it was a flick, and when. */
export type AssistantRelease = { direction: "up" | "down"; flick: boolean; y: number; now: number };

export type AssistantGrabberProps = Omit<ComponentProps<"button">, "children" | "disabled" | "onClick" | "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onLostPointerCapture"> & {
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
  onTap?: (press: Press) => void;
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

/**
 * The handle of Ask Alpha: it reports a finger pressing, dragging, lifting or released as plain facts with their time;
 * the dock's rules choose where Ask Alpha lands.
 * @model spec/app/assistant/dock.md
 */
export function AssistantGrabber({ onPress, onDrag, onRelease, onLift, onCancel, onTap, className, ...props }: AssistantGrabberProps) {
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
      aria-label="Resize chat"
      className={cn(focusRing, "flex size-11 cursor-grab touch-none items-start justify-center rounded-md pt-1.5", className)}
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
      onClick={(event) => onTap?.({ now: event.timeStamp })}
      {...props}
    >
      <span aria-hidden className="h-1 w-10 rounded-full bg-muted-foreground/45" />
    </button>
  );
}
