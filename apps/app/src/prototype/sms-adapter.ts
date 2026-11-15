import {nativeSmsDraftShelf,type SmsDraftShelf,type StoredSmsDraft} from '../runtime/native-sms-drafts';
import {readRecipientContacts} from './contacts-adapter';
import {MMS_MAX_TOTAL_BYTES} from '../../../../.eliza/client-features/packages/contracts/src/mms-send.ts';
import {isIncompleteSmsRow} from '../../../../.eliza/client-features/packages/contracts/src/native-telephony.ts';
import {registerPlugin} from '../platform-plugins';
import {aospImage} from '../runtime/aosp-image';
import {createSmsSession,mmsProblemLabel,mmsReceiptLabel,receiptLabel} from '../runtime/image-sms';
import {smsSubscriptionRevision} from '../runtime/sms-subscription-revision';
import {createAospTelephony,registerTelephonyProfile,MMS_MAX_ATTACHMENTS,reviewMms,reviewSms,type AlphaTelephonyPlugin,type MmsAttachmentDraft,type MmsReview,type SmsReview,type SmsReviewProblem,type SmsSendResult} from '../runtime/aosp-telephony';
import {watchReturnToApp} from './native-adapter';
import {formatDateTime} from './locale-time';
type Bag=Record<string,any>;
const MMS_PICTURES:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/gif':'gif'};
/* Native rejects with these codes before it journals or sends anything, so its message is the
 * reason and the next Send opens a new review. */
