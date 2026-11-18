import { registerPlugin } from '../platform-plugins';

/** Alpha's product-only native reads (AlphaDeviceAppsPlugin). Installed apps, default handlers and
 * the build, launch and locale facts are the shared ElizaSystem plugin. */
export interface DeviceAppsPlugin {
  platformCapabilities(): Promise<{ aospImage: boolean; phone: boolean; contacts: boolean; sms: boolean }>;
  /** Launcher builds only: opens Android's Home chooser. */
  openHomeChooser(): Promise<void>;
}
export const deviceApps = registerPlugin<DeviceAppsPlugin>('DeviceApps');
