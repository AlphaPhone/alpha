import type { ComponentProps, ReactNode } from "react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Card } from "../Card.tsx";
import { StatusDot } from "../StatusDot.tsx";

/** One line a card shows: who or what, and a few words about it. */
export type HomeCardLine = { title: string; detail: string };

export type HomeCardProps = Omit<ComponentProps<"button">, "title"> & {
  /** What the card is about, in a word or two, over what it shows. */
  title: string;
  /** The icon of the app the card opens; decorative. */
  icon: ReactNode;
  /** Why what it shows is not up to date, in a few words; left out when it is current. */
  notCurrent?: string;
};

export type HomeCardLinesProps = {
  /** The lines, in the order given. */
  lines: readonly HomeCardLine[];
};

/** A card in Home's row: one press opens the app it comes from. A card that is not current says so beside a warning mark. */
export function HomeCard({ title, icon, notCurrent, className, children, ...props }: HomeCardProps) {
  return (
    <Card
      asChild
      className={cn(
        focusRing,
        "min-h-44 w-72 max-w-[calc(100vw-3rem)] shrink-0 snap-start text-left transition-colors duration-fast ease-standard hover:bg-accent/60 active:bg-accent",
        className,
      )}
    >
      <button type="button" {...props}>
        <span className="flex w-full items-center gap-2">
          <span className="min-w-0 flex-1 text-xs font-semibold tracking-caps text-muted-foreground uppercase">{title}</span>
          <span aria-hidden className="text-muted-foreground [&_svg:not([class*='size-'])]:size-5">{icon}</span>
        </span>
        <span className="flex w-full min-w-0 flex-1 flex-col gap-2">{children}</span>
        {notCurrent ? <StatusDot status="warn" label={notCurrent} showLabel className="text-muted-foreground" /> : null}
      </button>
    </Card>
  );
}

/** The lines of a card, a name over a few quieter words each. */
export function HomeCardLines({ lines }: HomeCardLinesProps) {
  return lines.map((line) => (
    <span key={`${line.title}\n${line.detail}`} className="flex min-w-0 flex-col">
      <span className="truncate font-semibold">{line.title}</span>
      <span className="truncate text-sm text-muted-foreground">{line.detail}</span>
    </span>
  ));
}
