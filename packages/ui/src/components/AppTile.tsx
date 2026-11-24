import type { ComponentProps, ReactNode } from "react";
import { cn, launcherRing } from "../lib/cn.ts";

export type AppTileProps = Omit<ComponentProps<"button">, "children"> & {
  /** The app's name, shown under its icon. */
  label: string;
  /** The app's icon; decorative, since the label names the app. */
  icon: ReactNode;
  /** What is waiting in the app, such as "3 unread": shown as a dot and said after the name. */
  badge?: string;
  /** A second line when the drawer needs to tell two apps with the same name apart. */
  detail?: string;
  /** The drawer uses a smaller icon face and a foreground label. */
  variant?: "home" | "drawer";
};

/** An app on Home or in the Apps drawer: pressing it opens the app. */
export function AppTile({ label, icon, badge, detail, variant = "home", type = "button", className, ...props }: AppTileProps) {
  const drawer = variant === "drawer";
  return (
    <button type={type} aria-label={detail ? `${label} (${detail})` : undefined} className={cn("focus-visible:outline-none", launcherRing, "group flex min-w-0 flex-col items-center gap-2 rounded-tile disabled:pointer-events-none disabled:opacity-50", drawer && "w-full", className)} {...props}>
      <span aria-hidden className={cn("relative flex size-16 items-center justify-center rounded-tile bg-secondary text-foreground", drawer && "size-14 rounded-drawer-icon")}>
        <span className="flex transition-opacity duration-fast ease-out group-active:opacity-55 motion-reduce:transition-none">{icon}</span>
        {badge ? <span className="absolute top-3 right-3 size-2 rounded-full bg-alpha" /> : null}
      </span>
      <span className={cn("max-w-full text-center text-xs wrap-anywhere text-muted-foreground", drawer && "text-foreground")}>{label}</span>
      {detail ? <span className="max-w-full text-center text-xs wrap-anywhere text-muted-foreground">{detail}</span> : null}
      {badge ? <span className="sr-only">{badge}</span> : null}
    </button>
  );
}
