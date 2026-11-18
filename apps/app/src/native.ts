import { registerPlugin } from './platform-plugins';
import { Capacitor } from '@capacitor/core';
import type { AppInfoTarget, ElizaSystemPlugin } from './native/eliza-system';
import { createSystemLauncherBridge, type LauncherBridge } from '@elizaos/capacitor-system/launcher';
export const System = registerPlugin<ElizaSystemPlugin>("ElizaSystem");
export { deviceApps as DeviceApps } from './native/device-apps';
export const isAndroid = Capacitor.getPlatform() === "android";
/** The one launcher bridge over ElizaSystem, on Android and in the browser development device. */
export const launcherBridge: LauncherBridge = createSystemLauncherBridge(System);
/** False only when a native ElizaSystem is present without listener support. Capacitor turns a
 * listener on such a plugin into a rejection its caller cannot catch, and the returned promise
 * never settles. Every Android `Plugin` declares `addListener`, so this is true on a phone. */
export const launcherListens = (() => {
  const header = (Capacitor as typeof Capacitor & { PluginHeaders?: { name: string; methods?: { name: string }[] }[] }).PluginHeaders?.find(entry => entry.name === "ElizaSystem");
  return isAndroid ? !!header?.methods?.some(method => method.name === "addListener") : !header || !!header.methods?.some(method => method.name === "addListener");
})();
/** Android's App info for exactly one listed entry and profile (AlphaSystemPlugin.openAppInfo). */
export const openAppInfo = (target: AppInfoTarget): Promise<void> => System.openAppInfo(target);
