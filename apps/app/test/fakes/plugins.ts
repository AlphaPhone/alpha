import { elizaCalendar } from "./calendar.ts";
import { alphaMapsTransport, elizaLocation } from "./maps.ts";
import { type Faked, elizaAgent, elizaCloud, elizaSecureStore, present } from "./phone.ts";
import type { Answering } from "./routes.ts";
import { elizaFiles, selectedDocuments } from "./files.ts";
import type { Scene } from "./scene.ts";
import { alphaCarrierSetup, elizaReset, elizaSystem, elizaWiFi } from "./settings.ts";
import { elizaLocation as mapsLocation } from "./maps.ts";
import { type Faked, elizaAgent, elizaCloud, elizaSecureStore } from "./phone.ts";
import type { Answering } from "./routes.ts";
import { elizaSystem as launcherSystem } from "./launcher.ts";
import { elizaFiles } from "./files.ts";
import type { Scene } from "./scene.ts";
import { alphaCarrierSetup, elizaLocation as settingsLocation, elizaPasswords, elizaReset, elizaSystem as settingsSystem, elizaWiFi } from "./settings.ts";
import { telephonyPlugins } from "./telephony.ts";
import { alphaDevice } from "./update.ts";
import { alphaConnection } from "./platform.ts";
import { alphaVoiceCloud, elizaCloudSpeech, elizaSignIn } from "./voice.ts";

function combinedSystem(world: Scene): Faked {
  const launcher = launcherSystem(world.launcher);
  const settings = settingsSystem(world.settings);
  return (emit) => {
    const fromLauncher = launcher(emit) as {
      listLauncherApps: unknown;
      launchApp: unknown;
      openNotificationShade: unknown;
      getLaunchInfo: unknown;
      openAppInfo: (target: { packageName: string }) => unknown;
    };
    const fromSettings = settings(emit) as { openAppInfo: (target: { packageName: string }) => unknown };
    return {
      ...fromSettings,
      listLauncherApps: fromLauncher.listLauncherApps,
      launchApp: fromLauncher.launchApp,
      openNotificationShade: fromLauncher.openNotificationShade,
      getLaunchInfo: fromLauncher.getLaunchInfo,
      getBuildInfo: () => Promise.resolve({ launcher: world.launcher.launcher && world.settings.launcher, version: world.settings.version }),
      openAppInfo: (target: { packageName: string }) =>
        target.packageName === "ai.alphacompute.alphaphone" ? fromSettings.openAppInfo(target) : fromLauncher.openAppInfo(target),
    };
  };
}

function combinedLocation(world: Scene): Faked {
  const maps = mapsLocation(world.maps, () => world.now);
  const settings = settingsLocation(world.settings);
  return (emit) => {
    const fromMaps = maps(emit) as { checkPermissions: () => Promise<unknown>; requestPermissions: () => Promise<unknown> };
    const fromSettings = settings(emit) as { checkPermissions: () => Promise<unknown>; requestPermissions: () => Promise<unknown> };
    return {
      ...fromMaps,
      checkPermissions: () => (world.maps.allowed !== "granted" ? fromMaps.checkPermissions() : fromSettings.checkPermissions()),
      requestPermissions: () => (world.maps.allowed !== "granted" ? fromMaps.requestPermissions() : fromSettings.requestPermissions()),
    };
  };
}

/**
 * The plugins the fake phone's host registers, by the names their `@CapacitorPlugin` gives: one line per plugin, and
 * its import. Lines are only ever added, and git keeps every branch's (`.gitattributes`). An Alpha image's host
 * registers eliza's telephony plugin, and its contacts plugin where the image grants contacts.
 */
export function plugins(world: Scene, services: { readonly agent: Answering; readonly cloud: Answering }): Record<string, Faked> {
  return {
    ElizaAgent: elizaAgent(services.agent),
    ElizaCloud: elizaCloud(services.cloud, () => world.signedIn),
    ElizaSecureStore: elizaSecureStore(world.secrets, world.slots),
    ElizaCalendar: elizaCalendar(world.calendar),
    ElizaFiles: elizaFiles(world.files),
    SelectedDocuments: selectedDocuments(world.files),
    ElizaLocation: elizaLocation(world.maps, () => world.now),
    ...(world.image ? { ElizaTelephony: present, ElizaContacts: present } : {}),
    ElizaSystem: elizaSystem(world.launcher, world.settings),
    ElizaLocation: combinedLocation(world),
    ElizaSystem: combinedSystem(world),
    ElizaReset: elizaReset(world.settings),
    ElizaWiFi: elizaWiFi(world.settings),
    AlphaCarrierSetup: alphaCarrierSetup(world.settings),
    AlphaMapsTransport: alphaMapsTransport(world.maps),
    ...(world.image ? telephonyPlugins(world.telephony) : {}),
    AlphaDevice: alphaDevice(world.update, () => world.now),
    AlphaConnection: alphaConnection(world.platform),
    ...(world.voice.onDevice ? { AlphaVoiceCloud: alphaVoiceCloud(world.voice) } : {}),
    ElizaCloudSpeech: elizaCloudSpeech(world.voice),
    ElizaSignIn: elizaSignIn(world.voice, () => world.signedIn),
  };
}
