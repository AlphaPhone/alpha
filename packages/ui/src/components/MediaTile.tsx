import type { ComponentProps } from "react";
import { CircleCheck, Heart, Play } from "lucide-react";
import { cn, focusRing } from "../lib/cn.ts";

export type MediaTileProps = Omit<ComponentProps<"button">, "children"> & {
  /** What the tile shows: an image address the page may load, such as a `data:` thumbnail; a blank tile without one. */
  src?: string;
  /** What the item is, for assistive technology: its kind and when it was taken. */
  label: string;
  /** A video's length as the owner reads it, such as "0:42"; left out for a photo. */
  duration?: string;
  favourite?: boolean;
  /** Whether it is chosen in a selection; left out where nothing is being selected. */
  selected?: boolean;
};

/** One photo or video of a grid, square, with its length, its favourite and, while selecting, whether it is chosen. */
export function MediaTile({ src, label, duration, favourite = false, selected, className, ...props }: MediaTileProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      className={cn(focusRing, "relative aspect-square w-full overflow-hidden bg-secondary", className)}
      {...props}
    >
      {src ? <img src={src} alt="" draggable={false} className={cn("size-full object-cover transition-transform duration-fast ease-standard", selected && "scale-90 rounded-md")} /> : null}
      {duration !== undefined ? (
        <span className="absolute right-1 bottom-1 flex items-center gap-0.5 rounded-full bg-foreground/60 px-1.5 text-xs font-medium text-background">
          <Play aria-hidden className="size-3 fill-current" />
          {duration}
        </span>
      ) : null}
      {favourite ? <Heart aria-hidden className="absolute bottom-1 left-1 size-4 fill-background text-background drop-shadow" /> : null}
      {selected !== undefined ? (
        <span aria-hidden className={cn("absolute top-1 right-1 flex size-6 items-center justify-center rounded-full border-2 border-background", selected ? "bg-primary text-primary-foreground" : "bg-foreground/25")}>
          {selected ? <CircleCheck className="size-5" /> : null}
        </span>
      ) : null}
    </button>
  );
}
