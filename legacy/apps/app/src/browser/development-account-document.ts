import {browserDocuments} from './documents';
import {BrowserDomainDocument,type DomainRecovery} from './domain-document';
import {browserDevProfile} from './dev-profile';
import {isOpaque36} from '../lib/ids';
export const developmentCloudKey='alpha.browser.cloud.account.v1';
export type DevelopmentAccount='first'|'second';
type DevelopmentCloudAccount={account:DevelopmentAccount;session:string}|null;
const key=developmentCloudKey+'.document.v1';
const initial=()=>({rawAccount:null as string|null});
const domain=new BrowserDomainDocument(browserDocuments,key);
const channel=typeof BroadcastChannel==='undefined'?null:new BroadcastChannel('alpha.browser.documents.v1');
let cache:DevelopmentCloudAccount=null,ready=false,epoch=0;
const valid=(value:unknown):value is DevelopmentAccount=>value==='first'||value==='second';
function decode(data:ReturnType<typeof initial>):DevelopmentCloudAccount{
 if(!data||!Object.hasOwn(data,'rawAccount')||data.rawAccount!==null&&typeof data.rawAccount!=='string')throw Error('Development account data needs recovery.');
 const value=data.rawAccount===null?null:JSON.parse(data.rawAccount);
 if(value!==null&&(!value||!valid(value.account)||!isOpaque36(value.session)))throw Error('Development account data needs recovery.');return value;
}
function check(signal?:AbortSignal){signal?.throwIfAborted();if(!browserDevProfile)throw Error('Choose development mode.');}
/** Synchronous identity construction uses a previously read snapshot, never storage authority. */
export function developmentCloudAccount():DevelopmentCloudAccount{check();if(!ready)throw Error('Read the current development account before continuing.');return cache?{...cache}:null;}
export async function readDevelopmentCloudAccount(signal?:AbortSignal):Promise<DevelopmentCloudAccount>{
 check(signal);const generation=epoch;try{const value=decode(await domain.read(initial,signal));check(signal);if(generation!==epoch)throw Error('Development account changed.');cache=value;ready=true;return value?{...value}:null;}catch(error){if(generation===epoch)ready=false;throw error;}
}
/** Commit a new account snapshot here and announce it to this tab and the others. */
const publish=(value:DevelopmentCloudAccount)=>{epoch++;cache=value;ready=true;channel?.postMessage({key});window.dispatchEvent(new Event('alpha:development-account-changed'));};
export async function selectDevelopmentCloud(account:DevelopmentAccount|null,signal:AbortSignal){
 check(signal);if(account!==null&&!valid(account))throw Error('Choose a development account.');
 const value=account?{account,session:crypto.randomUUID()}:null;
 await domain.edit(initial,data=>{check(signal);decode(data);data.rawAccount=JSON.stringify(value);},signal);
 publish(value);return value;
}
const invalidate=()=>{epoch++;ready=false;window.dispatchEvent(new Event('alpha:development-account-invalidated'));window.dispatchEvent(new Event('alpha:development-account-changed'));};
channel?.addEventListener('message',event=>{if(event.data?.key===key)invalidate();});
export const developmentAccountRecovery={
 async capture(signal?:AbortSignal){check(signal);return domain.capture(signal);},
 async reset(expected:DomainRecovery,signal?:AbortSignal){check(signal);await domain.reset(expected,signal);publish(null);},
};
