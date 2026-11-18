import {test,expect,type Page} from '@playwright/test';
import {cloudNotesVoiceFixture,noPhysicalOrLocalVoice} from './cloud-notes-voice-fixture';

// v610 follow-up: a spoken "go back" with Browser in front. The agent's own Browser command moves
// the page while its voice reply is in flight. The voice conversation compares the published view
// context with the one it sent the turn with, so the new document revision read as the owner
// leaving the page: the conversation ended and the reply was dropped, as the typed reply was
// cancelled before. Real shell, voice adapter, sendVoiceTurn, AlphaClient and Alpha's Browser
// command; the web Browser surface stands in for the WebView. The Cloud speech ports, the agent
// transport and the websites are synthetic; the reply is held open until the page has moved.
// Evidence class: browser test of the web renderer; not a device, WebView, agent or model run.
const voice=(page:Page)=>page.getByRole('region',{name:'Voice conversation',exact:true});
const showing=(page:Page,name:string)=>page.locator('[data-browser-surface]:visible').frameLocator('iframe').getByRole('heading',{name,exact:true});

async function setup(page:Page){
 await cloudNotesVoiceFixture(page);
 const loads:Record<string,number>={};
 await page.route(/^https:\/\/history\.example\//,route=>{const name=new URL(route.request().url()).pathname.slice(1);loads[name]=(loads[name]??0)+1;return route.fulfill({contentType:'text/html',body:`<title>${name}</title><h1>${name}</h1>`});});
 await page.evaluate(async()=>{
  const {connectionController:c}=await import('/src/runtime/connection-ui.tsx'),{alphaClient}=await import('/src/runtime/alpha-client.ts'),{ViewNavigationClient}=await import('/src/runtime/view-navigation.ts'),{BrowserVoice}=await import('/src/browser/voice.ts'),{BrowserSurface}=await import('/src/browser/browser-surface.ts'),{Component}=await import('/src/prototype/model.js');
  const w=window as any,f=w.historyVoice={room:crypto.randomUUID(),session:{origin:'https://history-voice.invalid',ownerId:'synthetic-owner',agentId:'synthetic-agent',sessionId:'synthetic-session'},peak:0,inputs:[] as any[],release:null as null|((text:string)=>void),aborted:0};
  const snapshot={...c.getSnapshot(),kind:'remote',open:false,busy:false,session:f.session};c.getSnapshot=()=>snapshot as any;
  c.prepareVoiceConversation=async signal=>{signal.throwIfAborted();return {conversationId:f.room,session:f.session,connectionEpoch:1};};
  c.voiceConversationCurrent=(binding,foreground=true)=>binding.connectionEpoch===1&&binding.conversationId===f.room&&JSON.stringify(binding.session)===JSON.stringify(f.session)&&(!foreground||!snapshot.open&&!document.hidden);
  const navigation=new ViewNavigationClient(async()=>{throw Error('No view navigation is expected');},()=>false,()=>alphaClient.getState().context);
  c.captureViewNavigation=context=>({client:navigation,attempt:navigation.capture(context)});
  // The reply stays in flight until the spec releases it, as the agent's BROWSER action does.
  const transport={session:f.session,send:async(input:any)=>{input.signal.throwIfAborted();f.inputs.push({text:input.text,context:structuredClone(input.context)});
   const text=await new Promise<string>((resolve,reject)=>{f.release=resolve;input.signal.addEventListener('abort',()=>{f.aborted++;reject(Error('aborted'));},{once:true});});
   return {text,messageId:crypto.randomUUID(),userMessageId:crypto.randomUUID(),messageBinding:{conversationId:f.room,session:f.session}};},execute:async()=>{throw Error('No approval or device action is admitted');}};
  BrowserVoice.prototype.getRecordingMetrics=async function(input){f.mediaDriver=this;if(f.peak>0)(f.speechSamples??=[]).push(performance.now());return {recordingId:input.recordingId,peak:f.peak};};
  BrowserVoice.prototype.synthesize=async()=>{w.cloudNotesVoice.syntheses++;return {playbackId:crypto.randomUUID()};};
  BrowserVoice.prototype.play=async function(input:any){f.finishPlayback=()=>void (this as any).notifyListeners('playbackEnded',input);};
  // The web surface answers commands with nothing; the native plugin answers with the tab it acted on.
  const command=BrowserSurface.prototype.command;BrowserSurface.prototype.command=async function(input){await command.call(this,input);return {session:input.session,id:input.id} as any;};
  const original=Component.prototype.renderVals;Component.prototype.renderVals=function(){f.shell=this;return original.call(this);};c.close();alphaClient.attachVerifiedTransport(transport);
 });
 await expect.poll(()=>page.evaluate(()=>(window as any).historyVoice.shell?.live===true)).toBe(true);
 await page.getByRole('button',{name:'Browser',exact:true}).click();
 for(const path of ['first','second']){
  if(!await page.getByRole('textbox',{name:'Address',exact:true}).isVisible())await page.getByRole('button',{name:'Edit address',exact:true}).click();
  const box=page.getByRole('textbox',{name:'Address',exact:true});await box.fill('https://history.example/'+path);await box.press('Enter');
  await expect(showing(page,path)).toBeVisible();
 }
 await page.evaluate(()=>new Promise<void>(resolve=>(window as any).historyVoice.shell.setState({chat:'sheet'},resolve)));
 await page.evaluate(()=>(window as any).historyVoice.shell.startVoice());await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 return {loads};
}
async function speak(page:Page,text:string){
 await page.evaluate(text=>{const f=(window as any).historyVoice;(window as any).cloudNotesVoice.transcript=text;f.speechSamples=[];f.peak=.25;},text);
 await expect.poll(()=>page.evaluate(()=>{const samples=(window as any).historyVoice.speechSamples;return samples.length>=3?samples.at(-1)-samples[0]:0;}),{timeout:15000}).toBeGreaterThanOrEqual(950);
 await page.evaluate(()=>(window as any).historyVoice.peak=0);
 await expect.poll(()=>page.evaluate(()=>!!(window as any).historyVoice.release)).toBe(true);
}
// The agent's BROWSER back, as Alpha's view-interaction executor runs it: admitted for the reply
// in flight, then dispatched to the selected native tab.
async function agentBack(page:Page){
 return page.evaluate(async()=>{
  const {alphaClient}=await import('/src/runtime/alpha-client.ts'),Capacitor=(window as any).Capacitor;
  const shell=(window as any).historyVoice.shell,selected=alphaClient.getState().context.selectedObject!;
  const native=Capacitor.isNativePlatform;(Capacitor as any).isNativePlatform=()=>true;
  try{
   const release=alphaClient.admitOwnPageChange(shell.browserSelection());
   const result=await shell.browserCommand({subaction:'back'},{id:selected.id,revision:selected.revision},new AbortController().signal,()=>{});
   if(!result?.ok)release();
   return result;
  }finally{(Capacitor as any).isNativePlatform=native;}
 });
}

test('a spoken Browser back keeps the voice conversation and its reply',async({page})=>{
 test.setTimeout(90_000);
 const {loads}=await setup(page);
 await speak(page,'Go back.');
 const before=await page.evaluate(async()=>(await import('/src/runtime/alpha-client.ts')).alphaClient.getState().context.revision);
 expect(await agentBack(page)).toMatchObject({ok:true,data:{dispatched:true}});
 await expect.poll(()=>loads.first??0).toBe(2);
 await expect.poll(()=>page.evaluate(async()=>(await import('/src/runtime/alpha-client.ts')).alphaClient.getState().context.revision)).toBeGreaterThan(before);
 await expect(voice(page)).toBeVisible();
 await page.evaluate(()=>(window as any).historyVoice.release('Went back.'));
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 await expect(page.locator('[data-alpha-message-text]').filter({hasText:/^Went back\.$/})).toHaveCount(1);
 expect(await page.evaluate(()=>(window as any).historyVoice.aborted)).toBe(0);
 await page.evaluate(()=>(window as any).historyVoice.finishPlayback());await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();await expect(voice(page)).toHaveCount(0);await noPhysicalOrLocalVoice(page);
});

test('the owner leaving Browser still ends a spoken reply after the agent\'s own back',async({page})=>{
 test.setTimeout(90_000);
 const {loads}=await setup(page);
 await speak(page,'Go back.');
 await agentBack(page);await expect.poll(()=>loads.first??0).toBe(2);
 await page.evaluate(()=>window.dispatchEvent(new Event('launcher-home')));
 await expect(page.locator('html')).toHaveAttribute('data-active-view','home');
 await expect.poll(()=>page.evaluate(()=>(window as any).historyVoice.aborted)).toBe(1);
 await page.evaluate(()=>(window as any).historyVoice.release('Late reply after leaving Browser.'));
 await page.waitForTimeout(400);
 await expect(page.locator('[data-alpha-message-text]').filter({hasText:'Late reply after leaving Browser.'})).toHaveCount(0);
});
