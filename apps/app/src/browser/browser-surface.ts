import {iconStyle} from '../icon-style';
import { WebPlugin } from '@capacitor/core';
import {bookmarkDocument,browsingSessionDocument} from './preference-documents';
import {normalizeBrowsing as normalize} from '../../../../.eliza/client-features/plugins/plugin-native-browser-surface/src/browsing-session.ts';
import {browserVisitTimes, historyOutsideInterval, type BrowserHistoryInterval, type SavedBrowserHistory} from './history';
import {PAGE_READ_BUDGET_MS, PAGE_TEXT_MAX_CHARS, type PageText} from './page-context';
import {readablePage, readablePlainText} from './readable-page';

function savedBrowserState(input: Partial<SavedBrowserHistory>): SavedBrowserHistory {
  const saved = normalize(input);
  const visitTimes = browserVisitTimes(saved.history, input?.visitTimes);
  return Object.keys(visitTimes).length ? {...saved, visitTimes} : saved;
}

type Tab = { session: string; id: string; private: boolean; frame: HTMLIFrameElement; container: HTMLDivElement; link: HTMLAnchorElement; status:HTMLParagraphElement; history: string[]; position: number; sequence: number; navigation: number; loading: boolean; committed:boolean; error:string };
/** Unprivileged web surfaces. Remote documents never receive the host bridge. */
export class BrowserSurface extends WebPlugin {
  private tabs = new Map<string, Tab>();
  private submittedBrowsingState: SavedBrowserHistory | undefined;
  private key(input: {session:string;id:string}) { return `${input.session}:${input.id}`; }
  private tab(input: {session:string;id:string}) { const tab=this.tabs.get(this.key(input)); if(!tab)throw Error('Reopen this tab.');return tab; }
  private address(raw:string) { const url=new URL(raw);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Enter an HTTP or HTTPS address.');return url.href; }
  private emit(tab:Tab) { tab.status.textContent=tab.error;tab.status.hidden=!tab.error;void this.notifyListeners('stateChanged',{session:tab.session,id:tab.id,private:tab.private,sequence:++tab.sequence,navigation:tab.navigation,url:tab.history[tab.position],title:tab.history[tab.position],loading:tab.loading,committed:tab.committed,error:tab.error,canBack:tab.position>0,canForward:tab.position<tab.history.length-1}); }
  async create(input:{session:string;id:string;private?:boolean}) {
    if(this.tabs.has(this.key(input)))return;
    const container=document.createElement('div'),frame=document.createElement('iframe'),link=document.createElement('a'),status=document.createElement('p');
    container.dataset.browserSurface=input.id;
    // The phone canvas keeps one layer for web pages under its assistant layers (template.html),
    // so the composer and the chat sheet are composited over the page without moving or resizing
    // it. Created once there and never moved: re-parenting a frame would reload its page.
    const host=document.querySelector<HTMLElement>('[data-alpha-browser-surfaces]');
    container.style.cssText=`position:${host?'absolute':'fixed'};display:none;z-index:20;background:var(--bg,#fff);overflow:hidden;flex-direction:column;pointer-events:auto;transform-origin:0 0`;
    frame.title='Website';frame.referrerPolicy='no-referrer';
    // Opaque origin also isolates a same-origin development page from local state.
    frame.setAttribute('sandbox','allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads');
    frame.style.cssText='width:100%;flex:1;min-height:0;border:0;background:white';
    link.textContent='Open in browser';const external=document.createElement('span');external.setAttribute('aria-hidden','true');external.dataset.alphaIcon='/icons/lucide/external-link.svg';Object.assign(external.style,iconStyle('external-link'),{width:'14px',height:'14px'});link.append(external);link.target='_blank';link.rel='noopener noreferrer';link.style.cssText='padding:8px 12px;color:var(--fg,#111);font:12px system-ui;text-align:right;display:flex;justify-content:flex-end;align-items:center;gap:6px';
    status.setAttribute('role','status');status.style.cssText='margin:0;padding:12px;font:14px/1.4 system-ui';status.hidden=true;
    container.append(link,status,frame);(host??document.body).append(container);
    const tab:Tab={session:input.session,id:input.id,private:!!input.private,frame,container,link,status,history:[],position:-1,sequence:0,navigation:0,loading:false,committed:false,error:''};
    this.tabs.set(this.key(input),tab);
  }
  private load(tab:Tab) {
    const url=tab.history[tab.position];tab.navigation++;tab.loading=true;tab.committed=false;tab.error='';tab.link.href=url;
    // A fresh surface binds callbacks to this host-requested navigation. A late
    // load from a retired frame must not commit the new address or a stopped tab.
    const frame=tab.frame.cloneNode(false) as HTMLIFrameElement;frame.src=url;
    frame.addEventListener('load',()=>{
      if(this.tabs.get(this.key(tab))!==tab||tab.frame!==frame)return;
      if(!tab.loading){tab.navigation++;tab.committed=false;tab.error='Page blocked';}
      else{tab.loading=false;tab.committed=true;}
      this.emit(tab);
    });
    const previous=tab.frame;tab.frame=frame;previous.replaceWith(frame);this.emit(tab);
  }
  async navigate(input:{session:string;id:string;url:string}) {const tab=this.tab(input),url=this.address(input.url);tab.history=tab.history.slice(0,tab.position+1);tab.history.push(url);tab.position++;this.load(tab);}
  async command(input:{session:string;id:string;command:string}) {
    const tab=this.tab(input);
    if(input.command==='back'&&tab.position>0){tab.position--;this.load(tab);}
    else if(input.command==='forward'&&tab.position<tab.history.length-1){tab.position++;this.load(tab);}
    else if(input.command==='reload'&&tab.position>=0)this.load(tab);
    else if(input.command==='stop'&&tab.loading){const previous=tab.frame,blank=previous.cloneNode(false) as HTMLIFrameElement;blank.src='about:blank';tab.frame=blank;previous.replaceWith(blank);tab.navigation++;tab.loading=false;tab.committed=false;tab.error='Stopped';this.emit(tab);}
  }
  /** Geometry is in viewport pixels, as for the native surface. Inside the scaled phone canvas the
   * page is placed in its host's pixels and drawn back at viewport size, so it lays out exactly as wide
   * and tall as presented. */
  async present(input:{session:string;id:string|null;x?:number;y?:number;width?:number;height?:number}) {
    for(const tab of this.tabs.values())if(tab.session===input.session){
      const visible=tab.id===input.id;tab.container.style.display=visible?'flex':'none';if(!visible)continue;
      const host=tab.container.parentElement,box=host&&host!==document.body?host.getBoundingClientRect():null;
      const scale=box&&host!.offsetWidth?box.width/host!.offsetWidth:1;
      Object.assign(tab.container.style,{left:`${((input.x||0)-(box?.left||0))/scale}px`,top:`${((input.y||0)-(box?.top||0))/scale}px`,width:`${input.width||0}px`,height:`${input.height||0}px`,transform:scale===1?'':`scale(${1/scale})`});
    }
  }
  async close(input:{session:string;id:string}) {const tab=this.tabs.get(this.key(input));tab?.container.remove();this.tabs.delete(this.key(input));}
  async bookmarks() {return {urls:await bookmarkDocument.read<string[]>(()=>[])};}
  async setBookmark(input:{url:string;saved:boolean}) {const url=this.address(input.url);return bookmarkDocument.edit<string[],{urls:string[]}>(()=>[],urls=>{const next=urls.filter(value=>value!==url);if(input.saved)next.unshift(url);urls.splice(0,urls.length,...next);return {urls:[...urls]};});}
  async share(input:{session:string;id:string;url:string;navigation:number}) {const tab=this.tab(input);if(!tab.committed||tab.loading||tab.error||document.hidden||tab.container.style.display==='none'||tab.navigation!==input.navigation||tab.history[tab.position]!==input.url)throw Error('The page changed. Share it again.');if(!navigator.share)throw Error('Sharing is unavailable in this browser. Use Copy text.');await navigator.share({url:input.url});}
  async browsingState() {
    const saved = savedBrowserState(await browsingSessionDocument.read<SavedBrowserHistory>(()=>normalize({})));
    this.submittedBrowsingState = saved;
    return saved;
  }
  async saveBrowsingState(input: Partial<SavedBrowserHistory> & {clearHistory?: BrowserHistoryInterval}) {
    const next = savedBrowserState(input), previous = this.submittedBrowsingState;
    const saved = await browsingSessionDocument.edit<SavedBrowserHistory, SavedBrowserHistory>(()=>normalize({}), state=>{
      let {history, visitTimes} = next;
      if (previous) {
        // Apply this renderer's changes to current stored history. A stale renderer
        // cannot write back visits another window removed from the shared document.
        const added = history.filter(url => !previous.history.includes(url) || previous.visitTimes?.[url] !== visitTimes?.[url]);
        const kept = state.history.filter(url => history.includes(url) || !previous.history.includes(url) || previous.visitTimes?.[url] !== state.visitTimes?.[url]);
        visitTimes = {...state.visitTimes, ...browserVisitTimes(added, visitTimes)};
        history = [...added, ...kept];
      }
      if (input.clearHistory) history = historyOutsideInterval(history, visitTimes, input.clearHistory);
      const persisted = savedBrowserState({...next, history, visitTimes});
      delete state.visitTimes;
      Object.assign(state, persisted);
      return persisted;
    });
    this.submittedBrowsingState = input.clearHistory ? saved : next;
    return saved;
  }
  /** Clear Alpha-owned tabs and history only. The embedding browser owns remote
   * cookies and site storage; sandboxing does not grant us authority to erase them. */
  async clearBrowsingData(input:{session:string}) {
    const closed:string[]=[];for(const [key,tab] of this.tabs)if(tab.session===input.session&&!tab.private){tab.container.remove();this.tabs.delete(key);closed.push(tab.id);}
    await browsingSessionDocument.edit<SavedBrowserHistory,void>(()=>normalize({}),state=>{delete state.visitTimes;Object.assign(state,normalize({}));});
    this.submittedBrowsingState = normalize({});
    return {closed};
  }
  async clearSiteData(_input:{session:string;id:string;url:string}): Promise<{site:string}> {throw Error('Clear website data in your browser settings.');}
  async downloads() {window.dispatchEvent(new CustomEvent('alpha:browser-open-view',{detail:'files'}));}
  /** Page reading plays agent audio only (no Web Speech); the voice facade stops that playback. */
  async cancelReading() {}
  /** The page text for agent turns (page-context.ts). The sandboxed frame cannot be read, so the
   * development server fetches a public copy (scripts/browser-page-dev-proxy.ts) without cookies
   * for each turn, given up with the turn's read budget; other web builds have no reader. */
  async pageText(input:{session:string;id:string}): Promise<PageText> {
    const tab=this.tab(input),url=tab.history[tab.position];
    if(tab.private)throw Error('Private tabs are not read');
    if(!tab.committed||tab.loading)return {url,textUnavailable:tab.error?'not readable':'loading'};
    if(!import.meta.env.DEV)return {url,textUnavailable:'not readable'};
    try {
      const response=await fetch('/__alpha/page-html',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url}),signal:AbortSignal.timeout(PAGE_READ_BUDGET_MS)});
      if(!response.ok)return {url,textUnavailable:'not readable'};
      const type=response.headers.get('content-type')?.split(';')[0].trim().toLowerCase(),source=await response.text();
      return {url,...(type==='text/plain'?readablePlainText(source,PAGE_TEXT_MAX_CHARS):readablePage(new DOMParser().parseFromString(source,'text/html'),PAGE_TEXT_MAX_CHARS))};
    } catch { return {url,textUnavailable:'not readable'}; }
  }
}
