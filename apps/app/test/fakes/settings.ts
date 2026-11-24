// spec/app/settings/index.md, "Story: Find a setting and come back"
import type { DataResetPlugin } from "@elizaos/os/bridges/definitions/reset";
import type { LocationPermissionStatus, LocationPlugin } from "@elizaos/os/bridges/definitions/location";
import type { AndroidRoleStatus, NativeCrashEntry, SystemFacts, SystemHostPlugin, SystemPlugin, SystemSettingsPage } from "@elizaos/os/bridges/definitions/system";
import type { ApprovedJoinResult, ConnectOptions, ConnectivityResult, WiFiNetwork, WiFiPlugin } from "@elizaos/os/bridges/definitions/wifi";
import { type Faked, plugin, rejection } from "./phone.ts";

/** A field as Alpha's `AlphaCarrierSetup` plugin reports one. */
export interface CarrierField { status: "available" | "permission-denied" | "unavailable" | "unsupported" | "not-read"; value?: string }

/** What the fake phone holds for Settings, and how it behaves; a journey changes it between steps. */
export interface SettingsScene {
  facts: SystemFacts;
  roles: AndroidRoleStatus[];
  launcher: boolean;
  version: string;
  location: LocationPermissionStatus;
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
}

export function settingsScene(): SettingsScene {
  return {
    facts: { wifiEnabled: true, mobileDataEnabled: false, locationEnabled: true, batteryPercent: 80, charging: true, interruptionFilter: "all" },
    roles: [
      { role: "home", androidRole: "android.app.role.HOME", held: false, holders: ["com.android.launcher3"], available: true },
      { role: "assistant", androidRole: "android.app.role.ASSISTANT", held: false, holders: [], available: true },
    ],
    launcher: true, version: "1.4.0", location: { location: "granted", accuracy: "approximate" },
    gate: Promise.resolve(), grantsHome: true, opened: [], crashes: [], reset: { status: "cancelled", message: "Nothing was reset." }, reviews: [],
    networks: [{ ssid: "home", bssid: "00:11:22:33:44:55", rssi: -50, frequency: 2412, capabilities: "[WPA2-PSK-CCMP]", secured: true, security: "wpa2" }],
    joinAnswer: "connected", joins: [], connectivity: { online: true, validated: true, captivePortal: false, ssid: "home" },
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

/** `SystemPlugin.java`, the `ElizaSystem` plugin, as far as Settings reads and opens it. */
export function elizaSystem(scene: SettingsScene): Faked {
  return plugin<SystemPlugin & SystemHostPlugin>(() => ({
    listLauncherApps: () => Promise.resolve({ apps: [] }),
    launchApp: () => Promise.resolve(),
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
    openNotificationShade: () => Promise.resolve({ status: "unsupported" }),
    getBuildInfo: () => Promise.resolve({ launcher: scene.launcher, version: scene.version }),
    getLaunchInfo: () => Promise.resolve({ assistant: false }),
    getLocaleInfo: () => Promise.resolve({ locale: "en-US", hour24: false }),
    openAppInfo: ({ packageName }) => page(scene, `app-info ${packageName}`),
    openClock: () => Promise.reject(rejection("unsupported")),
    crashLog: () => Promise.resolve({ entries: scene.crashes.map((entry) => ({ ...entry })), exitHistory: true }),
    recordRendererFailure: () => Promise.resolve(),
    clearCrashLog: () => {
      scene.crashes = [];
      return Promise.resolve();
    },
  }));
}

/** The `ElizaLocation` plugin, as far as Settings asks what it may do. */
export function elizaLocation(scene: SettingsScene): Faked {
  return plugin<LocationPlugin>(() => ({
    getCurrentPosition: () => Promise.reject(rejection("TIMEOUT")),
    watchPosition: () => Promise.reject(rejection("unsupported")),
    clearWatch: () => Promise.resolve(),
    checkPermissions: () => Promise.resolve({ ...scene.location }),
    requestPermissions: () => Promise.resolve({ ...scene.location }),
    removeAllListeners: () => Promise.resolve(),
  }));
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
