import {Capacitor} from '@capacitor/core';
import {secureConnectionStore} from './native-connection';
/** Encrypted Keystore slot of the device Notes collection. */
export const SECURE_NOTES_SLOT = 'notes-records:v1:device';
/** The saved Notes collection as stored (Keystore slot on Android, browser document on the web build), never an editor snapshot. */
export async function readSavedNotesRaw():Promise<string>{
 const raw=Capacitor.getPlatform()==='android'?(await secureConnectionStore.read<{currentRaw:string}>(SECURE_NOTES_SLOT))?.currentRaw:await(await import('./browser-notes-document')).readBrowserNotesRaw();
 if(typeof raw!=='string')throw Error('Notes readback unavailable');
 return raw;
}
