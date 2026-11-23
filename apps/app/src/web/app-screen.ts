// How a domain hands its screen to the shell (spec/shell/index.md, "Story: Open an app from Home and keep my place").
// Each domain exports `screens: AppScreen[]` from src/web/<domain>/index.tsx; src/web/shell/registry.ts lists them.
import type { Effect, Stream } from "effect";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import type { AppServices } from "./runtime.ts";

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

/**
 * The Back of a sheet an always-mounted surface draws over the phone (spec/shell/navigation.md, "A layer is listed once, closes with
 * its owner or with Back, and holds the phone while open"): the shell lists it as a layer under the surface's id while `shown` reads
 * true, asks `close` when Back reaches that layer, and asks `close` again when HOME or the navigation drops the layer.
 */
export interface SurfaceBack {
  /** Whether the surface shows a sheet now, then every change of it, from the area's own state. */
  readonly shown: Stream.Stream<boolean, unknown, AppServices>;
  /** Closes the innermost sheet the surface shows: true when it closed one or keeps Back while one finishes, false when none is open. */
  readonly close: Effect.Effect<boolean, unknown, AppServices>;
}

/** A surface an area keeps mounted across screens: the assistant dock, the call bar, the listener indicator. */
export interface AppSurface {
  readonly id: string;
  readonly slot: SurfaceSlot;
  readonly availability: Availability;
  readonly Surface: ComponentType<{ readonly open: (app: AppId, route?: string) => void }>;
  /** The Back of the sheets the surface draws over the phone; absent when it draws none. */
  readonly back?: SurfaceBack;
}
