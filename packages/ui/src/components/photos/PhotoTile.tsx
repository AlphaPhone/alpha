import { Check, Heart, Play } from "lucide-react";
import { cn } from "../../lib/cn.ts";

export type PhotoTileProps = {
  /** The thumbnail's address; an item without one shows its empty square. */
  image: string;
  /** What the tile is, read out: a photo or a video, its day and place. */
  label: string;
  /** A video's length as the owner reads it, such as 0:12; none for a photo. */
  duration?: string;
  /** A favourite, marked with a heart. */
  favorite?: boolean;
  /** While selecting: whether this item is selected. Left out outside selection. */
  selected?: boolean;
  /** Dims an item that waits in Recently deleted. */
  dim?: boolean;
  /** In an album, where the marks sit a pixel further in from the corner. */
  album?: boolean;
  /** Opens the item, or adds it to or takes it from the selection; without it the tile cannot be pressed. */
  onPress?: () => void;
};

/** A black, 70% opaque backing that keeps white marks readable over any photo, in either theme. */
const scrim = "bg-foreground/70 text-alpha-foreground dark:bg-background/70";

/** One square thumbnail of the grid, with its favourite heart, its video length and, while selecting, its check. */
export function PhotoTile({ image, label, duration, favorite = false, selected, dim = false, album = false, onPress }: PhotoTileProps) {
  const selecting = selected !== undefined;
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selecting ? selected : undefined}
      disabled={!onPress}
      onClick={onPress}
      className={cn("relative block aspect-square touch-pan-y overflow-hidden bg-secondary", dim && "opacity-60")}
    >
      {image ? <img src={image} alt="" draggable={false} className={cn("absolute inset-0 size-full object-cover transition-transform duration-150", selected && "scale-86")} /> : null}
      {duration !== undefined && !selecting ? (
        <span className={cn(scrim, "absolute flex items-center gap-0.75 rounded-full px-1 py-0.5 text-badge font-semibold", album ? "right-1.75 bottom-1.5" : "right-1.5 bottom-1.25")}>
          <Play aria-hidden className="size-2.75 fill-current stroke-none" />
          {duration}
        </span>
      ) : null}
      {favorite && !selecting ? (
        <span className={cn(scrim, "absolute bottom-1.5 left-1.5 flex size-4.5 items-center justify-center rounded-full")}>
          <Heart aria-hidden className="size-3 fill-current stroke-none" />
        </span>
      ) : null}
      {selecting ? (
        <span
          className={cn(
            "absolute flex size-5.5 items-center justify-center rounded-full text-alpha-foreground ring-2 ring-alpha-foreground",
            album ? "top-1.75 right-1.75" : "top-1.5 right-1.5",
            selected ? "bg-alpha" : "bg-foreground/70 ring-inset dark:bg-background/70",
          )}
        >
          {selected ? <Check aria-hidden className="size-3.5" /> : null}
        </span>
      ) : null}
    </button>
  );
}
