// spec/camera/browse.md, "Story: Select what I see"; spec/camera/library.md, "Rows are ordered newest capture first, and equal times keep their order, so paging never reorders"
import { Check, Heart, Play } from "lucide-react";
import { useRef } from "react";
import type { Row } from "../../../gen/camera__library.ts";
import { groupSections } from "../../camera/photoGrid.vibe";
import { cn, focusRing } from "../lib/cn.ts";

export interface PhotoGridProps {
  /** The open list, newest first. */
  rows: readonly Row[];
  /** The selected items, when selecting. */
  selection: readonly string[];
  selecting: boolean;
  /** Three to five tiles a row. */
  columns: number;
  /** The time "Today" is counted from. */
  now: number;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
  onHold: (id: string) => void;
  onDrag: (anchor: string, id: string) => void;
  onPinch: (wider: boolean) => void;
}

const HOLD_MS = 450;

/** The day-grouped grid of tiles: tap opens or toggles, a long press selects, a drag extends, a pinch changes the columns. */
export function PhotoGrid({ rows, selection, selecting, columns, now, onOpen, onToggle, onHold, onDrag, onPinch }: PhotoGridProps) {
  const gesture = useRef<{ hold?: ReturnType<typeof setTimeout>; anchor?: string; held?: string; pinch?: number; pointers: Map<number, { x: number; y: number }> }>({ pointers: new Map() });
  const grid = columns === 3 ? "grid-cols-3" : columns === 5 ? "grid-cols-5" : "grid-cols-4";
  return (
    <div
      className="flex flex-col gap-4 overflow-y-auto pb-24"
      onPointerDown={(event) => {
        gesture.current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (gesture.current.pointers.size === 2) {
          const [a, b] = [...gesture.current.pointers.values()];
          gesture.current.pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        }
      }}
      onPointerMove={(event) => {
        if (!gesture.current.pointers.has(event.pointerId)) return;
        gesture.current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (gesture.current.pointers.size === 2 && gesture.current.pinch !== undefined) {
          const [a, b] = [...gesture.current.pointers.values()];
          const ratio = Math.hypot(a!.x - b!.x, a!.y - b!.y) / gesture.current.pinch;
          if (ratio > 1.25 || ratio < 0.8) {
            onPinch(ratio > 1.25);
            gesture.current.pinch = undefined;
          }
          return;
        }
        const anchor = gesture.current.anchor;
        const over = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-media-id]")?.dataset.mediaId;
        if (selecting && anchor !== undefined && over !== undefined && over !== anchor) onDrag(anchor, over);
      }}
      onPointerUp={(event) => {
        gesture.current.pointers.delete(event.pointerId);
        if (gesture.current.hold !== undefined) clearTimeout(gesture.current.hold);
        gesture.current.anchor = undefined;
      }}
      onPointerCancel={(event) => gesture.current.pointers.delete(event.pointerId)}
    >
      {groupSections(rows, now).map((section) => (
        <section key={section.key} aria-label={section.label}>
          <h2 className="px-4 pb-2 font-mono text-xs uppercase text-muted-foreground">{section.label}</h2>
          <ul className={cn("grid gap-0.5", grid)}>
            {section.items.map((row) => {
              const on = selection.includes(row.id);
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    data-media-id={row.id}
                    aria-label={`${row.video ? "Video" : "Photo"}, ${new Date(row.rank).toLocaleString("en-US")}`}
                    aria-pressed={selecting ? on : undefined}
                    className={cn("relative block aspect-square w-full overflow-hidden bg-muted", focusRing)}
                    onPointerDown={() => {
                      gesture.current.anchor = row.id;
                      if (selecting) return;
                      gesture.current.hold = setTimeout(() => {
                        gesture.current.held = row.id;
                        onHold(row.id);
                      }, HOLD_MS);
                    }}
                    onClick={() => {
                      if (gesture.current.held === row.id) {
                        gesture.current.held = undefined;
                        return;
                      }
                      if (selecting) onToggle(row.id);
                      else onOpen(row.id);
                    }}
                  >
                    {row.image !== "" && <img src={row.image} alt="" loading="lazy" className={cn("size-full object-cover", on && "scale-90 rounded-md")} />}
                    {row.video && <Play aria-hidden className="absolute right-1 bottom-1 size-4 text-background" />}
                    {row.favorite && <Heart aria-hidden className="absolute bottom-1 left-1 size-4 fill-background text-background" />}
                    {selecting && (
                      <span aria-hidden className={cn("absolute top-1 right-1 flex size-5 items-center justify-center rounded-full border-2 border-background", on ? "bg-primary" : "bg-scrim")}>
                        {on && <Check className="size-3 text-primary-foreground" />}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
