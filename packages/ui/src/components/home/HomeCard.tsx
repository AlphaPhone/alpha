import type { ComponentProps, ReactNode } from "react";
import { cn, launcherRing } from "../../lib/cn.ts";
import { Card } from "../Card.tsx";

/** One line a card shows: who or what, and a few words about it. */
export type HomeCardLine = { title: string; detail: string };

export type HomeCardProps = Omit<ComponentProps<"button">, "title"> & {
  /** What the card is about, in a word or two, over what it shows; left out, the head holds the icon alone. */
  title?: string;
  /** Where the item was read, beside the title. */
  origin?: string;
  /** The icon of the app the card opens; decorative. */
  icon: ReactNode;
  /** The quiet line at the foot of a row card: where and when it was read, how many more, or why it is not up to date. */
  status?: string;
  /** The agenda casts its light heading and icon against Alpha's blue. */
  variant?: "agenda" | "row";
};

export type HomeCardLinesProps = {
  /** The lines, in the order given. */
  lines: readonly HomeCardLine[];
};

/** A card in Home's row: one press opens the app it comes from. Its head, what it shows, and a row card's foot spread over its height. */
export function HomeCard({ title, origin, icon, status, variant = "row", className, children, ...props }: HomeCardProps) {
  const agenda = variant === "agenda";
  return (
    <Card
      asChild
      className={cn(
        "focus-visible:outline-none",
        launcherRing,
        "in-data-[alpha-keyboard]:focus-visible:-outline-offset-focus",
        "min-h-49 shrink-0 snap-start justify-between rounded-home-card border-0 p-5.5 text-left transition-colors duration-fast ease-standard motion-reduce:transition-none",
        agenda
          ? "w-[min(100%,calc(280px_*_clamp(1,var(--alpha-text-scale,1),1.3)))] bg-alpha text-alpha-foreground active:bg-alpha/90"
          : "w-max max-w-[calc(100%-3rem)] min-w-43 bg-secondary text-foreground active:bg-accent",
        className,
      )}
    >
      <button type="button" {...props} data-home-card={variant}>
        <span className="flex w-full min-w-0 items-center justify-between">
          {title ? <span className={cn("min-w-0 font-semibold", agenda ? "shrink text-sm leading-snug text-alpha-foreground/85" : "text-sm")}>{title}</span> : null}
          {origin ? <span className="mx-2 min-w-0 flex-1 truncate text-right text-xs leading-snug font-medium text-alpha-foreground/85">{origin}</span> : null}
          <span aria-hidden className={cn("ml-auto shrink-0 [&_svg:not([class*='size-'])]:size-6", agenda ? "text-alpha-foreground" : "text-primary")}>{icon}</span>
        </span>
        {children}
        {status !== undefined ? <span className="min-h-4.25 truncate text-xs leading-normal text-muted-foreground">{status}</span> : null}
      </button>
    </Card>
  );
}

/** The lines of a card, a name over a few quieter words each. */
export function HomeCardLines({ lines }: HomeCardLinesProps) {
  return (
    <span className="flex max-w-65 min-w-0 flex-col gap-2.5">
      {lines.map((line) => (
        <span key={`${line.title}\n${line.detail}`} className="flex min-w-0 flex-col">
          <span className="truncate text-date font-semibold">{line.title}</span>
          <span className="truncate text-xs leading-normal text-muted-foreground in-data-[home-card=agenda]:text-alpha-foreground/85">{line.detail}</span>
        </span>
      ))}
    </span>
  );
}
