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

/** The surface every card of a reply shares: its head, what it holds and its controls, quiet once settled. */
export function AssistantCardFrame({ icon, title, detail, children, actions, onOpen, settled = false, className, ...props }: AssistantCardFrameProps) {
  const head = (
    <>
      <span aria-hidden className="flex shrink-0 text-muted-foreground [&_svg:not([class*='size-'])]:size-5.5">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("line-clamp-3 text-base font-semibold break-words", settled && "text-muted-foreground")}>{title}</span>
        {detail ? <span className="text-sm break-words text-muted-foreground">{detail}</span> : null}
      </span>
      {onOpen && !settled ? <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" /> : null}
    </>
  );
  const row = "flex min-h-13 w-full items-center gap-3 px-4 py-3 text-left";
  return (
    <Card className={cn("gap-0 overflow-hidden p-0", className)} {...props}>
      {onOpen && !settled ? (
        <button type="button" onClick={onOpen} className={cn(focusRing, row, "transition-colors duration-fast ease-standard hover:bg-accent/60 focus-visible:-outline-offset-focus active:bg-accent")}>{head}</button>
      ) : (
        <div className={row}>{head}</div>
      )}
      {children ? <div className="flex flex-col gap-2 px-4 pb-3 text-base">{children}</div> : null}
      {actions && !settled ? <div className="flex flex-wrap gap-2 px-4 pb-3">{actions}</div> : null}
    </Card>
  );
}
