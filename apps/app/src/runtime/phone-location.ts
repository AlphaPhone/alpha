import {Capacitor} from '@capacitor/core';
import {cachedDevicePreferences} from '../browser/device-preferences';
import {registerPlugin} from '../platform-plugins';
import {parseClientLocationObservation,type ClientLocationObservation} from '../../../../.eliza/client-features/packages/contracts/src/client-turn-observation.ts';

/** The slice of the native ElizaLocation bridge this reader uses. */
export interface PhoneLocationBridge {
 checkPermissions():Promise<{location:'granted'|'denied'|'prompt'}>;
 getCurrentPosition(options:{accuracy:'high'|'medium';maxAge:number;timeout:number}):Promise<{coords:{latitude:number;longitude:number;accuracy?:number;timestamp:number}}>;
}
export interface PhoneLocationPorts {
 /** True while Alpha is allowed to share the native phone location. */
 enabled():boolean;
 bridge:PhoneLocationBridge;
 now():number;
}
/** A fix this recent is reused without asking the platform again. */
export const PHONE_LOCATION_REUSE_MS=60_000;
/** The platform may answer from a fix this old, which is immediate. */
export const PHONE_LOCATION_PLATFORM_MAX_AGE_MS=5*60_000;
/** A chat turn waits at most this long for a fresh fix. */
export const PHONE_LOCATION_WAIT_MS=1_500;
/** Without a fresh fix, an earlier one is still reported up to this age. */
export const PHONE_LOCATION_STALE_MS=30*60_000;

function observation(coords:{latitude:number;longitude:number;accuracy?:number;timestamp:number}):ClientLocationObservation|undefined {
 try{
  // About a meter of precision; nothing more is meaningful for a phone fix.
  const round=(value:number)=>Math.round(value*1e5)/1e5;
  const accuracy=typeof coords.accuracy==='number'&&Number.isFinite(coords.accuracy)&&coords.accuracy>=0?Math.round(coords.accuracy):undefined;
  return parseClientLocationObservation({latitude:round(coords.latitude),longitude:round(coords.longitude),...(accuracy===undefined?{}:{accuracyMeters:accuracy}),capturedAt:Math.round(coords.timestamp)});
 }catch{return undefined;}
}

/**
 * Cache the last fix for the resident agent while Alpha's setting and Android's
 * permission allow it. Concurrent turns and warm-up share the location request.
 */
export class PhoneLocationReader {
 private generation=0;
 private last:ClientLocationObservation|undefined;
 private pending:Promise<ClientLocationObservation|undefined>|undefined;
 constructor(private readonly ports:PhoneLocationPorts){}
 async read(signal:AbortSignal):Promise<ClientLocationObservation|undefined>{
  signal.throwIfAborted();
  if(!this.ports.enabled()){this.clear();return undefined;}
  const generation=this.generation;
  let granted=false;
  try{granted=(await this.ports.bridge.checkPermissions()).location==='granted';}catch{granted=false;}
  signal.throwIfAborted();
  if(generation!==this.generation)return undefined;
  if(!granted||!this.ports.enabled()){this.clear();return undefined;}
  const now=this.ports.now();
  if(this.last&&now-this.last.capturedAt<PHONE_LOCATION_REUSE_MS)return this.last;
  const pending=this.pending??=this.ports.bridge.getCurrentPosition({accuracy:'high',maxAge:PHONE_LOCATION_PLATFORM_MAX_AGE_MS,timeout:10_000})
   .then(result=>{if(generation!==this.generation||!this.ports.enabled())return undefined;const fix=observation(result.coords);if(fix&&(!this.last||fix.capturedAt>=this.last.capturedAt))this.last=fix;return fix;},()=>undefined)
   .finally(()=>{if(this.pending===pending)this.pending=undefined;});
  let timer:ReturnType<typeof setTimeout>|undefined,abort:(()=>void)|undefined;
  try{
   await Promise.race([pending,new Promise<void>(resolve=>{timer=setTimeout(resolve,PHONE_LOCATION_WAIT_MS);abort=()=>resolve();signal.addEventListener('abort',abort,{once:true});})]);
  }finally{if(timer!==undefined)clearTimeout(timer);if(abort)signal.removeEventListener('abort',abort);}
  signal.throwIfAborted();
  if(generation!==this.generation||!this.ports.enabled())return undefined;
  const last=this.last;
  return last&&this.ports.now()-last.capturedAt<=PHONE_LOCATION_STALE_MS?last:undefined;
 }
 clear(){this.generation++;this.last=undefined;this.pending=undefined;}
}

let shared:PhoneLocationReader|undefined;
export const phoneLocationEnabled=()=>Capacitor.isNativePlatform()
 && Capacitor.isPluginAvailable('ElizaLocation')
 && cachedDevicePreferences()?.agentLocationEnabled===true;

/** The app's one reader over the native ElizaLocation plugin. */
export function phoneLocationReader():PhoneLocationReader {
 if(!shared){
  shared=new PhoneLocationReader({enabled:phoneLocationEnabled,bridge:registerPlugin<PhoneLocationBridge>('ElizaLocation'),now:Date.now});
  window.addEventListener('alpha:device-settings',()=>{if(!phoneLocationEnabled())shared?.clear();});
 }
 return shared;
}

export function clearPhoneLocation(){shared?.clear();}
