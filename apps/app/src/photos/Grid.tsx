// spec/app/photos/index.md, "While Photos is open, the owner can pinch the grid between three, four and five columns"
import type { Effect, ManagedRuntime } from "effect";
import { Check, Heart, Image, Play } from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState, type MouseEvent, type ReactNode, type TouchEvent, type UIEvent } from "react";
import { cn } from "@repo/ui";
import type { Density } from "../../gen/app__photos.ts";
import { taken, type Row } from "./catalog.vibe";
import { thumbnailBatch, viewportThumbnails } from "./photos.vibe";

type Thumbnails = ReadonlyMap<number, string>;
type ThumbnailContext = Effect.Services<ReturnType<typeof viewportThumbnails>>;

const viewportInset = "192px 0px";
const thumbnailRoom = 144;

type GridObserver = {
  observe(line: HTMLDivElement, ids: string): void;
  forget(line: HTMLDivElement): void;
};

function useThumbnails(runtime: ManagedRuntime.ManagedRuntime<ThumbnailContext, unknown>, revision: number, trash: boolean) {
  const view = `${revision}:${trash}`;
  const [rendered, setRendered] = useState<{ scope: string; images: Thumbnails }>();
  const observingRef = useRef<GridObserver | undefined>(undefined);
  const connect = useCallback((root: HTMLDivElement | null) => {
    if (!root || typeof IntersectionObserver === "undefined") return;
    const active = new Map<Element, readonly number[]>();
    const membership = new WeakMap<Element, readonly number[]>();
    const pixels = new Map<number, string | undefined>();
    let closed = false;
    let reading = false;

    function wanted(): Set<number> {
      return new Set([...active.values()].flat().slice(0, thumbnailRoom));
    }
    function publish() {
      const images = new Map([...pixels].flatMap(([id, image]) => image ? [[id, image] as const] : []));
      setRendered({ scope: view, images });
    }
    async function settle() {
      if (closed) return;
      const current = wanted();
      let removed = false;
      for (const id of pixels.keys()) if (!current.has(id)) { pixels.delete(id); removed = true; }
      if (removed) publish();
      if (reading) return;
      const missing = [...current].filter((id) => !pixels.has(id)).slice(0, thumbnailBatch);
      if (missing.length === 0) return;
      reading = true;
      const read = await runtime.runPromiseExit(viewportThumbnails(missing, { revision, trash }));
      reading = false;
      if (closed) return;
      const latest = wanted();
      for (const id of missing) if (latest.has(id)) pixels.set(id, read._tag === "Success" ? read.value.get(id) : undefined);
      publish();
      void settle();
    }

    const observer = new IntersectionObserver((changes) => {
      if (closed) return;
      for (const change of changes) {
        const line = change.target;
        if (!change.isIntersecting || !line.isConnected) {
          active.delete(line);
        } else {
          active.set(line, membership.get(line) ?? []);
        }
      }
      void settle();
    }, { root, rootMargin: viewportInset });
    observingRef.current = {
      observe(line, ids) {
        membership.set(line, ids.split(",").map(Number).filter((id) => id > 0 && Number.isSafeInteger(id)));
        observer.observe(line);
      },
      forget: (line) => {
        observer.unobserve(line);
        active.delete(line);
        void settle();
      },
    };
    for (const line of root.querySelectorAll<HTMLDivElement>("[data-alpha-grid-line]")) observingRef.current.observe(line, line.dataset.alphaGridLine ?? "");
    return () => {
      closed = true;
      observingRef.current = undefined;
      observer.disconnect();
      active.clear();
      pixels.clear();
    };
  }, [runtime, revision, trash, view]);
  const observeLine = useCallback((line: HTMLDivElement | null, ids: string) => {
    if (!line) return;
    observingRef.current?.observe(line, ids);
    return () => observingRef.current?.forget(line);
  }, []);
  return { connect, observeLine, images: rendered?.scope === view ? rendered.images : undefined };
}

function ThumbnailLine({ members, observe, style, children }: {
  members: string;
  observe: (node: HTMLDivElement | null, members: string) => (() => void) | undefined;
  style: string;
  children: ReactNode;
}) {
  const mark = useCallback((line: HTMLDivElement | null) => observe(line, members), [observe, members]);
  return <div ref={mark} data-alpha-grid-line={members} className={cn("mb-0.5 grid gap-0.5 [content-visibility:auto]", style)}>{children}</div>;
}

type TileProps = {
  readonly number: number;
  readonly row: Row;
  readonly image?: string;
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

const Tile = memo(function Tile({ number, row, image, selected, interactive }: TileProps) {
  const video = row.kind === "phone" ? row.item.kind === "video" : row.item.mimeType.startsWith("video/");
  const name = row.item.name ?? (video ? "Video" : "Photo");
  const starred = row.item.favorite === true;
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
  readonly runtime: ManagedRuntime.ManagedRuntime<ThumbnailContext, unknown>;
  readonly revision: number;
  readonly trash: boolean;
  readonly resize: (density: Density) => void;
  /** Alpha's latest time, which the day headings count back from. */
  readonly now: number;
  readonly open?: (number: number) => void;
  readonly start?: (number: number) => void;
  readonly more?: () => void;
}

/** The most recent photos come first in a grid, with day headings in the Library. */
export function MediaGrid({ rows, selection, grouped, density, runtime, revision, trash, resize, now, open, start, more }: MediaGridProps) {
  const { connect, observeLine, images } = useThumbnails(runtime, revision, trash);
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
    <div ref={connect} data-alpha-app-scroll="photos" className="min-h-0 flex-1 touch-pan-y overflow-y-auto px-3 pb-28 [container-type:inline-size]" onScroll={scrolled}
      onClick={(event) => choose(event, open)} onContextMenu={(event) => choose(event, start)}
      onTouchStart={startPinch} onTouchMove={movePinch} onTouchEnd={clearPinch} onTouchCancel={clearPinch}>
      {groups.map(([label, items]) => (
        <section key={label} aria-label={label || "Photos"}>
          {label && <header className="sticky top-0 z-10 flex items-baseline justify-between bg-background px-1 py-2 text-sm font-semibold"><h2>{label}</h2><span className="text-xs font-normal text-muted-foreground">{items.length}</span></header>}
          {Array.from({ length: Math.ceil(items.length / size.columns) }, (_, index) => {
            const line = items.slice(index * size.columns, (index + 1) * size.columns);
            return <ThumbnailLine key={line[0]?.number ?? index} members={line.map((item) => item.number).join(",")} observe={observeLine} style={size.style}>{line.map(({ number, row }) => (
              <Tile key={number} number={number} row={row} image={images?.get(number)} selected={selection?.has(number)} interactive={open !== undefined} />
            ))}</ThumbnailLine>;
          })}
        </section>
      ))}
      {more && <button type="button" className="mx-auto mt-4 block min-h-11 rounded-full bg-muted px-4 text-sm" onClick={more}>Show more</button>}
    </div>
  );
}
