import type { ReactNode } from "react";

export type PhotoGridProps = {
  /** The `PhotoTile`s, the newest first. */
  children?: ReactNode;
};

/** Four square thumbnails a row, 2px apart, inset 12px from the screen's edges. */
export function PhotoGrid({ children }: PhotoGridProps) {
  return <div className="mx-3 grid grid-cols-4 gap-0.5">{children}</div>;
}
