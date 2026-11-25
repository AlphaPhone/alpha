import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn, launcherRing } from "../lib/cn.ts";

export type AppTileProps = Omit<ComponentProps<"button">, "children"> & {
  /** The app's name, shown under its icon. */
  label: string;
  /** The app's icon; decorative, since the label names the app. */
  icon: ReactNode;
  /** What is waiting in the app, such as "3 unread": shown as a dot and said after the name. */
  badge?: string;
  /** Uses the installed Apps grid's fixed icon and visible labels. */
  drawer?: boolean;
  /** The package, activity or profile that distinguishes this installed app. */
  detail?: string;
};

const homeFace: CSSProperties = { borderRadius: "min(var(--radius-tile), calc(var(--alpha-home-spacing, var(--spacing)) * 5.5))" };

/** An app on Home or in Apps: pressing it opens the app. */
export function AppTile({ label, icon, badge, drawer = false, detail, type = "button", className, ...props }: AppTileProps) {
  return (
    <button type={type} className={cn("focus-visible:outline-none", launcherRing, "group flex min-w-0 flex-col items-center rounded-tile disabled:pointer-events-none", drawer ? "w-full gap-2" : "gap-[calc(var(--alpha-home-spacing,var(--spacing))*2)] disabled:opacity-50", className)} {...props}>
      <span aria-hidden style={drawer ? undefined : homeFace} className={cn("relative flex items-center justify-center bg-secondary text-foreground", drawer ? "size-14 rounded-drawer-icon" : "size-[calc(var(--alpha-home-spacing,var(--spacing))*16)]")}>
        <span className={cn("flex", !drawer && "transition-opacity duration-fast ease-out group-active:opacity-55 motion-reduce:transition-none [&>svg]:size-[calc(var(--alpha-home-spacing,var(--spacing))*7.5)] [&>img]:size-[calc(var(--alpha-home-spacing,var(--spacing))*11)]")}>{icon}</span>
        {badge ? <span className="absolute top-3 right-3 size-2 rounded-full bg-alpha" /> : null}
      </span>
      {drawer && <span className="sr-only">Open{" "}</span>}
      <span className={cn("max-w-full text-center text-label wrap-anywhere", drawer ? "text-foreground" : "text-muted-foreground [font-size:min(var(--text-label),calc(var(--alpha-home-spacing,var(--spacing))*3*var(--alpha-text-scale,1)))]")}>{label}</span>
      {detail && <span className="max-w-full text-center text-2xs wrap-anywhere text-muted-foreground">{" "}{detail}</span>}
      {badge ? <span className="sr-only">{badge}</span> : null}
    </button>
  );
}
