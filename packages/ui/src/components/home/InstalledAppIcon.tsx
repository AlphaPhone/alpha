import { AppWindow } from "lucide-react";
import { cn } from "../../lib/cn.ts";

export type InstalledAppIconProps = {
  /** The icon Android gave for the app, as an image URL; a plain glyph stands in without one. */
  image?: string;
  className?: string;
};

/** The icon of an app installed on the phone, inside a tile's face; decorative, since the tile names the app. */
export function InstalledAppIcon({ image, className }: InstalledAppIconProps) {
  return image
    ? <img alt="" src={image} className={cn("size-12 rounded-lg object-cover", className)} />
    : <AppWindow aria-hidden className={cn("size-6", className)} />;
}
