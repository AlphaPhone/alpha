// spec/settings/privacy.md, "Story: Pause or turn off listening and see what the listener did"; spec/settings/preferences.md, "Story: Decide what Alpha may do without asking"
import type { ComponentMeta } from "vibestack/stories";
import { initial as preferences } from "../../../gen/settings__preferences.ts";
import { general, listenerOn, stopUnconfirmed } from "./fixtures.ts";
import type { PrivacyPagesProps } from "./PrivacyPages.tsx";

const none = () => undefined;
const base: PrivacyPagesProps = {
  page: "Privacy", facts: general.facts, preferences: { value: preferences, readable: true }, native: true,
  privacy: { route: "OnPhone", listener: listenerOn, aosp: true }, privacyActs: { stop: none, listenerSettings: none },
  onPermissions: none, onPreference: none, onResetPreferences: none, onHandoff: none, onAccessSetup: none,
  resetAsked: false, onAskReset: none,
};

export const meta: ComponentMeta<PrivacyPagesProps> = {
  args: base,
  states: {
    ViaCloud: { ...base, privacy: { route: "ViaCloud", listener: listenerOn, aosp: true } },
    StopUnconfirmed: { ...base, privacy: { route: "OnPhone", listener: stopUnconfirmed, aosp: true } },
    Unreadable: { ...base, preferences: { value: preferences, readable: false } },
    BrowserPageOff: { ...base, preferences: { value: { ...preferences, browserPage: false, edits: 1 }, readable: true } },
    ResetAsked: { ...base, preferences: { value: preferences, readable: false }, resetAsked: true },
    Permissions: { ...base, page: "Permissions" },
    Browser: { ...base, native: false, privacy: { route: "OnPhone", listener: listenerOn, aosp: false } },
  },
};
