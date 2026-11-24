import { elizaCalendar } from "./calendar.ts";
import { elizaLocation } from "./maps.ts";
import { type Faked, elizaAgent, elizaCloud, elizaSecureStore, present } from "./phone.ts";
import type { Answering } from "./routes.ts";
import { elizaSystem as launcherSystem } from "./launcher.ts";
import { elizaFiles } from "./files.ts";
import type { Scene } from "./scene.ts";
import { alphaCarrierSetup, elizaPasswords, elizaReset, elizaSystem as settingsSystem, elizaWiFi } from "./settings.ts";
import { telephonyPlugins } from "./telephony.ts";

/**
 * Combines Settings' and Home's parts of `ElizaSystem` into one plugin: Settings owns roles, device facts, crash logs
 * and Alpha's own App info, while Home owns the installed apps, launching one, its App info, the shade and presentation.
 */
function combinedSystem(world: Scene): Faked {
  return (emit) => {
    const settings = settingsSystem(world.settings)(emit) as Record<string, (arg: unknown) => Promise<unknown>>;
    const launcher = launcherSystem(world.launcher)(emit) as Record<string, (arg: unknown) => Promise<unknown>>;
    return {
      ...settings,
      ...launcher,
      getBuildInfo: () => Promise.resolve({ launcher: world.launcher.launcher, version: world.settings.version }),
      openAppInfo: (target: unknown) =>
        typeof target === "object" && target !== null && "packageName" in target && target.packageName === "ai.alphacompute.alphaphone"
          ? settings.openAppInfo(target)
          : launcher.openAppInfo(target),
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
    ElizaLocation: elizaLocation(world.maps, () => world.now),
    ...(world.image ? { ElizaTelephony: present, ElizaContacts: present } : {}),
    ElizaSystem: combinedSystem(world),
    ElizaReset: elizaReset(world.settings),
    ElizaWiFi: elizaWiFi(world.settings),
    ElizaPasswords: elizaPasswords(world.settings),
    AlphaCarrierSetup: alphaCarrierSetup(world.settings),
    ...(world.image ? telephonyPlugins(world.telephony) : {}),
  };
}
