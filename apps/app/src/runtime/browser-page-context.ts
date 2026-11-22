import {cachedDevicePreferences} from '../browser/device-preferences';
import {parseClientBrowserPageObservation,CLIENT_BROWSER_PAGE_TITLE_MAX,CLIENT_BROWSER_PAGE_URL_MAX,type ClientBrowserPageObservation} from '../../../../.eliza/client-features/packages/contracts/src/client-turn-observation.ts';
import type {ContextEnvelope} from './alpha-client';

/** The address the agent may see: HTTPS, no credentials, no fragment. */
export function pageAddress(value:unknown):string|undefined{
  if(typeof value!=='string')return undefined;
  try{const url=new URL(value);if(url.protocol!=='https:'||!url.hostname||url.username||url.password)return undefined;url.hash='';return url.href.length<=CLIENT_BROWSER_PAGE_URL_MAX?url.href:undefined;}catch{return undefined;}
}
/** A page title as one bounded line. */
export function agentPageTitle(value:unknown):string{
  const line=String(value??'').replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g,' ').replace(/\s+/g,' ').trim().slice(0,CLIENT_BROWSER_PAGE_TITLE_MAX);
  return line.replace(/[\uD800-\uDBFF]$/,'');
}

/** The Browser tab a turn observed: the observation's selected `browser-tab`. */
export type ObservedBrowserTab = {id:string;revision:string};
/**
 * Reads the page of the observed tab, or undefined when that tab is not the one Browser shows
 * now, is private, or has no loaded public page. Browser owns the tab state and the native read.
 */
export type BrowserPageSource = (tab:ObservedBrowserTab,signal:AbortSignal)=>Promise<ClientBrowserPageObservation|undefined>;

/** A chat turn waits at most this long for the page; without it the turn goes without the page. */
export const BROWSER_PAGE_WAIT_MS=1_200;

let source:BrowserPageSource|undefined;
/** Browser registers its reader while it is installed; the returned function removes it. */
export function registerBrowserPageSource(next:BrowserPageSource):()=>void {
 source=next;
 return ()=>{if(source===next)source=undefined;};
}

/** True while the owner lets Alpha share the open Browser page (Settings → Privacy). */
export const browserPageEnabled=()=>cachedDevicePreferences()?.agentBrowserPageEnabled===true;

/** The selected tab of a non-sensitive Browser observation, or undefined. */
export function observedBrowserTab(context:ContextEnvelope):ObservedBrowserTab|undefined {
 const selected=context.selectedObject;
 if(context.sensitive||context.view!=='browser'||selected?.kind!=='browser-tab'||typeof selected.revision!=='string')return undefined;
 return {id:selected.id,revision:selected.revision};
}

export interface BrowserPageContextPorts {
 enabled():boolean;
 source():BrowserPageSource|undefined;
 waitMs:number;
}
const defaultPorts:BrowserPageContextPorts={enabled:browserPageEnabled,source:()=>source,waitMs:BROWSER_PAGE_WAIT_MS};

/**
 * The page open in Browser for this turn, bound to the turn's observation by tab id and
 * revision. Never throws for the page itself: a refused, slow, changed or invalid read sends
 * the turn without it. The caller's own cancellation still aborts.
 */
export async function browserPageForTurn(context:ContextEnvelope,signal:AbortSignal,ports:BrowserPageContextPorts=defaultPorts):Promise<ClientBrowserPageObservation|undefined>{
 signal.throwIfAborted();
 const tab=observedBrowserTab(context),read=ports.source();
 if(!tab||!read||!ports.enabled())return undefined;
 const controller=new AbortController(),cancel=()=>controller.abort(signal.reason);
 signal.addEventListener('abort',cancel,{once:true});
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const page=await Promise.race([
   read(tab,controller.signal).catch(()=>undefined),
   new Promise<undefined>(resolve=>{timer=setTimeout(()=>{controller.abort(new DOMException('Browser page read timed out','TimeoutError'));resolve(undefined);},ports.waitMs);}),
  ]);
  signal.throwIfAborted();
  if(!page||!ports.enabled())return undefined;
  const parsed=parseClientBrowserPageObservation(page);
  return parsed.tabId===tab.id&&parsed.revision===tab.revision?parsed:undefined;
 }catch(error){
  signal.throwIfAborted();
  return undefined;
 }finally{
  if(timer!==undefined)clearTimeout(timer);
  signal.removeEventListener('abort',cancel);
 }
}
