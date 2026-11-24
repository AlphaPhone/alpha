import { type Faked, elizaAgent, elizaCloud, elizaSecureStore, present } from "./phone.ts";
import type { Answering } from "./routes.ts";
import type { Scene } from "./scene.ts";
import { alphaCarrierSetup, elizaLocation, elizaPasswords, elizaReset, elizaSystem, elizaWiFi } from "./settings.ts";

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
    ...(world.image ? { ElizaTelephony: present, ElizaContacts: present } : {}),
    ElizaSystem: elizaSystem(world.settings),
    ElizaLocation: elizaLocation(world.settings),
    ElizaReset: elizaReset(world.settings),
    ElizaWiFi: elizaWiFi(world.settings),
    ElizaPasswords: elizaPasswords(world.settings),
    AlphaCarrierSetup: alphaCarrierSetup(world.settings),
  };
}
