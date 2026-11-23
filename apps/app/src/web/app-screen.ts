// How a domain hands its screen to the shell (spec/shell/index.md, "Story: Open an app from Home and keep my place").
// Each domain exports `screens: AppScreen[]` from src/web/<domain>/index.tsx; src/web/shell/registry.ts lists them.
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

/** The apps the shell can open. One id per screen; a domain may own several. */
export type AppId =
  | "assistant" | "calendar" | "notes" | "files" | "inbox" | "maps" | "browser" | "camera" | "photos"
  | "phone" | "messages" | "contacts" | "clock" | "reminders" | "settings" | "account" | "workflows" | "passwords";

/** Where an app may appear: everywhere, or only on the Alpha AOSP image (PRD AP-08). */
export type Availability = "everywhere" | "aosp";

/** What the shell gives every screen. */
export interface ScreenProps {
  /** The route inside the app the owner or the agent opened, such as an event id; undefined for the app's start. */
  readonly route?: string;
  /** Leave the app: back to Home, keeping its state for the next open. */
  readonly onClose: () => void;
}

export interface AppScreen {
  readonly id: AppId;
  /** The app's name on Home and in the library. */
  readonly title: string;
  readonly icon: LucideIcon;
  readonly availability: Availability;
  readonly Screen: ComponentType<ScreenProps>;
  /** Hardware or gesture Back while this app is in front: true when the app took it, false when Back is the shell's. */
  readonly back: () => Promise<boolean>;
}

/** Where the shell mounts an always-present surface, above every screen. */
export type SurfaceSlot = "top" | "dock" | "overlay" | "notices";

/** A surface an area keeps mounted across screens: the assistant dock, the call bar, the listener indicator. */
export interface AppSurface {
  readonly id: string;
  readonly slot: SurfaceSlot;
  readonly availability: Availability;
  readonly Surface: ComponentType<{ readonly open: (app: AppId, route?: string) => void }>;
}
