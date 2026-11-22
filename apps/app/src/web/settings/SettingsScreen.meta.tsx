// spec/settings/index.md, "Story: Find a setting in a few taps"
import type { ComponentMeta } from "vibestack/stories";
import { initial as diagnostics } from "../../../gen/settings__diagnostics.ts";
import { developer, general, listenerOn, problems, unreadablePrivacy } from "./fixtures.ts";
import type { SettingsScreenProps } from "./SettingsScreen.tsx";

const none = () => undefined;
const act = { navigate: none, openPage: none, openShade: none, openAppInfo: none, askHome: none, textScale: none, choose: none, legible: none, preference: none, resetPreferences: none, scan: none, join: none, openPanel: none, check: none, install: none, allowAutomatic: none, eraseAll: none, openPasswords: none };

export const meta: ComponentMeta<SettingsScreenProps> = {
  args: {
    model: general, act, onClose: none, privacy: { route: "OnPhone", listener: listenerOn, aosp: true }, privacyActs: { stop: none, listenerSettings: none },
    diagnostics, aboutActs: { readLog: none, askClear: none, cancelClear: none, clear: none, exportReport: none, loadLicences: none },
    developerActs: { profile: "app", command: none, requestRole: none, toggleProfile: none },
  },
  states: {
    UnreadablePreferences: { model: unreadablePrivacy },
    Developer: { model: developer },
    ProblemLog: { model: { ...general, nav: { ...general.nav, page: "Problems" } }, diagnostics: problems },
  },
};
