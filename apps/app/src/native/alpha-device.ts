import type { CrashLogPort } from '../../../../.eliza/client-features/plugins/plugin-native-system/src/crash-log.ts';
import type { SystemFacts } from '../../../../.eliza/client-features/plugins/plugin-native-system/src/definitions.ts';
import type { watchMountedAppUpdates } from '../../../../.eliza/client-features/packages/ui/src/state/app-update-gate';

/** Proton Pass autofill provider state (PasswordProviderSupport.status). */
export type PasswordProviderStatus = {
  installation: 'unknown' | 'absent' | 'unrecognized-publisher' | 'installed' | 'disabled';
  selection: 'unknown' | 'none' | 'proton' | 'other';
  support: 'unknown' | 'available' | 'unavailable';
};
/** AlphaDevice.snapshot(): the shared system facts plus Alpha's device, permission and build facts.
 * A fact Android could not answer is absent. */
export type DeviceSnapshot = SystemFacts & {
  model: string;
  manufacturer: string;
  androidRelease: string;
  securityPatch: string;
  build: string;
  appVersion: string;
  readAt: number;
  textScalePercent: number;
  effectiveTextZoom: number;
  notificationsEnabled: boolean;
  locationAccess: 'precise' | 'approximate' | 'denied';
  permissions: { Microphone: boolean; Location: boolean; Camera: boolean; Calendar: boolean };
  passwordProvider: PasswordProviderStatus;
  appVersionCode?: number;
  appUpdatedAt?: number;
  appSigner?: string;
  appAutomaticUpdates?: 'unsupported' | 'permission-required' | 'starting' | 'supported';
};
/** Build and packaged-runtime facts shared in a diagnostics report. */
export type DiagnosticsFacts = {
  appVersion: string;
  versionCode: number;
  variant: 'launcher' | 'standalone';
  buildType: string;
  testMocks: boolean;
  sdkInt: number;
  androidRelease: string;
  securityPatch: string;
  runtimeHashes: Record<string, string>;
  upstreamPin?: string;
};
/** The update fields AlphaDevice verifies before it installs a package. */
export type AppUpdateInstall = { apkUrl: string; sha256: string; sizeBytes: number; versionCode: number; automatic?: true };
/** The system-bar icon port (prototype/system-bar-appearance.ts). */
export type SystemBarsPort = Pick<AlphaDevicePlugin, 'setSystemBarAppearance'>;

/**
 * AlphaDevicePlugin: settings handoffs, text scale, sharing, crash log, diagnostics, system bars and
 * the in-app update lifecycle. The browser host registers BrowserDevice under the same name
 * (browser/register.ts), so this module exports no singleton.
 */
export interface AlphaDevicePlugin extends CrashLogPort, Omit<Parameters<typeof watchMountedAppUpdates>[0], 'addListener'> {
  snapshot(): Promise<DeviceSnapshot>;
  openSettings(input: { page: string }): Promise<{ status: string; specific?: boolean }>;
  openNotificationShade(): Promise<{ status?: string }>;
  openPasswordProvider(input: { action: string }): Promise<{ status: string; destination?: string }>;
  setTextScale(input: { percent: number }): Promise<{ textScalePercent: number; effectiveTextZoom: number }>;
  recommendedTimeout(options: { baseMs: number }): Promise<{ timeoutMs?: unknown }>;
  copyText(input: { text: string }): Promise<void>;
  shareText(input: { title: string; text: string }): Promise<{ status: 'opened' }>;
  diagnosticsFacts(): Promise<DiagnosticsFacts>;
  shareDiagnostics(input: { text: string }): Promise<{ status: string }>;
  setSystemBarAppearance(input: { dark: boolean }): Promise<void>;
  checkForUpdate(): Promise<{ manifest?: string }>;
  installUpdate(input: AppUpdateInstall): Promise<{ status?: string }>;
  updateState(): Promise<{ pending?: boolean }>;
  addListener(event: 'alphaUpdateReady', listener: (value: unknown) => void): Promise<{ remove(): Promise<void> }>;
}

/** Simulated device controls only the browser development host (BrowserDevice) implements. */
export interface AlphaDeviceBrowserMethods {
  setSensor(input: { field: string; enabled?: boolean }): Promise<unknown>;
  setNetwork(input: { field: string; enabled?: boolean }): Promise<unknown>;
  setBrightness(input: { percent: number }): Promise<unknown>;
}
