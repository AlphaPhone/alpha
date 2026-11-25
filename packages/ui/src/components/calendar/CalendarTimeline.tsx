import type { ComponentProps, ReactNode } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

/** The height of one hour of the timeline, in pixels. */
export const calendarHourHeight = 56;

/** One event drawn on the timeline. */
export interface CalendarBlock {
  key: string | number;
  title: string;
  /** Under the title on a block an hour or longer: where it is, or that it is a video call. */
  sub?: string;
  /** The start, such as "9:30", shown at the end where the block is wide enough. */
  time: string;
  /** Read aloud for the block, such as "Standup, 9:30". */
  label: string;
  /** Start and length in hours from the day's midnight. */
  start: number;
  length: number;
  /** Which of `lanes` side-by-side lanes the block is in, where events overlap. */
  lane: number;
  lanes: number;
  /** `plain` on the quiet fill with its calendar's stripe; `invite` dashed, waiting for an answer. */
  tone?: "plain" | "invite";
  /** The stripe of the block's calendar. */
  stripe?: "primary" | "foreground";
  /** Opens the event; left out where it cannot be opened now. */
  onOpen?: () => void;
}

/** A block's place and size in a day `first` hour on, as inline geometry. */
function placed(block: CalendarBlock, first: number) {
  const height = Math.max(24, block.length * calendarHourHeight - 4);
  return { top: (block.start - first) * calendarHourHeight + 8, height, short: height < 40 };
}

export type CalendarEventBlockProps = Omit<ComponentProps<"button">, "children"> & {
  block: CalendarBlock;
  /** The first hour of the day the block is drawn in. */
  first: number;
  /** Whether the start time fits at the block's end. */
  showTime?: boolean;
};

/** One event on the timeline: its calendar's stripe, title, place, and start time. */
export function CalendarEventBlock({ block, first, showTime = true, className, style, ...props }: CalendarEventBlockProps) {
  const { top, height, short } = placed(block, first);
  const invite = block.tone === "invite";
  return (
    <button type="button" aria-label={block.label} disabled={!block.onOpen} onClick={block.onOpen} style={{ top, height, ...style }}
      className={cn(focusRing, "absolute box-border flex items-center gap-2 overflow-hidden rounded-md pr-3 pl-4 text-left disabled:cursor-default",
        short ? "py-0" : "py-2", invite ? "border-[1.5px] border-dashed border-muted-foreground bg-background" : "bg-secondary", className)} {...props}>
      <span aria-hidden className={cn("absolute top-1.5 bottom-1.5 left-1.5 w-0.75 rounded-full", invite || !block.stripe ? "bg-transparent" : block.stripe === "primary" ? "bg-primary" : "bg-foreground")} />
      <span className="flex min-h-0 min-w-0 grow flex-col flex-wrap justify-center self-stretch overflow-hidden">
        <span className="w-full shrink-0 truncate text-sm leading-plain font-semibold">{block.title}</span>
        {!short && block.sub && block.length >= 1 ? <span className="mt-0.75 w-full shrink-0 truncate text-xs leading-plain opacity-85">{block.sub}</span> : null}
      </span>
      {showTime ? <span className="text-xs leading-plain whitespace-nowrap opacity-75">{block.time}</span> : null}
    </button>
  );
}

export type CalendarTimelineProps = Omit<ComponentProps<"div">, "children"> & {
  /** The first and last hour drawn, each with its label, such as "7 AM". */
  hours: ReadonlyArray<{ hour: number; label: string }>;
  /** The day's timed events, each in its lane. */
  blocks?: ReadonlyArray<CalendarBlock>;
  /** The time now in hours from midnight, drawn as a line where the day shown is today. */
  now?: number;
  /** What the day shows where nothing is on it. */
  empty?: ReactNode;
  /** Several days side by side instead of `blocks`. */
  columns?: ReactNode;
};

/** A day's hours, from the first to the last, with each timed event in its place and the time now. */
export function CalendarTimeline({ hours, blocks = [], now, empty, columns, className, ...props }: CalendarTimelineProps) {
  const first = hours[0]?.hour ?? 7;
  const last = hours.at(-1)?.hour ?? 23;
  const height = (last - first) * calendarHourHeight + 16;
  return (
    <div role="region" aria-label="Calendar timeline" tabIndex={0}
      className={cn(focusRing, "grow touch-pan-y overflow-y-auto border-t border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)} {...props}>
      <div className="relative mb-27.5" style={{ height }}>
        {hours.map(({ hour, label }) => (
          <div key={hour}>
            <div aria-hidden className="absolute right-4 left-15 h-px bg-border opacity-70" style={{ top: (hour - first) * calendarHourHeight + 8 }} />
            <div className="absolute left-0 w-12.5 text-right text-2xs leading-plain text-muted-foreground" style={{ top: (hour - first) * calendarHourHeight }}>{label}</div>
          </div>
        ))}
        {empty ? (
          <div className="pointer-events-none absolute top-30 right-4 left-15 flex flex-col items-center gap-1.5 text-center text-sm leading-plain text-muted-foreground *:pointer-events-auto">{empty}</div>
        ) : null}
        {blocks.map((block) => {
          const lanes = Math.max(1, block.lanes);
          return (
            <CalendarEventBlock key={block.key} block={block} first={first} showTime={lanes <= 2}
              style={{ left: `calc(60px + ${block.lane} * (100% - 76px) / ${lanes})`, width: `calc((100% - 76px) / ${lanes} - 4px)` }} />
          );
        })}
        {columns}
        {now === undefined || now < first || now > last ? null : (
          <div aria-hidden className="pointer-events-none absolute right-4 left-13.5 h-0.5 bg-primary" style={{ top: (now - first) * calendarHourHeight + 8 }}>
            <span className="absolute -top-1 -left-1 size-2.5 rounded-full bg-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
