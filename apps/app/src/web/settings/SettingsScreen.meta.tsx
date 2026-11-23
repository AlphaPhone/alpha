// spec/settings/index.md, "Story: Find a setting in a few taps"
import type { ComponentMeta } from "vibestack/stories";
import { initial as diagnostics } from "../../../gen/settings__diagnostics.ts";
import { apps, broaderHandoff, developer, general, inbox, listenerOn, nearby, problems, root, stopUnconfirmed, unreadablePrivacy, unsavedDisplay } from "./fixtures.ts";
import type { SettingsScreenProps } from "./SettingsScreen.tsx";

const none = () => undefined;
const act = {
  open: none, back: none, openLicence: none, openApp: none, openAccount: none, accessSetup: none, openPage: none, openShade: none,
  askHome: none, textScale: none, choose: none, legible: none, preference: none, resetPreferences: none, scan: none, join: none,
  openPanel: none, check: none, install: none, allowAutomatic: none, eraseAll: none,
};

export const meta: ComponentMeta<SettingsScreenProps> = {
  args: {
    model: general, act, onClose: none, privacy: { route: "OnPhone", listener: listenerOn, aosp: true }, privacyActs: { stop: none, listenerSettings: none },
    diagnostics, aboutActs: { readLog: none, askClear: none, cancelClear: none, clear: none, exportReport: none, loadLicences: none },
    developerActs: { profile: "app", command: none, requestRole: none, toggleProfile: none },
  },
  states: {
    Root: { model: root },
    MicMayBeOn: { model: root, privacy: { route: "OnPhone", listener: stopUnconfirmed, aosp: true } },
    Apps: { model: apps },
    Inbox: { model: inbox },
    Nearby: { model: nearby },
    UnsavedDisplay: { model: unsavedDisplay },
    BroaderHandoff: { model: broaderHandoff },
    UnreadablePreferences: { model: unreadablePrivacy },
    Developer: { model: developer },
    ProblemLog: { model: { ...general, nav: { ...general.nav, page: "Problems" } }, diagnostics: problems },
  },
};
