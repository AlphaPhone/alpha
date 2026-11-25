// spec/app/settings/index.md, "Story: Find a setting and come back"
import type { DataResetPlugin } from "@elizaos/os/bridges/definitions/reset";
import type { AndroidRoleStatus, LaunchTarget, LauncherAppsChange, NativeCrashEntry, SystemFacts, SystemHostPlugin, SystemPlugin, SystemSettingsPage } from "@elizaos/os/bridges/definitions/system";
import type { ApprovedJoinResult, ConnectOptions, ConnectivityResult, WiFiNetwork, WiFiPlugin } from "@elizaos/os/bridges/definitions/wifi";
import type { LauncherScene } from "./launcher.ts";
import { type Faked, plugin, rejection } from "./phone.ts";

/** A field as Alpha's `AlphaCarrierSetup` plugin reports one. */
export interface CarrierField { status: "available" | "permission-denied" | "unavailable" | "unsupported" | "not-read"; value?: string }

/** What the fake phone holds for Settings, and how it behaves; a journey changes it between steps. */
export interface SettingsScene {
  facts: SystemFacts;
  roles: AndroidRoleStatus[];
  launcher: boolean;
  version: string;
  /** Reads of the phone's facts wait for this before they answer. */
  gate: Promise<unknown>;
  /** Android takes the Home role for Alpha when its dialog closes. */
  grantsHome: boolean;
  readonly opened: string[];
  crashes: NativeCrashEntry[];
  reset: { status: string; message: string };
  readonly reviews: number[];
  networks: WiFiNetwork[];
  joinAnswer: ApprovedJoinResult["status"];
  readonly joins: ConnectOptions[];
  connectivity: ConnectivityResult;
  carrier: { slots: Array<{ slotIndex: number; imei: CarrierField; simState: CarrierField }>; iccid: CarrierField; eid: CarrierField };
  /** Each Google consent Alpha's host was told to launch the agent with, oldest first. */
  readonly consents: Array<{ gmailChanges: boolean; calendarEdits: boolean }>;
}

export function settingsScene(): SettingsScene {
  return {
    facts: { wifiEnabled: true, mobileDataEnabled: false, locationEnabled: true, batteryPercent: 80, charging: true, interruptionFilter: "all" },
    roles: [
      { role: "home", androidRole: "android.app.role.HOME", held: false, holders: ["com.android.launcher3"], available: true },
      { role: "assistant", androidRole: "android.app.role.ASSISTANT", held: false, holders: [], available: true },
    ],
    launcher: true, version: "1.4.0",
    gate: Promise.resolve(), grantsHome: true, opened: [], crashes: [], reset: { status: "cancelled", message: "Nothing was reset." }, reviews: [],
    networks: [{ ssid: "home", bssid: "00:11:22:33:44:55", rssi: -50, frequency: 2412, capabilities: "[WPA2-PSK-CCMP]", secured: true, security: "wpa2" }],
    joinAnswer: "connected", joins: [], connectivity: { online: true, validated: true, captivePortal: false, ssid: "home" }, consents: [],
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

/** Alpha's own `AlphaCarrierSetup` plugin, which reads only when asked. */
/** `AlphaDevicePlugin.setAgentGoogleConsent`, which hands the consent to `AlphaAgentService` for the agent's next launch. */
export function alphaAgentConsent(scene: SettingsScene) {
  return {
    setAgentGoogleConsent: (consent: { gmailChanges: boolean; calendarEdits: boolean }) => {
      scene.consents.push({ gmailChanges: consent.gmailChanges, calendarEdits: consent.calendarEdits });
      return Promise.resolve();
    },
  };
}

export function alphaCarrierSetup(scene: SettingsScene): Faked {
  return () => ({
    read: () => Promise.resolve({
      canChooseSms: false, smsRole: { status: "available", value: "Messages" }, dialerRole: { status: "available", value: "Phone" }, eid: { status: "not-read" },
      hardware: { manufacturer: { status: "available", value: "Google" }, model: { status: "available", value: "Pixel" }, baseband: { status: "unsupported" } },
      slots: scene.carrier.slots,
      subscriptions: { items: [{ subscriptionId: 1, embedded: true, carrier: { status: "available", value: "Carrier" }, iccid: scene.carrier.iccid, operator: { status: "available", value: "Carrier" }, operatorCode: { status: "available", value: "310260" }, dataEnabled: { status: "available", value: "on" }, roaming: { status: "available", value: "off" } }] },
    }),
    readEid: () => Promise.resolve(scene.carrier.eid),
  });
}


/** The licence notices the page ships beside it, as the fake origin serves them. */
export const notices = [
  { name: "effect", version: "4.1.1", license: "MIT", text: "MIT License", flags: [] },
  { name: "react", version: "19.2.0", license: "MIT", text: "MIT License", flags: [] },
  { name: "mediabunny", version: "1.0.0", license: "MPL-2.0", text: "Mozilla Public License", flags: ["weak-copyleft"] },
];
