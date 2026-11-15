import type { CapacitorConfig } from "@capacitor/cli";
import {androidIdentity} from './scripts/android-identity.ts';
const identity = androidIdentity();
const config: CapacitorConfig = {
  appId: identity.appId,
  appName: identity.appName,
  webDir: "web-dist",
  loggingBehavior: "none",
  plugins: { SystemBars: { style: "LIGHT", insetsHandling: "disable" } },
  server: { androidScheme: "https" },
  android: { path: "android", allowMixedContent: false },
};
export default config;
