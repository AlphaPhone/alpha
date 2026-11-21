import {noteShareText,type ShareableNote} from '../../../../.eliza/client-features/plugins/plugin-notes/src/client/note-share-text.ts';
import { registerPlugin } from '../platform-plugins';
import type { AlphaNoteDocumentsPlugin } from '../native/alpha-note-documents';
import {noteDocumentText} from '../ui/notes/note-document-messages';
import type {ViewApi,ViewOutput,ViewRegistry} from './shell-types';
type NotesState={open?:unknown;list:Array<ShareableNote&{id:string}>};
type NotesOutput=ViewOutput&{canExportText?:boolean;exportText?:()=>void};
const documents=registerPlugin<Pick<AlphaNoteDocumentsPlugin,'exportText'>>('AlphaNoteDocuments', {
 web: () => import('../runtime/browser-note-documents').then(module => new module.BrowserNoteDocuments()),
});
/** Explicit user-selected text only; existing Notes persistence owns conflict/readback checks. */
export function installNotesDocumentAdapter(views:ViewRegistry){
 const notes=views.notes,render=notes.render,leave=notes.onLeave;let busy=false,epoch=0;
 // Android delivers a picker result before the app is shown again. A receipt lasts under two
 // seconds, so one issued while the document is hidden can be over before anyone sees it.
 const whenVisible=()=>document.hidden?new Promise<void>(resolve=>{const shown=()=>{if(document.hidden)return;document.removeEventListener('visibilitychange',shown);resolve();};document.addEventListener('visibilitychange',shown);}):Promise.resolve();
 notes.onLeave=api=>{epoch++;leave?.(api);};
 notes.render=(state,api:ViewApi)=>{
  const view=render(state,api) as NotesOutput;
  /** The outcome of a document operation, a failure included, shown once the document is visible and only in the Notes view it belongs to. */
  const receipt=(message:string)=>{const token=epoch;void whenVisible().then(()=>{if(token===epoch&&api.isActive())api.toast(message);});};
  const perform=async<T>(task:()=>Promise<T>,apply:(value:T)=>void|Promise<void>)=>{if(busy){api.toast('Busy');return;}const token=epoch;busy=true;try{const value=await task();if(token!==epoch||!api.isActive())return;await apply(value);}catch{if(token===epoch)receipt('Import failed');}finally{busy=false;}};
  const selected=(state as Partial<NotesState>).list?.find(n=>n.id===state.open);
  view.canExportText=!!selected;
  view.exportText=()=>{const current=api.get<NotesState>('notes'),note=current.list.find(n=>n.id===current.open);if(!note||!api.isActive()){api.toast('Open a note');return;}const snapshot=noteShareText(note);api.set({sheet:null});void perform(()=>documents.exportText(snapshot),value=>receipt(noteDocumentText('export-text',value.status,value.message)));};
  return view;
 };
}
