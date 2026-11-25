import type { ReactNode } from "react";

export type PhotoAlbumGridProps = {
  /** The `PhotoAlbumCard`s. */
  children?: ReactNode;
};

/** The albums two a row on a phone, more where the screen is wider. */
export function PhotoAlbumGrid({ children }: PhotoAlbumGridProps) {
  return <div className="grid grid-cols-[repeat(auto-fill,minmax(min(168px,calc((100%-12px)/2)),1fr))] gap-x-3 gap-y-4 px-4 pt-2">{children}</div>;
}
