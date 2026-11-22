// spec/shell/gestures.md, "One pointer owns a press or a drag, and only on the surface that is showing"; spec/shell/gestures.md, "A tap opens its entry unless a hold or drag ended on it; in edit mode it removes"
import { useRef, useState } from "react";
import { PressSlop } from "../../../gen/shell__gestures.ts";
import { AppTile, type TileFace } from "./AppTile.tsx";

/** The launcher calls a grid of tiles reports its pointers and keys to. */
export interface GestureControls {
  down: (pointer: number, key: string, onRemove: boolean) => void;
  move: (pointer: number, far: boolean) => void;
  up: (pointer: number, over: string) => void;
  cancel: (pointer: number) => void;
  context: (key: string) => void;
  tap: (key: string, onRemove: boolean, keyboard: boolean) => void;
  arrow: (key: string, direction: number) => void;
  erase: (key: string) => void;
}

export interface TileGridProps {
  faces: readonly TileFace[];
  /** Home's edit mode. */
  editing?: boolean;
  /** The entry being opened through Android. */
  launching?: string | null;
  controls: GestureControls;
  /** The grid's accessible name. */
  label: string;
}

/** A grid of tiles that turns pointers into the launcher's press, hold and drag gestures. */
export function TileGrid({ faces, editing = false, launching = null, controls, label }: TileGridProps) {
  const starts = useRef(new Map<number, { x: number; y: number; key: string }>());
  const [drag, setDrag] = useState<{ key: string; x: number; y: number } | null>(null);
  const overAt = (x: number, y: number, key: string) =>
    document.elementsFromPoint(x, y).map((node) => node.closest("[data-alpha-tile]")?.getAttribute("data-alpha-tile") ?? "").find((found) => found !== "" && found !== key) ?? "";
  return (
    <div
      role="list"
      aria-label={label}
      data-alpha-home-editing={editing || undefined}
      className="grid grid-cols-[repeat(auto-fill,minmax(calc(5.5rem*var(--alpha-text-scale,1)),1fr))] gap-x-2 gap-y-4 px-3"
      onPointerMove={(event) => {
        const start = starts.current.get(event.pointerId);
        if (!start) return;
        const far = Math.hypot(event.clientX - start.x, event.clientY - start.y) > PressSlop;
        controls.move(event.pointerId, far);
        if (editing && far) {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setDrag({ key: start.key, x: event.clientX - start.x, y: event.clientY - start.y });
        }
      }}
      onPointerUp={(event) => {
        const start = starts.current.get(event.pointerId);
        starts.current.delete(event.pointerId);
        controls.up(event.pointerId, start ? overAt(event.clientX, event.clientY, start.key) : "");
        setDrag(null);
      }}
      onPointerCancel={(event) => {
        starts.current.delete(event.pointerId);
        controls.cancel(event.pointerId);
        setDrag(null);
      }}
    >
      {faces.map((face) => (
        <div role="listitem" key={face.key}>
          <AppTile
            face={face}
            editing={editing}
            launching={launching === face.key}
            offset={drag?.key === face.key ? { x: drag.x, y: drag.y } : undefined}
            onPointerDown={(event, key, onRemove) => {
              if (event.button > 0) return;
              starts.current.set(event.pointerId, { x: event.clientX, y: event.clientY, key });
              controls.down(event.pointerId, key, onRemove);
            }}
            onContextMenu={controls.context}
            onActivate={controls.tap}
            onKey={(key, pressed) => {
              if (!editing) return;
              if (pressed === "Delete" || pressed === "Backspace") controls.erase(key);
              else if (pressed === "ArrowLeft" || pressed === "ArrowUp") controls.arrow(key, -1);
              else if (pressed === "ArrowRight" || pressed === "ArrowDown") controls.arrow(key, 1);
            }}
          />
        </div>
      ))}
    </div>
  );
}
