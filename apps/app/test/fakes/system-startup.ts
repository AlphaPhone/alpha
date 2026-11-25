import { launcherScene } from "./launcher.ts";
import { plugIn } from "./phone.ts";
import { elizaSystem, settingsScene } from "./settings.ts";

/** Capacitor registers the eager SDK System client while the native host is present, as it is on Android. */
const unplug = plugIn({ ElizaSystem: elizaSystem(launcherScene(), settingsScene()) });
try {
  await import("@elizaos/os-bridges");
} finally {
  unplug();
}
