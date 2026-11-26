import { type PointerEvent, useRef } from "react";

import { KEPT_SAMPLES, releaseOf, type Sample, TAP_SLOP } from "./chat-overlay-motion.ts";

type Press = { now: number };
type Track = { pointer: number; start: Sample; samples: Sample[]; moved: boolean; onCancel?: AssistantPull["onCancel"]; mark?: boolean };

/**
 * One released drag, settled as v119 settled it (45f6bed30 chat-overlay-motion-adapter.ts:1108-1124, use-pull-gesture.ts:380-479):
 * the way it went (a flick's aim, else its travel), whether it was a flick, whether it was quick enough to count as a
 * pull, how far it travelled, where it ended and when.
 */
export type AssistantRelease = { direction: "up" | "down"; flick: boolean; quick: boolean; travel: number; y: number; now: number };

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

function settle(track: Track, event: PointerEvent<HTMLElement>): AssistantRelease {
  const { direction, flick, quick, travel, y } = releaseOf(track.start, track.samples, { y: event.clientY, t: event.timeStamp }, event.pointerType === "touch");
  return { direction, flick, quick, travel, y, now: event.timeStamp };
}

function follow(track: Track, y: number, t: number) {
  track.samples.push({ y, t });
  if (track.samples.length > KEPT_SAMPLES) track.samples.shift();
}

function capture(element: HTMLElement, pointer: number) {
  try {
    if (!element.hasPointerCapture?.(pointer)) element.setPointerCapture(pointer);
  } catch {
    return;
  }
}

/**
 * Reports a press, drag or lift from a handle or an eligible editable field. A field the drag is under keeps the pointer
 * when the sheet it rises into is drawn over it, as v119's bar kept the drag of its empty input (45f6bed30
 * chat-overlay-motion-adapter.ts:1012-1020); only a press that has not moved, or a field taken away, lets it go.
 */
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
      const sample = { y: event.clientY, t: event.timeStamp };
      track.current = { pointer: event.pointerId, start: sample, samples: [sample], moved: false, onCancel: pull.onCancel };
      pull.onPress?.({ now: event.timeStamp, y: sample.y });
    },
    onPointerMove: (event: PointerEvent<Target>) => {
      const current = track.current;
      if (current?.pointer !== event.pointerId) return;
      if (pull === undefined) return cancel(event);
      const y = event.clientY;
      const starting = !current.moved && Math.abs(y - current.start.y) >= TAP_SLOP;
      if (starting && editable) capture(event.currentTarget, event.pointerId);
      current.moved ||= starting;
      follow(current, y, event.timeStamp);
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
      pull.onRelease?.(settle(current, event));
    },
    onPointerCancel: cancel,
    onLostPointerCapture: (event: PointerEvent<Target>) => {
      const field = event.currentTarget;
      if (editable && track.current?.moved && track.current.pointer === event.pointerId && field.isConnected) return capture(field, event.pointerId);
      cancel(event);
    },
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
  /** A press of Alpha's mark lifted without moving: as v119's mark (45f6bed30 chat-overlay-motion-adapter.ts:1044-1047, :783-792), a tap on its lift. */
  onLift?: (press: Press & { y: number }) => void;
  /**
   * Where the drag starts: the bar; the pill, which as v119's (45f6bed30 template.html:4826) drags from anywhere on it,
   * its buttons too, whose still press stays a tap; or the strip above a full-screen sheet, which as v119's strip
   * (template.html:4449) drags from anywhere but its own actions.
   */
  from?: "bar" | "pill" | "strip";
};

/**
 * Pointer handlers that let the whole resting bar be dragged like its handle, as v121's bar and pill were. Nothing is
 * taken until the finger moves past a few pixels, so a tap on the bar or its field stays a tap; a press on the handle, or
 * on a field that pulls Ask Alpha itself, is left to it; on the bar a press on any other control (Send, Talk, Stop, the
 * chat actions) stays that control's, and a field with a draft in it scrolls instead, while anywhere on the pill, its
 * buttons too, can start the drag. The press is seen on its way down, before a control keeps it for the field. A touch is held by the field it lands on until the bar
 * takes it, and that hand-over is not a loss. A mouse moves over whatever is under it, so until the slop the page's moves
 * are watched, and the bar takes the pointer once the press is a drag, as v119's handle took it on its press
 * (45f6bed30 use-pull-gesture.ts:233-243); taking it sooner would make a tap the bar's click, not its button's.
 */
