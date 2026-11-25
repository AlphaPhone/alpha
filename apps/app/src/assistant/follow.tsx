// spec/app/assistant/dock.md, "Story: Drag Ask Alpha where I want it"; spec/app/assistant/dock.md, "A drag released asks the shell once for where it landed, and keeps a sheet's height"; spec/app/assistant/dock.md, "A keyboard closed while typing puts Ask Alpha back on the bar"
import type { AssistantDrag, AssistantRelease } from "@repo/ui";
import { type RefObject, useRef, useState } from "react";
import { isOpen } from "../../gen/app__assistant__dock.ts";
import type { useMachine as useDock } from "../../gen/app__assistant__dock.react.ts";
import { untimed } from "../runtime/reactor.vibe";

const barHeight = 102;
const scrimSlop = 6;

type Dock = ReturnType<typeof useDock>;
type Detent = Parameters<typeof isOpen>[0];

/**
 * The sheet following the finger, as v121's did: a press notes where the finger and the sheet's top were, each move
 * past the slop sets the height the sheet is drawn at, and the release or a cancel hands the dock where it ended.
 * `following` is that live height, or undefined when no drag is under way.
 */
export function useSheetFollow(dock: Dock, detent: Detent, section: RefObject<HTMLElement | null>) {
  const [following, setFollowing] = useState<number | undefined>(undefined);
  const gestureRef = useRef<{ y: number; height: number; moved: boolean } | undefined>(undefined);
  const done = () => {
    gestureRef.current = undefined;
    setFollowing(undefined);
  };
  const gesture: AssistantDrag = {
    onPress: ({ y }) => {
      const shown = section.current?.getBoundingClientRect().height ?? 0;
      gestureRef.current = { y, height: isOpen(detent) ? Math.max(shown, barHeight) : barHeight, moved: false };
      void dock.send({ type: "press", detent, now: untimed });
    },
    onDrag: ({ y }) => {
      const g = gestureRef.current;
      if (!g) return;
      if (!g.moved) {
        if (!dock.can({ type: "drag" })) return;
        g.moved = true;
        void dock.send({ type: "drag" });
      }
      setFollowing(Math.min(window.innerHeight, Math.max(barHeight, Math.round(g.height + g.y - y))));
    },
    onRelease: ({ direction, flick, y }: AssistantRelease) => {
      const g = gestureRef.current;
      done();
      const height = g ? Math.max(0, Math.round(g.height + g.y - y)) : Math.max(0, Math.round(window.innerHeight - y));
      void dock.send({ type: "release", direction: direction === "up" ? "Up" : "Down", flick, height, floor: barHeight, full: window.innerHeight, now: untimed });
    },
    onCancel: () => {
      done();
      void dock.send({ type: "shift", now: untimed });
    },
  };
  return { following, gesture, done };
}

/**
 * v121's chat scrim over the page outside an open sheet: a tap, or a press that moves and is then followed wherever it
 * goes (its scrimSw), lowers Ask Alpha when it ends. While the bar is typed in, it only leaves the field, whose blur
 * rests Ask Alpha once, so a second step Back never leaves the app.
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
        if (!press || press.pointer !== event.pointerId || press.moved || Math.hypot(event.clientX - press.x, event.clientY - press.y) < scrimSlop) return;
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
