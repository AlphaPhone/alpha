import {openLegacyNotes} from './helpers/legacy-notes';
import {returnToApps} from './app-navigation';
import {expect,type Page} from '@playwright/test';
import {cloudNotesVoiceFixture} from './cloud-notes-voice-fixture';
// A voice conversation whose spoken turns the agent answers by opening a screen: the real batch
// coordinator, Alpha's sendVoiceTurn and the navigation handshake over closed media and Cloud ports.
// `development` opens the development phone, which has Phone, Messages and Contacts.
export const voice=(page:Page)=>page.getByRole('region',{name:'Voice conversation',exact:true});
export async function setup(page:Page,detent='sheet',development=false){
 await cloudNotesVoiceFixture(page,true,development);await openLegacyNotes(page);await returnToApps(page);
 await page.evaluate(async detent=>{
  const {connectionController:c}=await import('/src/runtime/connection-ui.tsx'),{alphaClient}=await import('/src/runtime/alpha-client.ts'),{ViewNavigationClient}=await import('/src/runtime/view-navigation.ts'),{BrowserVoice}=await import('/src/browser/voice.ts'),{Component}=await import('/src/prototype/model.js');
  const w=window as any,f=w.ownedVoiceNavigation={room:crypto.randomUUID(),installationId:crypto.randomUUID(),session:{origin:'https://owned.invalid',ownerId:'synthetic-owner',agentId:'synthetic-agent',sessionId:'synthetic-session'},peak:0,target:'notes',claims:0,acks:0,inputs:[],requests:[],holdClaim:false,holdAck:false};
  const snapshot={...c.getSnapshot(),kind:'remote',open:false,busy:false,session:f.session};c.getSnapshot=()=>snapshot as any;
  c.prepareVoiceConversation=async signal=>{signal.throwIfAborted();return {conversationId:f.room,session:f.session,connectionEpoch:1};};
  c.voiceConversationCurrent=(binding,foreground=true)=>binding.connectionEpoch===1&&binding.conversationId===f.room&&JSON.stringify(binding.session)===JSON.stringify(f.session)&&(!foreground||!snapshot.open&&!document.hidden);
  const navigation=f.navigation=new ViewNavigationClient(async(path,body,signal)=>{signal.throwIfAborted();f.requests.push({path,body:structuredClone(body)});if(path.endsWith('interact-claim')){f.claims++;if(f.holdClaim)await new Promise<void>(resolve=>f.releaseClaim=resolve);return {claimId:'claim-'+(body as any).requestId};}f.acks++;if(f.holdAck)await new Promise<void>(resolve=>f.releaseAck=resolve);return {accepted:true};},()=>snapshot.session===f.session&&!snapshot.open,()=>alphaClient.getState().context);
  c.captureViewNavigation=context=>({client:navigation,attempt:navigation.capture(context)});
  const transport={session:f.session,send:async input=>{input.signal.throwIfAborted();if(input.channelType!=='VOICE_DM')throw Error('Only new voice turns expected');f.inputs.push({requestId:input.requestId,context:structuredClone(input.context),text:input.text,conversationId:input.expectedConversationId});
   if(f.projectBeforeReply){
    f.projected=await input.projectRequestedView?.(f.target,input.signal);
    return {text:'Opened '+f.target+'.',messageId:crypto.randomUUID(),userMessageId:crypto.randomUUID(),messageBinding:{conversationId:f.room,session:f.session}};
   }
   if(f.smsDraft){
    const proposal={id:'draft-review',title:'Draft SMS',description:'To: Carson\n\nCan you bring ice?',smsReview:'draft',expiresAt:Date.now()+60000,contextRevision:input.context.revision} as const;
    return {text:'Your draft is ready to review.',messageId:crypto.randomUUID(),userMessageId:crypto.randomUUID(),messageBinding:{conversationId:f.room,session:f.session},proposals:[proposal]};
   }
   if(f.answer){
    input.onText?.(f.answer,{provisional:false,direct:true});
    return {text:f.answer,messageId:crypto.randomUUID(),userMessageId:crypto.randomUUID(),messageBinding:{conversationId:f.room,session:f.session}};
   }
   const id=crypto.randomUUID(),viewId=f.target==='home'?'chat':f.target,values={mode:'show',viewId,viewPath:'/'+viewId,viewType:'gui',label:f.target,completedActionDelivered:true,completedActionHandoffId:id,navigationPrepared:true,navigationBinding:{clientId:navigation.clientId,requestId:id,viewId,viewType:'gui',installationId:f.installationId}};return {text:'Opened '+f.target+'.',messageId:crypto.randomUUID(),userMessageId:crypto.randomUUID(),messageBinding:{conversationId:f.room,session:f.session},actionResults:[{actionName:'VIEWS_SHOW',success:true,values}]};},execute:async()=>{throw Error('No approval or device action is admitted');}};
  BrowserVoice.prototype.getRecordingMetrics=async function(input){f.mediaDriver=this;if(f.peak>0)(f.speechSamples??=[]).push(performance.now());return {recordingId:input.recordingId,peak:f.peak};};
  BrowserVoice.prototype.synthesize=async(input:any)=>{(f.spoken??=[]).push(input.text);(window as any).cloudNotesVoice.syntheses++;if(f.holdSynthesis)await new Promise<void>(resolve=>f.releaseSynthesis=resolve);return {playbackId:crypto.randomUUID()};};
  BrowserVoice.prototype.play=async function(input:any){f.playAdmissions=(f.playAdmissions||0)+1;f.finishPlayback=()=>void (this as any).notifyListeners('playbackEnded',input);};
  const send=Component.prototype.sendVoiceTurn;Component.prototype.sendVoiceTurn=async function(input:any){try{return await send.call(this,input);}catch(error:any){f.error={message:String(error),stack:error.stack};throw error;}};
  const original=Component.prototype.renderVals;Component.prototype.renderVals=function(){f.shell=this;return original.call(this);};c.close();alphaClient.attachVerifiedTransport(transport);
 },detent);
 await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.shell?.live===true)).toBe(true);
 await page.evaluate(async detent=>{const f=(window as any).ownedVoiceNavigation;f.notesRaw=await(await import('/src/runtime/browser-notes-document.ts')).readBrowserNotesRaw();f.seed=crypto.randomUUID();const row={id:f.seed,from:'user',text:'Retained target'};f.shell.messageReplyTarget={messageId:f.seed,from:'user',text:row.text,conversationId:f.room,session:f.session};f.shell.messageEditTarget={...f.shell.messageReplyTarget};f.reply=f.shell.messageReplyTarget;f.edit=f.shell.messageEditTarget;await new Promise<void>(resolve=>f.shell.setState({chat:detent,draft:'Retained unsent draft',msgs:[row]},resolve));},detent);
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.shell.startVoice());await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
}
export async function utterance(page:Page,target='notes'){await page.evaluate(target=>{const f=(window as any).ownedVoiceNavigation;f.target=target;(window as any).cloudNotesVoice.transcript=f.prompt??('Please open '+target+'.');f.speechSamples=[];f.peak=.25;},target);await expect.poll(()=>page.evaluate(()=>{const samples=(window as any).ownedVoiceNavigation.speechSamples;return samples.length>=3?samples.at(-1)-samples[0]:0;}),{timeout:15000}).toBeGreaterThanOrEqual(950);await page.evaluate(()=>(window as any).ownedVoiceNavigation.peak=0);}
