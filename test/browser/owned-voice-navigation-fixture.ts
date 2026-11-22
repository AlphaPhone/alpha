import {openLegacyNotes} from './helpers/legacy-notes';
import {returnToApps} from './app-navigation';
import {expect,type Page} from '@playwright/test';
import {cloudNotesVoiceFixture} from './cloud-notes-voice-fixture';
import {preloadPageModules} from './helpers/page-modules';
// A voice conversation whose spoken turns the agent answers by opening a screen: the real batch
// coordinator, Alpha's sendVoiceTurn and the navigation handshake over closed media and Cloud ports.
// `development` opens the development phone, which has Phone, Messages and Contacts.
export const voice=(page:Page)=>page.getByRole('region',{name:'Voice conversation',exact:true});
export async function setup(page:Page,detent='sheet',development=false,canonicalNotes=false){
 await page.addInitScript(()=>localStorage.setItem('alpha.browser.device.v1',JSON.stringify({askBeforeAgentActions:true})));
 await cloudNotesVoiceFixture(page,true,development);if(!canonicalNotes){await openLegacyNotes(page);await returnToApps(page);}
 await preloadPageModules(page,['/src/runtime/connection-ui.tsx','/src/runtime/alpha-client.ts','/src/runtime/view-navigation.ts','/src/browser/voice.ts','/src/prototype/model.js']);
 await page.evaluate(canonicalNotes=>{
  const modules=(window as any).__alphaModules;
  const {connectionController:c}=modules['/src/runtime/connection-ui.tsx'] as typeof import('/src/runtime/connection-ui.tsx');
  const {alphaClient}=modules['/src/runtime/alpha-client.ts'] as typeof import('/src/runtime/alpha-client.ts');
  const {ViewNavigationClient}=modules['/src/runtime/view-navigation.ts'] as typeof import('/src/runtime/view-navigation.ts');
  const {BrowserVoice}=modules['/src/browser/voice.ts'] as typeof import('/src/browser/voice.ts');
  const {Component}=modules['/src/prototype/model.js'] as typeof import('/src/prototype/model.js');
  const w=window as any,f=w.ownedVoiceNavigation={room:crypto.randomUUID(),installationId:crypto.randomUUID(),session:{origin:'https://owned.invalid',ownerId:'synthetic-owner',agentId:'synthetic-agent',sessionId:'synthetic-session'},peak:0,target:'notes',claims:0,acks:0,inputs:[],requests:[],holdClaim:false,holdAck:false};
  const snapshot={...c.getSnapshot(),kind:'remote',open:false,busy:false,session:f.session};c.getSnapshot=()=>snapshot as any;
  if(canonicalNotes){
   const open=new Promise<void>(resolve=>f.releaseNotesRead=resolve);
   c.getAppRecordClient=()=>({sessionId:f.session.sessionId,identity:f.session,current:()=>true,request:async(path:string,method:string)=>{
    if(path!=='/api/notes/state'||method!=='GET')throw Error('Only the Notes list read is available');
    await open;return {success:true,data:{notes:f.notes??[],trash:[],revision:1}};
   }} as any);
   c.canonicalNotesFilterAvailable=()=>true;
  }
  const pendingActions=c.pendingActions.bind(c);
  c.pendingActions=async(context,signal)=>{
   signal.throwIfAborted();
   if(!f.smsRecovery)return pendingActions(context,signal);
   f.reviewRefreshes=(f.reviewRefreshes??0)+1;
   const proposal=f.smsProposal;
   return proposal?[{...proposal,contextRevision:context.revision,...(f.smsRecovery==='changed'?{description:'To: Carson (+15550100200)\n\nA different message'}:{})}]:[];
  };
  f.enableSmsRecovery=(variant:string)=>{f.smsRecovery=variant;snapshot.phoneActionsAvailable=true;};
  c.prepareVoiceConversation=async signal=>{signal.throwIfAborted();return {conversationId:f.room,session:f.session,connectionEpoch:1};};
  c.voiceConversationCurrent=(binding,foreground=true)=>binding.connectionEpoch===1&&binding.conversationId===f.room&&JSON.stringify(binding.session)===JSON.stringify(f.session)&&(!foreground||!snapshot.open&&!document.hidden);
  const navigation=f.navigation=new ViewNavigationClient(async(path,body,signal)=>{signal.throwIfAborted();f.requests.push({path,body:structuredClone(body)});if(path.endsWith('interact-claim')){f.claims++;if(f.holdClaim)await new Promise<void>(resolve=>f.releaseClaim=resolve);return {claimId:'claim-'+(body as any).requestId};}f.acks++;if(f.holdAck)await new Promise<void>(resolve=>f.releaseAck=resolve);return {accepted:true};},()=>snapshot.session===f.session&&!snapshot.open,()=>alphaClient.getState().context);
  c.captureViewNavigation=context=>({client:navigation,attempt:navigation.capture(context)});
  const transport={session:f.session,send:async input=>{input.signal.throwIfAborted();if(input.channelType!=='VOICE_DM')throw Error('Only new voice turns expected');f.inputs.push({requestId:input.requestId,context:structuredClone(input.context),text:input.text,conversationId:input.expectedConversationId});
   if(f.browserDestination){
    const present=await f.shell.browserNavigateApproved(f.browserDestination,input.signal,true);
    f.browserDestination=undefined;
    return {text:'Opening the website.',messageId:crypto.randomUUID(),userMessageId:crypto.randomUUID(),messageBinding:{conversationId:f.room,session:f.session},completedActions:[{proposalId:crypto.randomUUID(),status:'succeeded',summary:'Opened Browser.',presentBrowser:present}]};
   }
   if(f.projectBeforeReply){
    f.projected=await input.projectRequestedView?.(f.target,input.signal);
    return {text:'Opened '+f.target+'.',messageId:crypto.randomUUID(),userMessageId:crypto.randomUUID(),messageBinding:{conversationId:f.room,session:f.session}};
   }
   if(f.smsDraft){
    const proposal=f.smsProposal={id:'draft-review',title:'Draft SMS',description:f.addressedDraft?'To: Carson (+15550100200)\n\nCan you bring ice?':'To contact: Carson\n\nCan you bring ice?',smsReview:f.addressedDraft?'addressed-draft':'draft',expiresAt:Date.now()+60000,contextRevision:input.context.revision} as const;
    return {text:'Your draft is ready to review.',messageId:crypto.randomUUID(),userMessageId:crypto.randomUUID(),messageBinding:{conversationId:f.room,session:f.session},proposals:[proposal]};
   }
   if(f.smsSendReview){
    const proposal={id:'send-reviewed-text',title:'Review SMS',description:'To: Carson (+15550100200)\n\nCan you bring ice?',smsReview:'send',expiresAt:Date.now()+60000,contextRevision:input.context.revision} as const;
    return {text:'Here is the text to review.',messageId:crypto.randomUUID(),userMessageId:crypto.randomUUID(),messageBinding:{conversationId:f.room,session:f.session},proposals:[proposal]};
   }
   if(f.answer){
    input.onText?.(f.answer,{provisional:false,direct:true});
    return {text:f.answer,messageId:crypto.randomUUID(),userMessageId:crypto.randomUUID(),messageBinding:{conversationId:f.room,session:f.session}};
   }
   const id=crypto.randomUUID(),viewId=f.target==='home'?'chat':f.target,values={mode:'show',viewId,viewPath:'/'+viewId,viewType:'gui',label:f.target,completedActionDelivered:true,completedActionHandoffId:id,navigationPrepared:true,navigationBinding:{clientId:navigation.clientId,requestId:id,viewId,viewType:'gui',installationId:f.installationId}};return {text:'Opened '+f.target+'.',messageId:crypto.randomUUID(),userMessageId:crypto.randomUUID(),messageBinding:{conversationId:f.room,session:f.session},actionResults:[{actionName:'VIEWS_SHOW',success:true,values}]};},execute:async({proposal,signal,approval})=>{
    signal.throwIfAborted();
    const direct=f.smsSendReview&&proposal.id==='send-reviewed-text'&&approval===undefined;
    const draft=f.addressedDraft&&proposal.id==='draft-review'&&approval==='send-draft';
    if(!direct&&!draft)throw Error('No approval or device action is admitted');
    (f.approvedTexts??=[]).push(proposal.id);
    return {proposalId:proposal.id,status:'succeeded',summary:'Text submitted.'};
   }};
  BrowserVoice.prototype.getRecordingMetrics=async function(input){f.mediaDriver=this;if(f.peak>0)(f.speechSamples??=[]).push(performance.now());return {recordingId:input.recordingId,peak:f.peak};};
  BrowserVoice.prototype.synthesize=async(input:any)=>{(f.spoken??=[]).push(input.text);(window as any).cloudNotesVoice.syntheses++;if(f.holdSynthesis)await new Promise<void>(resolve=>f.releaseSynthesis=resolve);return {playbackId:crypto.randomUUID()};};
  BrowserVoice.prototype.play=async function(input:any){f.playAdmissions=(f.playAdmissions||0)+1;f.finishPlayback=()=>void (this as any).notifyListeners('playbackEnded',input);};
  const send=Component.prototype.sendVoiceTurn;Component.prototype.sendVoiceTurn=async function(input:any){try{return await send.call(this,input);}catch(error:any){f.error={message:String(error),stack:error.stack};throw error;}};
  const original=Component.prototype.renderVals;Component.prototype.renderVals=function(){f.shell=this;return original.call(this);};c.close();alphaClient.attachVerifiedTransport(transport);
 },canonicalNotes);
 await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.shell?.live===true)).toBe(true);
 await page.evaluate(async detent=>{const f=(window as any).ownedVoiceNavigation;if(!f.releaseNotesRead)f.notesRaw=await(await import('/src/runtime/browser-notes-document.ts')).readBrowserNotesRaw();f.seed=crypto.randomUUID();const row={id:f.seed,from:'user',text:'Retained target'};f.shell.messageReplyTarget={messageId:f.seed,from:'user',text:row.text,conversationId:f.room,session:f.session};f.shell.messageEditTarget={...f.shell.messageReplyTarget};f.reply=f.shell.messageReplyTarget;f.edit=f.shell.messageEditTarget;await new Promise<void>(resolve=>f.shell.setState({chat:detent,draft:'Retained unsent draft',msgs:[row]},resolve));},detent);
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.shell.startVoice());await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
}
export async function utterance(page:Page,target='notes'){await page.evaluate(target=>{const f=(window as any).ownedVoiceNavigation;f.target=target;(window as any).cloudNotesVoice.transcript=f.prompt??('Please open '+target+'.');f.speechSamples=[];f.peak=.25;},target);await expect.poll(()=>page.evaluate(()=>{const samples=(window as any).ownedVoiceNavigation.speechSamples;return samples.length>=3?samples.at(-1)-samples[0]:0;}),{timeout:15000}).toBeGreaterThanOrEqual(950);await page.evaluate(()=>(window as any).ownedVoiceNavigation.peak=0);}
