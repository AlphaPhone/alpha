// spec/settings/index.md, "Story: Find a setting in a few taps"
import type { ComponentMeta } from "vibestack/stories";
import { initial as diagnostics } from "../../../gen/settings__diagnostics.ts";
import { apps, broaderHandoff, developer, general, imageGeneral, inbox, listenerOn, nearby, problems, root, signedOutRoot, stopUnconfirmed, unreadablePrivacy, unsavedDisplay } from "./fixtures.ts";
import type { SettingsScreenProps } from "./SettingsScreen.tsx";

const none = () => undefined;
const act = {
  open: none, back: none, openLicence: none, openApp: none, openAccount: none, openElsewhere: none, accessSetup: none, openPage: none, openShade: none,
  askHome: none, textScale: none, choose: none, legible: none, preference: none, resetPreferences: none, scan: none, join: none,
  openPanel: none, check: none, install: none, allowAutomatic: none, eraseAll: none,
};
const base: SettingsScreenProps = {
  model: general, act, onClose: none, dialog: undefined, onDialog: none, notifications: null, carrier: null,
  privacy: { route: "OnPhone", listener: listenerOn, aosp: true }, privacyActs: { stop: none, listenerSettings: none },
  diagnostics, aboutActs: { readLog: none, askClear: none, cancelClear: none, clear: none, exportReport: none, loadLicences: none },
  developerActs: { profile: "app", command: none, requestRole: none, toggleProfile: none },
};

export const meta: ComponentMeta<SettingsScreenProps> = {
  args: base,
  states: {
    Root: { ...base, model: root },
    SignedOutRoot: { ...base, model: signedOutRoot },
    ImageGeneral: { ...base, model: imageGeneral },
    MicMayBeOn: { ...base, model: root, privacy: { route: "OnPhone", listener: stopUnconfirmed, aosp: true } },
    Apps: { ...base, model: apps },
    Inbox: { ...base, model: inbox },
    Nearby: { ...base, model: nearby },
    JoinPassword: { ...base, model: nearby, dialog: { kind: "join", network: { name: "home", secured: true, joinable: true, strength: -50, security: "Wpa3" } } },
    EraseAsked: { ...base, dialog: { kind: "erase" } },
    UnsavedDisplay: { ...base, model: unsavedDisplay },
    BroaderHandoff: { ...base, model: broaderHandoff },
    UnreadablePreferences: { ...base, model: unreadablePrivacy },
    ResetPreferencesAsked: { ...base, model: unreadablePrivacy, dialog: { kind: "resetPreferences" } },
    Developer: { ...base, model: developer },
    ProblemLog: { ...base, model: { ...general, nav: { ...general.nav, page: "Problems" } }, diagnostics: problems },
    ClearAsked: { ...base, model: { ...general, nav: { ...general.nav, page: "Problems" } }, diagnostics: { ...problems, confirmClear: true } },
  },
};
