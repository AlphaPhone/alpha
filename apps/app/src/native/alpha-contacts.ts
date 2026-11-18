import { registerPlugin } from '../platform-plugins';
import type { AddressBookNativePlugin } from '../../../../.eliza/client-features/packages/contracts/src/native-address-book.ts';

/** The shared AddressBookPlugin under Alpha's name (AlphaContactsPlugin, Alpha image only). Alpha
 * implements the in-app read, save and remove. Results are untrusted until parsed by the
 * native-address-book parsers. */
export type AlphaContactsPlugin = Required<AddressBookNativePlugin>;
export const alphaContacts = registerPlugin<AlphaContactsPlugin>('AlphaContacts');
