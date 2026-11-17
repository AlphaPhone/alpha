/**
 * Truthful presentation of Android system facts for settings surfaces and quick-setting tiles.
 *
 * Only facts Android reported become an on/off state; a fact it did not report reads as a
 * handoff ("Open settings"), never as off. Every switch except the flashlight is read-only for an
 * ordinary app, so a tile or row hands off to Android's own page and is announced as a button
 * carrying the reported state, not as a toggle.
 *
 * The facts themselves are the shared system contract (`@elizaos/capacitor-system/settings`
 * parses Android's role rows and system facts); this module only words them.
 */
import type {
  parseRoleStatuses,
  SystemSwitchRow,
} from "@elizaos/capacitor-system/settings";

/** An Android settings page a handoff opens (the shared contract's page names). */
type SystemSettingsPage = SystemSwitchRow["page"];
/** One role row as the shared parser reports it. */
type AndroidRoleStatus = ReturnType<typeof parseRoleStatuses>[number];

/** Quick-setting keys a settings surface can present. */
export type SystemTileKey =
  | "wifi"
  | "bt"
  | "dnd"
  | "mic"
  | "loc"
  | "plane"
  | "torch";

/** Only directly observed native facts. A missing key means unknown: no on/off is shown. */
export type SystemTileFacts = Partial<Record<SystemTileKey, boolean>>;

/** Android page each handoff tile opens. The flashlight is a direct control and has none. */
export const SYSTEM_TILE_SETTINGS_PAGES: Readonly<
  Partial<Record<SystemTileKey, SystemSettingsPage>>
> = Object.freeze({
  wifi: "wifi",
  bt: "bluetooth",
  dnd: "dnd",
  plane: "airplane",
  loc: "location",
  mic: "privacy",
});

/**
 * Tile state from reported switches. Without the Wi-Fi switch, an active Wi-Fi transport still
 * proves Wi-Fi is on; no active transport does not prove it is off (it may be on and
 * disconnected). Permission grants are not switch states, so the microphone tile never gets one.
 */
export function tileFactsFromSystemFacts(
  snapshot: unknown,
  torch?: boolean,
): SystemTileFacts {
  const facts: SystemTileFacts = {};
  const value =
    snapshot && typeof snapshot === "object"
      ? (snapshot as Record<string, unknown>)
      : {};
  if (typeof value.wifiEnabled === "boolean") facts.wifi = value.wifiEnabled;
  else if (value.wifiActive === true) facts.wifi = true;
  if (typeof value.bluetoothEnabled === "boolean")
    facts.bt = value.bluetoothEnabled;
  if (typeof value.airplaneMode === "boolean") facts.plane = value.airplaneMode;
  if (typeof value.locationEnabled === "boolean")
    facts.loc = value.locationEnabled;
  if (value.interruptionFilter === "all") facts.dnd = false;
  else if (
    value.interruptionFilter === "priority" ||
    value.interruptionFilter === "alarms" ||
    value.interruptionFilter === "none"
  )
    facts.dnd = true;
  if (typeof torch === "boolean") facts.torch = torch;
  return facts;
}

/** Visible state under a tile. An unread switch says what the tile does instead of looking off. */
export function tileStateText(
  key: SystemTileKey | null,
  on: boolean | undefined,
): string {
  if (typeof on === "boolean") return on ? "On" : "Off";
  return key === "torch"
    ? "Tap to switch"
    : key === "mic"
      ? "Permissions"
      : "Open settings";
}

/**
 * Accessible name of a tile. A handoff tile is a button whose name carries the reported state
 * ("Wi-Fi, on, opens Android settings"); the flashlight is the one real toggle and keeps its name.
 */
export function tileAccessibleName(
  label: string,
  key: SystemTileKey | null,
  on: boolean | undefined,
): string {
  if (key === "torch") return label;
  const state = typeof on === "boolean" ? (on ? ", on" : ", off") : "";
  return (
    label +
    state +
    (key === "mic"
      ? ", opens Android permission settings"
      : ", opens Android settings")
  );
}

/** Settings row wording for a system switch: its state when Android reported it, else the fallback. */
export function switchValue(
  on: unknown,
  fallback: string,
  detail?: { on?: string; off?: string },
): string {
  return typeof on === "boolean"
    ? on
      ? (detail?.on ?? "On")
      : (detail?.off ?? "Off")
    : fallback;
}

/** What to say when Android opened a broader page than the one asked for; null for the specific page. */
export function broaderPageNotice(
  page: string,
  opened: unknown,
): string | null {
  if (
    !opened ||
    typeof opened !== "object" ||
    (opened as { specific?: unknown }).specific !== false
  )
    return null;
  if (page === "airplane" || page === "mobile")
    return "Opened Android network settings. This phone has no separate page for that switch.";
  if (page === "dnd")
    return "Opened Android priority settings. This phone has no separate Do Not Disturb page.";
  return "Opened a related Android settings page. This phone has no separate page for that setting.";
}

/** One settings handoff per gesture: repeated change events inside the window are ignored. */
export function handoffGate(
  windowMs = 2000,
  now: () => number = () => Date.now(),
) {
  let last = Number.NEGATIVE_INFINITY;
  let inFlight = false;
  return {
    begin(): boolean {
      const at = now();
      if (inFlight || at - last < windowMs) return false;
      inFlight = true;
      last = at;
      return true;
    },
    end() {
      inFlight = false;
      last = now();
    },
  };
}

/**
 * Truthful role wording. Android answers whether this app holds a role; holder lookups for other
 * apps are best effort (package visibility, Android's own resolver), so an empty or unreadable
 * holder list never claims that no app holds the role.
 */
export function androidRoleLabel(
  role: Pick<AndroidRoleStatus, "available" | "held" | "holders"> | undefined,
  host: { packageName: string; appName: string },
): string {
  if (!role) return "Unavailable";
  if (!role.available) return "Not available on this device";
  if (role.held) return host.appName;
  return role.holders.some(
    (holder) => holder !== "android" && holder !== host.packageName,
  )
    ? "Another app"
    : `Not ${host.appName}`;
}
