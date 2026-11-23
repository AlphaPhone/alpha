import {cachedDevicePreferences,readDevicePreferences} from '../browser/device-preferences';
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
/** With a capture of the same tab and revision in hand, a turn waits at most this long for a fresher one. */
export const BROWSER_PAGE_FRESH_WAIT_MS=250;
/** A capture older than this is not used for a turn. */
export const BROWSER_PAGE_CACHE_MAX_AGE_MS=10*60_000;

const cacheKey=(tab:ObservedBrowserTab)=>`${tab.id}\n${tab.revision}`;
/**
 * Browser's captures of the open page, so a chat turn rarely waits on a read: Browser captures a
 * page once it has settled and again when the assistant opens over it, and a turn joins a read
 * already running. Captures stay in memory on the phone; only a turn sends one.
 */
export class BrowserPageCache {
 private entry:{key:string;page:ClientBrowserPageObservation;at:number}|undefined;
 private running:{key:string;promise:Promise<ClientBrowserPageObservation|undefined>;controller:AbortController}|undefined;
 constructor(private readonly read:BrowserPageSource,private readonly now:()=>number=Date.now){}
 clear(){this.entry=undefined;this.running?.controller.abort();this.running=undefined;}
 /** The kept capture of this tab and revision, when recent enough. */
 cached(tab:ObservedBrowserTab):ClientBrowserPageObservation|undefined{
  const entry=this.entry;
  return entry&&entry.key===cacheKey(tab)&&this.now()-entry.at<=BROWSER_PAGE_CACHE_MAX_AGE_MS?entry.page:undefined;
 }
 /** Age in milliseconds of the kept capture of this tab and revision, or undefined. */
 age(tab:ObservedBrowserTab):number|undefined{const entry=this.entry;return entry?.key===cacheKey(tab)?this.now()-entry.at:undefined;}
 /** Reads the page of this tab now, joining a read already running for it, and keeps the result. */
 refresh(tab:ObservedBrowserTab):Promise<ClientBrowserPageObservation|undefined>{
  const key=cacheKey(tab);
  if(this.running?.key===key)return this.running.promise;
  this.running?.controller.abort();
  const controller=new AbortController();
  const promise=this.read(tab,controller.signal).then(page=>{
   if(page&&page.tabId===tab.id&&page.revision===tab.revision)this.entry={key,page,at:this.now()};
   return page;
  },()=>undefined).finally(()=>{if(this.running?.promise===promise)this.running=undefined;});
  this.running={key,promise,controller};
  return promise;
 }
 /**
  * The page for a chat turn: a fresh read when it lands within `freshMs`, else the kept capture
  * of the same tab and revision. With none kept the turn waits on the read (its own budget bounds it).
  */
 async forTurn(tab:ObservedBrowserTab,signal:AbortSignal,freshMs=BROWSER_PAGE_FRESH_WAIT_MS):Promise<ClientBrowserPageObservation|undefined>{
  signal.throwIfAborted();
  const kept=this.cached(tab),fresh=this.refresh(tab);
  if(!kept)return fresh;
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([fresh,new Promise<undefined>(resolve=>{timer=setTimeout(()=>resolve(undefined),freshMs);})])??kept;}
  finally{if(timer!==undefined)clearTimeout(timer);}
 }
}

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

/** The setting for this turn: the cached choice, or the saved one before the cache has loaded.
 * Unreadable preferences share nothing. */
async function browserPageAllowed(signal:AbortSignal):Promise<boolean>{
 const cached=cachedDevicePreferences();
 if(cached)return cached.agentBrowserPageEnabled===true;
 try{return (await readDevicePreferences(signal)).agentBrowserPageEnabled===true;}catch{signal.throwIfAborted();return false;}
}

export interface BrowserPageContextPorts {
 /** Whether the owner's setting allows this turn's page; checked before and after the read. */
 enabled(signal:AbortSignal):boolean|Promise<boolean>;
 source():BrowserPageSource|undefined;
 waitMs:number;
}
const defaultPorts:BrowserPageContextPorts={enabled:browserPageAllowed,source:()=>source,waitMs:BROWSER_PAGE_WAIT_MS};

/**
 * The page open in Browser for this turn, bound to the turn's observation by tab id and
 * revision. Never throws for the page itself: a refused, slow, changed or invalid read sends
 * the turn without it. The caller's own cancellation still aborts.
 */
export async function browserPageForTurn(context:ContextEnvelope,signal:AbortSignal,ports:BrowserPageContextPorts=defaultPorts):Promise<ClientBrowserPageObservation|undefined>{
 signal.throwIfAborted();
 const tab=observedBrowserTab(context),read=ports.source();
 if(!tab||!read||!await ports.enabled(signal))return undefined;
 const controller=new AbortController(),cancel=()=>controller.abort(signal.reason);
 signal.addEventListener('abort',cancel,{once:true});
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const page=await Promise.race([
   read(tab,controller.signal).catch(()=>undefined),
   new Promise<undefined>(resolve=>{timer=setTimeout(()=>{controller.abort(new DOMException('Browser page read timed out','TimeoutError'));resolve(undefined);},ports.waitMs);}),
  ]);
  signal.throwIfAborted();
  if(!page||!await ports.enabled(signal))return undefined;
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
