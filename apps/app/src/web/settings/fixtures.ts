// spec/settings/index.md, "Story: Find a setting in a few taps"; spec/settings/passwords.md, "Story: Use my saved passwords only after Android unlocks them"
import { initial as nav } from "../../../gen/settings.ts";
import { initial as appearance } from "../../../gen/settings__appearance.ts";
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
  nav: { ...nav, page: "General" }, facts: { ...facts, read, shown: 1, generation: 1, visible: true }, appearance, systemDark: false,
  preferences: { value: preferences, readable: true }, network, reset, variant: "launcher", offerLabel: "1.5.0 (150)",
  updates: { ...updates, installed: 140, offer: 150, bound: true, permission: "PermissionRequired", outcome: "UpdateReady" },
};

/** Preferences that could not be read: every switch locked, Ask before shown on. */
export const unreadablePrivacy: SettingsModel = { ...general, nav: { ...nav, page: "Privacy" }, preferences: { value: preferences, readable: false } };

/** The developer page of a build with test mocks. */
export const developer: SettingsModel = { ...general, nav: { ...nav, page: "Developer", developer: true } };

/** A problem log with two entries. */
export const problems = { ...diagnostics, log: "LogShown", problems: [{ at: 1_700_000_000_000, title: "A screen couldn’t be shown", detail: "TypeError" }, { at: 1_700_000_100_000, title: "Android stopped Alpha to free up memory", detail: "Reported by Android" }] } as const;

/** An unlocked vault holding two entries' metadata. */
export const unlocked: Vault = {
  ...vault, visit: 1, phase: { tag: "Unlocked" }, observed: false, autofill: "AutofillOther", browserFill: true,
  entries: [{ id: "a", label: "Bank", username: "ann@example.test", sites: ["bank.example"], revision: 3 }, { id: "b", label: "Mail", username: "ann", sites: ["mail.example"], revision: 1 }],
};

/** A vault Android can no longer decrypt. */
export const damaged: Vault = { ...vault, visit: 1, phase: { tag: "Damaged" }, observed: false };

export const listenerOn = { ...listener, shown: "ListenerOn", issued: 1 } as const;
