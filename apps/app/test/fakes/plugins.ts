import { elizaCalendar } from "./calendar.ts";
import { elizaLocation } from "./maps.ts";
import { type Faked, elizaAgent, elizaCloud, elizaSecureStore, present } from "./phone.ts";
import type { Answering } from "./routes.ts";
import { elizaSystem } from "./launcher.ts";
import { elizaFiles } from "./files.ts";
import type { Scene } from "./scene.ts";
import { alphaCarrierSetup, elizaPasswords, elizaReset, elizaSystem as settingsSystem, elizaWiFi } from "./settings.ts";
import { telephonyPlugins } from "./telephony.ts";

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
    ElizaLocation: elizaLocation(world.maps, () => world.now, () => world.settings.location),
    ...(world.image ? { ElizaTelephony: present, ElizaContacts: present } : {}),
    ElizaSystem: (emit) => ({ ...settingsSystem(world.settings)(emit), ...elizaSystem(world.launcher)(emit) }),
    ElizaReset: elizaReset(world.settings),
    ElizaWiFi: elizaWiFi(world.settings),
    ElizaPasswords: elizaPasswords(world.settings),
    AlphaCarrierSetup: alphaCarrierSetup(world.settings),
    ...(world.image ? telephonyPlugins(world.telephony) : {}),
  };
}
