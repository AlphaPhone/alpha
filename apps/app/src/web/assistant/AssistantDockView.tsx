// spec/assistant/dock.md, "Story: Open and size the chat with one gesture"; spec/assistant/dock.md, "Home keeps its bar, and a dragged height lasts only while the chat it was dragged in is open"; spec/assistant/dock.md, "Story: Size the sheet to what it shows"; spec/assistant/dock.md, "A click the platform still owes a gesture is swallowed inside its window"
import { Maximize2, Minimize2, Sparkles } from "lucide-react";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { clampSheet, halfHeight, isFlick, isTap, zoneOf, type Control, type Direction, type Dock, type Zone } from "../../../gen/assistant__dock.ts";
import { Button } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";

/** The dock controls a press may start a gesture on. */
export type DockPress = Extract<Control, "NoControl" | "OpenControl" | "TypeControl" | "ResizeControl">;

/** How a moved drag was let go: its direction, the zone it ended in, whether it was a flick, and the control under it. */
export type DockRelease = { readonly direction: Direction; readonly zone: Zone; readonly flick: boolean; readonly over: Control };

/** The dock's detent and gesture as its machine holds them, what its rules allow now, and the gesture's events. */
export type AssistantDockViewProps = {
  /** The detent the chat rests in: the pill, the bar, the sheet or full screen. */
  chat: Dock["chat"];
  /** The sheet keeps the height it was dragged to. */
  remembered: boolean;
  /** A gesture is captured. */
  dragging: boolean;
  /** The captured gesture has moved, so it is a drag and not a tap. */
  moved: boolean;
  /** The controls a press may start a gesture on now. */
  pressable: Readonly<Record<DockPress, boolean>>;
  /** The size button may act now. */
  canSizeButton: boolean;
  /** The chat may close now. */
  canCloseChat: boolean;
  /** A touch above the half sheet may close it now. */
  canTouchOutside: boolean;
  /** The captured gesture may be cancelled. */
  canCancelDrag: boolean;
  /** The conversation the open sheet shows. */
  children?: ReactNode;
  /** A press started a gesture on a control. */
  onDown: (label: DockPress) => void;
  /** The captured gesture moved past a tap. */
  onMove: () => void;
  /** The captured gesture was let go without moving. */
  onTap: () => void;
  /** The moved drag was let go. */
  onSettleDrag: (release: DockRelease) => void;
  /** The platform cancelled the captured gesture. */
  onCancelDrag: () => void;
  /** The owner pressed the size button. */
  onSizeButton: () => void;
  /** The owner closed the chat. */
  onCloseChat: () => void;
  /** The owner touched above the half sheet. */
  onTouchOutside: () => void;
};

type Track = { readonly startY: number; readonly startHeight: number; samples: { readonly y: number; readonly t: number }[] };

const floorOffset = 90;

/**
 * The compact assistant as its machine holds it: the bar or pill at rest, and the sheet it opens into, sized by one gesture at a time.
 * @model spec/assistant/dock.md
 */
