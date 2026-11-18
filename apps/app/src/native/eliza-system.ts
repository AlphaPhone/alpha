import type { SystemPlugin } from '../../../../.eliza/client-features/plugins/plugin-native-system/src/definitions.ts';

/** One listed launcher entry and profile whose Android App info page opens. */
export type AppInfoTarget = { packageName: string; activityName?: string; user?: string };

/**
 * The shared ElizaSystem plugin (AlphaSystemPlugin on Android) plus Alpha's network and App info
 * reads. The browser host registers BrowserDevice under the same name (browser/register.ts) and
 * native.ts owns the one registration, so this module exports no singleton.
 */
export type ElizaSystemPlugin = SystemPlugin & {
  /** The app's active Android network. Omitted facts mean Android could not answer. */
  getNetworkStatus(): Promise<{ connected?: boolean; internetValidated?: boolean }>;
  openAppInfo(target: AppInfoTarget): Promise<void>;
};
