import type { NativeCloudSignInPort } from '../../../../.eliza/client-features/packages/auth/src/auth/native-cloud-sign-in.ts';
import type { CloudEnvironment } from '../runtime/cloud-protocol';

/**
 * AlphaCloudSignInPlugin (the shared CloudSignInPlugin under Alpha's name). The explicit browser
 * Cloud host registers BrowserCloudSignIn under the same name (runtime/native-connection.ts), so this
 * module exports no singleton.
 */
export type AlphaCloudSignInPlugin = NativeCloudSignInPort<CloudEnvironment> & {
  /** Browser host only: settles the credential commit boundary before cancellation. Android has no
   * such method, and native-connection.ts hides Capacitor's synthesized stub. */
  cancelGoogleSignIn?(): Promise<unknown>;
};
