// spec/app/settings/index.md, "Story: Find a setting and come back"
import type { DataResetPlugin, AndroidRoleStatus, ElizaPasswordsPlugin, ListenerStatus, PasswordEditorInput, PasswordEntrySummary, PasswordsStatus, LaunchTarget, LauncherAppsChange, MirrorChoice, MirrorHistoryRow, MirrorPolicyChange, MirrorStatus, NativeCrashEntry, SystemFacts, SystemHostPlugin, SystemPlugin, SystemSettingsPage, ApprovedJoinResult, ConnectOptions, ConnectivityResult, WiFiNetwork, WiFiPlugin } from "@elizaos/os-bridges";
import type { PasswordProvider, PasswordProviderAction } from "../../src/platform/systemSettings.vibe";
import type { PermissionState } from "@capacitor/core";
import type { LauncherScene } from "./launcher.ts";
import { type Faked, plugin, rejection } from "./phone.ts";

type AppPermission = "camera" | "notifications";

/** A field as Alpha's `AlphaCarrierSetup` plugin reports one. */
export interface CarrierField { status: "available" | "permission-denied" | "unavailable" | "unsupported" | "not-read"; value?: string }

export interface RecoveryScene {
  retained: number;
  archived: number;
  starts: number;
  readonly tokens: string[];
}

export interface ListenerScene {
  status: ListenerStatus;
  readonly pauseReply: Promise<unknown>;
  openSettings: boolean;
}

/** What the fake phone holds for Settings, and how it behaves; a journey changes it between steps. */
export interface SettingsScene {
  facts: SystemFacts;
  recovery?: RecoveryScene;
  listener?: ListenerScene;
  textAsk?: { ticket: number; canReturn: boolean; returned: number[] };
  roles: AndroidRoleStatus[];
  launcher: boolean;
  version: string;
  hostFacts: { androidRelease: string; permissions: { Camera?: boolean; Microphone?: boolean; Calendar?: boolean } };
  /** Reads of the phone's facts wait for this before they answer. */
  gate: Promise<unknown>;
  /** Android takes the Home role for Alpha when its dialog closes. */
  grantsHome: boolean;
  readonly opened: string[];
  readonly copied: string[];
  refusesCopy: boolean;
  passwordsUnlocked: boolean;
  readonly passwords: PasswordEntrySummary[];
  readonly passwordEdits: Array<PasswordEditorInput | undefined>;
  readonly passwordRowActions: Array<{ choice: "copy" | "reveal" | "remove"; id: string; revision: number }>;
  mirror: MirrorStatus;
  readonly mirrorChoices: MirrorChoice[];
  readonly mirrorHistory: MirrorHistoryRow[];
  autofill: PasswordsStatus["autofill"];
  autofillDestination: Awaited<ReturnType<ElizaPasswordsPlugin["openAutofillSettings"]>>["destination"];
  passwordProvider?: PasswordProvider;
  readonly permissionRequests: AppPermission[];
  readonly permissionStates: Partial<Record<AppPermission, PermissionState>>;
  readonly permissionReplies: Partial<Record<AppPermission, PermissionState>>;
  crashes: NativeCrashEntry[];
  reset: { status: string; message: string };
  readonly reviews: number[];
  networks: WiFiNetwork[];
  joinAnswer: ApprovedJoinResult["status"];
  readonly joins: ConnectOptions[];
  connectivity: ConnectivityResult;
  carrier: { slots: Array<{ slotIndex: number; imei: CarrierField; simState: CarrierField }>; iccid: CarrierField; eid: CarrierField };
  /** Each Google consent Alpha's host kept to launch the agent with, oldest first: one told again unchanged is kept once, as `AlphaAgentService.keep` does. */
  readonly consents: Array<{ gmailChanges: boolean; calendarEdits: boolean }>;
  /** How many times Alpha told the host a consent at all, kept or not. */
  told: number;
  /** Whether the host refuses each consent it is told, keeping what it had, as when Android cannot save it. */
  refusesConsent: boolean;
  /** What the host waits for before it answers a consent, as when a restart of the agent is slow. */
  consentGate: Promise<void>;
}

