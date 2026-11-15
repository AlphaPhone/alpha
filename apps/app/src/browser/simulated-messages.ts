import {devSurfacesEnabled} from '../build-flags';
import {registerPlugin} from '../platform-plugins';
import {reviewMailAttachment} from '../runtime/inbox-attachment';
type Bag=Record<string,any>;
const attachments=registerPlugin<any>('AlphaMailAttachments');
const recipient=(state:Bag)=>state.thread||(typeof state.compose==='string'?state.compose:null);
/** Local message copies never enter the SMS/provider transport. */
export function installSimulatedMessages(view:Bag){
 if(!devSurfacesEnabled)return ()=>{};
 const render=view.render,leave=view.onLeave,back=view.back;let epoch=0,busy=false,capturing=false,captureDeparture=false,activeApi:Bag|undefined;
 const retirePage=()=>{epoch++;busy=false;capturing=false;captureDeparture=false;void attachments.cancel();if(activeApi?.isActive())activeApi.set({browserAttachmentRevision:crypto.randomUUID()});};
 const hidden=()=>{if(document.hidden)retirePage();};
 window.addEventListener('pagehide',retirePage);window.addEventListener('alpha:device-state',retirePage);document.addEventListener('visibilitychange',hidden);
 const retire=(api:Bag)=>{epoch++;busy=false;capturing=false;captureDeparture=false;void attachments.cancel();api.set({browserAttachment:null,browserDraftOwner:null});};
 view.onLeave=(api:Bag)=>{if(capturing&&captureDeparture)captureDeparture=false;else retire(api);return leave?.(api);};
 view.back=(state:Bag,api:Bag)=>{if(!state.tray)retire(api);return back?.(state,api);};
 view.render=(input:Bag,api:Bag)=>{
  let state=input;const pid=recipient(state);
  if(pid&&state.browserDraftOwner!==pid){
   const draft=state.localDrafts?.[pid],patch={browserDraftOwner:pid,text:draft?.text||'',browserAttachment:draft?.file?{pid,file:draft.file}:null};
   state={...state,...patch};queueMicrotask(()=>{if(api.isActive()&&recipient(api.get('messages'))===pid&&api.get('messages').browserDraftOwner!==pid)api.set(patch);});
  }
  const out=render(state,api);if(!out.t||!pid)return out;activeApi=api;
  const current=()=>api.get('messages'),file=state.browserAttachment?.pid===pid?state.browserAttachment.file:null;
  const repaint=()=>api.set({browserAttachmentRevision:crypto.randomUUID()});
  const save=(patch:Bag)=>{const next={...current(),...patch};const stored=Object.fromEntries(view.persist.map((key:string)=>[key,next[key]]));if(JSON.stringify(stored).length>12_000_000)throw Error('Messages storage is full. Remove older conversations before saving.');api.set(patch);};
  const draft=(text:string,selected:Bag|null)=>({localDrafts:{...current().localDrafts,[pid]:{text,file:selected}}});
  const fail=(error:unknown)=>api.toast(error instanceof Error?error.message:'Could not save. Your draft is still here.');
  const base=out.t;
  const receive=async(selected:File,valid:()=>boolean)=>{
   if(selected.size>5*1024*1024)throw Error('Choose a file up to 5 MiB.');
   const dataBase64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(selected);});
   const checked=await reviewMailAttachment({name:selected.name,mimeType:selected.type,dataBase64});if(!valid())return;
   const value={...checked,dataBase64};api.set({browserAttachment:{pid,file:value}});save(draft(current().text||'',value));
  };
  out.t={...base,local:true,busy,tray:false,
   onText:(event:Event)=>{const text=(event.target as HTMLInputElement).value;api.set({text});try{save(draft(text,current().browserAttachment?.pid===pid?current().browserAttachment.file:null));}catch(error){fail(error);}},
   attachFile:async()=>{if(busy)return;busy=true;const ticket=epoch;repaint();
    const valid=()=>ticket===epoch&&api.isActive()&&!document.hidden&&recipient(current())===pid;
    try{const files:File[]=await api.pickAttachmentFiles(1,valid);if(valid()&&files.length)await receive(files[0],valid);}
    catch(error){if(valid())fail(error);}finally{if(ticket===epoch){busy=false;repaint();}}
   },
   camera:async()=>{if(busy)return;busy=true;capturing=true;captureDeparture=true;const ticket=epoch;repaint();
    const same=()=>ticket===epoch&&!document.hidden&&recipient(current())===pid;
    try{const photo:File|undefined=await api.captureAttachmentPhoto(same);if(photo&&same()&&api.isActive())await receive(photo,()=>same()&&api.isActive());}
    catch(error){if(same())fail(error);}finally{if(ticket===epoch){capturing=false;captureDeparture=false;busy=false;repaint();}}
   },
   send:()=>{if(busy)return;const s=current(),selected=s.browserAttachment?.pid===pid?s.browserAttachment.file:null;if(!selected&&!s.localDrafts?.[pid]){base.send();return;}
    const text=String(s.text||'').trim();if(!selected&&!text)return;const threads={...s.threads},drafts={...s.localDrafts};delete drafts[pid];const k=Math.max(api.now.getHours()*60+api.now.getMinutes()-1,...Object.values(s.threads as Bag).flatMap((rows:any)=>rows.map((m:Bag)=>Number(m.k)||0)))+1;
    const messages=[...(selected?[{id:crypto.randomUUID(),k,me:true,file:selected.name,size:selected.size+' bytes',browserAttachment:selected}]:[]),...(text?[{id:crypto.randomUUID(),k,me:true,text}]:[])];threads[pid]=[...(threads[pid]||[]),...messages];
    try{save({threads,localDrafts:drafts,text:'',browserAttachment:null,tray:false});}catch(error){fail(error);}
   }
  };
  out.t.onKey=(event:KeyboardEvent)=>{if(event.key==='Enter'){event.preventDefault();out.t.send();}};
  if(file){out.t.hasAtts=true;out.t.hasSmart=false;out.t.sendCss='background:var(--acc);color:#fff';out.t.atts=[...base.atts,{name:file.name,hasImage:file.mimeType.startsWith('image/'),image:file.mimeType.startsWith('image/')?'data:'+file.mimeType+';base64,'+file.dataBase64:'',rm:()=>{api.set({browserAttachment:null});try{save(draft(current().text||'',null));}catch(error){fail(error);}}}];}
  out.t.bubbles=base.bubbles.map((bubble:Bag,index:number)=>{const stored=state.threads[pid]?.[index]?.browserAttachment;if(!stored)return bubble;const open=()=>void attachments.openReviewed({...stored,reviewed:true}).catch(fail);return stored.mimeType.startsWith('image/')?{...bubble,isFile:false,isPhoto:true,photoCss:'background:url("data:'+stored.mimeType+';base64,'+stored.dataBase64+'") center/cover;border-radius:20px',openPhoto:open}:{...bubble,openFile:open};});
  return out;
 };
 return ()=>{activeApi=undefined;retirePage();window.removeEventListener('pagehide',retirePage);window.removeEventListener('alpha:device-state',retirePage);document.removeEventListener('visibilitychange',hidden);};
}
