import { type PointerEvent, useRef } from "react";

type Press = { now: number };
type Sample = { y: number; at: number };
type Track = { pointer: number; start: number; prev: Sample; last: Sample; moved: boolean; onCancel: AssistantPull["onCancel"] };

/** The direction, speed, position and time of one released drag. */
export type AssistantRelease = { direction: "up" | "down"; flick: boolean; y: number; now: number };

export interface AssistantPull {
  /** A finger or mouse pressed the control at `y`. */
  onPress?: (press: Press & { y: number }) => void;
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
      pull.onPress?.({ now: event.timeStamp, y: sample.y });
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

/** What a drag on Ask Alpha's resting bar reports: that it began, where the finger is, and how it ended or was taken away. */
export type AssistantBarDrag = {
  /** The finger moved past a few pixels on the bar: a drag begins where it was pressed, as a press of the handle would. */
  onStart?: (press: Press & { y: number }) => void;
  /** Where the finger is, on each move once the drag began. */
  onDrag?: (drag: { y: number }) => void;
  /** The drag ended: its direction, whether it was a flick, and where it ended. */
  onRelease?: (release: AssistantRelease) => void;
  /** The drag was taken away by the system, a resize or the window losing focus. */
  onCancel?: (press: Press) => void;
  /** The bar is drawn as the pill: as on v121, a drag may start on any of its buttons, whose still press stays a tap. */
  pill?: boolean;
};

/**
 * Pointer handlers that let the whole resting bar be dragged like its handle, as v121's bar and pill were. Nothing is
 * taken until the finger moves past a few pixels, so a tap on the bar or its field stays a tap; a press on the handle, or
 * on a field that pulls Ask Alpha itself, is left to it; on the bar a press on any other control (Send, Talk, Stop, the
 * chat actions) stays that control's, and a field with a draft in it scrolls instead, while on the pill every button
 * can start the drag. The press is seen on its way down, before a control keeps it for the field. A touch is held by the field it lands on until the bar
 * takes it, and that hand-over is not a loss.
 */
export function useAssistantBarDrag({ onStart, onDrag, onRelease, onCancel, pill = false }: AssistantBarDrag) {
  const track = useRef<Omit<Track, "onCancel"> | undefined>(undefined);
  const lost = (event: PointerEvent<HTMLElement>) => {
    if (event.type === "lostpointercapture" && event.target !== event.currentTarget) return;
    const current = track.current;
    if (current?.pointer !== event.pointerId) return;
    track.current = undefined;
    if (current.moved) onCancel?.({ now: event.timeStamp });
  };
  return {
    onPointerDownCapture: (event: PointerEvent<HTMLElement>) => {
      if (!event.isPrimary || event.button !== 0 || !(event.target instanceof Element)) return;
      if (event.target.closest("[data-alpha-grabber], [data-alpha-pull]")) return;
      // spec/app/assistant/dock.md, "A press does one thing: a tap is never also a drag, and a late click never taps"
      if (pill ? !event.target.closest("button") : event.target.closest("button, a, [role=menuitem]") && !event.target.closest("[data-alpha-input-drag-alpha]")) return;
      if (event.target instanceof HTMLTextAreaElement && event.target.value !== "") return;
      const sample = { y: event.clientY, at: event.timeStamp };
      track.current = { pointer: event.pointerId, start: sample.y, prev: sample, last: sample, moved: false };
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const current = track.current;
      if (current?.pointer !== event.pointerId) return;
      const y = event.clientY;
      current.prev = current.last;
      current.last = { y, at: event.timeStamp };
      if (!current.moved && Math.abs(y - current.start) > slop) {
        current.moved = true;
        capture(event.currentTarget, event.pointerId);
        onStart?.({ now: event.timeStamp, y: current.start });
      }
      if (current.moved) onDrag?.({ y });
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const current = track.current;
      if (current?.pointer !== event.pointerId) return;
      track.current = undefined;
      if (!current.moved) return;
      const y = event.clientY;
      const flick = Math.abs(current.last.y - current.prev.y) >= (current.last.at - current.prev.at) * flickPixelsPerMillisecond;
      onRelease?.({ direction: y < current.start ? "up" : "down", flick, y, now: event.timeStamp });
    },
    onPointerCancel: lost,
    onLostPointerCapture: lost,
  };
}