export function settingsScene(): SettingsScene {
  return {
    facts: { wifiEnabled: true, mobileDataEnabled: false, locationEnabled: true, batteryPercent: 80, charging: true, interruptionFilter: "all" },
    roles: [
      { role: "home", androidRole: "android.app.role.HOME", held: false, holders: ["com.android.launcher3"], available: true },
      { role: "assistant", androidRole: "android.app.role.ASSISTANT", held: false, holders: [], available: true },
    ],
    launcher: true, version: "1.4.0",
    hostFacts: { androidRelease: "16", permissions: { Microphone: false, Calendar: true } },
    passwordsUnlocked: false, passwords: [], passwordEdits: [], passwordRowActions: [],
    mirror: { revision: "policy-1", enabled: false, paused: false, accessGranted: true, connected: true, history: false, historyUnavailable: false, apps: [] },
    mirrorChoices: [{ packageName: "example.reader", label: "News reader" }], mirrorHistory: [],
    autofill: { supported: true, selected: "none" }, autofillDestination: "autofill-picker",
    permissionRequests: [], permissionStates: {}, permissionReplies: {},
    gate: Promise.resolve(), grantsHome: true, opened: [], copied: [], refusesCopy: false, crashes: [], reset: { status: "cancelled", message: "Nothing was reset." }, reviews: [],
    networks: [{ ssid: "home", bssid: "00:11:22:33:44:55", rssi: -50, frequency: 2412, capabilities: "[WPA2-PSK-CCMP]", secured: true, security: "wpa2" }],
    joinAnswer: "connected", joins: [], connectivity: { online: true, validated: true, captivePortal: false, ssid: "home" }, consents: [], told: 0, refusesConsent: false, consentGate: Promise.resolve(),
    carrier: {
      slots: [{ slotIndex: 0, imei: { status: "available", value: "356938035643809" }, simState: { status: "available", value: "Ready" } }, { slotIndex: 1, imei: { status: "permission-denied" }, simState: { status: "available", value: "Absent" } }],
      iccid: { status: "permission-denied" }, eid: { status: "available", value: "89049032000000000000000000000001" },
    },
  };
}

const page = (scene: SettingsScene, name: string) => {
  scene.opened.push(name);
  return Promise.resolve();
};

/**
 * `SystemPlugin.java`, the `ElizaSystem` plugin, as far as Home and Settings ask it: Home's apps, opening one or its
 * info page, the shade and how Alpha is presented, from `home`; the phone's facts, roles and pages, from `scene`.
 */
export function elizaSystem(home: LauncherScene, scene: SettingsScene): Faked {
  return plugin<SystemPlugin & SystemHostPlugin, { launcherAppsChanged: LauncherAppsChange }>((emit) => {
    home.changed = () => emit("launcherAppsChanged", { reason: "changed" });
    const known = (target: LaunchTarget) => target.packageName === "ai.alphacompute.alphaphone" || home.apps.some((app) => app.packageName === target.packageName);
    return {
      listLauncherApps: () => (home.unlisted ? Promise.reject(rejection("failed")) : Promise.resolve({ apps: home.apps })),
      launchApp(target) {
        home.opened.push(target.packageName);
        const refused = home.refusing.get(target.packageName) ?? (known(target) ? undefined : "not-installed");
        return refused === undefined ? Promise.resolve() : Promise.reject(rejection(refused));
      },
      resolveDefaultApp: () => Promise.resolve({ role: "dial", available: false }),
      openDefaultApp: () => Promise.resolve(),
      getStatus: async () => {
        await scene.gate;
        return { packageName: "ai.alphacompute.alphaphone", roles: scene.roles.map((role) => ({ ...role })) };
      },
      requestRole: ({ role }) => {
        if (role === "home" && scene.grantsHome) scene.roles = scene.roles.map((one) => (one.role === "home" ? { ...one, held: true, holders: ["ai.alphacompute.alphaphone"] } : one));
        return Promise.resolve({ role, held: scene.grantsHome, resultCode: scene.grantsHome ? -1 : 0 });
      },
      openSettings: () => page(scene, "home"),
      openNetworkSettings: () => page(scene, "network"),
      getDeviceSettings: () => Promise.resolve({ brightness: 50, brightnessMode: "manual", canWriteSettings: false, volumes: [] }),
      setScreenBrightness: () => Promise.reject(rejection("unsupported")),
      setVolume: () => Promise.reject(rejection("unsupported")),
      setFlashlight: () => Promise.resolve({ available: false, enabled: false }),
      openWriteSettings: () => page(scene, "write-settings"),
      openDisplaySettings: () => page(scene, "display"),
      openSoundSettings: () => page(scene, "sound"),
      getSystemFacts: async () => {
        await scene.gate;
        return { ...scene.facts };
      },
      openSettingsPage: ({ page: asked }: { page: SystemSettingsPage }) => {
        scene.opened.push(asked);
        return Promise.resolve({ status: "opened", page: asked, specific: asked !== "mobile" });
      },
      openNotificationShade() {
        home.shades += 1;
        const shade = home.shade;
        return shade === "silent" ? new Promise(() => {}) : Promise.resolve({ status: shade });
      },
      getBuildInfo: () => Promise.resolve({ launcher: home.launcher && scene.launcher, version: scene.version }),
      getLaunchInfo: () => Promise.resolve({ assistant: home.assistant }),
      getLocaleInfo: () => Promise.resolve({ locale: "en-US", hour24: false }),
      openAppInfo(target) {
        home.infos.push(target.packageName);
        scene.opened.push(`app-info ${target.packageName}`);
        return known(target) ? Promise.resolve() : Promise.reject(rejection("not-installed"));
      },
      openClock: () => Promise.reject(rejection("unsupported")),
      crashLog: () => Promise.resolve({ entries: scene.crashes.map((entry) => ({ ...entry })), exitHistory: true }),
      recordRendererFailure: () => Promise.resolve(),
      clearCrashLog: () => {
        scene.crashes = [];
        return Promise.resolve();
      },
    };
  });
}

