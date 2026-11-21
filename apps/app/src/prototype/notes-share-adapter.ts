import {shareSelectedText,copySelectedText} from '../runtime/text-share';
import {openSharePanel} from '../runtime/share-panel';
import {noteShareText,type ShareableNote} from '../../../../.eliza/client-features/plugins/plugin-notes/src/client/note-share-text.ts';
import {errorNotice,ERROR_TOAST} from '../runtime/error-notice';
import {isAbortError} from '../lib/abort';
import type {ViewApi,ViewOutput,ViewRegistry} from './shell-types';
type NoteRow=ShareableNote&{id:string};
type NotesState={open?:unknown;list:NoteRow[]};
type NoteDetail={share?:()=>void};
type NotesOutput=ViewOutput&{ed?:NoteDetail;vo?:NoteDetail;lk?:NoteDetail;shareSheet?:boolean;copyText?:()=>void;shareMail:()=>void;canExportText?:boolean;exportText:()=>unknown};
/** User actions snapshot exactly one currently selected note; Email remains an in-app draft. */
export function installNotesShareAdapter(views:ViewRegistry){
 const notes=views.notes,render=notes.render;
 notes.render=(state,api:ViewApi)=>{
  const view=render(state,api) as NotesOutput;
  const selected=()=>{const current=api.get<NotesState>('notes');if(!api.isActive()||!current.open)throw Error('Open a note first.');const note=current.list.find(row=>row.id===current.open);if(!note)throw Error('The note is no longer available.');
   // The shared text's layout is the shared Notes export format; a note it cannot export is worded here.
   try{return noteShareText(note);}catch{throw Error('This note has no text to share.');}};
  const failure=(error:unknown)=>{if(!isAbortError(error)&&api.isActive())api.toast(errorNotice(error,'Sharing is unavailable.'),ERROR_TOAST);};
  const share=()=>{try{const snapshot=selected(),identity=JSON.stringify(snapshot),id=api.get('notes').open;
   void openSharePanel({title:snapshot.title,current:()=>{try{return api.isActive()&&api.get('notes').open===id&&JSON.stringify(selected())===identity;}catch{return false;}},external:()=>shareSelectedText(snapshot).catch(failure),email:()=>view.shareMail(),copy:()=>copySelectedText(snapshot.text).then(()=>api.toast('Note text copied.'),failure),save:view.canExportText?()=>view.exportText():undefined});
  }catch(error){failure(error);}};
  for(const key of ['ed','vo','lk'] as const){const detail=view[key];if(detail)detail.share=share;}
  view.shareSheet=false;
  view.copyText=()=>{try{const snapshot=selected();api.set({sheet:null});void copySelectedText(snapshot.text).then(()=>{if(api.isActive())api.toast('Note text copied.');},failure);}catch(error){failure(error);}};
  // Compose a draft only. The existing explicit Send/review flow owns email delivery.
  view.shareMail=()=>{try{const snapshot=selected();api.set({sheet:null});api.open('inbox',{compose:{subject:snapshot.title,body:snapshot.text}});}catch(error){failure(error);}};
  return view;
 };
}
