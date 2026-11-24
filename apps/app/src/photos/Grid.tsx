import { Check, Heart, Image, Play } from "lucide-react";
import { memo, useMemo, type UIEvent } from "react";
import { cn } from "@repo/ui";
import { taken, type Row } from "./catalog.vibe";

type TileProps = {
  readonly number: number;
  readonly row: Row;
  readonly selected?: boolean;
  readonly open?: (number: number) => void;
  readonly start?: (number: number) => void;
};

const day = new Intl.DateTimeFormat(undefined, { dateStyle: "long" });

function timing(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

const Tile = memo(function Tile({ number, row, selected, open, start }: TileProps) {
  const video = row.kind === "phone" ? row.item.kind === "video" : row.item.file.type.startsWith("video/");
  const image = row.kind === "phone" ? row.item.image : row.item.thumbnail;
  const name = row.item.name ?? (video ? "Video" : "Photo");
  const starred = row.kind === "phone" && row.item.favorite === true;
  return (
    <button type="button" data-alpha-media-key={number} aria-label={name} aria-pressed={selected}
      disabled={!open}
      className="relative grid aspect-square min-w-0 touch-pan-y place-items-center overflow-hidden bg-secondary focus-visible:outline-focus focus-visible:outline-offset-focus"
      onClick={open && (() => open(number))}
      onContextMenu={start && ((event) => { event.preventDefault(); start(number); })}>
      {image ? <img src={image} loading="lazy" decoding="async" alt="" className="absolute inset-0 size-full object-cover" /> : <Image aria-hidden className="size-6 text-muted-foreground" />}
      {starred && <span className="absolute bottom-1 left-1 grid size-6 place-items-center rounded-full bg-background/80" aria-label="Favorite"><Heart aria-hidden className="size-3.5 fill-current" /></span>}
      {video && <span className="absolute right-1 bottom-1 flex items-center gap-1 rounded-full bg-background/80 px-1.5 py-0.5 text-xs"><Play aria-hidden className="size-3 fill-current" />{timing(row.item.duration ?? 0)}</span>}
      {selected !== undefined && <span aria-hidden className={cn("absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full border border-background", selected ? "bg-primary text-primary-foreground" : "bg-background/65")}>{selected && <Check className="size-4" />}</span>}
    </button>
  );
});

interface MediaGridProps {
  readonly rows: readonly { readonly number: number; readonly row: Row }[];
  readonly selection?: ReadonlySet<number>;
  readonly grouped?: boolean;
  readonly open?: (number: number) => void;
  readonly start?: (number: number) => void;
  readonly more?: () => void;
}

/** The most recent photos come first in a grid, with day headings in the Library. */
export function MediaGrid({ rows, selection, grouped, open, start, more }: MediaGridProps) {
  const groups = useMemo(() => {
    const byDay = new Map<string, Array<(typeof rows)[number]>>();
    for (const item of rows) {
      const date = taken(item.row);
      const label = grouped && Number.isFinite(date) && date > 0 ? day.format(date) : "";
      const group = byDay.get(label) ?? [];
      if (!byDay.has(label)) byDay.set(label, group);
      group.push(item);
    }
    return [...byDay];
  }, [rows, grouped]);
  function scrolled(event: UIEvent<HTMLDivElement>) {
    const pane = event.currentTarget;
    if (pane.scrollHeight - pane.scrollTop - pane.clientHeight < pane.clientHeight / 2) more?.();
  }
  return (
    <div data-alpha-app-scroll="photos" className="min-h-0 flex-1 touch-pan-y overflow-y-auto pb-28 [container-type:inline-size]" onScroll={scrolled}>
      {groups.map(([label, items]) => (
        <section key={label} aria-label={label || "Photos"}>
          {label && <header className="sticky top-0 z-10 flex items-baseline justify-between bg-background px-4 py-2 text-sm font-semibold"><h2>{label}</h2><span className="text-xs font-normal text-muted-foreground">{items.length}</span></header>}
          {Array.from({ length: Math.ceil(items.length / 4) }, (_, index) => {
            const line = items.slice(index * 4, index * 4 + 4);
            return <div key={line[0]?.number ?? index} className="mb-0.5 grid grid-cols-4 gap-0.5 [content-visibility:auto] [contain-intrinsic-block-size:auto_24cqw]">{line.map(({ number, row }) => (
              <Tile key={number} number={number} row={row} selected={selection?.has(number)} open={open} start={start} />
            ))}</div>;
          })}
        </section>
      ))}
      {more && <button type="button" className="mx-auto mt-4 block min-h-11 rounded-full bg-muted px-4 text-sm" onClick={more}>Show more</button>}
    </div>
  );
}