/** The `ElizaReset` plugin: Android's review answers only that nothing was reset. */
export function elizaReset(scene: SettingsScene): Faked {
  return plugin<DataResetPlugin>(() => ({
    review: () => {
      scene.reviews.push(scene.reviews.length + 1);
      return Promise.resolve({ ...scene.reset });
    },
  }));
}

/** The `ElizaWiFi` plugin: a scan of the scene's networks and Android's approval of a join. */
export function elizaWiFi(scene: SettingsScene): Faked {
  return plugin<WiFiPlugin>(() => ({
    checkPermissions: () => Promise.resolve({ location: "granted" }),
    requestPermissions: () => Promise.resolve({ location: "granted" }),
    getCapabilities: () => Promise.resolve({ sdk: 35, approvedJoin: true, internetPanel: true }),
    openInternetPanel: () => page(scene, "internet"),
    getWifiState: () => Promise.resolve({ enabled: true, connected: true, rssi: -50 }),
    getConnectedNetwork: () => Promise.resolve({ network: null }),
    listAvailableNetworks: () => Promise.resolve({ networks: scene.networks.map((network) => ({ ...network })) }),
    connectToNetwork: () => Promise.resolve({ success: false }),
    disconnectFromNetwork: () => Promise.resolve({ success: true }),
    getConnectivity: () => Promise.resolve({ ...scene.connectivity }),
    addNetworkWithApproval: (options) => {
      scene.joins.push(options);
      return Promise.resolve({ status: scene.joinAnswer });
    },
  }));
}

/** `AlphaDevicePlugin.setAgentGoogleConsent`, which hands the consent to `AlphaAgentService` for the agent's next launch. */
export function alphaAgentConsent(scene: SettingsScene) {
  return {
    setAgentGoogleConsent: async (consent: { gmailChanges: boolean; calendarEdits: boolean }) => {
      scene.told += 1;
      await scene.consentGate;
      if (scene.refusesConsent) throw new Error("Agent consent could not be saved");
      const kept = scene.consents.at(-1);
      if (kept?.gmailChanges !== consent.gmailChanges || kept.calendarEdits !== consent.calendarEdits) scene.consents.push({ gmailChanges: consent.gmailChanges, calendarEdits: consent.calendarEdits });
    },
  };
}

/** Alpha's own `AlphaCarrierSetup` plugin, which reads only when asked. */
export function alphaCarrierSetup(scene: SettingsScene): Faked {
  return () => ({
    read: () => Promise.resolve({
      canChooseSms: false, smsRole: { status: "available", value: "Messages" }, dialerRole: { status: "available", value: "Phone" }, eid: { status: "not-read" },
      hardware: { manufacturer: { status: "available", value: "Google" }, model: { status: "available", value: "Pixel" }, baseband: { status: "unsupported" } },
      slots: scene.carrier.slots,
      subscriptions: { status: "available", items: [{ subscriptionId: 1, embedded: true, slotIndex: 0, defaultData: true, carrier: { status: "available", value: "Carrier" }, iccid: scene.carrier.iccid, operator: { status: "available", value: "Carrier" }, operatorCode: { status: "available", value: "310260" }, dataEnabled: { status: "available", value: "on" }, roaming: { status: "available", value: "off" } }] },
    }),
    readEid: () => Promise.resolve(scene.carrier.eid),
    openSettings: async ({ page: target }: { page: string }) => {
      await page(scene, target);
      return { status: "opened", specific: true };
    },
  });
}


