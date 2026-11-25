import { Folder } from "lucide-react";

export type PhotoAlbumCardProps = {
  /** The album's name. */
  name: string;
  /** How many photos and videos it holds. */
  count: number;
  /** The thumbnail of its cover; an album without one shows its empty square. */
  cover: string;
  /** Opens the album; without it the card cannot be pressed. */
  onOpen?: () => void;
};

/** An album of the Albums tab: its cover, its name and how many items it holds. */
export function PhotoAlbumCard({ name, count, cover, onOpen }: PhotoAlbumCardProps) {
  return (
    <button type="button" aria-label={name} disabled={!onOpen} onClick={onOpen} className="flex min-w-0 flex-col gap-0.75 text-left">
      <span className="relative mb-1.75 block aspect-square w-full overflow-hidden rounded-md bg-secondary">
        {cover ? <img src={cover} alt="" draggable={false} className="absolute inset-0 size-full object-cover" /> : null}
      </span>
      <span className="flex max-w-full min-w-0 items-center gap-1.75 text-tile-name font-semibold">
        <Folder aria-hidden className="size-4 shrink-0" />
        <span className="truncate">{name}</span>
      </span>
      <span className="h-3.75 text-meta leading-tight text-muted-foreground">{count}</span>
    </button>
  );
}
