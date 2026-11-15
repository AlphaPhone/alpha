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
 const render=view.render,leave=view.onLeave,back=view.back,ongoing=view.ongoing;let busy=false,epoch=0,status='',confirm=false,selecting=false,selectionScope='',selectionStatus='';
 let selected=new Set<string>(),review:Bag|null=null;
 const resetSelection=()=>{selecting=false;selected.clear();review=null;selectionStatus='';};
 const scope=(state:Bag)=>JSON.stringify([!!state.localDraftFolder,state.localMailFolder||'',state.acct,state.q,state.open,!!state.compose]);
 const key=(row:Bag,index:number,drafts:boolean)=>String(drafts?row.localDraftId||row.id||'legacy-'+index:(row.sent?'sent:':'mail:')+row.id);
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
 view.back=(state:Bag,api:Bag)=>{if(review){review=null;api.set({localMailRevision:Date.now()});return true;}if(selecting){resetSelection();api.set({localMailRevision:Date.now()});return true;}if(confirm){confirm=false;api.set({localMailRevision:Date.now()});return true;}if(state.compose){keep(api,true);return true;}if(state.localDraftFolder||state.localMailFolder){api.set({localDraftFolder:false,localMailFolder:null});return true;}return back?.(state,api);};
 view.onLeave=(api:Bag)=>{if(api.get('inbox').compose)keep(api,true);epoch++;busy=false;confirm=false;resetSelection();return leave?.(api);};
 view.render=(state:Bag,api:Bag)=>{const folder=state.localMailFolder;const renderState=folder?{...state,acct:'all',mails:[...(state.mails||[]),...(state.sent||[])].filter((row:Bag)=>folder==='trash'?row.del:row.arch&&!row.del).map((row:Bag)=>({...row,arch:false,del:false})),sent:[]}:state;const out=render(renderState,api),repaint=()=>api.set({localMailRevision:Date.now()}),setDraft=(patch:Bag)=>{status='';api.set({compose:{...api.get('inbox').compose,...patch}});};

 // Drafts use the normal folder/list, not one recovery button per email.
 const normalChips=out.chips.map((chip:Bag)=>({...chip,css:state.localDraftFolder||folder?'background:var(--s2);color:var(--mut)':chip.css,on:state.localDraftFolder||folder?false:chip.on,pick:()=>{api.set({localDraftFolder:false,localMailFolder:null});chip.pick();}}));
 out.chips=out.folderChips=[...normalChips,...['Archive','Trash'].map(label=>({label,css:folder===label.toLowerCase()?'background:var(--fg);color:var(--bg)':'background:var(--s2)',pick:()=>api.set({localMailFolder:label.toLowerCase(),localDraftFolder:false,open:null,q:null})})),{label:'Drafts',css:state.localDraftFolder?'background:var(--fg);color:var(--bg)':'background:var(--s2)',pick:()=>api.set({localDraftFolder:true,localMailFolder:null,open:null,q:null})}];
 if(folder)out.emptyAdd=false;
 if(state.localDraftFolder&&!state.compose){
  out.rows=(state.localDrafts||[]).map((saved:Bag,index:number)=>({id:saved.localDraftId||'legacy-'+index,localDraftId:saved.localDraftId,label:'Draft, '+(saved.subject||'(No subject)'),name:'Draft',ini:'D',subj:saved.subject||'(No subject)',snip:saved.body||saved.pendingTo||'',time:'',nameW:'500',subjCss:'color:var(--fg)',dot:'transparent',clip:!!saved.atts?.length,tx:0,current:'false',down:()=>{},up:()=>{},open:()=>restore(saved,api)}));
  out.empty=!out.rows.length;out.emptyText='No drafts';out.emptyAdd=false;
 }
 // Reuse the native mailbox row, selection menu and confirmation presentation.
 const currentScope=scope(state),ticket=epoch,drafts=!!state.localDraftFolder;
 if(selectionScope!==currentScope){resetSelection();selectionScope=currentScope;}
 const current=()=>ticket===epoch&&scope(api.get('inbox'))===currentScope&&!document.hidden;
 const rows:Bag[]=out.rows||[],visibleIds=new Set<string>(rows.map((row,index)=>key(row,index,drafts)));
 const liveRows=()=>{const now=api.get('inbox');return drafts?now.localDrafts||[]:[...(now.mails||[]),...(now.sent||[])];};
 selected=new Set([...selected].filter(id=>visibleIds.has(id)));
 const prepare=(action:string,title:string)=>{
  if(!current()||!selected.size)return;
  const live:Bag[]=liveRows(),ids=[...selected];
  const snapshots=ids.map(id=>live.filter((row:Bag,index:number)=>key(row,index,drafts)===id));
  if(snapshots.some(matches=>matches.length!==1)){selectionStatus='These emails changed. Select them again.';repaint();return;}
  review={action,title,ids,snapshots:snapshots.map(matches=>JSON.stringify(matches[0]))};selectionStatus='';repaint();
 };
 const apply=()=>{
  const approved=review;if(!approved||!current())return;
  const live:Bag[]=liveRows();
  if(approved.ids.some((id:string,at:number)=>{const matches=live.filter((row,index)=>key(row,index,drafts)===id);return matches.length!==1||JSON.stringify(matches[0])!==approved.snapshots[at];})){
   review=null;selectionStatus='These emails changed. Select them again.';repaint();return;
  }
  const targets=new Set(approved.ids),patch:Bag={};
  const change=(items:Bag[])=>items.map((row,index)=>{
   if(!targets.has(key(row,index,false)))return row;
   return {...row,...(approved.action==='archive'?{arch:true}:approved.action==='unarchive'?{arch:false}:approved.action==='trash'?{del:true}:approved.action==='untrash'?{del:false}:approved.action==='read'?{unread:false}:{unread:true})};
  });
  if(drafts)patch.localDrafts=live.filter((row,index)=>!targets.has(key(row,index,true)));
  else{const now=api.get('inbox');patch.mails=change(now.mails||[]);patch.sent=change(now.sent||[]);}

  try{api.set(patch);resetSelection();repaint();}
  catch(error){selectionStatus=error instanceof Error?error.message:'The selected emails could not be saved. Try again.';api.toast(selectionStatus);}
 };
 out.mailSelecting=selecting;out.mailBatchBusy=false;out.mailBatchStatus=selectionStatus;
 out.folderTitle=selecting?`${selected.size} selected`:drafts?'Drafts':folder==='archive'?'Archive':folder==='trash'?'Trash':state.acct==='sent'?'Sent':'Inbox';
 out.rows=rows.map((row,index)=>({...row,rowRole:selecting?'checkbox':'button',selecting,selected:selected.has(key(row,index,drafts))?'true':'false',
  down:selecting?()=>{}:row.down,up:selecting?()=>{}:row.up,
  open:()=>{if(!current())return;if(!selecting){row.open();return;}const id=key(row,index,drafts);if(selected.has(id))selected.delete(id);else selected.add(id);review=null;selectionStatus='';repaint();}}));
 out.mailReview=review?{title:`${review.title} ${review.ids.length} ${drafts?(review.ids.length===1?'draft':'drafts'):(review.ids.length===1?'email':'emails')}?`,confirm:apply,close:()=>{review=null;repaint();}}:null;
 out.mailOptions=[
  {label:selecting?'Finish selection':drafts?'Select drafts':'Select emails',icon:'check',disabled:!selecting&&!rows.length,run:()=>{if(!current())return;if(selecting)resetSelection();else selecting=true;repaint();}},
  ...(selecting?[
   {label:'Select all',icon:'list-checks',disabled:!rows.length,run:()=>{if(!current())return;selected=new Set(visibleIds);review=null;repaint();}},
   ...(drafts?[{label:'Delete drafts',icon:'trash-2',disabled:!selected.size,run:()=>prepare('discard-local','Delete')}]:[
    {label:folder==='trash'?'Restore':folder==='archive'?'Move to Inbox':'Archive',icon:folder==='trash'?'rotate-ccw':'archive',disabled:!selected.size,run:()=>prepare(folder==='trash'?'untrash':folder==='archive'?'unarchive':'archive',folder==='trash'?'Restore':folder==='archive'?'Move to Inbox':'Archive')},
    {label:'Mark as read',icon:'mail-open',disabled:!selected.size,run:()=>prepare('read','Mark as read')},
    {label:'Mark as unread',icon:'mail',disabled:!selected.size,run:()=>prepare('unread','Mark as unread')},
    ...(folder!=='trash'?[{label:'Move to Trash',icon:'trash-2',disabled:!selected.size,run:()=>prepare('trash','Move to Trash')}]:[]),
   ]),
  ]:[]),
  {label:'Refresh',icon:'rotate-cw',disabled:false,run:repaint},
 ].map(item=>({...item,icon:'/icons/lucide/'+item.icon+'.svg',pick:(event:Event)=>{(event.currentTarget as HTMLElement).closest('details')?.removeAttribute('open');item.run();}}));
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
