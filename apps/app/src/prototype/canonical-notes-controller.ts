import {NotesController,type NotesControllerHooks} from '../ui/notes/notes-controller.ts';
import {createNotesClient} from '../../../../.eliza/client-features/plugins/plugin-notes/src/client/notes-api.ts';
import type {AppRecordPort} from '../runtime/app-record-route-policy';
import {NOTES_INVALIDATED_EVENT} from '../runtime/app-record-completion';
import {sessionKey} from '../lib/session-key';
import {abortError} from '../lib/abort';
export const CANONICAL_NOTES_INVALIDATED_EVENT=NOTES_INVALIDATED_EVENT;
const binding=(port:AppRecordPort)=>sessionKey(port.sessionId,port.scope??null,port.identity.ownerId,port.identity.agentId,port.identity.sessionId,port.identity.origin);
/** Adapt the private resident transport and authenticated events to shared Notes. */
export class CanonicalNotesController extends NotesController {
 private detach:()=>void=()=>{};
 private readonly sessionId:string;
 constructor(port:AppRecordPort,hooks:NotesControllerHooks){
  const identity=binding(port),current=()=>port.current()&&binding(port)===identity;
  const assertCurrent=(signal:AbortSignal)=>{signal.throwIfAborted();if(!current())throw abortError('The Notes connection changed.');};
  super(createNotesClient({fetch:async<T>(path:string,options:RequestInit={}):Promise<T>=>{
   const signal=options.signal??new AbortController().signal;assertCurrent(signal);
   const method=options.method??'GET';
   if(method!=='GET'&&method!=='POST')throw Error('Unsupported Notes transport method.');
   if(options.body!==undefined&&typeof options.body!=='string')throw Error('Unsupported Notes request framing.');
   const body=options.body===undefined?undefined:JSON.parse(options.body);
   const value=await port.request(path,method,body,signal);assertCurrent(signal);return value as T;
  }}),current,hooks);
  this.sessionId=port.sessionId;
 }
 listen(target:EventTarget):void{
  this.detach();
  if(!this.current)throw abortError('The Notes connection changed.');
  const changed=(event:Event)=>{const detail=(event as CustomEvent<{sessionId?:unknown;revision?:unknown}>).detail;if(!detail||detail.sessionId!==this.sessionId)return;this.invalidate(typeof detail.revision==='number'&&Number.isSafeInteger(detail.revision)&&detail.revision>=0?detail.revision:undefined);};
  target.addEventListener(CANONICAL_NOTES_INVALIDATED_EVENT,changed);
  this.detach=()=>target.removeEventListener(CANONICAL_NOTES_INVALIDATED_EVENT,changed);
 }
 override retire():void{this.detach();super.retire();}
}
