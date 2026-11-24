import type { ComponentProps } from "react";
import { Plus } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { HomeNotice, type HomeNoticeMessage } from "./HomeNotice.tsx";

export type HomeEditBarProps = Omit<ComponentProps<"div">, "children"> & {
  /** Opens Add to Home; left out when it is open already or nothing is left to add, so the button refuses. */
  onShowHidden?: () => void;
  /** Ends editing. */
  onDone?: () => void;
  /** A failure told while Home is being edited. */
  notice?: HomeNoticeMessage;
};

/** The bar over Home while it is being edited: Add to Home, Done, and what went wrong. */
export function HomeEditBar({ onShowHidden, onDone, notice, className, ...props }: HomeEditBarProps) {
  return (
    <div className={cn("flex flex-col gap-3 px-4", className)} {...props}>
      <div className="flex items-center justify-between gap-2">
        <Button variant="secondary" size="icon" aria-label="Add to Home" aria-haspopup="dialog" disabled={!onShowHidden} onClick={onShowHidden}>
          <Plus />
        </Button>
        <Button disabled={!onDone} onClick={onDone}>Done</Button>
      </div>
      {notice ? <HomeNotice notice={notice} place="InEditBar" /> : null}
    </div>
  );
}
