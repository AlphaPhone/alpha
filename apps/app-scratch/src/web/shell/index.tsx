// spec/shell/index.md, "Story: Open an app from Home and keep my place"
import type { AppScreen, AppSurface } from "../app-screen.ts";

/** The shell is no app of its own: Home, the library and the layers are its root, not a screen. */
export const screens: AppScreen[] = [];

/** The shell mounts every area's surfaces and needs none of its own in the registry. */
export const surfaces: AppSurface[] = [];

export { InlineSheet, type InlineSheetProps } from "./InlineSheet.tsx";
export { useLayer } from "./useLayer.ts";
export { ShellRoot } from "./ShellRoot.tsx";
export { CallbackLanding, type CallbackLandingProps } from "./CallbackLanding.tsx";
export { NotificationsPage, NotificationsSettings, deliveryWord, type NotificationsPageProps, type NotificationsSettingsProps } from "./NotificationsPage.tsx";
