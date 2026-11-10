import {Capacitor} from '@capacitor/core';
import {AssistantDraftController} from './assistant-draft-controller';
import type {AssistantDraft} from '../runtime/assistant-draft-record';
import {secureConnectionStore} from '../runtime/native-connection';
import {nativeAssistantDraftRecovery} from '../runtime/native-assistant-draft-recovery';
import {encodeInboxUnsaved,readInboxUnsaved,inboxUnsavedLimit,type InboxUnsaved} from '../runtime/inbox-unsaved-record';
import {editCoalescer} from '../runtime/inbox-edit-coalescer';
import {openDomainRecovery} from '../browser/domain-recovery';
import {browserDevProfile} from '../browser/dev-profile';
/** Account-scoped recovery copies remain separate from the explicitly saved local draft. */
export function inboxUnsaved(owner:string,publish:()=>void,restore:(value:InboxUnsaved)=>void){
 let text='',alive=true,applying=false,invalid:''|'size'|'content'='',recoveryAbort:AbortController|undefined;
 // Edits are written once per pause in typing: the latest copy waits here, replaces any earlier
 // unwritten one, and is encoded only when written. A store write in flight holds the next one.
 const queue=editCoalescer<InboxUnsaved>(value=>{try{text=encodeInboxUnsaved(value);invalid='';controller.edit(text);}catch(error){invalid=error instanceof RangeError?'size':'content';}if(alive)publish();});
 // Leaving the app does not wait for the pause: the waiting copy is written at once.
 const hidden=()=>{if(document.hidden)queue.flush();};
 document.addEventListener('visibilitychange',hidden);
 let parsed:{raw:string;value:InboxUnsaved|null}|null=null;
 const binding=JSON.stringify(['inbox-unsaved',browserDevProfile?'development':'app',owner]);
 const controller=new AssistantDraftController(async()=>{
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(binding))),n=>n.toString(16).padStart(2,'0')).join('');
  const slot='inbox-drafts:v1:unsaved:'+hash,native=Capacitor.getPlatform()==='android';
  const domain=native?null:new (await import('../browser/json-domain-document')).BrowserJsonDomainDocument('alpha.browser.'+slot);
  const check=(row:any):AssistantDraft|null=>{if(row===null)return null;if(!row||Object.keys(row).sort().join(',')!=='binding,revision,text,version'||row.version!==1||row.binding!==binding||typeof row.revision!=='string'||!row.revision||typeof row.text!=='string'||new TextEncoder().encode(row.text).length>inboxUnsavedLimit)throw Error('Retained email edits need recovery.');if(row.text)readInboxUnsaved(row.text,owner);return row;};
  const empty=()=>({version:1,binding,revision:crypto.randomUUID(),text:''});
  return {
   recovery:domain?{capture:(signal?:AbortSignal)=>domain.capture(signal),reset:async(expected:any,signal?:AbortSignal)=>{await domain.restore(expected,JSON.stringify({raw:JSON.stringify(empty())}),signal);}}:nativeAssistantDraftRecovery(binding,{read:()=>secureConnectionStore.readRaw(slot),compareExchange:(expected,value)=>secureConnectionStore.compareExchangeRaw(slot,expected,value)}),
   read:async()=>check(native?await secureConnectionStore.read(slot):await domain!.readJson()),
   save:async(expected:AssistantDraft|null,nextText:string)=>{queue.hold();try{const value={version:1 as const,binding,revision:crypto.randomUUID(),text:nextText};check(value);if(new TextEncoder().encode(JSON.stringify(value)).length>8*1024*1024)throw Error('Retained email is too large.');if(native){const receipt=await secureConnectionStore.compareExchange(slot,expected,value);if(receipt.status!=='saved')throw Error('Retained email changed.');}else await domain!.editJson(actual=>{check(actual);if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Retained email changed.');return value;});return value;}finally{queue.release();}},
  };
 },()=>text,value=>{text=value;if(applying&&value)restore(readInboxUnsaved(value,owner));},()=>{if(alive)publish();});
 return {
  ready:controller.open(binding),
  get available(){return !!text||queue.pending;},
  /** The retained copy: the edit waiting to be written, else the copy as stored; null when there is
   * none or it cannot be read. The stored text is parsed once and the same object returned until
   * it changes; callers treat the result as read-only. */
  peek():InboxUnsaved|null{
   const waiting=queue.peek();if(waiting)return waiting;
   if(!text)return null;
   if(parsed?.raw!==text){let value:InboxUnsaved|null=null;try{value=readInboxUnsaved(text,owner);}catch{}parsed={raw:text,value};}
   return parsed!.value;
  },
  get conflict(){return controller.state.conflict;},
  get error(){return controller.state.error;},
  get status(){return invalid==='size'?'Current email edits are too large to retain. Shorten them before closing.':invalid?'Current email edits could not be retained on this device. Save the draft before closing.':controller.state.message.replaceAll('sending','provider review').replace('Preparing draft to send','Clearing retained edits');},
  edit(value:InboxUnsaved){queue.push(value);publish();},
  resume(){queue.flush();if(controller.state.conflict){applying=true;try{controller.restoreSaved();}finally{applying=false;}}else if(text)restore(readInboxUnsaved(text,owner));},
  replace(){controller.keepCurrent();},
  retry(){return controller.retry();},
  async clear(){queue.flush();const expected=text;if(expected)await controller.consume(expected,()=>alive&&text===expected&&!queue.pending);},
  recover(current:unknown){const recovery=controller.recovery();if(!recovery)return;recoveryAbort?.abort();recoveryAbort=new AbortController();openDomainRecovery({capture:async signal=>{const captured=await recovery.capture(signal);return {...captured,raw:JSON.stringify({saved:captured.raw,current})};},reset:recovery.reset},'email edits','Email edit recovery','Back up retained edits before resetting this recovery copy. Explicitly saved drafts and provider mail will not change.',recoveryAbort.signal,undefined,Capacitor.getPlatform()==='android'?'device':'browser');},
  retire(){queue.flush();document.removeEventListener('visibilitychange',hidden);alive=false;controller.retire(false);recoveryAbort?.abort();},
 };
}
