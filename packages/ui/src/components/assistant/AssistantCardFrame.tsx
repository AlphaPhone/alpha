import type { ComponentProps, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Card } from "../Card.tsx";

export type AssistantCardFrameProps = Omit<ComponentProps<"div">, "title"> & {
  /** A picture of the kind of card, before its title; decorative. */
  icon: ReactNode;
  /** What the card is about. */
  title: string;
  /** A second line under the title. */
  detail?: string;
  /** What the card holds beyond its title. */
  children?: ReactNode;
  /** The card's own controls in a row at its foot; they are shown only while the card is live. */
  actions?: ReactNode;
  /** Opens the card's subject in its app; the card's head is pressed, and only while the card is live. */
  onOpen?: () => void;
  /** Done with, or answered by a newer reply: the card is quiet and offers nothing. */
  settled?: boolean;
};

/** The surface every card of a reply shares: its head with the kind's mark on Alpha blue, what it holds and its controls, quiet once settled. */
export function AssistantCardFrame({ icon, title, detail, children, actions, onOpen, settled = false, className, ...props }: AssistantCardFrameProps) {
  const head = (
    <>
      <span aria-hidden className={cn("flex size-11.5 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-5.5", settled ? "bg-accent text-muted-foreground" : "bg-alpha text-alpha-foreground")}>{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("line-clamp-3 text-md font-semibold break-words", settled && "text-muted-foreground")}>{title}</span>
        {detail ? <span className="text-meta break-words text-muted-foreground">{detail}</span> : null}
      </span>
      {onOpen && !settled ? <ChevronRight aria-hidden className="size-4.5 shrink-0 text-muted-foreground" /> : null}
    </>
  );
  const row = "flex w-full items-center gap-3.5 p-3.5 text-left";
  return (
    <Card className={cn("gap-0 overflow-hidden rounded-tile border-0 bg-secondary p-0 text-secondary-foreground", className)} {...props}>
      {onOpen && !settled ? (
        <button type="button" onClick={onOpen} className={cn(focusRing, row, "transition-colors duration-fast ease-standard focus-visible:-outline-offset-focus active:bg-accent")}>{head}</button>
      ) : (
        <div className={row}>{head}</div>
      )}
      {children ? <div className="flex flex-col gap-2 px-3.5 pb-3.5 text-base">{children}</div> : null}
      {actions && !settled ? <div className="flex flex-wrap gap-2 px-3.5 pb-3.5">{actions}</div> : null}
    </Card>
  );
}