/** The qualified image listener's status, stop receipts and explicit native settings handoff. */
export function elizaSense(scene: SettingsScene, listener: ListenerScene): Faked {
  return () => ({
    status: () => Promise.resolve(listener.status),
    pause: () => listener.pauseReply,
    turnOff: async () => {
      listener.status = { available: true, state: "OFF", label: "Off", consented: false, listening: false, microphoneOpen: false };
      return { ...listener.status, saved: true };
    },
    openSettings: async () => {
      if (listener.openSettings) await page(scene, "sense-settings");
      return { opened: listener.openSettings };
    },
  });
}

/** Android's autofill status and provider picker through the native Passwords bridge. */
export function elizaPasswords(scene: SettingsScene): Faked {
  const check = (choice: "copy" | "reveal" | "remove", id: string, revision: number | undefined) => {
    if (!scene.passwordsUnlocked) throw rejection("locked");
    const index = scene.passwords.findIndex((entry) => entry.id === id && entry.revision === revision);
    if (revision === undefined || index < 0) throw rejection("conflict");
    scene.passwordRowActions.push({ choice, id, revision });
    return index;
  };
  return () => ({
    status: () => Promise.resolve<PasswordsStatus>({ available: true, locked: !scene.passwordsUnlocked, unlockRemainingMs: scene.passwordsUnlocked ? 60000 : 0, unlockSeconds: 60, biometric: false, autofill: { ...scene.autofill } }),
    unlock: async (): ReturnType<ElizaPasswordsPlugin["unlock"]> => {
      scene.passwordsUnlocked = true;
      return { unlocked: true, unlockRemainingMs: 60000 };
    },
    lock: async (): ReturnType<ElizaPasswordsPlugin["lock"]> => {
      scene.passwordsUnlocked = false;
      return { locked: true };
    },
    list: async (): ReturnType<ElizaPasswordsPlugin["list"]> => {
      if (!scene.passwordsUnlocked) throw rejection("locked");
      return { entries: structuredClone(scene.passwords) };
    },
    reveal: async ({ id, expectedRevision }: Parameters<ElizaPasswordsPlugin["reveal"]>[0]): ReturnType<ElizaPasswordsPlugin["reveal"]> => {
      check("reveal", id, expectedRevision);
      return { shown: true, hidesAfterMs: 30_000 };
    },
    copy: async ({ id, expectedRevision }: Parameters<ElizaPasswordsPlugin["copy"]>[0]): ReturnType<ElizaPasswordsPlugin["copy"]> => {
      check("copy", id, expectedRevision);
      return { copied: true, clearsAfterMs: 30_000 };
    },
    remove: async ({ id, expectedRevision }: Parameters<ElizaPasswordsPlugin["remove"]>[0]): ReturnType<ElizaPasswordsPlugin["remove"]> => {
      scene.passwords.splice(check("remove", id, expectedRevision), 1);
      return { removed: true };
    },
    openEditor: async ({ entryId, expectedRevision }: Partial<PasswordEditorInput>): ReturnType<ElizaPasswordsPlugin["openEditor"]> => {
      if (!scene.passwordsUnlocked) throw rejection("locked");
      if (entryId === undefined && expectedRevision === undefined) {
        scene.passwordEdits.push(undefined);
        scene.passwords.push({ id: "entry-new", label: "New account", username: "owner", updatedAt: 1000, revision: 1,
          bindings: [{ kind: "web", facet: "https://other.test", display: "other.test" }] });
        return { status: "saved", id: "entry-new", revision: 1 };
      }
      if (entryId === undefined || expectedRevision === undefined) throw rejection("invalid");
      scene.passwordEdits.push({ entryId, expectedRevision });
      const found = scene.passwords.find(({ id }) => id === entryId);
      if (!found || found.revision !== expectedRevision) throw rejection("conflict");
      found.label = "Updated account";
      found.revision += 1;
      return { status: "saved", id: found.id, revision: found.revision };
    },
    openAutofillSettings: async (): ReturnType<ElizaPasswordsPlugin["openAutofillSettings"]> => {
      await page(scene, scene.autofillDestination);
      return { status: "opened", destination: scene.autofillDestination };
    },
  });
}

