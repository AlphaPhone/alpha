import {testMocksEnabled} from '../build-flags';
import {openRetainedDataNotice} from './retained-data-notice';
import {layoutBrowserDialog} from './dialog-layout';
import type {DomainRecovery,BrowserDomainDocument} from './domain-document';
let current:HTMLDialogElement|undefined;
/** Exact-byte download and explicitly confirmed, revision-checked reset. */
export function openDomainRecovery(domain:Pick<BrowserDomainDocument,'capture'|'reset'>,name:string,heading:string,description:string,signal?:AbortSignal,storage:'browser'|'device'='browser'){
 if(!testMocksEnabled){openRetainedDataNotice(heading,signal);return;}
 if(signal?.aborted||current?.open)return;
 const dialog=current=document.createElement('dialog');dialog.setAttribute('aria-label',heading);dialog.style.cssText='box-sizing:border-box;width:min(400px,94vw);max-height:85dvh;overflow:auto;padding:24px;border:0;border-radius:20px;background:var(--bg,#fff);color:var(--fg,#111);font:16px/1.5 system-ui';
 const previous=document.activeElement as HTMLElement|null,abort=new AbortController();let closed=false,confirming=false,busy=false,captured:DomainRecovery|undefined;
 const title=document.createElement('h2');title.textContent=heading;
 const text=document.createElement('p');text.textContent=description;
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent=`Reading saved ${name}…`;
 const button=(label:string)=>{const b=document.createElement('button');b.textContent=label;b.style.cssText='min-height:44px;margin:4px;padding:10px;font:inherit';return b;};
 const backup=button(`Download ${name} backup`),reset=button(`Reset ${storage==='browser'?'app':storage} ${name}`),close=button('Close recovery');backup.disabled=reset.disabled=true;
 const download=(raw:string,name:string)=>{
  if(busy||closed)return;
  const url=URL.createObjectURL(new Blob([raw],{type:'application/octet-stream'})),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);
  try{link.click();status.textContent='Downloading';}
  finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 };
 backup.onclick=()=>{if(captured?.raw!==null&&captured?.raw!==undefined)download(captured.raw,captured.format==='domain'?`Alpha-${name}-recovery.txt`:`Alpha-${name}-store-recovery.txt`);};
 reset.onclick=()=>{if(busy||closed||!captured)return;if(!confirming){confirming=true;reset.textContent=`Confirm ${name} reset`;status.textContent=`Reset ${name}? Can’t be undone.`;return;}busy=true;reset.disabled=true;
  void (async()=>{try{if(document.hidden)throw Error('Reset cancelled.');await domain.reset(captured!,abort.signal);if(!closed){status.textContent=`${name[0].toUpperCase()+name.slice(1)} reset. Reloading…`;location.reload();}}catch(error){if(!closed){status.textContent=error instanceof Error?error.message:`Reset could not be confirmed. Reload to inspect the ${name}.`;confirming=false;reset.textContent=`Reset ${storage==='browser'?'app':storage} ${name}`;reset.disabled=false;}}finally{busy=false;}})();
 };
 const trapFocus=(event:KeyboardEvent)=>{if(event.key!=='Tab')return;const items=Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]')).filter(item=>item.getClientRects().length);const first=items[0],last=items.at(-1);if(!first||!last)return;if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}};
 dialog.addEventListener('keydown',trapFocus);
 const retireEvents=['pagehide','launcher-home','alpha:device-state','alpha:dev-incoming-call'];
 const dispose=()=>{if(closed)return;closed=true;abort.abort();signal?.removeEventListener('abort',dispose);dialog.remove();if(current===dialog)current=undefined;window.removeEventListener('alpha-back',back,true);for(const event of retireEvents)window.removeEventListener(event,dispose,true);document.removeEventListener('visibilitychange',visibility);previous?.focus();};
 signal?.addEventListener('abort',dispose,{once:true});
 const back=(event:Event)=>{event.preventDefault();event.stopImmediatePropagation();dispose();},visibility=()=>{if(document.hidden)dispose();};close.onclick=dispose;dialog.oncancel=e=>{e.preventDefault();dispose();};window.addEventListener('alpha-back',back,true);for(const event of retireEvents)window.addEventListener(event,dispose,true);document.addEventListener('visibilitychange',visibility);dialog.append(title,text);if(storage==='browser')dialog.append(backup);dialog.append(reset,status,close);layoutBrowserDialog(dialog,[close]);(document.querySelector('.os')||document.body).append(dialog);dialog.showModal();close.focus();
 void domain.capture(abort.signal).then(value=>{if(closed)return;captured=value;backup.disabled=value.raw===null;reset.disabled=value.raw===null&&!value.snapshot;status.textContent=value.format==='unrecognized'?'Needs recovery':value.raw===null?`No saved ${storage} ${name}.`:'Nothing deleted until you confirm';},()=>{if(!closed)status.textContent='Unreadable';});
}
