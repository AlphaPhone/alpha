// spec/settings/index.md, "Story: Find a setting in a few taps"; spec/settings/passwords.md, "Story: Use my saved passwords only after Android unlocks them"
import { initial as nav } from "../../../gen/settings.ts";
import { initial as appearance } from "../../../gen/settings__appearance.ts";
import type { Diagnostics } from "../../../gen/settings__diagnostics.ts";
import { initial as diagnostics } from "../../../gen/settings__diagnostics.ts";
import { initial as facts, unread } from "../../../gen/settings__facts.ts";
import { initial as network } from "../../../gen/settings__network.ts";
import type { Vault } from "../../../gen/settings__passwords.ts";
import { initial as vault } from "../../../gen/settings__passwords.ts";
import { initial as preferences } from "../../../gen/settings__preferences.ts";
import { initial as listener } from "../../../gen/settings__privacy.ts";
import { initial as reset } from "../../../gen/settings__reset.ts";
import { initial as updates } from "../../../gen/settings__updates.ts";
import type { SettingsModel } from "./SettingsScreen.tsx";

const read = { ...unread, wifi: "On", bluetooth: "Off", dnd: "Unknown", camera: "Allowed", microphone: "Denied", home: "NotHeldByAlpha", assistant: "HeldElsewhere", launcher: true, version: "1.4.0", versionCode: 140, android: "16", textScale: 115, storageUsed: 40, storageTotal: 128 } as const;

/** A launcher phone on the General page with an update offered. */
export const general: SettingsModel = {
  nav: { ...nav, page: "General" }, facts: { ...facts, read, shown: 1, generation: 1, visible: true }, appearance,
  preferences: { value: preferences, readable: true }, network, reset, variant: "launcher", account: { account: "ann@example.test", provider: "Cloud" },
  updates: { ...updates, installed: 140, offer: 150, offerName: "1.5.0", bound: true, permission: "PermissionRequired", outcome: "UpdateReady" },
};

/** The root of an Alpha image build. */
export const root: SettingsModel = { ...general, nav, variant: "aosp" };

/** The root of a signed-out phone that uses its own provider key. */
export const signedOutRoot: SettingsModel = { ...general, nav, account: { account: "Signed out", provider: "Own key" } };

/** General on the Alpha image, with the Phone row. */
export const imageGeneral: SettingsModel = { ...general, variant: "aosp" };

/** Apps on the Alpha image, with Messages listed. */
export const apps: SettingsModel = { ...general, nav: { ...nav, page: "Apps" }, variant: "aosp" };

/** Inbox's page, with remote images loading. */
export const inbox: SettingsModel = { ...general, nav: { ...nav, page: "AppInbox" } };

/** Display after a text-size request Android refused and a theme the phone could not save. */
export const unsavedDisplay: SettingsModel = {
  ...general, nav: { ...nav, page: "Display" },
  facts: { ...general.facts, scaleIssued: 1, scaleFailed: 1 },
  appearance: { ...appearance, choice: "Dark", saved: "Light" },
};

/** General after Android opened a broader page than the one asked for and refused the Home role. */
export const broaderHandoff: SettingsModel = {
  ...general, facts: { ...general.facts, handoff: { tag: "HandoffOpened", specific: false }, handoffPage: "PageDnd", roleRefused: true },
};

/** A Wi-Fi scan with a secured and an enterprise network, after Android asked for a sign-in page. */
export const nearby: SettingsModel = {
  ...general, nav: { ...nav, page: "Network" },
  network: {
    ...network, scan: "Found", join: "Portal", network: "cafe", online: "BehindPortal",
    networks: [
      { name: "home", secured: true, joinable: true, strength: -50, security: "Wpa3" },
      { name: "office", secured: true, joinable: false, strength: -70, security: "Enterprise" },
    ],
  },
};

/** Preferences that could not be read: every switch locked, Ask before shown on. */
export const unreadablePrivacy: SettingsModel = { ...general, nav: { ...nav, page: "Privacy" }, preferences: { value: preferences, readable: false } };

/** The developer page of a build with test mocks. */
export const developer: SettingsModel = { ...general, nav: { ...nav, page: "Developer", developer: true } };

/** A problem log with two entries. */
export const problems: Diagnostics = { ...diagnostics, log: "LogShown", problems: [{ at: 1_700_000_000_000, title: "A screen couldn’t be shown", detail: "TypeError" }, { at: 1_700_000_100_000, title: "Android stopped Alpha to free up memory", detail: "Reported by Android" }] };

/** An unlocked vault holding two entries' metadata. */
export const unlocked: Vault = {
  ...vault, visit: 1, phase: { tag: "Unlocked" }, observed: false, autofill: "AutofillOther", browserFill: true,
  entries: [{ id: "a", label: "Bank", username: "ann@example.test", sites: ["bank.example"], revision: 3 }, { id: "b", label: "Mail", username: "ann", sites: ["mail.example"], revision: 1 }],
};

/** A vault Android can no longer decrypt. */
export const damaged: Vault = { ...vault, visit: 1, phase: { tag: "Damaged" }, observed: false };

export const listenerOn = { ...listener, shown: "ListenerOn", issued: 1 } as const;

/** A stop the listener could not confirm. */
export const stopUnconfirmed = { ...listener, shown: "ListenerOn", issued: 2, stopUnconfirmed: true, actions: 1 } as const;

/** Licence notices with a flagged component. */
export const notices: Diagnostics = {
  ...diagnostics, licences: "NoticesReady",
  notices: [
    { name: "react", version: "19.0.0", licence: "MIT", source: "https://github.com/facebook/react", text: "MIT License", flags: [], obligations: [] },
    { name: "example-gpl", version: "1.0.0", licence: "GPL-3.0", source: "", text: "", flags: ["copyleft-strong", "custom-flag"], obligations: ["Ship the source with the binary."] },
  ],
};

/** A paused activation Android lets the owner continue. */
export const pausedActivation = { ...updates, activation: "Paused", canContinue: true, pending: true } as const;