const SMS_NOT_SENT=new Set(['too-long','invalid','busy','unavailable']);
/* Owner text for the shared review's refusals; a handoff allows more people and a longer text. */
function smsProblemLabel(problem:SmsReviewProblem,mode:'direct'|'handoff',chosen:boolean){
 return {'no-recipient':'Enter at least one phone number.','invalid-recipient':'Check the phone numbers.','too-many-recipients':mode==='direct'?'A text can go to at most five people.':'A text can go to at most ten people.','empty-body':'Enter a message.','body-too-long':mode==='direct'?'A text is limited to 1,600 characters.':'A text is limited to 5,000 characters.','invalid-body':'The message contains characters that cannot be sent.','sim-unknown':chosen?'That SIM is no longer active. Select a SIM again.':'No active SIM is available.','sim-required':'Select a SIM for this text.','sim-not-selectable':'Choose the SIM in your messaging app.'}[problem];
}
export function installSmsAdapter(Component:any,views:Bag,shelf:SmsDraftShelf=nativeSmsDraftShelf()){
 if(!aospImage)return;
 const client=createAospTelephony(registerPlugin<AlphaTelephonyPlugin>('AlphaTelephony'),true),p=Component.prototype,mount=p.componentDidMount,update=p.componentDidUpdate,unmount=p.componentWillUnmount;
 let owner:any,recipients='',body='',sim='',operationId='',busy=false,notice='',active=false,lifecycle=0,draftRevision=0,picking=false;
 let receipt:SmsSendResult|null=null;
 let currentApi:Bag|undefined,composing=false,tray=false,mediaAttempt=0;
 let choosing=false,recipientQuery='',contactsAll=false,contactRows:Bag[]=[],contactNext:string|undefined,contactBusy=false,contactNotice='',contactEpoch=0;
 let cameraDraft:{owner:any;revision:number;thread:string|null}|undefined;
 let contactDraft:{owner:any;revision:number;thread:string|null}|undefined;
 const previews=new Map<MmsAttachmentDraft,string>();
 let draftId='',restoredPending=false,shelfBusy=false,shelfError='',saveTail:Promise<unknown>=Promise.resolve();
 const savedDrafts=new Map<string,StoredSmsDraft>(),draftVersions=new Map<string,string>(),dirtyDrafts=new Map<string,StoredSmsDraft>();
 const encode=(bytes:Uint8Array)=>{let raw='';for(let i=0;i<bytes.length;i+=16384)raw+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(raw);};
 const pending=(id:string,review:SmsReview|MmsReview|null)=>id&&review&&review.subscriptionId!==null?{id,recipients:[...review.recipients],body:review.body,subscriptionId:review.subscriptionId}:undefined;
 const meaningful=()=>!!body.length||!!attachments.length||composing&&!!recipients.length;
 function snapshot():StoredSmsDraft|undefined{
  if(!meaningful())return;
  if(!draftId)draftId=crypto.randomUUID();
  return {id:draftId,revision:crypto.randomUUID(),thread:session.state.thread||cameraDraft?.thread||contactDraft?.thread||null,recipients,body,sim,updatedAt:Date.now(),pictures:attachments.map(item=>({name:item.name,contentType:item.contentType,dataBase64:encode(item.bytes)})),sms:pending(operationId,smsReview),mms:pending(mmsOperationId,mmsReview)};
 }
 function saveLocal(row=snapshot()):Promise<void>{
  if(!row)return Promise.resolve();dirtyDrafts.set(row.id,row);savedDrafts.set(row.id,row);
  const work=saveTail.then(async()=>{await shelf.save(row,draftVersions.get(row.id)??null);draftVersions.set(row.id,row.revision);if(dirtyDrafts.get(row.id)===row)dirtyDrafts.delete(row.id);});
  saveTail=work.catch(()=>{});return work;
 }
 async function loadLocal(){
  const target=owner,visit=lifecycle;shelfBusy=true;changed();
  try{await saveTail;const rows=await shelf.load();if(target!==owner||visit!==lifecycle||!active)return;
   savedDrafts.clear();for(const row of rows){savedDrafts.set(row.id,row);draftVersions.set(row.id,row.revision);}for(const row of dirtyDrafts.values())savedDrafts.set(row.id,row);shelfError='';
  }catch(error){if(target===owner&&visit===lifecycle&&active)shelfError=error instanceof Error?error.message:'Saved drafts could not load. They have not been changed.';}
  finally{if(target===owner&&visit===lifecycle){shelfBusy=false;changed();}}
 }
 async function restoreLocal(row:StoredSmsDraft){
  if(!active||busy)return;
  retireDraft();draftId=row.id;draftVersions.set(row.id,row.revision);recipients=row.recipients;body=row.body;sim=row.sim;composing=!row.thread;
  attachments=row.pictures.map(item=>({name:item.name,contentType:item.contentType,bytes:Uint8Array.from(atob(item.dataBase64),ch=>ch.charCodeAt(0))}));pictureSeq=attachments.length;
  for(const item of attachments)previews.set(item,URL.createObjectURL(new Blob([new Uint8Array(item.bytes)],{type:item.contentType})));
  operationId=row.sms?.id||'';smsReview=row.sms&&row.sms.subscriptionId!==null?{recipients:[...row.sms.recipients],body:row.sms.body,subscriptionId:row.sms.subscriptionId}:null;
  mmsOperationId=row.mms?.id||'';mmsReview=row.mms?{recipients:[...row.mms.recipients],body:row.mms.body,subscriptionId:row.mms.subscriptionId,attachments}:null;
  restoredPending=!!(operationId||mmsOperationId);notice=restoredPending?'This draft may have sent. Check its status before sending again.':'';
  session.openThread(row.thread);changed();if(restoredPending){await reconcile();await reconcileMms();}
 }
 async function closeDraft(){
  if(!active||busy||shelfBusy)return;const target=owner,visit=lifecycle,revision=draftRevision;busy=true;changed();
  try{await saveLocal();if(!active||owner!==target||visit!==lifecycle||revision!==draftRevision)return;retireDraft();session.openThread(null);changed();}
  catch(error){if(active&&owner===target&&visit===lifecycle){notice=error instanceof Error?error.message:'Draft could not be saved. Your message is still here.';}}
  finally{if(owner===target&&visit===lifecycle){busy=false;changed();}}
 }
 /* The reviewed text an operation ID was assigned for: the native send and its read-back hash exactly this. */
 let smsReview:(SmsReview&{subscriptionId:number})|null=null;
 /* A reviewed MMS (group message or pictures) keeps its own operation ID and the exact reviewed
  * content, so a result is read back only for what the owner reviewed. */
 let attachments:MmsReview['attachments']=[],pictureSeq=0,mmsOperationId='',mmsReview:MmsReview|null=null;
 const changed=()=>owner?.setState({smsNativeRevision:Date.now()});
 /* The verified image's reviewed client is the shared Messages and Phone profile while this shell
  * is installed; off the image this adapter returns above, so nothing is registered. */
 registerTelephonyProfile(client);
 const session=createSmsSession(client,true,changed,id=>{if(id===operationId)void reconcile();},id=>{if(id===mmsOperationId)void reconcileMms();});
 /* Android's picture chooser covers the WebView and reports it hidden; the draft stays while it is open. */
 const retireDraft=()=>{contactEpoch++;choosing=false;recipientQuery='';contactsAll=false;contactRows=[];contactNext=undefined;contactBusy=false;contactNotice='';mediaAttempt++;cameraDraft=undefined;contactDraft=undefined;picking=false;busy=false;draftRevision++;recipients='';body='';sim='';draftId='';restoredPending=false;operationId='';smsReview=null;notice='';receipt=null;composing=false;tray=false;resetMms(true);};
 const sync=()=>{
  const next=!!owner&&owner.S().view==='messages'&&!document.hidden,was=active;
  const held=cameraDraft||contactDraft;
  const ownedExcursion=!!held&&held.owner===owner&&(cameraDraft&&owner?.S().view==='camera'||contactDraft&&owner?.S().view==='contacts');
  if(!next&&!ownedExcursion&&(was||held)){const row=snapshot();if(row)void saveLocal(row).catch(error=>{shelfError=error instanceof Error?error.message:'Draft could not be saved.';});}
  if(next&&held?.thread&&session.state.thread===null)session.openThread(held.thread);
  if(next!==active){active=next;lifecycle++;session.setActive(next);if(next)void loadLocal();}
  if(next&&contactDraft)contactDraft=undefined;
  if(!next&&!ownedExcursion&&(was||held))retireDraft();
 };
 const resetMms=(pictures:boolean)=>{mmsOperationId='';mmsReview=null;if(pictures){for(const url of previews.values())URL.revokeObjectURL(url);previews.clear();attachments=[];pictureSeq=0;}};
 const draftRecipients=()=>recipients.split(',').map(v=>v.trim()).filter(Boolean);
 async function reconcile(){if(!active||!operationId||!smsReview)return;const token=lifecycle,draft=draftRevision,id=operationId,review=smsReview;try{const value=await client.smsSendResult(review,id);if(active&&token===lifecycle&&draft===draftRevision){receipt=value;notice=receiptLabel(value.status);changed();}}catch{/* No record or unavailable is never evidence of not sent. */}}
 async function send(){if(!active||busy)return;if(restoredPending){await reconcile();await reconcileMms();return;}const token=lifecycle,draft=draftRevision;let dispatched=false;busy=true;changed();try{
  const status=session.state.status;if(!status){notice='Refresh Messages, then review the text again.';return;}
  /* The shared review normalizes and dedupes numbers and takes the only active SIM; a SIM that is no longer active is refused. */
  const checked=reviewSms({recipients:draftRecipients(),body,subscriptionId:sim?Number(sim):undefined},status,'direct');
  if('problem' in checked){notice=checked.problem==='sim-unknown'&&!status.subscriptions?'Grant SIM access to select a SIM.':smsProblemLabel(checked.problem,'direct',!!sim);return;}
  if(!operationId||!smsReview){operationId=crypto.randomUUID();smsReview={...checked.review,subscriptionId:checked.review.subscriptionId as number};}
  await saveLocal();if(!active||token!==lifecycle||draft!==draftRevision)return;dispatched=true;const result=await client.sendSms(smsReview,operationId);if(!active||token!==lifecycle||draft!==draftRevision)return;receipt=result;notice=receiptLabel(result.status);
  /* Cancelled and denied prove nothing was sent: the next Send opens a new review. */
  if(result.status==='cancelled'||result.status==='denied'){operationId='';draftRevision++;}await session.refresh();return result;
 }catch(error){if(active&&token===lifecycle&&draft===draftRevision){const code=(error as {code?:string})?.code,message=error instanceof Error?error.message:'';
  if(operationId&&code&&SMS_NOT_SENT.has(code)&&message){operationId='';notice=message;}else if(operationId&&code==='expired'&&message)notice=message;
  else notice=dispatched?'This text may have sent. Check your messaging app before sending again.':message||'SMS review could not open.';}}finally{if(token===lifecycle){busy=false;changed();}}}
 /** Clear a submitted clean-UI draft only after its native result; never create a synthetic sent row. */
 async function submit(){
  if(!active||busy)return;
  const target=owner,token=lifecycle,revision=draftRevision,pictures=attachments.length>0||draftRecipients().length>1;
  const result=pictures?await sendMms():await send();
  if(!result||!active||owner!==target||token!==lifecycle||revision!==draftRevision||!['submitted','sent','delivered'].includes(result.status))return;
  const sentTo=[...(pictures?mmsReview?.recipients:smsReview?.recipients)||[]].sort().join(',');
  busy=true;changed();try{const consumed=draftId;if(consumed){try{await shelf.remove(consumed,draftVersions.get(consumed)??null);savedDrafts.delete(consumed);dirtyDrafts.delete(consumed);draftVersions.delete(consumed);}catch{notice+=' The saved draft was kept for status checking.';}}
  if(!active||owner!==target||token!==lifecycle||revision!==draftRevision)return;draftId='';body='';for(const url of previews.values())URL.revokeObjectURL(url);previews.clear();attachments=[];pictureSeq=0;draftRevision++;tray=false;
  if(composing){const thread=session.state.threads.find(row=>!isIncompleteSmsRow(row)&&[...row.addresses].sort().join(',')===sentTo);if(thread){composing=false;session.openThread(thread.id);}}
  }finally{if(owner===target&&token===lifecycle){busy=false;changed();}}
 }
 async function reconcileMms(){if(!active||!mmsOperationId||!mmsReview)return;const token=lifecycle,draft=draftRevision,id=mmsOperationId,review=mmsReview;try{const value=await client.mmsSendResult(review,id);if(active&&token===lifecycle&&draft===draftRevision){notice=mmsReceiptLabel(value.status);changed();}}catch{/* No record or unavailable is never evidence of not sent. */}}
 /** One MMS to every recipient, with the text and the picked pictures. Android's review dialog shows
  * it again; only the owner's Send there sends. A repeated operation ID never sends twice. */
 async function sendMms(){if(!active||busy)return;if(restoredPending){await reconcile();await reconcileMms();return;}const token=lifecycle,draft=draftRevision;let dispatched=false;busy=true;changed();try{
  const status=session.state.status;if(!status)throw Error('Refresh Messages, then review the MMS again.');
  const checked=reviewMms({recipients:draftRecipients(),body,attachments,subscriptionId:sim?Number(sim):undefined},status);
  if('problem' in checked)throw Error(mmsProblemLabel(checked.problem));
  if(!mmsOperationId){mmsOperationId=crypto.randomUUID();mmsReview=checked.review;}
  await saveLocal();if(!active||token!==lifecycle||draft!==draftRevision)return;dispatched=true;const result=await client.sendMms(mmsReview??checked.review,mmsOperationId);if(!active||token!==lifecycle||draft!==draftRevision)return;receipt=null;notice=mmsReceiptLabel(result.status);if(result.status==='cancelled'||result.status==='denied'){resetMms(false);draftRevision++;}await session.refresh();return result;
 }catch(error){if(active&&token===lifecycle&&draft===draftRevision)notice=dispatched?'This MMS may have sent. Check the conversation before sending again.':error instanceof Error?error.message:'MMS review could not open.';}finally{if(token===lifecycle){busy=false;changed();}}}
 /** The shared picker/camera changes only this reviewed draft. A retired visit cannot adopt bytes. */
 async function attach(fromCamera=false){
  if(!active||busy||!currentApi)return;
  if(attachments.length>=MMS_MAX_ATTACHMENTS){notice='You can attach up to five pictures.';changed();return;}
  const target=owner,revision=draftRevision,thread=session.state.thread,attempt=++mediaAttempt,api=currentApi;
  const captured={owner:target,revision,thread};if(fromCamera)cameraDraft=captured;
  const current=()=>owner===target&&attempt===mediaAttempt&&revision===draftRevision&&!document.hidden&&
   (target.S().view==='messages'&&(session.state.thread===thread||fromCamera&&cameraDraft===captured&&session.state.thread===null)||fromCamera&&cameraDraft===captured&&target.S().view==='camera');
  busy=true;picking=true;changed();
  try{
   const chosen=fromCamera?[await api.captureAttachmentPhoto(current)].filter(Boolean) as File[]:await api.pickAttachmentFiles(MMS_MAX_ATTACHMENTS-attachments.length,current);
   if(!current()||!chosen.length)return;
   const prepared:MmsReview['attachments']=[];
   for(const file of chosen){
    if(!MMS_PICTURES[file.type])throw Error('Only JPEG, PNG and GIF pictures can be sent.');
    if(!file.size||file.size>1024*1024)throw Error('Choose a picture smaller than 1 MB.');
    const bytes=new Uint8Array(await file.arrayBuffer());if(!current())return;
    prepared.push({contentType:file.type as MmsReview['attachments'][number]['contentType'],bytes,name:`picture-${pictureSeq+prepared.length+1}.${MMS_PICTURES[file.type]}`});
   }
   if(attachments.length+prepared.length>MMS_MAX_ATTACHMENTS)throw Error('You can attach up to five pictures.');
   if(new TextEncoder().encode(body).length+[...attachments,...prepared].reduce((total,item)=>total+item.bytes.length,0)>MMS_MAX_TOTAL_BYTES)throw Error('Choose fewer or smaller pictures for this message.');
   if(!current())return;
   const urls:string[]=[];
   try{for(const item of prepared)urls.push(URL.createObjectURL(new Blob([new Uint8Array(item.bytes)],{type:item.contentType})));}
   catch(error){for(const url of urls)URL.revokeObjectURL(url);throw error;}
   prepared.forEach((item,index)=>{attachments.push(item);previews.set(item,urls[index]);});
   pictureSeq+=prepared.length;restoredPending=false;draftRevision++;operationId='';resetMms(false);receipt=null;notice='';tray=false;
  }catch(error){if(current())notice=error instanceof Error?error.message:'Pictures could not open. Try again.';}
  finally{if(attempt===mediaAttempt){cameraDraft=undefined;picking=false;busy=false;sync();changed();}}
 }
 function removePicture(index:number){
  if(busy||!active)return;const item=attachments[index];if(!item)return;
  const preview=previews.get(item);if(preview)URL.revokeObjectURL(preview);previews.delete(item);attachments.splice(index,1);
  restoredPending=false;draftRevision++;operationId='';resetMms(false);receipt=null;notice='';changed();
 }
 async function handoff(){if(!active||busy)return;const token=lifecycle,draft=draftRevision;busy=true;changed();try{
  /* The messaging app chooses the SIM, so a handoff never carries one. */
  const status=session.state.status;if(!status){notice='Refresh Messages, then review the text again.';return;}
  const checked=reviewSms({recipients:draftRecipients(),body},status,'handoff');if('problem' in checked){notice=smsProblemLabel(checked.problem,'handoff',false);return;}
  const result=await client.composeSms(checked.review);if(active&&token===lifecycle&&draft===draftRevision)notice=result.message;}catch{if(active&&token===lifecycle)notice='Enter recipients and text, then review them in your messaging app.';}finally{if(token===lifecycle){busy=false;changed();}}}
 const edit=(setter:(value:string)=>void)=>(event:Event)=>{if(busy)return;setter((event.target as HTMLInputElement).value);restoredPending=false;draftRevision++;operationId='';resetMms(false);notice='';receipt=null;changed();};
 /* Prefilled recipients only change the draft; Send still opens Android's review. */
 /* Recipients a thread filled follow the next thread opened until the owner edits them. */
 let threadFill='';
 const address=(value:string)=>{if(busy)return false;recipients=value;restoredPending=false;draftRevision++;operationId='';resetMms(false);notice='';receipt=null;return true;};
 const threadAddresses=(addresses:readonly string[])=>{const numbers=addresses.map(v=>v.replace(/[\s().-]/g,''));return numbers.length&&numbers.length<=5&&numbers.every(v=>/^\+?[0-9]{2,20}$/.test(v))?[...new Set(numbers)].join(', '):'';};
 async function permission(access:'sms'|'sendSms'|'phoneState'){const token=lifecycle;try{await session.request(access);}catch{if(active&&token===lifecycle){notice='SMS access could not be requested.';changed();}}}
 /* Back in a conversation returns to the list and keeps the draft. */
 const back=views.messages.back;views.messages.back=(st:Bag,api:Bag)=>{if(choosing){contactEpoch++;choosing=false;contactRows=[];changed();return true;}if(composing||session.state.thread){void closeDraft();return true;}return back?back(st,api):false;};
 views.messages.reply=()=>null;views.messages.suggestions=()=>[];
 async function findRecipients(request=false,more=false){
  const visit=lifecycle,token=++contactEpoch,target=owner,query=recipientQuery;
  const current=()=>active&&choosing&&owner===target&&visit===lifecycle&&token===contactEpoch;
  contactBusy=true;contactNotice='';if(!more){contactRows=[];contactNext=undefined;}changed();
  try{const result=await readRecipientContacts(query,50,request,current,more?contactNext:undefined);if(!current())return;
   if(!result.readable){contactNotice='Allow Contacts access to choose someone.';return;}
   contactRows=more?contactRows.concat(result.contacts):result.contacts;contactNext=result.next;
  }catch(error){if(current())contactNotice=error instanceof Error?error.message:'Contacts could not load.';}
  finally{if(current()){contactBusy=false;changed();}}
 }
 function chooseRecipient(number:string){if(!active||!choosing||busy)return;address(number);choosing=false;contactEpoch++;contactRows=[];composing=true;session.openThread(null);changed();}
 views.messages.render=(st:Bag={},api:Bag={})=>{
 currentApi=api;
 /* A number handed over from Contacts fills the recipients once. */
 if(typeof st?.prefill==='string'&&st.prefill){address(st.prefill.slice(0,230));composing=true;session.openThread(null);queueMicrotask(()=>api.set?.({prefill:null}));}
 /* An incomplete provider row has no content or recipients to present. Listing or
  * selecting one must not imply that its message was shown or prefill a reply. */
 const nativeRows=session.state.rows.map(row=>isIncompleteSmsRow(row)
  ? {id:row.id,address:'Content unavailable',direction:'',when:formatDateTime(new Date(row.date)),body:'Use the system messaging app to view this message.'}
  : {...row,address:row.addresses.join(', '),direction:`${row.direction} · ${row.kind.toUpperCase()} · ${row.status}${row.attachments?' · '+row.attachments+' attachments':''}`,when:formatDateTime(new Date(row.date))});
 const nativeThreads=session.state.threads.map(row=>isIncompleteSmsRow(row)
  ? {id:row.id,label:'Conversation content unavailable',snippet:'Use the system messaging app to view this conversation.',open:()=>{notice='Content unavailable. Use the system messaging app to view this conversation.';changed();}}
  : {...row,label:row.addresses.join(', ')||'Conversation',open:()=>{session.openThread(row.id);const value=threadAddresses(row.addresses);if((!recipients.trim()||recipients===threadFill)&&recipients!==value&&address(value)){threadFill=value;changed();}}});
 const waiting=busy||session.state.busy||shelfBusy,showThread=!choosing&&(!!session.state.thread||composing||!!cameraDraft);
 const query=recipientQuery.trim(),queryDigits=query.replace(/[^0-9]/g,''),isNumber=/^[+0-9(). \-]+$/.test(query)&&queryDigits.length>=3;
 const recentNumbers=[...new Set(session.state.threads.flatMap(row=>isIncompleteSmsRow(row)?[]:row.addresses))].slice(0,3);
 const candidates=query||contactsAll?contactRows.flatMap(row=>(Array.isArray(row.phones)?row.phones:[]).filter((phone:unknown)=>typeof phone==='string'&&phone.trim()).map((phone:string)=>({name:String(row.name||row.displayName||phone),phone}))):recentNumbers.map(phone=>({name:phone,phone}));
 const recipientPicker=choosing?{q:recipientQuery,onQ:(event:Event)=>{recipientQuery=(event.target as HTMLInputElement).value;contactEpoch++;if(recipientQuery.trim()||contactsAll)void findRecipients();else{contactRows=[];contactNotice='';contactBusy=false;}changed();},onKey:(event:KeyboardEvent)=>{if(event.key==='Enter'&&isNumber){event.preventDefault();chooseRecipient(query);}},isNum:isNumber,num:query,goNum:()=>isNumber&&chooseRecipient(query),people:candidates.map(row=>({...row,ini:'',go:()=>chooseRecipient(row.phone)})),openContacts:()=>{contactsAll=true;void findRecipients(true);},more:!!contactNext,loadMore:()=>{if(contactNext&&!contactBusy)void findRecipients(false,true);},busy:contactBusy,notice:contactNotice}:null;
 const names=recipients||'New message';
 const status=session.state.status;
 const setupKind=!status?null:status.permissions.sms!=='granted'?'sms':status.permissions.sendSms!=='granted'?'sendSms':status.permissions.phoneState!=='granted'?'phoneState':(attachments.length>0||draftRecipients().length>1)&&status.roles?.sms?.available&&status.roles.sms.held!==true?'smsRole':null;
 const setupLabel=setupKind==='sms'?'Allow Messages access':setupKind==='sendSms'?'Allow sending messages':setupKind==='phoneState'?'Allow SIM access':setupKind==='smsRole'?'Set Alpha as messaging app':'';
 const bubbles=[...session.state.rows].reverse().map(row=>{
  const incomplete=isIncompleteSmsRow(row),mine=!incomplete&&row.direction==='outgoing';
  const statusLabel=!mine?'':!incomplete&&row.kind==='sms'&&row.deliveryReport==='complete'?'Delivered':!incomplete?({sent:'Sent',failed:'Not sent',queued:'Sending…',draft:'Draft',unknown:'Send status unknown'} as Record<string,string>)[row.status]||'':'';
  return {id:row.id,statusLabel,hasStatus:!!statusLabel,sep:true,sepLabel:formatDateTime(new Date(row.date)),text:incomplete?'This message could not be read.':row.body||(row.attachments?'Picture message':''),isText:true,isPhoto:false,isFile:false,row:'justify-content:'+(mine?'flex-end':'flex-start')+';margin-top:6px',css:(mine?'background:var(--acc);color:var(--alpha-white);':'background:var(--s2);color:var(--fg);')+'border-radius:20px',photoCss:'',openPhoto:()=>{},openFile:()=>{}};
 });
 const t=showThread?{
  name:names,ini:'',unknown:true,hasInitials:false,showContact:!composing,composing,recipients,onRecipients:edit(value=>recipients=value),
  who:()=>{if(!active||waiting)return;contactDraft={owner,revision:draftRevision,thread:session.state.thread};api.open('contacts',{q:draftRecipients()[0]||'',open:null});},call:()=>{const first=draftRecipients()[0];if(first)api.open('phone',{prefill:first});},
  bubbles,typing:false,text:body,hasText:!!body.trim(),busy:waiting,notice:notice||shelfError||(!status&&!session.state.busy?'Messages could not load. Try again.':''),
  atts:attachments.map((item,index)=>({id:item.name,name:item.name,image:previews.get(item)||'',hasImage:previews.has(item),rm:()=>removePicture(index)})),hasAtts:!!attachments.length,
  sendCss:body.trim()||attachments.length?'background:var(--acc);color:var(--alpha-white)':'background:var(--s2);color:var(--mut)',
  onText:edit(value=>body=value),onKey:()=>{},send:()=>void submit(),
  tray,trayCss:tray?'background:var(--fg);color:var(--bg);transform:rotate(45deg)':'background:var(--s2);color:var(--fg)',toggleTray:()=>{if(!waiting){tray=!tray;changed();}},
  attachFile:()=>void attach(),camera:()=>void attach(true),smart:[],hasSmart:false,
  more:!!session.state.next,loadMore:()=>void session.refresh(true),retry:()=>void session.refresh(),
  simChoices:(status?.subscriptions||[]).length>1?(status?.subscriptions||[]).map(row=>({id:String(row.id),label:row.displayName||`SIM ${row.slot+1}`,selected:sim===String(row.id),choose:()=>{if(waiting)return;sim=String(row.id);restoredPending=false;draftRevision++;operationId='';resetMms(false);changed();}})):[],
 }:null;
 return {cleanConversation:true,nativeManaged:true,nativePrototype:false,
  convos:[...savedDrafts.values()].sort((a,b)=>b.updatedAt-a.updatedAt).map(row=>({id:'alpha-draft:'+row.id,name:row.recipients||'New message',ini:'',unknown:true,last:'Draft: '+(row.body||row.pictures.length+' pictures'),time:formatDateTime(new Date(row.updatedAt)),nameW:'500',lastCss:'color:var(--mut)',dot:'transparent',tx:0,down:()=>{},up:()=>{},open:()=>void restoreLocal(row)})).concat(nativeThreads.map(row=>{const unread='unread' in row&&row.unread===true;return {...row,name:row.label,ini:'',unknown:true,last:row.snippet,time:'date' in row?formatDateTime(new Date(row.date)):'',nameW:unread?'700':'500',lastCss:'color:var(--mut)',dot:unread?'var(--acc)':'transparent',tx:0,down:()=>{},up:()=>{},open:()=>{composing=false;tray=false;row.open();}};})),
  inThread:showThread,t,newMsg:async()=>{if(waiting)return;try{await saveLocal();if(!active)return;retireDraft();session.openThread(null);choosing=true;changed();}catch(error){notice=error instanceof Error?error.message:'Draft could not save.';changed();}},picking:choosing,p:recipientPicker,
  searchAvailable:false,searching:false,notSearching:true,sq:'',hasSq:false,empty:!waiting&&!nativeThreads.length&&!savedDrafts.size,emptyText:waiting?'Loading messages…':'No messages',emptyIcon:api.ic?.bubble||'',
  setupLabel,setupAction:async()=>{if(setupKind==='smsRole'){const token=lifecycle;try{await client.requestRole('sms');if(active&&token===lifecycle)await session.refresh();}catch{if(active&&token===lifecycle){notice='Default messaging app could not change. Try again.';changed();}}}else if(setupKind)void permission(setupKind);},more:!!session.state.next,loadMore:()=>void session.refresh(true),
  nativeStatus:session.state.message,nativeRows,nativeReceipts:session.state.receipts.map(row=>({id:row.operationId,label:`${formatDateTime(new Date(row.createdAt))} · Subscription ${row.subscriptionId} · ${receiptLabel(row.status)}`})),nativeThreads,nativeInThread:!!session.state.thread,nativeBack:()=>session.openThread(null),nativeMore:!!session.state.next,nativeBusy:busy||session.state.busy,nativeRefresh:()=>{void session.refresh();void reconcile();},nativeLoadMore:()=>void session.refresh(true),nativeRead:()=>void permission('sms'),nativeSendAccess:()=>void permission('sendSms'),nativeSimAccess:()=>void permission('phoneState'),nativeSims:(session.state.status?.subscriptions||[]).map(row=>({...row,label:`SIM ${row.slot+1}: ${row.displayName}`,pick:()=>{if(busy)return;receipt=null;notice='';sim=String(row.id);restoredPending=false;draftRevision++;operationId='';resetMms(false);changed();}})),nativeSim:sim?`Selected subscription ${sim}`:session.state.status?.permissions.phoneState!=='granted'?'Grant SIM access to select a SIM.':session.state.status?.subscriptions?.length===0?'No active SIM is available.':'Select a SIM below',nativeRecipients:recipients,nativeBody:body,nativeOnRecipients:edit(value=>recipients=value),nativeOnBody:edit(value=>body=value),nativeSend:()=>void send(),nativeSendMms:()=>void sendMms(),nativeAttach:()=>void attach(),nativeMmsAvailable:!!session.state.status?.mmsSend,nativeAttachments:attachments.map((item,index)=>({label:`${item.name} · ${Math.max(1,Math.round(item.bytes.length/1024))} KB`,remove:()=>{if(busy)return;attachments.splice(index,1);restoredPending=false;draftRevision++;operationId='';resetMms(false);receipt=null;notice='';changed();}})),nativeHandoff:()=>void handoff(),nativeNotice:notice,nativeClear:()=>{if(busy)return;draftRevision++;recipients='';body='';operationId='';resetMms(true);notice='';receipt=null;changed();}};};
 p.componentDidMount=function(){mount?.call(this);owner=this;this.smsSelection=()=>{const selected=session.state.status?.subscriptions?.find(row=>String(row.id)===sim);return active&&selected?{kind:'sms-subscription',id:String(selected.id),revision:smsSubscriptionRevision(selected)}:undefined;};lifecycle++;this.smsReturn=watchReturnToApp(()=>void session.refresh());this.smsHide=()=>{if(!document.hidden)picking=false;sync();};document.addEventListener('visibilitychange',this.smsHide);sync();};
 p.componentDidUpdate=function(...args:any[]){update?.apply(this,args);sync();};
 p.componentWillUnmount=function(){this.smsSelection=undefined;this.smsReturn?.();document.removeEventListener('visibilitychange',this.smsHide);if(owner===this){owner=null;active=false;lifecycle++;session.setActive(false);retireDraft();currentApi=undefined;}unmount?.call(this);};
}
