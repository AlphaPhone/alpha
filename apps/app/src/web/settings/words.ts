// spec/settings/vocabulary.md, "Story: See only what Android reported"; spec/settings/index.md, "About's Agent activity says whether the agent runs, is starting, is stopped or needs the owner"; spec/settings/reset.md, "The native answer is worded by Alpha, and one Alpha does not know claims nothing"; spec/settings/facts.md, "A broader page is named for what it covers"; spec/settings/diagnostics.md, "A licence flag is shown by Alpha's name for it, an unlisted flag as written, with what it obliges"
import type { Access, RoleHold, Switch } from "../../../gen/settings__vocabulary.ts";
import type { BroaderNotice, ShadeAnswer } from "../../../gen/settings__facts.ts";
import type { Export } from "../../../gen/settings__diagnostics.ts";
import type { Notice } from "../../../gen/settings__reset.ts";
import type { JoinPhase, Online } from "../../../gen/settings__network.ts";
import type { Outcome, Permission } from "../../../gen/settings__updates.ts";
import type { Listening } from "../../../gen/settings__privacy.ts";
import type { AgentState } from "../../../gen/settings.ts";

/** A state's word and the token its dot is drawn in; an unknown state has no dot. */
export interface StateWord { readonly word: string; readonly tone?: "ok" | "warn" | "muted" | "destructive" }

/** About's Agent activity row: the agent's state (spec/settings/index.md). */
export const AGENT: Record<AgentState, StateWord> = {
  AgentRunning: { word: "Running", tone: "ok" }, AgentStarting: { word: "Starting", tone: "muted" },
  AgentNeedsYou: { word: "Needs you", tone: "warn" }, AgentStopped: { word: "Stopped", tone: "muted" },
};
export const SWITCH: Record<Switch, StateWord> = { On: { word: "On", tone: "ok" }, Off: { word: "Off", tone: "muted" }, Unknown: { word: "Open settings" } };
export const ACCESS: Record<Access, StateWord> = {
  Allowed: { word: "Allowed", tone: "ok" }, Partial: { word: "Limited", tone: "warn" }, Asks: { word: "Ask", tone: "warn" },
  Denied: { word: "Off", tone: "muted" }, Unread: { word: "—" },
};
export const ROLE: Record<RoleHold, StateWord> = {
  HeldByAlpha: { word: "Alpha Phone", tone: "ok" }, HeldElsewhere: { word: "Another app" }, NotHeldByAlpha: { word: "Not Alpha Phone" },
  RoleUnavailable: { word: "Not available on this device" }, RoleUnread: { word: "Unavailable" },
};
export const BROADER: Record<BroaderNotice, string> = {
  NoBroader: "", NetworkPage: "Opened Android network settings. This phone has no separate page for that switch.",
  PriorityPage: "Opened Android priority settings. This phone has no separate Do Not Disturb page.",
  RelatedPage: "Opened a related Android settings page. This phone has no separate page for that setting.",
};
export const RESET: Record<Notice, string> = {
  NoNotice: "", AlreadyOpen: "The reset review is already open. Nothing was erased.", Expired: "The reset review expired. Nothing was erased.",
  NeedsScreenLock: "Set a screen lock in Android Settings before erasing Alpha’s data. Nothing was erased.",
  NoAuthentication: "Unlocking with your screen lock isn’t available. Nothing was erased.",
  MayStillProceed: "Reset couldn’t be prepared, and the reset you confirmed may still go ahead. Close and reopen Alpha before trying again.",
  ListenerUnreachable: "Always-on listening is off or can’t be reached, so nothing was erased. Turn it on in Android Settings and try again.",
  Unconfirmed: "Reset isn’t available right now.",
};
export const JOIN: Record<JoinPhase, StateWord> = {
  JoinIdle: { word: "" }, AwaitingAndroid: { word: "Waiting for Android" }, Joined: { word: "Connected", tone: "ok" },
  Portal: { word: "Sign-in page needed", tone: "warn" }, Declined: { word: "Not saved" }, Unverified: { word: "Not confirmed", tone: "warn" },
  NotConnected: { word: "Not connected", tone: "muted" }, WrongPassword: { word: "Wrong password", tone: "destructive" },
  AlreadySaved: { word: "Already saved · choose it in Android" }, JoinInvalid: { word: "Check the password", tone: "destructive" },
  JoinUnsupported: { word: "Join in Android settings" },
};
export const ONLINE: Record<Online, StateWord> = {
  OnlineUnknown: { word: "—" }, Offline: { word: "Offline", tone: "muted" }, Validated: { word: "Online", tone: "ok" },
  BehindPortal: { word: "Sign-in page", tone: "warn" }, UnvalidatedOnline: { word: "No internet confirmed", tone: "warn" },
};
export const PERMISSION: Record<Permission, StateWord> = {
  PermissionUnread: { word: "" }, AndroidStarting: { word: "Starting" }, PermissionRequired: { word: "Not allowed", tone: "warn" },
  AutomaticAllowed: { word: "Allowed", tone: "ok" }, AutomaticUnsupported: { word: "Unavailable" },
};
export const OUTCOME: Record<Outcome, string> = {
  NoOutcome: "", UpdateReady: "A compatible update is ready below.", NoneOffered: "No compatible update was offered.",
  CheckFailed: "Couldn’t check for updates. Try again.", InstallStarted: "Downloading the update.", InstallRefused: "The update is no longer offered.",
};
export const LISTENING: Record<Listening, string> = {
  ListenerUnavailable: "Unavailable", ListenerOff: "Off", ListenerOn: "Listening", ListenerPaused: "Paused",
  ListenerNeedsSetup: "Needs setup", MicStillOpen: "Microphone still open",
};
export const SHADE: Record<ShadeAnswer, string> = {
  ShadeNotAsked: "", ShadeOpened: "", ShadeStandalone: "The shade opens only while Alpha is your Home app.",
  ShadePermissionMissing: "Android hasn’t given Alpha the status bar permission.", ShadeUnsupported: "Unavailable",
  ShadeNotInFront: "The shade opens only while Alpha is in front.",
};
export const EXPORT: Record<Export, string> = {
  NoExport: "", Exporting: "", Shared: "", Saved: "Diagnostics saved", ExportFailed: "Export failed",
};
export const FLAGS: Record<string, string> = {
  "copyleft-strong": "Copyleft (GPL family)", "network-copyleft": "Network copyleft (AGPL)", "copyleft-weak": "Weak copyleft (LGPL, MPL, EPL)",
  "share-alike-data": "Share-alike data", "unknown-licence": "Unknown license", "licence-text-missing-from-package": "No license file in package",
  unverified: "License unverified", "permissive-not-previously-listed": "Permissive, newly listed", "non-open-source-terms": "Not open-source terms",
  "proprietary-licence-held-outside-repo": "Proprietary, license held by owner", "proprietary-no-licence-recorded": "Proprietary, no license recorded",
};
export const HANDOFF_UNAVAILABLE = "Unavailable";
export const ROLE_NOT_CHANGED = "Not changed";
export const SCALE_NOT_SAVED = "Text size could not be saved.";
export const THEME_NOT_SAVED = "Theme not saved";
export const CLEAR_FAILED = "Couldn’t clear";
