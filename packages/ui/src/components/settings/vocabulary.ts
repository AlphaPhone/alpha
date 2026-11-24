import type { StatusDotProps } from "../StatusDot.tsx";

/** The pages of Settings, as `Page` in spec/app/settings/index.md names them. */
export type SettingsPageName =
  | "top" | "general" | "display" | "sound" | "notifications" | "battery" | "phone" | "privacy" | "permissions" | "apps"
  | "inbox" | "workflows" | "calendar" | "camera" | "photos" | "maps" | "notes" | "about" | "activity" | "licences" | "developer" | "problems"
  | "network" | "carrier";

/** What another area owns, which a row hands over to: `Neighbour` in spec/app/settings/index.md. */
export type Neighbour =
  | "account-and-plan" | "google-and-email" | "calendar-account" | "password-manager" | "notification-collection"
  | "listener" | "conversations" | "restart-details" | "calendar-backups";

/** The pages of Android's own settings a row can open: `Target` in spec/app/settings/android.md. */
export type AndroidTarget =
  | "android-home" | "accounts-sync" | "wifi-networks" | "bluetooth-devices" | "mobile-networks" | "airplane-mode" | "screen-lock"
  | "default-apps" | "display-settings" | "brightness" | "sound-settings" | "do-not-disturb" | "battery-saver" | "alpha-alerts"
  | "alert-channel" | "notification-access" | "workflow-alerts" | "app-permissions" | "photo-permissions" | "location-settings"
  | "about-phone" | "developer-options" | "all-files-access" | "internet-panel" | "sim-cards" | "access-point-names";

/** A page of Android's settings to open; a channel's page names its channel. */
export type AndroidStart = { target: AndroidTarget; channel?: number };

/** What Alpha tells about the last start: Android opened a nearby page, none, or did not answer. */
export type AndroidTold = "nearby" | "unavailable" | "no-answer";

/** What every page that offers a hand-off to Android takes. */
export type SettingsAndroidProps = {
  /** The start of an Android page in flight: its row spins, and every other hand-off waits for it. */
  starting?: AndroidStart;
  /** Opens one of Android's own pages; a row is pressable only with it. */
  onAndroid?: (start: AndroidStart) => void;
};

/** What the phone said about a fact: not yet, that it could not read it, or its value, with a state when the value has one. */
export type Reading =
  | { word: "waiting" }
  | { word: "unavailable" }
  | { word: "reported"; value: string; status?: StatusDotProps["status"] };

/** The accesses Alpha holds: `Access` in spec/app/settings/facts.md. */
export type Access = "camera" | "microphone" | "location" | "calendar" | "photos" | "files" | "notifications";

/** What a row says of one access. */
export type AccessWord = "waiting" | "unavailable" | "allowed" | "approximate" | "off";

/** Where the owner was on a page: the row that has focus is remembered and given back when the page shows again. */
export type SettingsPlaceProps = {
  /** The row to focus when the page shows, counted from the top. */
  place?: number;
  /** Called with the row that has focus, so Settings can return to it. */
  onPlace?: (row: number) => void;
};

/** Props that put focus on the row the owner left and report the row that has it. */
export const placed = ({ place, onPlace }: SettingsPlaceProps, row: number) => ({
  autoFocus: place === row,
  onFocus: onPlace && (() => onPlace(row)),
});

/** The state of the device preferences as the phone last read them. */
export type DeviceRead = "reading" | "loaded" | "failed";
