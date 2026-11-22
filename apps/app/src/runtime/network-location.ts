import {Capacitor} from '@capacitor/core';
import {registerPlugin} from '../platform-plugins';

/** AlphaNetworkLocationPlugin: one Wi-Fi/cell lookup through BeaconDB, only when asked. */
export interface NetworkLocationBridge {
 locate(options:{unchangedFrom?:string}):Promise<{latitude:number;longitude:number;accuracy:number;timestamp:number;fingerprint:string}|{unchanged:true;fingerprint:string}>;
}
export interface NetworkFix {latitude:number;longitude:number;accuracyMeters:number;timestamp:number}
export interface NetworkLocationPorts {available():boolean;bridge:NetworkLocationBridge;now():number}

/** An answer is reused for this long without asking again. */
export const NETWORK_FIX_REUSE_MS=15*60_000;
/** After that, the same visible networks keep the earlier answer for up to this long. */
export const NETWORK_FIX_UNCHANGED_MS=60*60_000;
/** A failed lookup is not retried sooner than this. */
export const NETWORK_FIX_RETRY_MS=2*60_000;

/**
 * Network position for when GPS has no fix: indoors, or an image without a network location
 * provider. Lookups happen only when a caller needs a position now (a Maps action, a locate card,
 * the agent's connection warm-up), are shared while one is in flight, and are cached, so the
 * service sees at most a few requests an hour from a phone that stays put.
 */
export class NetworkLocationClient {
 private last:NetworkFix|undefined;
 private fingerprint:string|undefined;
 private checkedAt=Number.NEGATIVE_INFINITY;
 private retryAfter=Number.NEGATIVE_INFINITY;
 private pending:Promise<NetworkFix|undefined>|undefined;
 private generation=0;
 constructor(private readonly ports:NetworkLocationPorts){}
 /** The last answer while it may still stand for the phone's position; never a lookup. */
 cached(now=this.ports.now()):NetworkFix|undefined{
  const fix=this.last;
  return fix&&now-fix.timestamp<=NETWORK_FIX_UNCHANGED_MS?fix:undefined;
 }
 /** A position now: the cached one while recent, else one shared lookup. */
 locate():Promise<NetworkFix|undefined>{
  if(!this.ports.available())return Promise.resolve(undefined);
  const now=this.ports.now();
  if(this.last&&now-this.checkedAt<NETWORK_FIX_REUSE_MS)return Promise.resolve(this.cached(now));
  if(now<this.retryAfter)return Promise.resolve(this.cached(now));
  const generation=this.generation;
  const pending=this.pending??=this.ports.bridge.locate(this.last&&this.fingerprint?{unchangedFrom:this.fingerprint}:{}).then(answer=>{
   if(generation!==this.generation)return undefined;
   const at=this.ports.now();this.checkedAt=at;
   if('unchanged' in answer){if(this.last)this.last={...this.last,timestamp:at};return this.cached(at);}
   const {latitude,longitude,accuracy,timestamp}=answer;
   if(![latitude,longitude,accuracy,timestamp].every(Number.isFinite)||Math.abs(latitude)>90||Math.abs(longitude)>180||accuracy<=0){this.retryAfter=at+NETWORK_FIX_RETRY_MS;return this.cached(at);}
   this.last={latitude,longitude,accuracyMeters:accuracy,timestamp};this.fingerprint=answer.fingerprint;
   return this.last;
  },()=>{if(generation===this.generation)this.retryAfter=this.ports.now()+NETWORK_FIX_RETRY_MS;return this.cached();})
   .finally(()=>{if(this.pending===pending)this.pending=undefined;});
  return pending;
 }
 clear(){this.generation++;this.last=undefined;this.fingerprint=undefined;this.checkedAt=Number.NEGATIVE_INFINITY;this.retryAfter=Number.NEGATIVE_INFINITY;this.pending=undefined;}
}

let shared:NetworkLocationClient|undefined;
/** The app's one client over AlphaNetworkLocationPlugin. */
export function networkLocation():NetworkLocationClient {
 return shared??=new NetworkLocationClient({available:()=>Capacitor.isNativePlatform()&&Capacitor.isPluginAvailable('AlphaNetworkLocation'),bridge:registerPlugin<NetworkLocationBridge>('AlphaNetworkLocation'),now:Date.now});
}