export function useAssistantBarDrag({ onStart, onDrag, onRelease, onCancel, onLift, from = "bar" }: AssistantBarDrag) {
  const track = useRef<Track | undefined>(undefined);
  const watching = useRef<(() => void) | undefined>(undefined);
  const lost = (event: PointerEvent<HTMLElement>) => {
    if (event.type === "lostpointercapture" && event.target !== event.currentTarget) return;
    const current = track.current;
    if (current?.pointer !== event.pointerId) return;
    track.current = undefined;
    watching.current?.();
    if (current.moved) onCancel?.({ now: event.timeStamp });
  };
  /** One move of the pressed pointer: once past the slop the bar takes the pointer, as v119's handle did on its press. */
  const moveTo = (owner: HTMLElement, pointer: number, y: number, t: number) => {
    const current = track.current;
    if (current?.pointer !== pointer) return;
    follow(current, y, t);
    if (!current.moved && Math.abs(y - current.start.y) >= TAP_SLOP) {
      current.moved = true;
      watching.current?.();
      capture(owner, pointer);
      onStart?.({ now: t, y: current.start.y });
    }
    if (current.moved) onDrag?.({ y });
  };
  return {
    onPointerDownCapture: (event: PointerEvent<HTMLElement>) => {
      if (!event.isPrimary || event.button !== 0 || !(event.target instanceof Element)) return;
      if (event.target.closest("[data-alpha-grabber]:not([data-alpha-input-drag-alpha]), [data-alpha-pull]")) return;
      // spec/app/assistant/dock.md, "A press does one thing: a tap is never also a drag, and a late click never taps"
      if (from === "pill" ? !event.target.closest("[data-alpha-pill]")
        : from === "strip" ? event.target.closest("[data-alpha-strip-action]")
        : event.target.closest("button, a, [role=menuitem]") && !event.target.closest("[data-alpha-input-drag-alpha]")) return;
      if (event.target instanceof HTMLTextAreaElement && event.target.value !== "") return;
      const sample = { y: event.clientY, t: event.timeStamp };
      track.current = { pointer: event.pointerId, start: sample, samples: [sample], moved: false, mark: event.target.closest("[data-alpha-input-drag-alpha]") !== null };
      watching.current?.();
      const owner = event.currentTarget;
      const pointer = event.pointerId;
      const outside = (seen: globalThis.PointerEvent) => seen.pointerId === pointer && !(seen.target instanceof Node && owner.contains(seen.target));
      const move = (seen: globalThis.PointerEvent) => { if (outside(seen)) moveTo(owner, pointer, seen.clientY, seen.timeStamp); };
      const end = (seen: globalThis.PointerEvent) => {
        if (seen.pointerId !== pointer) return;
        stop();
        if (outside(seen) && track.current?.pointer === pointer && !track.current.moved) track.current = undefined;
      };
      const stop = () => {
        window.removeEventListener("pointermove", move, true);
        window.removeEventListener("pointerup", end, true);
        window.removeEventListener("pointercancel", end, true);
        if (watching.current === stop) watching.current = undefined;
      };
      window.addEventListener("pointermove", move, true);
      window.addEventListener("pointerup", end, true);
      window.addEventListener("pointercancel", end, true);
      watching.current = stop;
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => moveTo(event.currentTarget, event.pointerId, event.clientY, event.timeStamp),
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const current = track.current;
      if (current?.pointer !== event.pointerId) return;
      track.current = undefined;
      if (current.moved) return onRelease?.(settle(current, event));
      if (current.mark) onLift?.({ now: event.timeStamp, y: event.clientY });
    },
    onPointerCancel: lost,
    onLostPointerCapture: lost,
  };
}
