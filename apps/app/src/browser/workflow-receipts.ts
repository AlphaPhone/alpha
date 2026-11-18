import {layoutBrowserDialog} from './dialog-layout';
import {noticeActionBlocked} from './notice-action';
import {abortError} from '../lib/abort';
import {reviewMailAttachment,type MailAttachment} from '../runtime/inbox-attachment';
type Bag=Record<string,any>;
export type ReceiptInput={mailId:string;sent:boolean;index:number;name:string;mimeType:string;sha256:string};
const state=(api:Bag,name:string)=>({...api.get(name),...JSON.parse(localStorage.getItem('alpha.dev.app.'+name)||'{}')});
export async function receiptAttachment(input:ReceiptInput,api:Bag,signal:AbortSignal):Promise<MailAttachment>{
 signal.throwIfAborted();const get=()=>{const rows=state(api,'inbox')[input.sent?'sent':'mails']||[],matches=rows.filter((mail:Bag)=>String(mail.id)===input.mailId&&!mail.del);if(matches.length!==1)return;return matches[0].atts?.[input.index];};
 const file=structuredClone(get());if(!file?.browserAttachment)throw Error('The selected receipt is no longer in Inbox. Choose it again.');
 const checked=await reviewMailAttachment(file);signal.throwIfAborted();if(JSON.stringify(get())!==JSON.stringify(file)||checked.sha256!==input.sha256||file.name!==input.name||file.mimeType!==input.mimeType)throw Error('The receipt attachment changed. Choose it again.');
 return {name:file.name,mimeType:file.mimeType,dataBase64:file.dataBase64};
}
export function requestWorkflowReceipt(api:Bag,signal:AbortSignal,mailId?:string|number):Promise<ReceiptInput>{
 signal.throwIfAborted();return new Promise((resolve,reject)=>{
 const inbox=state(api,'inbox'),choices:({file:MailAttachment;mail:Bag;sent:boolean;index:number})[]=[];
 for(const sent of [false,true])for(const mail of inbox[sent?'sent':'mails']||[])for(const [index,file] of (mail.atts||[]).entries())if(!mail.del&&file.browserAttachment&&(mailId===undefined||!sent&&String(mail.id)===String(mailId)))choices.push({file,mail,sent,index});
 const previous=document.activeElement as HTMLElement|null,dialog=document.createElement('dialog');dialog.setAttribute('aria-label','Workflow receipt');dialog.style.cssText='box-sizing:border-box;width:min(380px,92vw);max-height:85dvh;overflow:auto;border:0;border-radius:20px;padding:24px;background:var(--bg,#fff);color:var(--fg,#111);font:16px/1.5 system-ui';
 const shell=document.querySelector('.os');if(shell){const theme=getComputedStyle(shell);for(const name of ['--bg','--fg','--s2'])dialog.style.setProperty(name,theme.getPropertyValue(name));}
 const title=document.createElement('h2');title.textContent='Workflow receipt';const info=document.createElement('p');info.textContent=choices.length?'Pick attachment':'Attachment needed';dialog.append(title,info);
 const field=(name:string,input:HTMLElement)=>{input.setAttribute('aria-label',name);const label=document.createElement('label');label.textContent=name;label.style.cssText='display:grid;gap:6px;margin:12px 0';input.style.cssText='box-sizing:border-box;width:100%;padding:10px;border:1px solid #999;border-radius:10px;font:inherit;color:inherit;background:var(--bg,#fff)';label.append(input);dialog.append(label);};
 const select=document.createElement('select');select.add(new Option('Choose attachment',''));choices.forEach((choice,index)=>select.add(new Option(choice.file.name+' · '+choice.mail.subj,String(index))));field('Receipt attachment',select);
 const status=document.createElement('p');status.setAttribute('role','status');const use=document.createElement('button');use.textContent='Use receipt';use.disabled=true;const cancel=document.createElement('button');cancel.textContent='Cancel run';for(const button of [use,cancel])button.style.cssText='min-height:44px;padding:10px 14px;margin:4px;border:1px solid #ccc;border-radius:10px;font:inherit;color:inherit;background:var(--s2,#f3f3f3)';dialog.append(status,use,cancel);
 let settled=false,busy=false;const valid=()=>select.value!=='';const update=()=>use.disabled=busy||!valid();select.addEventListener('input',update);
 const finish=(value?:ReceiptInput)=>{if(settled)return;settled=true;signal.removeEventListener('abort',close);window.removeEventListener('alpha-back',back,true);for(const event of events)window.removeEventListener(event,close);document.removeEventListener('visibilitychange',hidden);dialog.close();dialog.remove();if(previous?.isConnected&&!signal.aborted)previous.focus();value?resolve(value):reject(abortError('Receipt input cancelled'));};
 const close=()=>finish(),hidden=()=>{if(document.hidden)close();},back=(event:Event)=>{event.preventDefault();event.stopImmediatePropagation();close();},events=['pagehide','alpha:device-state','launcher-home','alpha:dev-incoming-call'];
 use.onclick=async()=>{if(busy||!valid())return;busy=true;update();select.disabled=true;try{const choice=choices[Number(select.value)],checked=await reviewMailAttachment(choice.file);const result:ReceiptInput={mailId:String(choice.mail.id),sent:choice.sent,index:choice.index,name:checked.name,mimeType:checked.mimeType,sha256:checked.sha256};await receiptAttachment(result,api,signal);if(!settled)finish(result);}catch(error){if(!settled)status.textContent=error instanceof Error?error.message:'Choose another attachment.';}finally{busy=false;select.disabled=false;update();}};
 cancel.onclick=close;dialog.onclose=close;signal.addEventListener('abort',close,{once:true});window.addEventListener('alpha-back',back,true);for(const event of events)window.addEventListener(event,close);document.addEventListener('visibilitychange',hidden);layoutBrowserDialog(dialog,[use,cancel]);document.body.append(dialog);
 if(signal.aborted||noticeActionBlocked()){close();return;}try{dialog.showModal();select.focus();}catch{close();}
 });
}
