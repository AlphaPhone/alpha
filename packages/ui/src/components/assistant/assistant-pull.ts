import { type PointerEvent, useRef } from "react";

type Press = { now: number };
type Sample = { y: number; at: number };
type Track = { pointer: number; start: number; prev: Sample; last: Sample; moved: boolean; onCancel: AssistantPull["onCancel"] };

/** The direction, speed, position and time of one released drag. */
export type AssistantRelease = { direction: "up" | "down"; flick: boolean; y: number; now: number };

export interface AssistantPull {
  /** A finger or mouse pressed the control. */
  onPress?: (press: Press) => void;
  /** The pointer moved beyond the press slop and may keep moving. */
  onDrag?: (drag: { y: number }) => void;
  /** A drag ended at the reported position. */
  onRelease?: (release: AssistantRelease) => void;
  /** The pointer lifted after a press without a drag. */
  onLift?: (press: Press) => void;
  /** The system retired this pointer before a release. */
  onCancel?: (press: Press) => void;
}

const slop = 6;
const flickPixelsPerMillisecond = 1;

function capture(element: HTMLElement, pointer: number) {
  try {
    if (!element.hasPointerCapture?.(pointer)) element.setPointerCapture(pointer);
  } catch {
    return;
  }
}

/** Reports a press, drag or lift from a handle or an eligible editable field. */
export function useAssistantPull<Target extends HTMLElement>(pull: AssistantPull | undefined, editable = false) {
  const track = useRef<Track | undefined>(undefined);
  const cancel = (event: PointerEvent<Target>) => {
    const current = track.current;
    if (current?.pointer !== event.pointerId) return;
    track.current = undefined;
    current.onCancel?.({ now: event.timeStamp });
  };
  return {
    onPointerDown: (event: PointerEvent<Target>) => {
      if (pull === undefined || event.button !== 0 || track.current !== undefined) return;
      const mouse = event.pointerType === "mouse";
      if (editable && mouse) event.preventDefault();
      if (!editable || mouse) capture(event.currentTarget, event.pointerId);
      const sample = { y: event.clientY, at: event.timeStamp };
      track.current = {
        pointer: event.pointerId, start: sample.y, prev: sample, last: sample, moved: false, onCancel: pull.onCancel,
      };
      pull.onPress?.({ now: event.timeStamp });
    },
    onPointerMove: (event: PointerEvent<Target>) => {
      const current = track.current;
      if (current?.pointer !== event.pointerId) return;
      if (pull === undefined) return cancel(event);
      const y = event.clientY;
      const starting = !current.moved && Math.abs(y - current.start) > slop;
      if (starting && editable) capture(event.currentTarget, event.pointerId);
      current.moved ||= starting;
      current.prev = current.last;
      current.last = { y, at: event.timeStamp };
      if (current.moved) pull.onDrag?.({ y });
    },
    onPointerUp: (event: PointerEvent<Target>) => {
      const current = track.current;
      if (current?.pointer !== event.pointerId) return;
      if (pull === undefined) return cancel(event);
      track.current = undefined;
      const now = event.timeStamp;
      if (!current.moved) {
        pull.onLift?.({ now });
        if (editable && event.pointerType === "mouse") event.currentTarget.focus();
        return;
      }
      const y = event.clientY;
      const flick = Math.abs(current.last.y - current.prev.y) >= (current.last.at - current.prev.at) * flickPixelsPerMillisecond;
      pull.onRelease?.({ direction: y < current.start ? "up" : "down", flick, y, now });
    },
    onPointerCancel: cancel,
    onLostPointerCapture: cancel,
  };
}