/** The Android-only Settings methods exposed by AlphaDevice. */
export function settingsHost(scene: SettingsScene) {
  const permissionState = (permission: AppPermission) => scene.permissionStates[permission] ??
    (permission === "camera" && scene.hostFacts.permissions.Camera ? "granted" : "denied");
  return {
    settingsFacts: () => Promise.resolve(scene.hostFacts),
    accessPermissionStatus: ({ permission }: { permission: AppPermission }) => Promise.resolve({ state: permissionState(permission) }),
    requestAccessPermission: ({ permission }: { permission: AppPermission }) => {
      const state = permissionState(permission);
      if (state === "prompt" || state === "prompt-with-rationale") {
        scene.permissionRequests.push(permission);
        scene.permissionStates[permission] = scene.permissionReplies[permission] ?? state;
      }
      return Promise.resolve({ state: permissionState(permission) });
    },
    passwordProviderStatus: () => Promise.resolve(scene.passwordProvider),
    openPasswordProvider: async ({ action }: { action: PasswordProviderAction }) => {
      await page(scene, `password-provider ${action}`);
      return { status: "opened", destination: action === "settings" ? "provider-picker" : "external" };
    },
    textAsk: () => Promise.resolve({ ticket: scene.textAsk?.ticket ?? 0 }),
    closeTextAsk: ({ ticket }: { ticket: number }) => {
      const visit = scene.textAsk;
      const closed = visit?.ticket === ticket && visit.canReturn;
      if (closed) {
        visit.returned.push(ticket);
        visit.ticket = 0;
      }
      return Promise.resolve({ closed });
    },
    copyText: ({ text }: { text: string }) => {
      if (scene.refusesCopy) return Promise.reject(new Error("Clipboard unavailable"));
      scene.copied.push(text);
      return Promise.resolve();
    },
    openSettings: async ({ page: target }: { page: string }) => {
      await page(scene, target);
      return { status: "opened", specific: target === "all-files" };
    },
  };
}

/** The phone's notification delivery and the Android page for an exact channel. */
export function elizaNotices(scene: SettingsScene): Faked {
  return () => ({
    status: () => Promise.resolve({
      appEnabled: true, permissionGranted: true, interruption: "all", scope: "alpha-phone",
      channels: [{ id: "opaque-reminders", name: "Reminders", importance: 0, blocked: true, groupBlocked: false }],
    }),
    openChannelSettings: async ({ id }: { id: string }) => {
      if (id !== "opaque-reminders") throw rejection("This notification channel is no longer available");
      await page(scene, `channel ${id}`);
      return { status: "opened" };
    },
    crossAppStatus: async () => structuredClone(scene.mirror),
    notificationApps: async () => ({ apps: structuredClone(scene.mirrorChoices) }),
    setNotificationPolicy: async (requested: MirrorPolicyChange) => {
      if (requested.expectedRevision !== scene.mirror.revision) throw rejection("changed");
      const { enabled, history, apps } = requested;
      const pinned = apps?.map(({ packageName, preview }) => {
        const verified = scene.mirrorChoices.find((choice) => choice.packageName === packageName);
        if (!verified) throw rejection("unavailable");
        return { ...verified, preview, available: true };
      });
      scene.mirror = {
        ...scene.mirror, revision: scene.mirror.revision + "-next",
        enabled: enabled ?? scene.mirror.enabled, history: history ?? scene.mirror.history, apps: pinned ?? scene.mirror.apps,
      };
      scene.mirrorHistory.splice(0);
      return structuredClone(scene.mirror);
    },
    resumeCrossApp: async ({ expectedRevision }: { expectedRevision: string }) => {
      if (expectedRevision !== scene.mirror.revision) throw rejection("changed");
      scene.mirror.paused = false;
      return structuredClone(scene.mirror);
    },
    notificationHistory: async () => ({ items: structuredClone(scene.mirrorHistory) }),
    clearNotificationHistory: async ({ expectedRevision }: { expectedRevision: string }) => {
      if (expectedRevision !== scene.mirror.revision) throw rejection("changed");
      scene.mirrorHistory.splice(0);
    },
    openNotificationAccess: async () => {
      await page(scene, "notification-access");
      return { status: "opened" };
    },
  });
}

/** Licence notices as a test answers the shipped notices file with them. */
export const notices = [
  { name: "effect", version: "4.1.1", license: "MIT", text: "MIT License", flags: [] },
  { name: "react", version: "19.2.0", license: "MIT", text: "MIT License", flags: [] },
  { name: "mediabunny", version: "1.0.0", license: "MPL-2.0", text: "Mozilla Public License", flags: ["weak-copyleft"] },
];
