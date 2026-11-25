import { launcherScene } from "./launcher.ts";
import { plugIn } from "./phone.ts";
import { type ListenerScene, elizaSense, elizaSystem, settingsScene } from "./settings.ts";

/** Capacitor registers eager SDK clients while the native host is present, as it is on Android. */
const settings = settingsScene();
const listener: ListenerScene = { status: { available: false }, pauseReply: Promise.resolve({ available: false }), openSettings: false };
const unplug = plugIn({ ElizaSystem: elizaSystem(launcherScene(), settings), ElizaSense: elizaSense(settings, listener) });
try {
  await import("@elizaos/os-bridges");
} finally {
  unplug();
}
