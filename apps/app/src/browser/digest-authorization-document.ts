import {anyAbortSignal} from '../runtime/abort-signal';
import {browserDocuments} from './documents';
import {BrowserDomainDocument,type DomainRecovery} from './domain-document';
import {browserDevProfile} from './dev-profile';
import {isOpaque36,isSha256Hex} from '../lib/ids';
export type DigestAuthorization={mutationId:string;kinds:string[];phase:'start'|'review'|'complete';state?:string;expiresAt?:string};
const channel=typeof BroadcastChannel==='undefined'?null:new BroadcastChannel('alpha.browser.documents.v1');
const initial=()=>({pending:null as DigestAuthorization|null});
function validate(data:ReturnType<typeof initial>){
 const invalid=()=>{throw Error('Saved authorization needs recovery.');};
 if(!data||!Object.hasOwn(data,'pending'))return invalid();
 const p=data.pending;
 if(p===null)return p;
 if(!p||!isOpaque36(p.mutationId))return invalid();
 if(!Array.isArray(p.kinds)||!p.kinds.length||p.kinds.length>2||new Set(p.kinds).size!==p.kinds.length||p.kinds.some(kind=>!['email','calendar'].includes(kind)))return invalid();
 if(!['start','review','complete'].includes(p.phase))return invalid();
 if(p.phase!=='start'&&(!isSha256Hex(p.state)||!Number.isFinite(Date.parse(p.expiresAt||''))))return invalid();
 return p;
}

export function digestAuthorizationDocument(scope:string,current:()=>boolean,signal:AbortSignal){
 if(!browserDevProfile||!isSha256Hex(scope))throw Error('Choose a development digest connection.');
 const key='alpha.browser.cloud-delegation:'+scope,check=()=>{signal.throwIfAborted();if(!current())throw Error('Connection changed.');},domain=new BrowserDomainDocument(browserDocuments,key);
 return {
  async read(){check();const data=await domain.read(initial,signal);check();return validate(data);},
  async save(expected:DigestAuthorization|null,next:DigestAuthorization|null){check();validate({pending:next});await domain.edit(initial,data=>{check();const pending=validate(data);if(JSON.stringify(pending)!==JSON.stringify(expected))throw Error('Authorization changed in another tab.');data.pending=next;},signal);check();channel?.postMessage({key});},
  subscribe(listener:()=>void){const changed=(event:MessageEvent)=>{if(event.data?.key===key)listener();};channel?.addEventListener('message',changed);return()=>{channel?.removeEventListener('message',changed);};},
  async capture(request?:AbortSignal){check();const result=await domain.capture(request?anyAbortSignal([signal,request]):signal);check();return result;},
  async reset(expected:DomainRecovery,request?:AbortSignal){check();await domain.reset(expected,request?anyAbortSignal([signal,request]):signal);check();channel?.postMessage({key});},
 };
}
