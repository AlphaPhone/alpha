import type { ComponentProps, ReactNode } from "react";
import { cn, launcherRing } from "../../lib/cn.ts";
import { Card } from "../Card.tsx";
import { StatusDot } from "../StatusDot.tsx";

/** One line a card shows: who or what, and a few words about it. */
export type HomeCardLine = { title: string; detail: string };

export type HomeCardProps = Omit<ComponentProps<"button">, "title"> & {
  /** What the card is about, in a word or two, over what it shows. */
  title?: string;
  /** The icon of the app the card opens; decorative. */
  icon: ReactNode;
  /** Why what it shows is not up to date, in a few words; left out when it is current. */
  notCurrent?: string;
  /** The card's foot, as v121's cards closed: where what it shows was read and when, such as "Recent email · Updated 1:32 PM". */
  status?: string;
  /** The agenda casts its light heading and icon against Alpha's blue. */
  variant?: "agenda" | "row";
};

export type HomeCardLinesProps = {
  /** The lines, in the order given. */
  lines: readonly HomeCardLine[];
};

/** A card in Home's row: one press opens the app it comes from. A card that is not current says so beside a warning mark. */
export function HomeCard({ title, icon, notCurrent, status, variant = "row", className, children, ...props }: HomeCardProps) {
  const agenda = variant === "agenda";
  return (
    <Card
      asChild
      className={cn(
        "focus-visible:outline-none",
        launcherRing,
        "min-h-49 w-max min-w-43 max-w-full shrink-0 snap-start justify-between rounded-home-card border-0 bg-secondary p-5.5 text-left text-foreground transition-colors duration-fast ease-standard active:bg-accent",
        agenda && "w-[min(100%,calc(280px_*_clamp(1,var(--alpha-text-scale,1),1.3)))] bg-alpha text-alpha-foreground active:bg-alpha/90",
        className,
      )}
    >
      <button type="button" {...props}>
        <span className="flex w-full items-center gap-2">
          <span className={cn("min-w-0 flex-1 text-sm leading-snug font-semibold", agenda && "text-alpha-foreground/85")}>{title}</span>
          <span aria-hidden className={cn("text-primary [&_svg:not([class*='size-'])]:size-6", agenda && "text-alpha-foreground")}>{icon}</span>
        </span>
        <span className={cn("flex w-full min-w-0 flex-1 flex-col justify-center gap-3", !agenda && "max-w-65")}>{children}</span>
        {status ? <span className={cn("min-h-4 truncate text-xs leading-snug text-muted-foreground", agenda && "text-alpha-foreground/85")}>{status}</span> : null}
        {notCurrent ? <StatusDot status="warn" label={notCurrent} showLabel className={cn("text-muted-foreground", agenda && "text-alpha-foreground/85")} /> : null}
      </button>
    </Card>
  );
}

/** The lines of a card, a name over a few quieter words each. */
export function HomeCardLines({ lines }: HomeCardLinesProps) {
  return lines.map((line) => (
    <span key={`${line.title}\n${line.detail}`} className="flex min-w-0 flex-col">
      <span className="truncate text-lg leading-snug font-semibold">{line.title}</span>
      <span className="truncate text-xs leading-normal text-muted-foreground">{line.detail}</span>
    </span>
  ));
}
