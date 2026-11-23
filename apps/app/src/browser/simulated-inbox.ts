import {DailyApps} from '../daily';
import {devSurfacesEnabled} from '../build-flags';
import {registerPlugin} from '../platform-plugins';
import type {AlphaMailAttachmentsPlugin} from '../native/alpha-mail-attachments';
import {reviewMailAttachment} from '../runtime/inbox-attachment';
type Bag=Record<string,any>;
type MailAction='archive'|'restoreArchive'|'trash'|'restoreTrash'|'read'|'unread'|'discard';
const mailChanges:Record<Exclude<MailAction,'discard'>,Bag>={
 archive:{arch:true},restoreArchive:{arch:false},trash:{del:true},restoreTrash:{del:false},read:{unread:false},unread:{unread:true},
};
const rowKey=(row:Bag,index:number,drafts:boolean)=>drafts
 ? (row.localDraftId?'draft:'+row.localDraftId:'legacy-draft:'+index)
 : (row.sent?'sent:':'received:')+String(row.id);
const selectionScope=(state:Bag)=>JSON.stringify([state.localMailFolder,state.acct,state.q,state.open,!!state.compose]);
const attachments=registerPlugin<Pick<AlphaMailAttachmentsPlugin,'readSelected'|'openReviewed'|'cancel'>>('AlphaMailAttachments');
const address=(value:unknown):value is string=>typeof value==='string'&&value.length<=254&&/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);
/** Local development messages never enter a provider transport. */
export function installSimulatedInbox(view:Bag){
 if(!devSurfacesEnabled)return;
 const render=view.render,leave=view.onLeave,back=view.back,ongoing=view.ongoing;let busy=false,epoch=0,status='';
 let selecting=false,scope='',selectionStatus='';
 let savedOnBack:unknown=null;
 const selected=new Set<string>();
 let review:{action:MailAction,title:string,rows:Map<string,string>}|null=null;
 const resetSelection=()=>{selecting=false;selected.clear();review=null;selectionStatus='';};
 const repaint=(api:Bag)=>api.set({localMailRevision:Date.now()});
 const recipientAddress=(api:Bag,value:unknown)=>{
  if(address(value))return value;
  const contacts=api.get('contacts')?.list,people=contacts?.length?contacts:api.people||[];
  const email=people.find((person:Bag)=>person.id===value)?.email;
  return address(email)?email:null;
 };
 const recipients=(api:Bag,draft:Bag,raw:string)=>{
  const to=Array.isArray(draft.to)?[...draft.to]:draft.to?[draft.to]:[];
  if(address(raw)&&!to.some(value=>recipientAddress(api,value)===raw))to.push(raw);
  return to;
 };
 const keepDraft=(api:Bag)=>{
  const state=api.get('inbox');if(!state.compose)return true;
  try{
   const draft=structuredClone(state.compose===true?{}:state.compose),typed=String(state.toQ||''),raw=typed.trim();
   draft.to=recipients(api,draft,raw);
   draft.pendingTo=address(raw)?'':typed;
   const meaningful=raw||draft.to.length||String(draft.subject||'').trim()||String(draft.body||'').trim()||String(draft.cc||'').trim()||String(draft.bcc||'').trim()||draft.atts?.length||draft.attach?.length;
   const patch:Bag={compose:null,toQ:''};
   if(meaningful||draft.localDraftId){
    draft.localDraftId??=crypto.randomUUID();
    const rows=[...(state.localDrafts||[])],at=rows.findIndex((saved:Bag)=>saved.localDraftId===draft.localDraftId);
    if(at<0)rows.push(draft);else rows[at]=draft;
    patch.localDrafts=rows;
   }
   api.set(patch);status='';return true;
  }catch(error){api.toast(error instanceof Error?error.message:'The draft could not be saved. Keep it open.');return false;}
 };
 view.ongoing=(state:Bag,api:Bag)=>state.compose?{label:'Inbox draft',icon:'mail'}:ongoing?.(state,api);
 view.onLeave=(api:Bag)=>{
  if(api.get('inbox').compose!==savedOnBack)keepDraft(api);
  savedOnBack=null;epoch++;busy=false;resetSelection();return leave?.(api);
 };
 view.back=(state:Bag,api:Bag)=>{
  if(review){review=null;repaint(api);return true;}
  if(selecting){resetSelection();repaint(api);return true;}
  if(state.compose){
   if(!keepDraft(api)||state.composeLocal)return true;
   // Shell Back calls onLeave before the already saved composer's close commits.
   savedOnBack=state.compose;
   queueMicrotask(()=>{savedOnBack=null;});
   return false;
  }
  if(state.localMailFolder&&!state.compose&&state.open==null&&state.q==null){api.set({localMailFolder:null});return true;}
  return back?.(state,api);
 };
 view.render=(state:Bag,api:Bag)=>{const out=render(state,api),repaint=()=>api.set({localMailRevision:Date.now()}),setDraft=(patch:Bag)=>{status='Unsaved local draft';api.set({compose:{...api.get('inbox').compose,...patch}});};
 const folder=state.localMailFolder as 'archive'|'trash'|'drafts'|undefined;
 const drafts=folder==='drafts';
 const switchFolder=(next:string|null)=>api.set({localMailFolder:next,open:null,openSource:null,q:null});
 const restoreDraft=(saved:Bag)=>{
  try{
   const draft:Bag={...structuredClone(saved),localDraftId:saved.localDraftId||crypto.randomUUID()};
   api.set({localDrafts:(api.get('inbox').localDrafts||[]).map((item:Bag)=>item===saved?draft:item),compose:draft,composeLocal:true,toQ:draft.pendingTo||''});
   status='Restored local draft';
  }catch{/* The retained draft stays in its original slot. */}
 };
 // A composer owns one saved draft. Sending/discarding another composer must
 // not erase it; old drafts receive an identity only when explicitly restored.
 const chips=out.chips.map((chip:Bag)=>({...chip,on:!folder&&chip.on,css:folder?'background:var(--s2);color:var(--fg)':chip.css,pick:()=>{switchFolder(null);chip.pick();}}));
 for(const label of ['Archive','Trash','Drafts']){
  const key=label.toLowerCase(),on=folder===key;
  chips.push({label,on,css:on?'background:var(--fg);color:var(--bg)':'background:var(--s2);color:var(--fg)',pick:()=>switchFolder(key)});
 }
 if(!state.compose&&!folder)for(const [index,saved] of (state.localDrafts||[]).entries())chips.push({label:state.localDrafts.length===1?'Restore local draft':`Restore draft ${index+1}: ${saved.subject||'(no subject)'}`,css:'background:var(--s2)',pick:()=>restoreDraft(saved)});
 out.chips=out.folderChips=chips;
 if(drafts&&!state.compose){
  out.rows=(state.localDrafts||[]).map((saved:Bag)=>({
   localDraftId:saved.localDraftId,label:'Draft, '+(saved.subject||'(No subject)'),name:'Draft',ini:'D',
   subj:saved.subject||'(No subject)',snip:saved.body||'',time:'',nameW:'500',subjCss:'color:var(--fg)',
   dot:'transparent',clip:!!saved.atts?.length,tx:0,current:'false',open:()=>restoreDraft(saved),
  }));
  out.empty=!out.rows.length;out.emptyText='No drafts';out.emptyAdd=false;
 }
 if(folder)out.emptyAdd=false;

 const renderedScope=selectionScope(state),ticket=epoch;
 if(scope!==renderedScope){resetSelection();scope=renderedScope;}
 const current=()=>ticket===epoch&&api.isActive()&&!document.hidden&&selectionScope(api.get('inbox'))===renderedScope;
 const rows:Bag[]=out.rows||[];
 const visible=new Set(rows.map((row,index)=>rowKey(row,index,drafts)));
 for(const id of selected)if(!visible.has(id))selected.delete(id);
 const liveRows=(now:Bag):Bag[]=>drafts?now.localDrafts||[]:[...(now.mails||[]),...(now.sent||[])];
 function snapshot(items:Bag[],id:string){
  const matches=items.filter((item,index)=>rowKey(item,index,drafts)===id);
  return matches.length===1?JSON.stringify(matches[0]):undefined;
 }
 function retired(){
  review=null;selectionStatus='These emails changed. Select them again.';repaint();
 }
 function prepare(action:MailAction,title:string){
  if(!current()||!selected.size)return;
  const items=liveRows(api.get('inbox')),bindings=new Map<string,string>();
  for(const id of selected){
   const saved=snapshot(items,id);
   if(saved===undefined){retired();return;}
   bindings.set(id,saved);
  }
  review={action,title,rows:bindings};selectionStatus='';repaint();
 }
 function apply(){
  const approved=review;
  if(!approved||!current())return;
  const now=api.get('inbox'),items=liveRows(now);
  for(const [id,saved] of approved.rows)if(snapshot(items,id)!==saved){retired();return;}
  const action=approved.action;
  try{
   if(action==='discard')api.set({localDrafts:items.filter((row,index)=>!approved.rows.has(rowKey(row,index,true)))});
   else{
    const change=(list:Bag[])=>list.map((row,index)=>approved.rows.has(rowKey(row,index,false))?{...row,...mailChanges[action]}:row);
    api.set({mails:change(now.mails||[]),sent:change(now.sent||[])});
   }
   resetSelection();repaint();
  }catch(error){selectionStatus=error instanceof Error?error.message:'The selected emails could not be saved.';repaint();}
 }
 out.folderTitle=selecting?`${selected.size} selected`:drafts?'Drafts':folder==='archive'?'Archive':folder==='trash'?'Trash':state.acct==='sent'?'Sent':'Inbox';
 out.rows=rows.map((row,index)=>{
  const id=rowKey(row,index,drafts);
  if(!selecting)return row;
  return {...row,rowRole:'checkbox',checked:selected.has(id)?'true':'false',selecting:true,selected:selected.has(id),down:undefined,up:undefined,open:()=>{
   if(!current()||review)return;
   if(selected.has(id))selected.delete(id);else selected.add(id);
   selectionStatus='';repaint();
  }};
 });
 const close=()=>{review=null;repaint();};
 out.mailReview=review?{
  title:`${review.title} ${review.rows.size} ${drafts?'draft':'email'}${review.rows.size===1?'':'s'}?`,
  confirm:apply,close,
 }:null;
 out.mailBatchStatus=selectionStatus;
 const menu=[{
  label:selecting?'Finish selection':drafts?'Select drafts':'Select emails',icon:'check',
  disabled:!selecting&&!rows.length,run:()=>{if(!current())return;if(selecting)resetSelection();else selecting=true;repaint();},
 }];
 const add=(label:string,icon:string,action:MailAction,title=label)=>menu.push({label,icon,disabled:!selected.size,run:()=>prepare(action,title)});
 if(selecting){
  menu.push({label:'Select all',icon:'list-checks',disabled:!rows.length,run:()=>{if(!current())return;for(const id of visible)selected.add(id);repaint();}});
  if(drafts)add('Delete drafts','trash-2','discard','Delete');
  else{
   if(folder==='trash')add('Restore','rotate-cw','restoreTrash');
   else if(folder==='archive')add('Move to Inbox','rotate-cw','restoreArchive');
   else add('Archive','archive','archive');
   add('Mark as read','mail-open','read');add('Mark as unread','mail','unread');
   if(folder!=='trash')add('Move to Trash','trash-2','trash');
  }
 }
 menu.push({label:'Refresh',icon:'rotate-cw',disabled:false,run:repaint});
 const closeMenu=(menu:HTMLDetailsElement|null)=>{if(!menu)return;menu.open=false;menu.querySelector<HTMLElement>('summary')?.focus();};
 out.mailOptions=menu.map(item=>({...item,icon:'/icons/lucide/'+item.icon+'.svg',pick:(event:Event)=>{
  closeMenu((event.currentTarget as HTMLElement).closest('details'));item.run();
 }}));
 out.mailMenuKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.stopPropagation();closeMenu(event.currentTarget as HTMLDetailsElement);}};
 const otherDrafts=(draft:Bag)=>(api.get('inbox').localDrafts||[]).filter((saved:Bag)=>!draft.localDraftId||saved.localDraftId!==draft.localDraftId);
 const compose=out.compose;out.compose=()=>{if(api.get('inbox').compose&&!keepDraft(api))return;status='Unsaved local draft';compose();};
 const validRecipient=(value:unknown)=>!!recipientAddress(api,value);
 if(out.c){const base=out.c;out.c={...base,toPh:'Email address',local:true,busy,status,sendDisabled:busy,heading:'New email',showRecipientDetails:!!state.compose.recipientsExpanded||!!state.compose.cc||!!state.compose.bcc,toggleRecipientDetails:()=>setDraft({recipientsExpanded:!state.compose.recipientsExpanded}),attachmentHint:'PDF, images or text · one file up to 5 MiB',cc:state.compose.cc||'',bcc:state.compose.bcc||'',onCc:(e:Bag)=>setDraft({cc:e.target.value}),onBcc:(e:Bag)=>setDraft({bcc:e.target.value}),
 save:()=>{
  try{
   const current=api.get('inbox'),draft=structuredClone(current.compose),raw=String(current.toQ||'').trim();
   if(raw&&!address(raw)){api.toast('Add a valid recipient.');return;}
   draft.to=recipients(api,draft,raw);
   if(draft.to.some((value:unknown)=>!validRecipient(value))){api.toast('Add valid recipients.');return;}
   delete draft.pendingTo;
   draft.localDraftId??=crypto.randomUUID();
   api.set({localDrafts:[...otherDrafts(draft),draft],compose:draft,toQ:''});status='Saved locally';repaint();
  }catch{}
 },
 attach:async()=>{if(busy)return;busy=true;const ticket=epoch,draft=api.get('inbox').compose;repaint();let selectionId:string|undefined;try{const selection=await DailyApps.perform({action:'files'});selectionId=selection.selectionId;if(ticket!==epoch||api.get('inbox').compose!==draft||selection.status==='cancelled')return;if(!selectionId)throw Error('Choose a file.');const file=await attachments.readSelected({selectionId});await reviewMailAttachment(file);if(ticket!==epoch||api.get('inbox').compose!==draft)return;setDraft({atts:[{name:file.name,mimeType:file.mimeType,dataBase64:file.dataBase64,sha256:file.sha256,size:file.size+' bytes',browserAttachment:true}],attach:[]});status='Attachment ready';}catch(error){if(ticket===epoch)api.toast(error instanceof Error?error.message:'Could not attach file.');}finally{if(selectionId)await DailyApps.forgetSelected({selectionId}).catch(()=>{});if(ticket===epoch){busy=false;repaint();}}},
 send:()=>{if(busy)return;const current=api.get('inbox'),draft=current.compose,raw=String(current.toQ||'').trim(),to=recipients(api,draft,raw);const cc=String(draft.cc||'').split(',').map(v=>v.trim()).filter(Boolean),bcc=String(draft.bcc||'').split(',').map(v=>v.trim()).filter(Boolean);if(!to.length||to.some((value:unknown)=>!validRecipient(value))||raw&&!address(raw)||[...cc,...bcc].some(v=>!/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(v))){api.toast('Add valid recipients.');return;}const message={id:crypto.randomUUID(),sent:true,sentAt:Date.now(),to,cc,bcc,acct:draft.acct||'personal',subj:draft.subject||'(no subject)',body:draft.body||'',time:'Now',k:Date.now(),atts:draft.atts||[]};try{api.set({sent:[message,...current.sent],localDrafts:otherDrafts(draft),compose:null,toQ:'',mails:current.mails.map((m:Bag)=>m.id===draft.replyTo?{...m,unread:false,replied:true}:m)});status='';api.toast('Sent locally');}catch{}}
 };for(const key of ['onTo','toKey','onSubj','onBody','addRaw'])out.c[key]=(...args:any[])=>{status='Unsaved local draft';return base[key]?.(...args);};out.c.atts=base.atts.map((item:Bag)=>({...item,rm:()=>{status='Unsaved local draft';item.rm();}}));}
 if(out.d?.atts){const source=(state.openSource==='sent'?state.sent||[]:state.openSource==='received'?state.mails||[]:[...(state.mails||[]),...(state.sent||[])]).find((m:Bag)=>String(m.id)===String(state.open));out.d.atts=out.d.atts.map((item:Bag,index:number)=>{const file=source?.atts?.[index];return file?.browserAttachment?{...item,open:()=>void attachments.openReviewed({...file,size:undefined,reviewed:true,offerSave:!source.sent}).catch((error:Error)=>api.toast(error.message))}:item;});}
 return out;};
}
