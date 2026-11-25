// spec/app/photos/index.md, "While Photos is open, the owner can pinch the grid between three, four and five columns"
import { Check, Heart, Image, Play } from "lucide-react";
import { memo, useMemo, useRef, type MouseEvent, type TouchEvent, type UIEvent } from "react";
import { cn } from "@repo/ui";
import type { Density } from "../../gen/app__photos.ts";
import { taken, type Row } from "./catalog.vibe";

type TileProps = {
  readonly number: number;
  readonly row: Row;
  readonly selected?: boolean;
  readonly interactive: boolean;
};

/** Days within this many days of today have a heading of their own, as in v121; older items are grouped by month. */
const dayHeadings = 30;

const startOfDay = (at: number) => new Date(at).setHours(0, 0, 0, 0);

/** The heading an item taken `at` falls under, as of `now`: "Today", "Yesterday", "Sat, Oct 31", then "October 2026". */
export function headingOf(at: number, now: number): string {
  const ago = Math.round((startOfDay(now) - startOfDay(at)) / 86_400_000);
  const shot = new Date(at);
  if (ago <= 0) return "Today";
  if (ago === 1) return "Yesterday";
  if (ago < dayHeadings) {
    const otherYear = shot.getFullYear() !== new Date(now).getFullYear();
    return shot.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", ...(otherYear ? { year: "numeric" } : {}) });
  }
  return shot.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function timing(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

const Tile = memo(function Tile({ number, row, selected, interactive }: TileProps) {
  const video = row.kind === "phone" ? row.item.kind === "video" : row.item.mimeType.startsWith("video/");
  const image = row.kind === "phone" ? row.item.image : row.item.thumbnail;
  const name = row.item.name ?? (video ? "Video" : "Photo");
  const starred = row.kind === "phone" && row.item.favorite === true;
  return (
    <button type="button" data-alpha-media-key={number} aria-label={name} aria-pressed={selected}
      disabled={!interactive}
      className="relative grid aspect-square min-w-0 touch-pan-y place-items-center overflow-hidden bg-secondary focus-visible:outline-focus focus-visible:outline-offset-focus">
      {image ? <img src={image} loading="lazy" decoding="async" alt="" className="absolute inset-0 size-full object-cover" /> : <Image aria-hidden className="size-6 text-muted-foreground" />}
      {starred && <span className="absolute bottom-1 left-1 grid size-6 place-items-center rounded-full bg-background/80" aria-label="Favorite"><Heart aria-hidden className="size-3.5 fill-current" /></span>}
      {video && <span className="absolute right-1 bottom-1 flex items-center gap-1 rounded-full bg-background/80 px-1.5 py-0.5 text-xs"><Play aria-hidden className="size-3 fill-current" />{timing(row.item.duration ?? 0)}</span>}
      {selected !== undefined && <span aria-hidden className={cn("absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full border border-background", selected ? "bg-primary text-primary-foreground" : "bg-background/65")}>{selected && <Check className="size-4" />}</span>}
    </button>
  );
});

const sizes = {
  Spacious: { columns: 3, style: "grid-cols-3 [contain-intrinsic-block-size:auto_32cqw]", larger: "Spacious", smaller: "Regular" },
  Regular: { columns: 4, style: "grid-cols-4 [contain-intrinsic-block-size:auto_24cqw]", larger: "Spacious", smaller: "Compact" },
  Compact: { columns: 5, style: "grid-cols-5 [contain-intrinsic-block-size:auto_19cqw]", larger: "Regular", smaller: "Compact" },
} as const satisfies Record<Density, { columns: number; style: string; larger: Density; smaller: Density }>;

function touchDistance(event: TouchEvent<HTMLDivElement>): number {
  if (event.touches.length !== 2) return 0;
  const [first, second] = [event.touches[0], event.touches[1]];
  return first && second ? Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY) : 0;
}

interface MediaGridProps {
  readonly rows: readonly { readonly number: number; readonly row: Row }[];
  readonly selection?: ReadonlySet<number>;
  readonly grouped?: boolean;
  readonly density: Density;
  readonly resize: (density: Density) => void;
  /** Alpha's latest time, which the day headings count back from. */
  readonly now: number;
  readonly open?: (number: number) => void;
  readonly start?: (number: number) => void;
  readonly more?: () => void;
}

/** The most recent photos come first in a grid, with day headings in the Library. */
export function MediaGrid({ rows, selection, grouped, density, resize, now, open, start, more }: MediaGridProps) {
  const pinchRef = useRef<{ distance: number; start: Density; reported: Density } | undefined>(undefined);
  const size = sizes[density];
  const groups = useMemo(() => {
    const byDay = new Map<string, Array<(typeof rows)[number]>>();
    for (const item of rows) {
      const date = taken(item.row);
      const label = grouped && Number.isFinite(date) && date > 0 ? headingOf(date, now) : "";
      const group = byDay.get(label) ?? [];
      if (!byDay.has(label)) byDay.set(label, group);
      group.push(item);
    }
    return [...byDay];
  }, [rows, grouped, now]);
  function choose(event: MouseEvent<HTMLDivElement>, action: ((number: number) => void) | undefined) {
    if (action === undefined || !(event.target instanceof Element)) return;
    const tile = event.target.closest("button[data-alpha-media-key]");
    const number = Number(tile?.getAttribute("data-alpha-media-key"));
    if (number > 0 && Number.isSafeInteger(number)) {
      if (event.type === "contextmenu") event.preventDefault();
      action(number);
    }
  }
  function startPinch(event: TouchEvent<HTMLDivElement>) {
    const distance = touchDistance(event);
    pinchRef.current = distance > 0 ? { distance, start: density, reported: density } : undefined;
  }
  function movePinch(event: TouchEvent<HTMLDivElement>) {
    const pinch = pinchRef.current;
    const distance = touchDistance(event);
    if (!pinch || distance <= 0) return;
    const ratio = distance / pinch.distance;
    const start = sizes[pinch.start];
    const changed = ratio > 1.25 ? start.larger : ratio < 0.8 ? start.smaller : pinch.start;
    if (changed === pinch.reported) return;
    pinch.reported = changed;
    resize(changed);
  }
  function clearPinch() {
    pinchRef.current = undefined;
  }
  function scrolled(event: UIEvent<HTMLDivElement>) {
    const pane = event.currentTarget;
    if (pane.scrollHeight - pane.scrollTop - pane.clientHeight < pane.clientHeight / 2) more?.();
  }
  return (
    <div data-alpha-app-scroll="photos" className="min-h-0 flex-1 touch-pan-y overflow-y-auto px-3 pb-28 [container-type:inline-size]" onScroll={scrolled}
      onClick={(event) => choose(event, open)} onContextMenu={(event) => choose(event, start)}
      onTouchStart={startPinch} onTouchMove={movePinch} onTouchEnd={clearPinch} onTouchCancel={clearPinch}>
      {groups.map(([label, items]) => (
        <section key={label} aria-label={label || "Photos"}>
          {label && <header className="sticky top-0 z-10 flex items-baseline justify-between bg-background px-1 py-2 text-sm font-semibold"><h2>{label}</h2><span className="text-xs font-normal text-muted-foreground">{items.length}</span></header>}
          {Array.from({ length: Math.ceil(items.length / size.columns) }, (_, index) => {
            const line = items.slice(index * size.columns, (index + 1) * size.columns);
            return <div key={line[0]?.number ?? index} className={cn("mb-0.5 grid gap-0.5 [content-visibility:auto]", size.style)}>{line.map(({ number, row }) => (
              <Tile key={number} number={number} row={row} selected={selection?.has(number)} interactive={open !== undefined} />
            ))}</div>;
          })}
        </section>
      ))}
      {more && <button type="button" className="mx-auto mt-4 block min-h-11 rounded-full bg-muted px-4 text-sm" onClick={more}>Show more</button>}
    </div>
  );
}
