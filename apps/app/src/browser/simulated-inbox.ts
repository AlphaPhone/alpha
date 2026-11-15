import {DailyApps} from '../daily';
import {devSurfacesEnabled} from '../build-flags';
import {registerPlugin} from '../platform-plugins';
import {reviewMailAttachment} from '../runtime/inbox-attachment';
type Bag=Record<string,any>;
const attachments=registerPlugin<any>('AlphaMailAttachments');
const address=(value:unknown):value is string=>typeof value==='string'&&value.length<=254&&/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);
/** Local development messages never enter a provider transport. */
export function installSimulatedInbox(view:Bag){
 if(!devSurfacesEnabled)return;
 const render=view.render,leave=view.onLeave,back=view.back,ongoing=view.ongoing;let busy=false,epoch=0,status='',confirm=false;
 const restore=(saved:Bag,api:Bag)=>{const value:Bag={...structuredClone(saved),localDraftId:saved.localDraftId||crypto.randomUUID()};api.set({localDrafts:(api.get('inbox').localDrafts||[]).map((row:Bag)=>row===saved?value:row),compose:value,composeLocal:true,toQ:value.pendingTo||''});status='';};
 const keep=(api:Bag,close:boolean)=>{
  const state=api.get('inbox');if(!state.compose)return true;
  const draft=structuredClone(state.compose===true?{}:state.compose),typed=String(state.toQ||''),raw=typed.trim();
  if(raw&&address(raw)){draft.to=[...(Array.isArray(draft.to)?draft.to:draft.to?[draft.to]:[]),raw];draft.pendingTo='';}else draft.pendingTo=typed;
  const meaningful=raw||draft.to?.length||String(draft.subject||'').trim()||String(draft.body||'').trim()||String(draft.cc||'').trim()||String(draft.bcc||'').trim()||draft.atts?.length;
  try{
   const drafts=meaningful?(()=>{draft.localDraftId??=crypto.randomUUID();const rows=[...(state.localDrafts||[])],index=rows.findIndex((row:Bag)=>row.localDraftId===draft.localDraftId);if(index<0)rows.push(draft);else rows[index]=draft;return rows;})():state.localDrafts||[];
   const next={...state,localDrafts:drafts},stored=Object.fromEntries(view.persist.map((key:string)=>[key,next[key]]));if(JSON.stringify(stored).length>12_000_000)throw Error('Draft storage is full. Your email is still open.');
   api.set({localDrafts:drafts,compose:close?null:draft,toQ:close?'':draft.pendingTo});status='';confirm=false;return true;
  }catch(error){status=error instanceof Error?error.message:'The draft could not be saved. Keep it open.';api.toast(status);return false;}
 };
 view.ongoing=(state:Bag,api:Bag)=>!!state.compose||!!ongoing?.(state,api);
 view.back=(state:Bag,api:Bag)=>{if(confirm){confirm=false;api.set({localMailRevision:Date.now()});return true;}if(state.compose){keep(api,true);return true;}if(state.localDraftFolder){api.set({localDraftFolder:false});return true;}return back?.(state,api);};
 view.onLeave=(api:Bag)=>{if(api.get('inbox').compose)keep(api,true);epoch++;busy=false;confirm=false;return leave?.(api);};
 view.render=(state:Bag,api:Bag)=>{const out=render(state,api),repaint=()=>api.set({localMailRevision:Date.now()}),setDraft=(patch:Bag)=>{status='';api.set({compose:{...api.get('inbox').compose,...patch}});};
 out.mailOptions=[{label:'Refresh',icon:'/icons/lucide/rotate-cw.svg',run:repaint}].map(item=>({...item,disabled:false,pick:(event:Event)=>{(event.currentTarget as HTMLElement).closest('details')?.removeAttribute('open');item.run();}}));
 // Drafts use the normal folder/list, not one recovery button per email.
 const normalChips=out.chips.map((chip:Bag)=>({...chip,css:state.localDraftFolder?'background:var(--s2);color:var(--mut)':chip.css,on:state.localDraftFolder?false:chip.on,pick:()=>{api.set({localDraftFolder:false});chip.pick();}}));
 out.chips=out.folderChips=[...normalChips,{label:'Drafts',css:state.localDraftFolder?'background:var(--fg);color:var(--bg)':'background:var(--s2)',pick:()=>api.set({localDraftFolder:true,open:null,q:null})}];
 if(state.localDraftFolder&&!state.compose){
  out.rows=(state.localDrafts||[]).map((saved:Bag,index:number)=>({id:saved.localDraftId||'legacy-'+index,label:'Draft, '+(saved.subject||'(No subject)'),name:'Draft',ini:'D',subj:saved.subject||'(No subject)',snip:saved.body||saved.pendingTo||'',time:'',nameW:'500',subjCss:'color:var(--fg)',dot:'transparent',clip:!!saved.atts?.length,tx:0,current:'false',down:()=>{},up:()=>{},open:()=>restore(saved,api)}));
  out.empty=!out.rows.length;out.emptyText='No drafts';out.emptyAdd=false;
 }
 const otherDrafts=(draft:Bag)=>(api.get('inbox').localDrafts||[]).filter((saved:Bag)=>!draft.localDraftId||saved.localDraftId!==draft.localDraftId);
 const compose=out.compose;out.compose=()=>{if(api.get('inbox').compose&&!keep(api,true))return;status='';confirm=false;compose();};
 const contacts=api.get('contacts')?.list,people=contacts?.length?contacts:api.people||[],validRecipient=(value:unknown)=>address(value)||people.some((person:Bag)=>person.id===value&&address(person.email));
 if(out.c){const base=out.c;out.c={...base,toPh:'Email address',local:true,busy,status,confirm,sendDisabled:busy,heading:'New message',showRecipientDetails:!!state.compose.recipientsExpanded||!!state.compose.cc||!!state.compose.bcc,toggleRecipientDetails:()=>setDraft({recipientsExpanded:!state.compose.recipientsExpanded}),attachmentHint:'PDF, images or text · one file up to 5 MiB',cc:state.compose.cc||'',bcc:state.compose.bcc||'',onCc:(e:Bag)=>setDraft({cc:e.target.value}),onBcc:(e:Bag)=>setDraft({bcc:e.target.value}),
 save:()=>{keep(api,false);},
 discard:()=>{confirm=true;repaint();},cancelDiscard:()=>{confirm=false;repaint();},confirmDiscard:()=>{try{api.set({localDrafts:otherDrafts(api.get('inbox').compose),compose:null,toQ:''});confirm=false;status='';}catch{}},
 attach:async()=>{if(busy)return;busy=true;const ticket=epoch,draft=api.get('inbox').compose;repaint();let selectionId:string|undefined;try{const selection=await DailyApps.perform({action:'files'});selectionId=selection.selectionId;if(ticket!==epoch||api.get('inbox').compose!==draft||selection.status==='cancelled')return;if(!selectionId)throw Error('Choose a file.');const file=await attachments.readSelected({selectionId});await reviewMailAttachment(file);if(ticket!==epoch||api.get('inbox').compose!==draft)return;setDraft({atts:[{name:file.name,mimeType:file.mimeType,dataBase64:file.dataBase64,sha256:file.sha256,size:file.size+' bytes',browserAttachment:true}],attach:[]});status='';}catch(error){if(ticket===epoch)api.toast(error instanceof Error?error.message:'Could not attach file.');}finally{if(selectionId)await DailyApps.forgetSelected({selectionId}).catch(()=>{});if(ticket===epoch){busy=false;repaint();}}},
 send:()=>{if(busy)return;const draft=api.get('inbox').compose,to=Array.isArray(draft.to)?[...draft.to]:draft.to?[draft.to]:[],raw=String(api.get('inbox').toQ||'').trim();if(raw)to.push(raw);const cc=String(draft.cc||'').split(',').map(v=>v.trim()).filter(Boolean),bcc=String(draft.bcc||'').split(',').map(v=>v.trim()).filter(Boolean);if(!to.length||to.some((value:unknown)=>!validRecipient(value))||raw&&!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(raw)||[...cc,...bcc].some(v=>!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(v))){api.toast('Add valid recipients.');return;}const current=api.get('inbox'),message={id:crypto.randomUUID(),sent:true,sentAt:Date.now(),to,cc,bcc,acct:draft.acct||'personal',subj:draft.subject||'(no subject)',body:draft.body||'',time:'Now',k:Date.now(),atts:draft.atts||[]};try{api.set({sent:[message,...current.sent],localDrafts:otherDrafts(draft),compose:null,toQ:'',mails:current.mails.map((m:Bag)=>m.id===draft.replyTo?{...m,unread:false,replied:true}:m)});status='';api.toast('Sent locally');}catch{}}
 };for(const key of ['onTo','toKey','onSubj','onBody','addRaw'])out.c[key]=(...args:any[])=>{status='';return base[key]?.(...args);};out.c.atts=base.atts.map((item:Bag)=>({...item,rm:()=>{status='';item.rm();}}));}
 if(out.d?.atts){const source=[...(state.mails||[]),...(state.sent||[])].find((m:Bag)=>String(m.id)===String(state.open));out.d.atts=out.d.atts.map((item:Bag,index:number)=>{const file=source?.atts?.[index];return file?.browserAttachment?{...item,open:()=>void attachments.openReviewed({...file,size:undefined,reviewed:true,offerSave:!source.sent}).catch((error:Error)=>api.toast(error.message))}:item;});}
 return out;};
}
