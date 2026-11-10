import {Capacitor} from '@capacitor/core';
import {secureConnectionStore} from './native-connection';
import {BrowserJsonDomainDocument} from '../browser/json-domain-document';
import {ServiceReadCache,type ReadCacheStore} from './service-read-cache';
export type ReadCacheOwner={environment:string;userId:string;organizationId:string;credentialId:string};
/** The services that keep offline snapshots. Each has its own document. */
export type ReadCacheService='gmail'|'google-calendar';
/** The identity one service's document is bound to: the verified local account and the service.
 * Two services of one account never share a document, so clearing, the entry bound and the size
 * bound of one cannot remove or evict what the other saved. */
export function readCacheIdentity(owner:ReadCacheOwner,service:ReadCacheService):string{
 return JSON.stringify([owner.environment,owner.userId,owner.organizationId,owner.credentialId,service]);
}
/** The identity of the document both services wrote before each had its own. */
export function sharedReadCacheIdentity(owner:ReadCacheOwner):string{
 return JSON.stringify([owner.environment,owner.userId,owner.organizationId,owner.credentialId]);
}
const sha256=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('');
async function platformStore(identity:string):Promise<ReadCacheStore>{
 const hash=await sha256(identity),slot='connected-read-cache:v1:'+hash;
 if(Capacitor.isNativePlatform())return {read:()=>secureConnectionStore.read(slot),compareExchange:async(before,value)=>(await secureConnectionStore.compareExchange(slot,before,value)).status};
 const document=new BrowserJsonDomainDocument('alpha.browser.'+slot);
 return {read:()=>document.readJson(),compareExchange:async(before,value)=>{let saved=false;await document.editJson(actual=>{if(JSON.stringify(actual)!==JSON.stringify(before))return actual;saved=true;return value;});return saved?'saved':'conflict';}};
}
/** Removes the document both services once shared. Its snapshots are not migrated: each service
 * reads its provider again. Best effort; a failure leaves it to the next open. */
export async function retireSharedReadCache({read,compareExchange}:ReadCacheStore):Promise<void>{
 for(let attempt=0;attempt<3;attempt++){const raw=await read();if(raw===null||raw===undefined||await compareExchange(raw,null)==='saved')return;}
}
const opened=new Map<string,Promise<ServiceReadCache>>(),retired=new Set<string>();
/** Cost: one SHA256 and one cached document handle per verified local account identity and service. */
export function serviceReadCache(owner:ReadCacheOwner,service:ReadCacheService):Promise<ServiceReadCache>{
 if(Object.values(owner).some(v=>typeof v!=='string'||!v||v.length>1024)||service!=='gmail'&&service!=='google-calendar')return Promise.reject(Error('Read cache owner is unavailable'));
 const identity=readCacheIdentity(owner,service);
 let result=opened.get(identity);if(result)return result;
 result=(async()=>{
  const shared=sharedReadCacheIdentity(owner);
  if(!retired.has(shared)){retired.add(shared);void platformStore(shared).then(retireSharedReadCache).catch(()=>{retired.delete(shared);});}
  return new ServiceReadCache(identity,await platformStore(identity));
 })();opened.set(identity,result);result.catch(()=>opened.delete(identity));return result;
}
