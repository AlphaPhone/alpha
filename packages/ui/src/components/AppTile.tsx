import type { ComponentProps, ReactNode } from "react";
import { cn, launcherRing } from "../lib/cn.ts";

export type AppTileProps = Omit<ComponentProps<"button">, "children"> & {
  /** The app's name, shown under its icon. */
  label: string;
  /** The app's icon; decorative, since the label names the app. */
  icon: ReactNode;
  /** What is waiting in the app, such as "3 unread": shown as a dot and said after the name. */
  badge?: string;
};

/** An app on Home: pressing it opens the app. */
export function AppTile({ label, icon, badge, type = "button", className, ...props }: AppTileProps) {
  return (
    <button type={type} className={cn(launcherRing, "group flex min-w-0 flex-col items-center gap-2 rounded-tile disabled:pointer-events-none disabled:opacity-50", className)} {...props}>
      <span aria-hidden className="relative flex size-16 items-center justify-center rounded-tile bg-secondary text-foreground transition-colors duration-fast group-active:bg-accent">
        {icon}
        {badge ? <span className="absolute top-3 right-3 size-2 rounded-full bg-alpha" /> : null}
      </span>
      <span className="max-w-full text-center text-xs wrap-anywhere text-muted-foreground">{label}</span>
      {badge ? <span className="sr-only">{badge}</span> : null}
    </button>
  );
}
