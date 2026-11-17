import { Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import * as KeyValueStore from "effect/persistence/KeyValueStore";
import { type Agent, agentAt, relayedAgent } from "./agent.vibe";
import { capacitorBridge } from "./bridge.vibe";
import { type Cloud, cloudAt, relayedCloud } from "./cloud.vibe";
import { type Device, browserDevice, capacitorDevice } from "./device.vibe";
import { type Vault, browserVault, capacitorVault } from "./vault.vibe";

/** Every service of the world outside Alpha. Areas reach the world only through these. */
export type Platform = KeyValueStore.KeyValueStore | Agent | Cloud | Device | Vault;

const store = KeyValueStore.layerStorage(() => localStorage);

/** The phone: each service through its Capacitor plugin, with tokens kept in native code. */
export function phonePlatform(): Layer.Layer<Platform> {
  return Layer.mergeAll(store, capacitorDevice, capacitorVault, relayedAgent, relayedCloud).pipe(Layer.provide(capacitorBridge));
}

/** A browser page: the agent and the cloud at the page's own `/agent` and `/cloud`, which the dev server answers, and no image, plugins or secrets. */
export function browserPlatform(origin: string): Layer.Layer<Platform> {
  return Layer.mergeAll(store, browserDevice, browserVault, agentAt(`${origin}/agent`), cloudAt(`${origin}/cloud`)).pipe(Layer.provide(FetchHttpClient.layer));
}
