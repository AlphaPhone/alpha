import { registerPlugin } from '../platform-plugins';
import type { TelephonyNativePlugin } from '../../../../.eliza/client-features/packages/contracts/src/native-telephony.ts';

export type { TelephonyNativePlugin };
/** The shared TelephonyPlugin under Alpha's name (AlphaTelephonyPlugin, Alpha image only). */
export const alphaTelephony = registerPlugin<TelephonyNativePlugin>('AlphaTelephony');
