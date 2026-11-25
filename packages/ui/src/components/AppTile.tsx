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
    <button type={type} className={cn("focus-visible:outline-none", launcherRing, "group flex min-w-0 flex-col items-center gap-[calc(var(--alpha-home-spacing,var(--spacing))*2)] rounded-tile disabled:pointer-events-none disabled:opacity-50", className)} {...props}>
      <span aria-hidden className="relative flex size-[calc(var(--alpha-home-spacing,var(--spacing))*16)] items-center justify-center rounded-[min(var(--radius-tile),calc(var(--alpha-home-spacing,var(--spacing))*5.5))] bg-secondary text-foreground">
        <span className="flex transition-opacity duration-fast ease-out group-active:opacity-55 motion-reduce:transition-none [&>svg]:size-[calc(var(--alpha-home-spacing,var(--spacing))*7.5)] [&>img]:size-[calc(var(--alpha-home-spacing,var(--spacing))*11)]">{icon}</span>
        {badge ? <span className="absolute top-3 right-3 size-2 rounded-full bg-alpha" /> : null}
      </span>
      <span className="max-w-full text-center text-label wrap-anywhere text-muted-foreground [font-size:min(var(--text-label),calc(var(--alpha-home-spacing,var(--spacing))*3*var(--alpha-text-scale,1)))]">{label}</span>
      {badge ? <span className="sr-only">{badge}</span> : null}
    </button>
  );
}
