import {Capacitor} from '@capacitor/core';
import {secureConnectionStore} from './native-connection';
import {BrowserJsonDomainDocument} from '../browser/json-domain-document';
import {ServiceReadCache,type ReadCacheStore} from './service-read-cache';
import {sha256Hex} from '../lib/hash.ts';
export type ReadCacheOwner={environment:string;userId:string;organizationId:string;credentialId:string};
/** A service that keeps its offline snapshots in a document of its own, apart from the account document. */
export type ReadCacheService='gmail';
/** The identity a document is bound to: the verified local account, and the service for a service's
 * own document. Mail never shares the account document, so clearing mail, its entry bound and its
 * size bound cannot remove or evict what Calendar saved there, and the reverse. */
export function readCacheIdentity(owner:ReadCacheOwner,service?:ReadCacheService):string{
 const account=[owner.environment,owner.userId,owner.organizationId,owner.credentialId];
 return JSON.stringify(service?[...account,service]:account);
}
async function platformStore(identity:string):Promise<ReadCacheStore>{
 const slot='connected-read-cache:v1:'+await sha256Hex(identity);
 if(Capacitor.isNativePlatform())return {read:()=>secureConnectionStore.read(slot),compareExchange:async(before,value)=>(await secureConnectionStore.compareExchange(slot,before,value)).status};
 const browserDocument=new BrowserJsonDomainDocument('alpha.browser.'+slot);
 return {read:()=>browserDocument.readJson(),compareExchange:async(before,value)=>{let saved=false;await browserDocument.editJson(actual=>{if(JSON.stringify(actual)!==JSON.stringify(before))return actual;saved=true;return value;});return saved?'saved':'conflict';}};
}
const opened=new Map<string,Promise<ServiceReadCache>>();
/** Cost: one SHA256 and one cached document handle per verified local account identity and document. */
export function serviceReadCache(owner:ReadCacheOwner,service?:ReadCacheService):Promise<ServiceReadCache>{
 if(Object.values(owner).some(v=>typeof v!=='string'||!v||v.length>1024)||service!==undefined&&service!=='gmail')return Promise.reject(Error('Read cache owner is unavailable'));
 const identity=readCacheIdentity(owner,service);
 let result=opened.get(identity);
 if(!result){
  result=(async()=>new ServiceReadCache(identity,await platformStore(identity)))();
  opened.set(identity,result);result.catch(()=>opened.delete(identity));
 }
 return result;
}
