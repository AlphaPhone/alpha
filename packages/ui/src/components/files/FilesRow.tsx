import type { ComponentProps, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

export type FilesRowProps = Omit<ComponentProps<"button">, "children" | "title"> & {
  /** The file, folder or place the row opens. */
  name: string;
  /** What else is known: its kind, size and when it changed, or how much room is free. */
  detail?: ReactNode;
  /** Its icon, in a rounded well before the name; decorative. */
  icon: ReactNode;
  /** A count at the end, such as the items in a category. */
  count?: ReactNode;
  /** `row` in a list; `tile` in the three-column grid. */
  layout?: "row" | "tile";
  /** `place` at the top of Files, a little larger; `item` in a folder. */
  size?: "place" | "item";
  /** While choosing items: whether this one is chosen; left out while not choosing. */
  chosen?: boolean;
};

/** One place, folder or file in Files: pressed to open it, or, while choosing, to choose it. */
export function FilesRow({ name, detail, icon, count, layout = "row", size = "item", chosen, className, ...props }: FilesRowProps) {
  const place = size === "place";
  const mark = chosen === undefined ? null : (
    <span aria-hidden className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", chosen ? "bg-alpha text-alpha-foreground" : "inset-ring-[1.5px] inset-ring-muted-foreground", layout === "tile" && "absolute top-3 right-3", layout === "tile" && (chosen ? "ring-2 ring-background" : "bg-background"))}>
      {chosen ? <Check className="size-3.75" /> : null}
    </span>
  );
  if (layout === "tile") {
    return (
      <button type="button" aria-pressed={chosen} className={cn(focusRing, "relative flex w-full flex-col rounded-drawer-icon px-1.5 pt-1.5 pb-2.5 text-left active:bg-accent disabled:opacity-40 aria-pressed:bg-secondary", className)} {...props}>
        <span aria-hidden className="flex aspect-square items-center justify-center rounded-md bg-secondary text-foreground [&_svg]:size-7">{icon}</span>
        <span className="mx-0.5 mt-1.5 line-clamp-2 text-meta leading-snug break-words">{name}</span>
        {mark}
      </button>
    );
  }
  return (
    <button type="button" aria-pressed={chosen} className={cn(focusRing, "flex min-h-15 w-full items-center gap-3.5 rounded-drawer-icon px-2 text-left active:bg-accent disabled:opacity-40 aria-pressed:bg-secondary", place ? "py-2" : "py-2.5", className)} {...props}>
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground [&_svg]:size-5">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate font-medium", place ? "text-md" : "text-base leading-tight")}>{name}</span>
        {detail ? <span className={cn("mt-0.5 text-muted-foreground", place ? "text-caption" : "text-meta leading-tight")}>{detail}</span> : null}
      </span>
      {count === undefined ? null : <span className="text-sm leading-tight text-muted-foreground">{count}</span>}
      {mark}
    </button>
  );
}
