import {Capacitor} from '@capacitor/core';
import {secureConnectionStore} from './native-connection';
import {validateNotesFolders,NOTES_FOLDERS_SLOT,browserNotesFoldersKey,type NotesFoldersDocument} from './notes-folders-model';
export * from './notes-folders-model';
import {NOTE_FOLDERS_METADATA_KEY,readNoteFolders,type NoteFolder} from '../../../../.eliza/client-features/plugins/plugin-notes/src/note-folders.ts';

/** Storage for the folder list: the encrypted device slot on Android, a browser document on the web build. */
let browserDocument:Promise<{readJson<T>():Promise<T|null>;editJson<T>(update:(value:T|null)=>T|null):Promise<void>}>|null=null;
const browser=()=>browserDocument??=import('../browser/json-domain-document').then(m=>new m.BrowserJsonDomainDocument(browserNotesFoldersKey));
const native=()=>Capacitor.getPlatform()==='android';
export async function readNotesFolders():Promise<NotesFoldersDocument>{
 return validateNotesFolders(native()?await secureConnectionStore.read<unknown>(NOTES_FOLDERS_SLOT):await (await browser()).readJson<unknown>());
}
/** Compare-and-exchange edit with readback; a lost race throws and nothing is written. */
export async function editNotesFolders(update:(doc:NotesFoldersDocument)=>NotesFoldersDocument):Promise<NotesFoldersDocument>{
 if(native()){
  const raw=await secureConnectionStore.read<unknown>(NOTES_FOLDERS_SLOT),doc=validateNotesFolders(raw),next=validateNotesFolders(update(doc));
  if(JSON.stringify(next)!==JSON.stringify(doc)&&(await secureConnectionStore.compareExchange(NOTES_FOLDERS_SLOT,raw,next)).status!=='saved')throw Error('Notes folders changed');
 }else await (await browser()).editJson<unknown>(raw=>{const doc=validateNotesFolders(raw),next=validateNotesFolders(update(doc));return JSON.stringify(next)===JSON.stringify(doc)?raw:next;});
 return readNotesFolders();
}
/** The folder list a chat message carries while the agent keeps this owner's notes, so chat can move
 * a note to a folder by name. Nothing is sent when the list cannot be read or does not fit the shared
 * contract: the agent then offers no move, and never takes that for "there are no folders". */
export async function chatNotesFolders():Promise<{[NOTE_FOLDERS_METADATA_KEY]?:NoteFolder[]}>{
 try{const folders=readNoteFolders({[NOTE_FOLDERS_METADATA_KEY]:(await readNotesFolders()).folders.map(({id,name})=>({id,name}))});return folders?{[NOTE_FOLDERS_METADATA_KEY]:folders}:{};}
 catch{return {};}
}
