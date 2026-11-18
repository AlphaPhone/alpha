import type { FilesStoragePort } from '../../../../.eliza/client-features/plugins/plugin-files/src/browser/files-browser-adapter.ts';
import type { NativeResult } from '../daily';

/**
 * AlphaFilesPlugin: the shared Files storage port (files-browser-adapter) over Android storage, with
 * Alpha's selection result. `settings` opens Android's all-files access page instead of the prompt.
 * The browser host registers BrowserFiles under the same name (browser/register.ts), so this module
 * exports no singleton.
 */
export type AlphaFilesPlugin = FilesStoragePort<NativeResult> & {
  storageRequestAccess(options?: { settings?: boolean }): ReturnType<FilesStoragePort<NativeResult>['storageRequestAccess']>;
};

/** Methods only the browser development host (BrowserFiles) implements. */
export interface AlphaFilesBrowserMethods {
  usage(): Promise<{ bytes: number; files: number }>;
  storageSaveMedia(input: { paths: string[] }): Promise<unknown>;
}
