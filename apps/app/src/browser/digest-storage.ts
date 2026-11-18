import {anyAbortSignal} from '../runtime/abort-signal';
import {browserDevProfile} from './dev-profile';
import {assertDevelopmentIdentity,readDevelopmentIdentity,verifyDevelopmentIdentity} from './development-identity';
import {BrowserDomainDocument,type DomainRecovery} from './domain-document';
import {browserDocuments} from './documents';
import {developmentDigestStore} from '../runtime/local-agent-storage';
import {actionScope} from '../runtime/device-actions';
import type {VerifiedSession} from '../runtime/alpha-client';
import {isRecord} from '../lib/parse';
import {agentOwnerKey} from '../lib/session-key';
/** The production inbox keeps its CAS/recovery semantics in browser development. */
export async function browserDigestStore(session:VerifiedSession,current:()=>boolean,signal?:AbortSignal){
 if(!browserDevProfile)throw Error('Development mode required.');
 const selected=JSON.parse(localStorage.getItem('alpha.connection.selection.v1')||'null');
 if(selected?.kind!=='development'||!['local','cloud','remote'].includes(selected.profile))throw Error('Choose a development connection.');
 const identity=await readDevelopmentIdentity(selected.profile,signal);
 if(identity.ownerId!==session.ownerId||identity.agentId!==session.agentId)throw Error('Digest owner changed.');
 const prefix='hosted-digests:v1:'+await actionScope(agentOwnerKey(session));
 const check=(slot:unknown)=>{
  signal?.throwIfAborted();assertDevelopmentIdentity(identity);
  const selection=JSON.parse(localStorage.getItem('alpha.connection.selection.v1')||'null');
  if(!current()||selection?.kind!=='development'||selection.profile!==identity.profile)throw Error('Digest connection changed.');
  if(typeof slot!=='string'||slot.length>300||(slot!==prefix&&!slot.startsWith(prefix+':')))throw Error('Digest storage scope changed.');
 };
 // All inbox slots share one document; the backup retains each slot's exact bytes.
 type State={slots:Record<string,string>};
 const initial=():State=>({slots:{}});
 const domain=new BrowserDomainDocument(browserDocuments,'alpha.browser.'+prefix+'.document.v1');
 const validate=(state:State)=>{
  if(!state||!isRecord(state.slots)||Object.entries(state.slots).some(([slot,raw])=>{try{check(slot);return typeof raw!=='string';}catch{return true;}}))throw Error('Digest inbox needs recovery.');
  return state;
 };
 const value=(state:State,slot:string):string|null=>{
  validate(state);if(!Object.hasOwn(state.slots,slot))return null;
  const row=JSON.parse(state.slots[slot]);
  if(!isRecord(row)||!Object.hasOwn(row,'value')||row.value!==null&&typeof row.value!=='string')throw Error('Digest inbox needs recovery.');
  return row.value;
 };
 const storage=developmentDigestStore(async input=>{
  await verifyDevelopmentIdentity(identity,signal);check(input.slot);const slot=input.slot as string;
  if(input.operation==='digestRead'){const state=await domain.read(initial,signal);await verifyDevelopmentIdentity(identity,signal);check(slot);return {value:value(state,slot)};}
  if(input.operation!=='digestCompareExchange')throw Error('Unknown digest storage operation.');
  if(input.value!==null&&(typeof input.value!=='string'||new TextEncoder().encode(input.value).length>250000))throw Error('Digest storage exceeds the recovery limit.');
  return domain.edit(initial,async data=>{await verifyDevelopmentIdentity(identity,signal);check(slot);if(value(data,slot)!==input.expectedValue)return {status:'conflict'};data.slots[slot]=JSON.stringify({value:input.value});return {status:'saved'};},signal);
 });
 const recoverySignal=(request?:AbortSignal)=>signal&&request?anyAbortSignal([signal,request]):signal??request;
 return {...storage,recovery:{
  async capture(request?:AbortSignal){await verifyDevelopmentIdentity(identity,recoverySignal(request));check(prefix);const result=await domain.capture(recoverySignal(request));await verifyDevelopmentIdentity(identity,recoverySignal(request));check(prefix);return result;},
  async reset(expected:DomainRecovery,request?:AbortSignal){await verifyDevelopmentIdentity(identity,recoverySignal(request));check(prefix);await domain.reset(expected,recoverySignal(request));await verifyDevelopmentIdentity(identity,recoverySignal(request));check(prefix);},
 }};
}
