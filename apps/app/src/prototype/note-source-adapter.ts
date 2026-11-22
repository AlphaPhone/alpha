import {anyAbortSignal} from '../runtime/abort-signal';
import {Capacitor} from '@capacitor/core';
import {runFilePicker,inputFiles} from '../browser/file-picker';
import {DailyApps} from '../daily';
import {registerPlugin} from '../platform-plugins';
import {reviewMailAttachment,type MailAttachment} from '../runtime/inbox-attachment';
import {rethrowAttachmentRefusal} from '../ui/mailbox/drafts-controller';
import {documentSourceOf,retainedSourceReferences,type DocumentSourceLink} from '../../../../.eliza/client-features/plugins/plugin-files/src/documents/source-links.ts';
type Bag=Record<string,any>;
/** A note's linked source document (shared plugin-files source-link rules, J03). */
export type Source=DocumentSourceLink;
const attachments=registerPlugin<{
 readSelected(input:{selectionId:string}):Promise<MailAttachment & {sha256:string;size:number;sourceReferenceVersion?:1}>;
 openReviewed(input:MailAttachment & {sha256:string;reviewed:boolean}):Promise<{message:string}>;
 openSourceReference(input:{reference:string;sha256:string;size:number;mimeType:string}):Promise<{message:string}>;
 releaseSourceReferences(input:{keep:string[]}):Promise<{removed:number;released:number;remaining:number}>;
 cancel():Promise<void>;
}>('AlphaMailAttachments');
/**
 * Android keeps a linked source's read grant while a note names its a1: reference (J03, option a),
 * also after the picker selection that granted it is forgotten or evicted. Notes therefore tell
 * the native side which references a saved or restorable (Trash) note still names; the others
 * are removed once they were last retained more than three days ago (a content question's link
 * may be saved in a summary note well after it was asked) and their grants released, so the bounded
 * reference map never fills with links of deleted notes. A trashed note keeps its link until its
 * Trash copy is purged, so a restored note still opens its source.
 */
export async function releaseUnusedSourceReferences(notes:readonly unknown[]):Promise<void>{
 if(Capacitor.getPlatform()!=='android')return;
 const keep=retainedSourceReferences(notes);
 await attachments.releaseSourceReferences({keep});
}
export const sourceOf=documentSourceOf;
/** Open the original file from a note’s attachment chip. Retained fingerprints
 * from older notes can still be resolved through the system file picker. */
export function installNoteSourceAdapter(views:Bag){
 const notes=views.notes,render=notes.render,leave=notes.onLeave;
 let pending:AbortController|undefined;
 notes.onLeave=(...args:any[])=>{pending?.abort();leave?.(...args);};
 notes.render=(state:Bag,api:Bag)=>{
  const out=render(state,api),note=state.list?.find((n:Bag)=>n.id===state.open);
  const source=note?.kind==='text'?sourceOf(note.documentSource):undefined;
  out.canLinkSource=!!source;out.sourceLabel='Attachment';
  out.sourceDocument=async()=>{
   if(!source||pending||!api.isActive()||document.hidden)return;
   const latest=api.get('notes'),record=latest.list.find((n:Bag)=>n.id===note.id);
   if(latest.open!==note.id||JSON.stringify(record?.documentSource)!==JSON.stringify(note.documentSource))return;
   const operation=pending=new AbortController(),signal=operation.signal,native=Capacitor.isNativePlatform();
   let selectionId:string|undefined,opening=false;
   const current=()=>!signal.aborted&&(native||!document.hidden)&&api.isActive()&&api.get('notes').open===note.id&&
    JSON.stringify(api.get('notes').list.find((n:Bag)=>n.id===note.id)?.documentSource)===JSON.stringify(record.documentSource);
   signal.addEventListener('abort',()=>{if(opening)void attachments.cancel().catch(()=>{});},{once:true});
   const hide=()=>{if(document.hidden)operation.abort();};
   window.addEventListener('pagehide',()=>operation.abort(),{signal});
   // Android’s own file picker can hide the WebView while the selection is pending.
   if(!native)document.addEventListener('visibilitychange',hide,{signal});
   try{
    if(source.reference){
     opening=true;
     await attachments.openSourceReference({reference:source.reference,sha256:source.sha256,size:source.size,mimeType:source.mimeType});
     return;
    }
    let file:MailAttachment;
    if(native){
     const choice=await DailyApps.perform({action:'files'});
     selectionId=choice.selectionId;
     if(!current()||choice.status==='cancelled')return;
     if(choice.status!=='selected'||!selectionId)throw Error('Choose a supported file.');
     file=await attachments.readSelected({selectionId});
    }else{
     const chosen=await runFilePicker(async pickerSignal=>{
      const owned=anyAbortSignal([pickerSignal,signal]),files=await inputFiles(owned);
      const picked=files[0];
      if(!picked)return null;
      if(picked.size>5*1024*1024)throw Error('Choose a file up to 5 MB.');
      const bytes=new Uint8Array(await picked.arrayBuffer());
      owned.throwIfAborted();
      let binary='';
      for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      return {name:picked.name,mimeType:picked.type,dataBase64:btoa(binary)};
     },null);
     if(!current()||!chosen)return;
     file=chosen;
    }
    if(!current())return;
    const checked=await reviewMailAttachment(file).catch(rethrowAttachmentRefusal);
    if(!current())return;
    if(checked.sha256!==source.sha256||checked.size!==source.size||file.mimeType!==source.mimeType){
     api.toast('That file doesn’t match this attachment.');
     return;
    }
    opening=true;
    await attachments.openReviewed({...file,sha256:checked.sha256,reviewed:true});
   }catch{
    if(current())api.toast('Couldn’t open the linked file.');
   }finally{
    if(selectionId)await DailyApps.forgetSelected({selectionId}).catch(()=>{if(current())api.toast('Reopen Files');});
    opening=false;operation.abort();pending=undefined;
   }
  };
  return out;
 };
}
