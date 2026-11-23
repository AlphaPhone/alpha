// spec/assistant/dock.md, "Story: Open and size the chat with one gesture"; spec/assistant/dock.md, "Home keeps its bar, and a dragged height lasts only while the chat it was dragged in is open"; spec/assistant/dock.md, "Story: Size the sheet to what it shows"; spec/assistant/dock.md, "A click the platform still owes a gesture is swallowed inside its window"
import { Effect } from "effect";
import { Maximize2, Minimize2, Sparkles } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import { clampSheet, halfHeight, initial, isFlick, isTap, zoneOf, type Control } from "../../../gen/assistant__dock.ts";
import { useMachine } from "../../../gen/assistant__dock.react.ts";
import type { AppId } from "../app-screen.ts";
import { Assistant } from "../../assistant/assistant.vibe";
import { Button } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";
import { ChatPanel } from "./ChatPanel.tsx";
import { runtime } from "./runtime.ts";
import { act } from "../shell/services.ts";

/** What the shell gives the dock: a way to open an app. */
export type AssistantDockProps = {
  /** Open an app, as the shell does. */
  open: (app: AppId, route?: string) => void;
};

type Track = { readonly startY: number; readonly startHeight: number; samples: { readonly y: number; readonly t: number }[] };

const floorOffset = 90;

/**
 * The compact assistant on every screen: the bar or pill at rest, and the sheet it opens into, sized by one gesture at a time.
 * @model spec/assistant/dock.md
 */
export function AssistantDock({ open }: AssistantDockProps) {
  const { state = initial, can, send } = useMachine(runtime);
  const track = useRef<Track | undefined>(undefined);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const viewport = typeof window === "undefined" ? 800 : window.visualViewport?.height ?? window.innerHeight;
  const full = Math.max(200, viewport - 72);
  const half = halfHeight(viewport, full);
  const sheet = state.chat === "Full" ? full : clampSheet(state.remembered && height !== undefined ? height : half, half, full);
  const shown = track.current !== undefined && height !== undefined ? height : sheet;
  const press = (label: Control) => (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !event.isPrimary || !can({ type: "down", label })) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    track.current = { startY: event.clientY, startHeight: state.chat === "Sheet" || state.chat === "Full" ? sheet : 0, samples: [{ y: event.clientY, t: event.timeStamp }] };
    void send({ type: "down", label });
  };
  const drag = (event: PointerEvent<HTMLElement>) => {
    const t = track.current;
    if (t === undefined) return;
    t.samples = [...t.samples.slice(-31), { y: event.clientY, t: event.timeStamp }];
    if (!isTap(event.clientY - t.startY)) {
      if (!state.drag.moved) void send({ type: "move" });
      setHeight(Math.min(full, Math.max(0, t.startHeight + t.startY - event.clientY)));
    }
  };
  const lift = (over: Control) => (event: PointerEvent<HTMLElement>) => {
    const t = track.current;
    track.current = undefined;
    if (t === undefined) return;
    if (!state.drag.moved) { void send({ type: "tap" }); return; }
    const recent = t.samples.filter((sample) => event.timeStamp - sample.t <= 100);
    const first = recent[0] ?? t.samples[0];
    const last = t.samples.at(-1);
    const travel = first === undefined || last === undefined ? 0 : first.y - last.y;
    const elapsed = first === undefined || last === undefined ? 0 : Math.round(last.t - first.t);
    const held = last === undefined ? 0 : Math.round(event.timeStamp - last.t);
    const released = Math.min(full, Math.max(0, t.startHeight + t.startY - event.clientY));
    setHeight(released);
    void send({ type: "settleDrag", direction: t.startY - event.clientY >= 0 ? "Up" : "Down", zone: zoneOf(released, floorOffset, full), flick: isFlick(travel, elapsed, held), over });
  };
  const cancel = () => { track.current = undefined; if (can({ type: "cancelDrag" })) void send({ type: "cancelDrag" }); };
  const openSheet = state.chat === "Sheet" || state.chat === "Full";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col" data-alpha-chat-dragging={state.drag.active || undefined}>
      {state.chat === "Sheet" && (
        <div aria-hidden data-alpha-chat-outside="" className="pointer-events-auto fixed inset-0 hidden portrait:block"
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); if (can({ type: "touchOutside" })) void send({ type: "touchOutside" }); }} />
      )}
      {openSheet ? (
        <div
          className={cn("pointer-events-auto relative flex flex-col bg-background shadow-lg transition-[height] duration-slow ease-sheet motion-reduce:transition-none", state.chat === "Full" ? "rounded-none" : "rounded-t-xl")}
          style={{ height: shown }}
        >
          {state.chat !== "Full" && (
            <div role="separator" aria-label="Resize chat" className="flex h-6 touch-none items-center justify-center"
              onPointerDown={press("ResizeControl")} onPointerMove={drag} onPointerUp={lift("NoControl")} onPointerCancel={cancel}>
              <span aria-hidden className="h-1 w-10 rounded-full bg-border" />
            </div>
          )}
          <div className="flex justify-end px-3">
            <Button size="icon" variant="ghost" aria-label={state.chat === "Full" ? "Shrink chat" : "Expand chat"} data-alpha-chat-size=""
              disabled={!can({ type: "sizeButton" })} onClick={() => void send({ type: "sizeButton" })}>
              {state.chat === "Full" ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
            <Button size="icon" variant="ghost" aria-label="Close chat" disabled={!can({ type: "closeChat" })} onClick={() => void send({ type: "closeChat" })}>
              <span aria-hidden className="h-1 w-5 rounded-full bg-foreground" />
            </Button>
          </div>
          <div className="min-h-0 flex-1">
            <ChatPanel open={(app, route) => open(app as AppId, route)} onTalk={() => act(Effect.flatMap(Effect.service(Assistant), (assistant) => assistant.requestVoice()))} />
          </div>
        </div>
      ) : state.chat === "Input" ? (
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