export function AssistantDockView(props: AssistantDockViewProps) {
  const { chat, remembered, dragging, moved, pressable } = props;
  const track = useRef<Track | undefined>(undefined);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const viewport = typeof window === "undefined" ? 800 : window.visualViewport?.height ?? window.innerHeight;
  const full = Math.max(200, viewport - 72);
  const half = halfHeight(viewport, full);
  const sheet = chat === "Full" ? full : clampSheet(remembered && height !== undefined ? height : half, half, full);
  const shown = track.current !== undefined && height !== undefined ? height : sheet;
  const press = (label: DockPress) => (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !event.isPrimary || !pressable[label]) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    track.current = { startY: event.clientY, startHeight: chat === "Sheet" || chat === "Full" ? sheet : 0, samples: [{ y: event.clientY, t: event.timeStamp }] };
    props.onDown(label);
  };
  const drag = (event: PointerEvent<HTMLElement>) => {
    const t = track.current;
    if (t === undefined) return;
    t.samples = [...t.samples.slice(-31), { y: event.clientY, t: event.timeStamp }];
    if (!isTap(event.clientY - t.startY)) {
      if (!moved) props.onMove();
      setHeight(Math.min(full, Math.max(0, t.startHeight + t.startY - event.clientY)));
    }
  };
  const lift = (over: Control) => (event: PointerEvent<HTMLElement>) => {
    const t = track.current;
    track.current = undefined;
    if (t === undefined) return;
    if (!moved) { props.onTap(); return; }
    const recent = t.samples.filter((sample) => event.timeStamp - sample.t <= 100);
    const first = recent[0] ?? t.samples[0];
    const last = t.samples.at(-1);
    const travel = first === undefined || last === undefined ? 0 : first.y - last.y;
    const elapsed = first === undefined || last === undefined ? 0 : Math.round(last.t - first.t);
    const held = last === undefined ? 0 : Math.round(event.timeStamp - last.t);
    const released = Math.min(full, Math.max(0, t.startHeight + t.startY - event.clientY));
    setHeight(released);
    props.onSettleDrag({ direction: t.startY - event.clientY >= 0 ? "Up" : "Down", zone: zoneOf(released, floorOffset, full), flick: isFlick(travel, elapsed, held), over });
  };
  const cancel = () => { track.current = undefined; if (props.canCancelDrag) props.onCancelDrag(); };
  const openSheet = chat === "Sheet" || chat === "Full";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col" data-alpha-chat-dragging={dragging || undefined}>
      {chat === "Sheet" && (
        <div aria-hidden data-alpha-chat-outside="" className="pointer-events-auto fixed inset-0 hidden portrait:block"
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); if (props.canTouchOutside) props.onTouchOutside(); }} />
      )}
      {openSheet ? (
        <div
          className={cn("pointer-events-auto relative flex flex-col bg-background shadow-lg transition-[height] duration-slow ease-sheet motion-reduce:transition-none", chat === "Full" ? "rounded-none" : "rounded-t-xl")}
          style={{ height: shown }}
        >
          {chat !== "Full" && (
            <div role="separator" aria-label="Resize chat" className="flex h-6 touch-none items-center justify-center"
              onPointerDown={press("ResizeControl")} onPointerMove={drag} onPointerUp={lift("NoControl")} onPointerCancel={cancel}>
              <span aria-hidden className="h-1 w-10 rounded-full bg-border" />
            </div>
          )}
          <div className="flex justify-end px-3">
            <Button size="icon" variant="ghost" aria-label={chat === "Full" ? "Shrink chat" : "Expand chat"} data-alpha-chat-size=""
              disabled={!props.canSizeButton} onClick={props.onSizeButton}>
              {chat === "Full" ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
            <Button size="icon" variant="ghost" aria-label="Close chat" disabled={!props.canCloseChat} onClick={props.onCloseChat}>
              <span aria-hidden className="h-1 w-5 rounded-full bg-foreground" />
            </Button>
          </div>
          <div className="min-h-0 flex-1">
            {props.children}
          </div>
        </div>
      ) : chat === "Input" ? (
        <div className="pointer-events-auto flex items-center gap-2 rounded-t-xl bg-background px-3 py-2 shadow-md" data-alpha-input-drag-background=""
          onPointerDown={press("NoControl")} onPointerMove={drag} onPointerUp={lift("NoControl")} onPointerCancel={cancel}>
          <Button variant="ghost" className="flex-1 justify-start text-muted-foreground" aria-label="Open conversation"
            onPointerDown={(event) => { event.stopPropagation(); press("OpenControl")(event); }} onPointerUp={(event) => { event.stopPropagation(); lift("OpenControl")(event); }}>
            <Sparkles aria-hidden className="size-4 text-primary" />Ask Alpha
          </Button>
        </div>
      ) : (
        <Button className="pointer-events-auto mx-auto mb-[max(env(safe-area-inset-bottom),12px)] rounded-full" aria-label="Type"
          onPointerDown={press("TypeControl")} onPointerMove={drag} onPointerUp={lift("TypeControl")} onPointerCancel={cancel}>
          <Sparkles aria-hidden className="size-4" />Alpha
        </Button>
      )}
    </div>
  );
}
