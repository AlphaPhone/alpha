import type {BrowserDocumentSnapshot as Snapshot,BrowserDocumentStore} from '../../../../.eliza/client-features/packages/ui/src/platform/browser-document-store';
/** Product recovery policy; the injected upstream store owns transactions. */
type Documents = Pick<BrowserDocumentStore,'read'|'compareExchange'|'edit'>;
/** The stored envelope. `legacy` is always written as null. */
type Envelope = {version:1;legacy:string|null;value:string|null};
export type DomainRecovery = {
 snapshot:Snapshot|undefined;
 raw:string|null;
 format:'domain'|'unrecognized';
};
const envelope=(raw:string|null):Envelope=>{
 const value=raw===null?null:JSON.parse(raw);
 if(!value||value.version!==1||!Object.hasOwn(value,'legacy')||!Object.hasOwn(value,'value')||
  value.legacy!==null&&typeof value.legacy!=='string'||value.value!==null&&typeof value.value!=='string')
  throw Error('Browser document metadata needs recovery.');
 return value;
};
const empty=():Envelope=>({version:1,legacy:null,value:null});

/** One Alpha domain moves as a unit: readers, writers, backup and reset. */
export class BrowserDomainDocument {
 private documents:Documents;
 private key:string;
 constructor(documents:Documents,key:string){
  this.documents=documents;this.key=key;
 }

 private async load(signal?:AbortSignal):Promise<Envelope>{
  const current=await this.documents.read(this.key,signal);
  return current?envelope(current.raw):empty();
 }

 async readRaw(signal?:AbortSignal):Promise<string|null>{return (await this.load(signal)).value;}
 async read<T>(initial:()=>T|Promise<T>,signal?:AbortSignal):Promise<T>{
  const raw=await this.readRaw(signal);signal?.throwIfAborted();
  const value:T=raw===null?await initial():JSON.parse(raw);signal?.throwIfAborted();return value;
 }
 async edit<T,R>(initial:()=>T|Promise<T>,edit:(data:T)=>R|Promise<R>,signal?:AbortSignal,expected?:DomainRecovery):Promise<R>{
  return this.documents.edit(this.key,async before=>{
   signal?.throwIfAborted();
   // An explicit reviewed intent must not survive an intervening write, even an ABA value change.
   if(expected&&(before?.revision!==expected.snapshot?.revision||before?.raw!==expected.snapshot?.raw))throw Error('Device settings changed. Review the current choice and try again.');
   const value:Envelope=before?envelope(before.raw):empty();
   const data:T=value.value===null?await initial():JSON.parse(value.value);
   signal?.throwIfAborted();
   const result=await edit(data);signal?.throwIfAborted();
   const raw=JSON.stringify(data);
   if(raw===undefined)throw Error('Browser document cannot be saved.');
   return {raw:JSON.stringify({...value,value:raw}),result};
  },signal);
 }

 /** Capture without parsing domain bytes or requiring readable metadata. */
 async capture(signal?:AbortSignal):Promise<DomainRecovery>{
  const snapshot=await this.documents.read(this.key,signal);
  if(!snapshot)return {snapshot,raw:null,format:'domain'};
  try{return {snapshot,raw:envelope(snapshot.raw).value,format:'domain'};}
  catch{return {snapshot,raw:snapshot.raw,format:'unrecognized'};}
 }

 /** Product-reviewed replacement, bound to the exact captured bytes. */
 async restore(expected:DomainRecovery,raw:string,signal?:AbortSignal):Promise<void>{
  signal?.throwIfAborted();
  await this.documents.compareExchange(this.key,expected.snapshot,JSON.stringify({version:1,legacy:null,value:raw}),signal);
 }

 /** Called only after explicit reset confirmation of the captured recovery state. */
 async reset(expected:DomainRecovery,signal?:AbortSignal):Promise<void>{
  signal?.throwIfAborted();
  await this.documents.compareExchange(this.key,expected.snapshot,JSON.stringify({version:1,legacy:null,value:null}),signal);
 }
}
