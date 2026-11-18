import {Capacitor} from '@capacitor/core';
import {secureConnectionStore} from '../runtime/native-connection';
import {isUuidV4} from '../lib/ids';
import {addNoteOrigin,removeNoteOrigin,findNoteLink,noteOriginIndex,noteLinkOf,noteOriginTitle,recordNoteRevision,resolveNoteLink,type NoteLink,type NoteOriginKind,type NoteOriginIndex} from '../runtime/note-origin';
type Bag=Record<string,any>;
const slot='note-origins:v1:device';
let cache:NoteOriginIndex|null=null,loading:Promise<void>|null=null;
const listeners=new Set<()=>void>();
let browserDocument:Promise<{readJson<T>():Promise<T|null>;editJson<T>(update:(value:T|null)=>T|null):Promise<void>}>|null=null;
const browser=()=>browserDocument??=import('../browser/json-domain-document').then(m=>new m.BrowserJsonDomainDocument('alpha.browser.'+slot));
const native=()=>Capacitor.getPlatform()==='android';
/** The stored links, validated. */
async function readNoteOrigins(){return noteOriginIndex(native()?await secureConnectionStore.read<NoteOriginIndex>(slot):await (await browser()).readJson<NoteOriginIndex>());}
async function change(update:(index:NoteOriginIndex)=>NoteOriginIndex){
 if(native()){
  const raw=await secureConnectionStore.read<NoteOriginIndex>(slot),index=noteOriginIndex(raw),next=update(index);
  if(next!==index&&(await secureConnectionStore.compareExchange(slot,raw,next)).status!=='saved')throw Error('Note links changed.');
 }else await (await browser()).editJson<NoteOriginIndex>(raw=>{const index=noteOriginIndex(raw),next=update(index);return next===index?raw:next;});
 cache=await readNoteOrigins();for(const listener of listeners)listener();
}
/** Reads the saved links once. A failed read shows no links; it never invents one. */
function loadNoteOrigins(){return loading??=readNoteOrigins().then(index=>{cache=index;for(const listener of listeners)listener();},()=>{loading=null;});}
/** Reminders and in-app (browser) events are linked by their ids, Agent Calendar events by their canonical event key. Device calendar row ids are
 * provider-assigned and can be reused after a deletion, so a native event is linked by the
 * creationId Alpha saved it with, which the pinned calendar reader returns on events this app
 * created. That id is a link, not proof of ownership: another app with
 * calendar write access can set the same fields. */
export const noteOriginSupported=(kind:NoteOriginKind)=>kind==='reminder'||kind==='event';
/** The note-origin key of a listed calendar event: its creationId on Android (absent for events
 * Alpha did not create, which then have no link), its series or event id in the browser calendar. */
export function eventNoteOriginId(event:{creationId?:unknown;seriesId?:unknown;id?:unknown}|undefined):string|undefined{
 if(!event)return undefined;
 if(Capacitor.isNativePlatform())return isUuidV4(event.creationId)?event.creationId:undefined;
 const id=event.seriesId||event.id;return id==null||id===''?undefined:String(id);
}
/** Links a record that was just saved to the note its draft came from. Resolves false when the link
 * was not stored; the saved record itself is never affected. */
export async function rememberNoteOrigin(kind:NoteOriginKind,id:string,value:unknown):Promise<boolean>{
 const origin=noteLinkOf(value);if(!origin||!id||!noteOriginSupported(kind))return false;
 try{await change(index=>addNoteOrigin(index,kind,id,origin,Date.now()));return JSON.stringify(savedNoteOrigin(kind,id))===JSON.stringify(origin);}catch{return false;}
}
export async function forgetNoteOrigin(kind:NoteOriginKind,id:string):Promise<void>{try{await change(index=>removeNoteOrigin(index,kind,id));}catch{/* An orphaned link names no existing record. */}}
/** A saved link: a recording link (version 1) or a canonical Notes record link (version 2). */
export function savedNoteOrigin(kind:NoteOriginKind,id:string):NoteLink|undefined{return cache&&id?findNoteLink(cache,kind,id):undefined;}

/** Shows "From note" on a saved reminder or event and opens that exact note, or nothing. */
export function installNoteOriginAdapter(Component:Bag,views:Bag){
 const p=Component.prototype,mount=p.componentDidMount,unmount=p.componentWillUnmount,render=views.calendar.render;
 let opening=false,shell:Bag|undefined;
 p.componentDidMount=function(){mount.call(this);shell=this;this.noteOriginChanged=()=>{if(this.live!==false)this.vset('calendar',{});};listeners.add(this.noteOriginChanged);void loadNoteOrigins();};
 p.componentWillUnmount=function(){listeners.delete(this.noteOriginChanged);unmount.call(this);};
 views.calendar.render=(state:Bag,api:Bag)=>{
  const out=render(state,api),selected=out.ev&&state.open?(state.events||[]).find((e:Bag)=>e.id===state.open):undefined;
  const origin=selected?.alphaReminderId?savedNoteOrigin('reminder',selected.alphaReminderId):selected?.alphaCalendarId?savedNoteOrigin('event',eventNoteOriginId(selected.nativeEvent)||''):typeof selected?.canonicalEventKey==='string'?savedNoteOrigin('event',selected.canonicalEventKey):undefined;
  if(!origin||!out.ev)return out;
  // A recording link (version 1) names no agent Notes record, so it shows nothing.
  return origin.version===2?canonicalOrigin(out,origin,api,state.open):out;
 };
 /** A canonical Notes record link: resolved against the open agent Notes collection only. */
 const canonicalNotes=()=>shell?.canonicalNotesUi?.current?shell.canonicalNotesUi:undefined;
 const canonicalOrigin=(out:Bag,origin:NoteLink,api:Bag,openId:unknown)=>{
  const ui=canonicalNotes(),live=ui?resolveNoteLink(origin,ui.notes()):undefined,name=live?.status==='found'?noteOriginTitle(live.note,'Note'):'';
  out.ev.hasOrigin=true;out.ev.originLabel=!ui?'Note':name?`From note: ${name}`:'Deleted note';out.ev.originOpenLabel=name?`Open note ${name}`:'Open note';
  out.ev.openOrigin=async()=>{
   if(opening)return;opening=true;
   try{
    if(!api.isActive()||document.hidden||api.get('calendar').open!==openId)return;
    const notes=canonicalNotes(),found=notes?resolveNoteLink(origin,notes.notes()):undefined;
    if(!notes){if(api.isActive()&&!document.hidden)api.toast('Notes unavailable');return;}
    if(found?.status!=='found'){api.toast('Source gone');return;}
    const changed=await recordNoteRevision(found.note as {id:string})!==origin.revision;
    if(!api.isActive()||document.hidden||api.get('calendar').open!==openId||canonicalNotes()!==notes)return;
    if(resolveNoteLink(origin,notes.notes()).status!=='found'){api.toast('Source gone');return;}
    api.open('notes',{});notes.select(origin.noteId);
    if(changed)api.toast('Edited');
   }finally{opening=false;}
  };
  return out;
 };
}
