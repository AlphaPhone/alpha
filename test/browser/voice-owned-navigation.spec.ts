import {test,expect,type Page} from '@playwright/test';
import {noPhysicalOrLocalVoice} from './cloud-notes-voice-fixture';
import {setup,utterance,voice} from './owned-voice-navigation-fixture';
// surface: where Talk from the hidden chat lands. Cloud speech opens the voice sheet; once a refused
// Cloud request has held this account on on-device speech, the Home pill holds the conversation.
async function restartVoice(page:Page,surface:'sheet'|'pill'){
 await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();
 await expect(voice(page)).toHaveCount(0);
 // The composer keeps its unsent draft and shows Send. Talk is available from
 // the pill, a pull down from the bar, without editing the draft.
 await page.getByRole('button',{name:'Minimize chat',exact:true}).click();
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.shell.setState({chat:'hidden'}));
 expect(await page.evaluate(async()=>(await import('/src/runtime/voice-selection.ts')).speechRoute())).toBe(surface==='sheet'?'cloud':'device');
 await page.getByRole('button',{name:'Talk',exact:true}).click({timeout:5000});
 if(surface==='sheet'){await expect(voice(page)).toBeVisible();await expect(page.locator('[data-alpha-pill-voice]')).toHaveCount(0);return;}
 await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.shell.swallowed())).toBe(false);
 await page.locator('[data-alpha-pill-voice]').getByRole('button',{name:'Open conversation',exact:true}).press('Enter',{timeout:5000});
}
test.afterEach(async({page},info)=>{if(info.status!==info.expectedStatus)await info.attach('closed-source-debug',{body:JSON.stringify(await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;return {error:f?.error,inputs:f?.inputs,requests:f?.requests,state:f?.shell?.S(),cloud:(window as any).cloudNotesVoice};})),contentType:'application/json'});});
for(const detent of ['sheet','full'])test(`canonical own Notes Calendar Home navigation keeps ${detent} voice through matching speech and rearm`,async({page},info)=>{
 await setup(page,detent);const originalContexts:any[]=[];
 for(const [index,target] of ['notes','calendar','home'].entries()){
  if(target==='home')await page.evaluate(()=>(window as any).ownedVoiceNavigation.prompt='Open Home and keep our conversation open.');
  await utterance(page,target);await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');await expect(voice(page).getByRole('button',{name:'Stop voice conversation',exact:true})).toBeVisible();await expect(page.locator('html')).toHaveAttribute('data-active-view',target);
  const observed=await page.evaluate(async()=>{const f=(window as any).ownedVoiceNavigation;return {chat:f.shell.S().chat,toast:f.shell.S().toast,claims:f.claims,acks:f.acks,draft:f.shell.S().draft,reply:f.shell.messageReplyTarget===f.reply,edit:f.shell.messageEditTarget===f.edit,notes:await(await import('/src/runtime/browser-notes-document.ts')).readBrowserNotesRaw()===f.notesRaw,inputs:f.inputs,requests:f.requests,starts:(window as any).cloudNotesVoice.starts};});
  expect(observed).toMatchObject({chat:detent,toast:'',claims:index+1,acks:index+1,draft:'Retained unsent draft',reply:true,edit:true,notes:true,starts:index+1});expect(observed.inputs[index].context.view).toBe(index===0?'home':['notes','calendar'][index-1]);expect(observed.inputs.every((input:any)=>input.conversationId===observed.inputs[0].conversationId)).toBe(true);const claim=observed.requests[index*2],ack=observed.requests[index*2+1];expect(claim.path).toBe('/api/views/interact-claim');expect(ack.path).toBe('/api/views/interact-result');expect(ack.body).toMatchObject({...claim.body,success:true,result:{switched:true}});originalContexts.push(observed.inputs[index].context);expect(observed.inputs.map((input:any)=>input.context)).toEqual(originalContexts);
  await page.screenshot({path:info.outputPath(target+'-'+detent+'.png'),animations:'disabled'});await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());await expect(voice(page)).toHaveAttribute('data-voice-state','listening');if(index<2)await page.waitForTimeout(1600);
 }
 await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();await expect(voice(page)).toHaveCount(0);await noPhysicalOrLocalVoice(page);
});
test('a standalone spoken Home request switches the screen without an inference request',async({page})=>{
 await setup(page);
 await utterance(page,'notes');
 await expect(page.locator('html')).toHaveAttribute('data-active-view','notes');
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 await page.evaluate(()=>{
  const f=(window as any).ownedVoiceNavigation;
  f.finishPlayback();f.prompt='Okay, thank you. Can you go home now?';
 });
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await utterance(page);
 await expect(page.locator('html')).toHaveAttribute('data-active-view','home');
 await expect(page.getByText('You’re on Home.',{exact:true})).toBeVisible();
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.inputs.length)).toBe(1);
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
});
for(const detent of ['sheet','full'])test(`a completed website request keeps Talk in the same ${detent} for a spoken page question`,async({page})=>{
 await setup(page,detent);
 const url='https://voice-browser.example/demo';
 await page.route(url,route=>route.fulfill({contentType:'text/html',body:'<h1>Proof of page</h1>'}));
 await page.evaluate(url=>{
  const f=(window as any).ownedVoiceNavigation;
  f.browserDestination=url;
  f.prompt='Visit '+url;
 },url);
 await utterance(page);
 await expect(page.locator('html')).toHaveAttribute('data-active-view','browser');
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.shell.browserSelection()?.kind)).toBe('browser-tab');
 if(detent==='sheet')await expect(page.locator('[data-browser-surface]:visible').frameLocator('iframe').getByRole('heading',{name:'Proof of page'})).toBeVisible();
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await page.evaluate(()=>{
  const f=(window as any).ownedVoiceNavigation;
  f.prompt='Summarize the page I have open in one sentence.';
  f.answer='This page has a heading that says Proof of page.';
 });
 await page.waitForTimeout(1600);
 await utterance(page);
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 await expect.poll(()=>page.evaluate(()=>{
  const f=(window as any).ownedVoiceNavigation;
  return {inputs:f.inputs.map((item:any)=>[item.conversationId===f.room,item.context.view]),chat:f.shell.S().chat,draft:f.shell.S().draft,spoken:f.spoken.at(-1)};
 })).toEqual({inputs:[[true,'home'],[true,'browser']],chat:detent,draft:'Retained unsent draft',spoken:'This page has a heading that says Proof of page.'});
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();
 await noPhysicalOrLocalVoice(page);
});

test('a late native-style document update after Browser opens keeps the original Talk session',async({page})=>{
 await setup(page);
 const url='https://voice-browser.example/delayed';
 let loadPage:()=>void;
 const released=new Promise<void>(resolve=>{loadPage=resolve;});
 await page.route(url,async route=>{
  await released;
  await route.fulfill({contentType:'text/html',body:'<h1>Delayed page</h1>'});
 });
 await page.evaluate(async url=>{
  const f=(window as any).ownedVoiceNavigation;
  f.browserDestination=url;
  f.prompt='Visit '+url;
  const {BrowserSurface}=await import('/src/browser/browser-surface.ts');
  const original=BrowserSurface.prototype.navigate;
  BrowserSurface.prototype.navigate=async function(input){
   await original.call(this,input);
   const surface=this as any,tab=surface.tab(input);
   f.reportRedirect=()=>{
    tab.navigation++;
    tab.history[tab.position]=url+'/';
    surface.emit(tab);
   };
  };
 },url);
 try{
  await utterance(page);
  await expect(page.locator('html')).toHaveAttribute('data-active-view','browser');
  await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
  const old=await page.evaluate(()=>(window as any).ownedVoiceNavigation.shell.browserSelection());
  await page.evaluate(()=>(window as any).ownedVoiceNavigation.reportRedirect());
  await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.shell.browserSelection()?.revision)).not.toBe(old.revision);
  await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
  loadPage!();
  await expect(page.locator('[data-browser-surface]:visible').frameLocator('iframe').getByRole('heading',{name:'Delayed page'})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.shell.browserOpeningTab())).toBeUndefined();
  await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
  await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
  await page.evaluate(()=>{
   const f=(window as any).ownedVoiceNavigation;
   f.prompt='Summarize the page I have open in one sentence.';
   f.answer='This is the delayed page.';
  });
  await page.waitForTimeout(1600);
  await utterance(page);
  await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
  expect(await page.evaluate(()=>{
   const f=(window as any).ownedVoiceNavigation;
   return {sameRoom:f.inputs.every((input:any)=>input.conversationId===f.room),view:f.inputs.at(-1).context.view,spoken:f.spoken.at(-1)};
  })).toEqual({sameRoom:true,view:'browser',spoken:'This is the delayed page.'});
  await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
  await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
  await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();
 }finally{loadPage!();}
});

const unconfirmedBrowserReply='I couldn’t confirm that the requested screen opened.';
for(const canPresent of [true,false])test(`Talk reports the Browser result after foreground presentation (${canPresent?'shown':'refused'})`,async({page})=>{
 await setup(page);
 const url='https://voice-browser.example/demo';
 await page.route(url,route=>route.fulfill({contentType:'text/html',body:'<h1>Proof of page</h1>'}));
 await page.evaluate(({url,canPresent,reply})=>{
  const f=(window as any).ownedVoiceNavigation;
  f.browserDestination=url;
  f.browserReply=reply;
  f.browserPresentationRefused=!canPresent;
  f.prompt='Can you open '+url+' in the browser?';
 },{url,canPresent,reply:unconfirmedBrowserReply});
 await utterance(page);
 await expect(page.locator('html')).toHaveAttribute('data-active-view',canPresent?'browser':'home');
 if(canPresent){
  await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
  await expect(page.locator('[data-browser-surface]:visible').frameLocator('iframe').getByRole('heading',{name:'Proof of page'})).toBeVisible();
  await expect(page.getByText('Browser is open.',{exact:true})).toHaveCount(1);
  await expect(page.getByText(unconfirmedBrowserReply,{exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.spoken)).toEqual(['Browser is open.']);
  await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
  await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 }else{
  await expect(page.getByText(unconfirmedBrowserReply,{exact:true})).toHaveCount(1);
  await expect(voice(page)).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.spoken??[])).toEqual([]);
 }
 expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.inputs.length)).toBe(1);
});

test('typed Browser navigation reports the visible tab and leaves chat open',async({page})=>{
 await setup(page);
 await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();
 const url='https://voice-browser.example/demo';
 await page.route(url,route=>route.fulfill({contentType:'text/html',body:'<h1>Proof of page</h1>'}));
 await page.evaluate(async({url,reply})=>{
  const f=(window as any).ownedVoiceNavigation;
  const {connectionController}=await import('/src/runtime/connection-ui.tsx');
  connectionController.getSelectedConversationId=()=>f.room;
  f.allowTyped=true;
  f.browserDestination=url;
  f.browserReply=reply;
  f.shell.messageReplyTarget=f.shell.messageEditTarget=undefined;
 },{url,reply:unconfirmedBrowserReply});
 const composer=page.getByRole('textbox',{name:'Message Alpha',exact:true}).filter({visible:true});
 await composer.fill('Can you open '+url+' in the browser?');
 await page.getByRole('button',{name:'Send',exact:true}).filter({visible:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-active-view','browser');
 await expect(page.getByText('Browser is open.',{exact:true})).toHaveCount(1);
 await expect(page.getByText(unconfirmedBrowserReply,{exact:true})).toHaveCount(0);
 await expect(composer).toBeVisible();
});

for(const stage of ['claim','ack'])test(`Stop while ${stage} is held retires own navigation without speech or rearm`,async({page},info)=>{await setup(page);await page.evaluate(stage=>{(window as any).ownedVoiceNavigation[stage==='claim'?'holdClaim':'holdAck']=true;},stage);await utterance(page);await expect.poll(()=>page.evaluate(stage=>(window as any).ownedVoiceNavigation[stage==='claim'?'claims':'acks'],stage)).toBe(1);await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();await page.evaluate(stage=>(window as any).ownedVoiceNavigation[stage==='claim'?'releaseClaim':'releaseAck'](),stage);await page.waitForTimeout(400);expect(await page.evaluate(()=>({speech:(window as any).cloudNotesVoice.syntheses,starts:(window as any).cloudNotesVoice.starts,acks:(window as any).ownedVoiceNavigation.acks}))).toEqual({speech:0,starts:1,acks:1});const replies=await page.evaluate(()=>(window as any).ownedVoiceNavigation.requests.filter((request:any)=>request.path.endsWith('interact-result')));expect(replies).toHaveLength(1);expect(replies[0].body).toMatchObject({claimId:'claim-'+replies[0].body.requestId,success:stage==='ack',result:{switched:stage==='ack'}});await expect(page.locator('html')).toHaveAttribute('data-active-view',stage==='claim'?'home':'notes');await noPhysicalOrLocalVoice(page);});
for(const change of ['user-navigation','account','selection'])test(`held ACK refuses voice continuation after ${change}`,async({page})=>{await setup(page);await page.evaluate(()=>(window as any).ownedVoiceNavigation.holdAck=true);await utterance(page);await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.acks)).toBe(1);await page.evaluate(async change=>{const f=(window as any).ownedVoiceNavigation;if(change==='user-navigation')f.shell.openView('calendar');else if(change==='account'){(window as any).cloudNotesVoice.owner='replacement';(await import('/src/runtime/connection-ui.tsx')).connectionController.close();}else{const {alphaClient}=await import('/src/runtime/alpha-client.ts');alphaClient.setViewContext({...alphaClient.getState().context,selectedObject:{kind:'note',id:'new-user-selection',revision:'2'}});}f.releaseAck();},change);await page.waitForTimeout(400);expect(await page.evaluate(()=>({speech:(window as any).cloudNotesVoice.syntheses,starts:(window as any).cloudNotesVoice.starts}))).toEqual({speech:0,starts:1});await noPhysicalOrLocalVoice(page);});

test('Stop after accepted own ACK while TTS preparation is held admits no playback or rearm',async({page})=>{await setup(page);await page.evaluate(()=>(window as any).ownedVoiceNavigation.holdSynthesis=true);await utterance(page);await expect.poll(()=>page.evaluate(()=>typeof(window as any).ownedVoiceNavigation.releaseSynthesis)).toBe('function');await expect(page.locator('html')).toHaveAttribute('data-active-view','notes');await expect(voice(page)).toHaveAttribute('data-voice-state','preparing-speech');expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.acks)).toBe(1);await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();await page.evaluate(()=>(window as any).ownedVoiceNavigation.releaseSynthesis());await page.waitForTimeout(400);expect(await page.evaluate(()=>({plays:(window as any).ownedVoiceNavigation.playAdmissions||0,starts:(window as any).cloudNotesVoice.starts}))).toEqual({plays:0,starts:1});await noPhysicalOrLocalVoice(page);});

// These probes keep the real batch coordinator, Alpha sendVoiceTurn and navigation
// handshake. Only the closed media/Cloud transport ports are synthetic.
test('empty ASR stops without a turn and explicit restart sends the next spoken navigation exactly once',async({page})=>{
 await setup(page);await page.evaluate(()=>(window as any).cloudNotesVoice.empty=true);
 await utterance(page);await expect(voice(page)).toHaveAttribute('data-voice-state','error');
 expect(await page.evaluate(()=>(window as any).cloudNotesVoice.active)).toBe(null);
 expect(await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation,c=(window as any).cloudNotesVoice;return {inputs:f.inputs.length,claims:f.claims,acks:f.acks,speech:c.syntheses,uploads:c.uploads};})).toEqual({inputs:0,claims:0,acks:0,speech:0,uploads:1});
 await page.evaluate(()=>(window as any).cloudNotesVoice.empty=false);await restartVoice(page,'sheet');
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.inputs.length)).toBe(0);
 await utterance(page,'calendar');
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');await expect(page.locator('html')).toHaveAttribute('data-active-view','calendar');
 expect(await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation,c=(window as any).cloudNotesVoice;return {inputs:f.inputs.length,claims:f.claims,acks:f.acks,speech:c.syntheses,uploads:c.uploads,draft:f.shell.S().draft};})).toEqual({inputs:1,claims:1,acks:1,speech:1,uploads:2,draft:'Retained unsent draft'});
 await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();await noPhysicalOrLocalVoice(page);
});

test('billing failure requires explicit restart and does not replay the failed utterance',async({page})=>{
 await setup(page);await page.evaluate(()=>(window as any).cloudNotesVoice.billing=true);await utterance(page);
 await expect(voice(page)).toHaveAttribute('data-voice-state','error');// Failure text stays quiet; the explicit restart is what the owner gets.
 await expect(voice(page)).not.toContainText('billing');await expect(voice(page).getByRole('button',{name:'Stop voice conversation',exact:true})).toBeEnabled();
 await page.waitForTimeout(1000);
 expect(await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation,c=(window as any).cloudNotesVoice;return {inputs:f.inputs.length,starts:c.starts,speech:c.syntheses,uploads:c.uploads,active:c.active};})).toEqual({inputs:0,starts:1,speech:0,uploads:1,active:null});
 await page.evaluate(()=>(window as any).cloudNotesVoice.billing=false);await restartVoice(page,'pill');await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.inputs.length)).toBe(0);
 await utterance(page,'notes');await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 expect(await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation,c=(window as any).cloudNotesVoice;return {inputs:f.inputs.length,claims:f.claims,acks:f.acks,speech:c.syntheses,uploads:c.uploads};})).toEqual({inputs:1,claims:1,acks:1,speech:1,uploads:2});
 await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();
 // A refused Cloud request first checks on-device speech (refused here), never synthesizes on it,
 // and only then shows the Cloud failure: exactly one readiness probe and no other local or physical media.
 expect(await page.evaluate(()=>{const f=(window as any).cloudNotesVoice;return {mic:f.mic,plays:f.plays,local:f.local,localProbes:f.localProbes,paired:f.paired};})).toEqual({mic:0,plays:0,local:1,localProbes:1,paired:0});
});

for(const retirement of ['stop','account'])test(`late held ASR after ${retirement} admits no navigation, send or media rearm`,async({page})=>{
 await setup(page);await page.evaluate(()=>(window as any).cloudNotesVoice.hold=true);await utterance(page);await expect(voice(page)).toHaveAttribute('data-voice-state','transcribing');
 if(retirement==='stop')await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();
 else await page.evaluate(async()=>{(window as any).cloudNotesVoice.owner='replacement';(await import('/src/runtime/connection-ui.tsx')).connectionController.close();});
 await expect(voice(page)).toHaveCount(0);await page.evaluate(()=>(window as any).cloudNotesVoice.release());await page.waitForTimeout(700);
 expect(await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation,c=(window as any).cloudNotesVoice;return {inputs:f.inputs.length,claims:f.claims,acks:f.acks,starts:c.starts,speech:c.syntheses,draft:f.shell.S().draft};})).toEqual({inputs:0,claims:0,acks:0,starts:1,speech:0,draft:'Retained unsent draft'});await noPhysicalOrLocalVoice(page);
});


test('idle capture expiry and stale stop callbacks neither upload silence nor end the replacement capture',async({page})=>{
 await setup(page);
 await expect.poll(()=>page.evaluate(()=>!!(window as any).ownedVoiceNavigation.mediaDriver&&(window as any).cloudNotesVoice.active!==null)).toBe(true);
 const old=await page.evaluate(async()=>{const f=(window as any).ownedVoiceNavigation,c=(window as any).cloudNotesVoice;const recordingId=c.active;await f.mediaDriver.notifyListeners('recordingStopped',{recordingId,durationMs:59000});return recordingId;});
 await expect.poll(()=>page.evaluate(()=>(window as any).cloudNotesVoice.starts)).toBe(2);await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await page.evaluate(async recordingId=>{const f=(window as any).ownedVoiceNavigation;await f.mediaDriver.notifyListeners('recordingStopped',{recordingId,durationMs:59000});},old);await page.waitForTimeout(500);
 expect(await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation,c=(window as any).cloudNotesVoice;return {starts:c.starts,uploads:c.uploads,inputs:f.inputs.length,claims:f.claims,speech:c.syntheses};})).toEqual({starts:2,uploads:0,inputs:0,claims:0,speech:0});
 await utterance(page,'calendar');await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.inputs.length)).toBe(1);
 await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();await noPhysicalOrLocalVoice(page);
});
// A spoken "open camera" from the voice sheet: the conversation keeps its detent on Camera, as typed navigation
// does, so the voice conversation held by its sheet continues and the screen change is acknowledged.
test('spoken Camera navigation keeps the voice sheet and acknowledges the switch',async({page})=>{
 await setup(page,'sheet');
 await utterance(page,'camera');
 await expect(page.locator('html')).toHaveAttribute('data-active-view','camera');
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 const observed=await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;return {chat:f.shell.S().chat,toast:f.shell.S().toast,acks:f.acks,ack:f.requests.find((request:any)=>request.path.endsWith('interact-result'))?.body};});
 expect(observed).toMatchObject({chat:'sheet',toast:'',acks:1,ack:{success:true,result:{switched:true}}});
 // Camera's own preview asks for media here, so only the voice conversation's end is checked.
 await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();await expect(voice(page)).toHaveCount(0);
});


test('a voice draft suggestion speaks naturally while chat keeps the full recipient, subject and body',async({page})=>{
 await setup(page);
 const answer="Got it. Here's the draft:\n\nTo: owner@example.com\nSubject: Tomorrow's shoot\n\nBring the tripod at 9:30.\n\nReady to send whenever you are.";
 await page.evaluate(answer=>{
  const f=(window as any).ownedVoiceNavigation;
  f.answer=answer;
  f.prompt='Draft an email about the shoot.';
 },answer);
 await utterance(page);
 await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.spoken)).toEqual(['The suggested email is in the chat.']);
 expect(await page.evaluate(()=> (window as any).ownedVoiceNavigation.shell.S().msgs.filter((m:any)=>m.from==='agent').at(-1)?.text)).toBe(answer);
 await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();
 await expect(voice(page)).toHaveCount(0);
 expect(await page.evaluate(()=> (window as any).ownedVoiceNavigation.shell.S().msgs.filter((m:any)=>m.from==='agent').at(-1)?.text)).toBe(answer);
});
test('a requested app projected before the reply keeps the voice sheet and rearms',async({page})=>{
 await setup(page);
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.projectBeforeReply=true);
 await utterance(page,'notes');
 await expect(page.locator('html')).toHaveAttribute('data-active-view','notes');
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 expect(await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;return {projected:f.projected,chat:f.shell.S().chat,error:f.error};})).toEqual({projected:true,chat:'sheet',error:undefined});
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
});

for(const when of ['during the ACK','after opening'])test(`Talk survives the first canonical Notes list load ${when}`,async({page})=>{
 await setup(page,'sheet',false,true);
 const held=when==='during the ACK';
 await page.evaluate(held=>{(window as any).ownedVoiceNavigation.holdAck=held;},held);
 await utterance(page,'notes');
 await expect(page.locator('html')).toHaveAttribute('data-active-view','notes');
 if(held)await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.acks)).toBe(1);
 else await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.releaseNotesRead());
 await expect.poll(()=>page.evaluate(async()=>{
  const {alphaClient}=await import('/src/runtime/alpha-client.ts');
  return alphaClient.getState().context.selectedObject?.kind;
 })).toBe('canonical-note-source');
 if(held)await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;f.holdAck=false;f.releaseAck();});
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;f.prompt='Read my checklist.';f.answer='Your checklist is ready.';});
 await utterance(page);
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 expect(await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;return f.inputs.at(-1).context.selectedObject;}))
  .toEqual({kind:'canonical-note-source',id:'notes',revision:'1'});
});

test('an unresolved text draft asks who should receive it and returns to listening',async({page})=>{
 await setup(page);
 await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;f.smsDraft=true;f.prompt='Draft a text to Carson asking him to bring ice.';});
 await utterance(page);
 await expect(page.getByRole('button',{name:/Draft SMS.*Choose recipient/})).toBeVisible();
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.spoken)).toEqual(['Who should get this text? Say their full name or choose a recipient on your phone.']);
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
});

for(const spoken of ['Hmm, send this.', 'Yeah, I think I wanna send it.'])test(`spoken confirmation ${spoken} confirms one visible SMS without forwarding the command`,async({page})=>{
 await setup(page,'full');
 await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;f.smsSendReview=true;f.prompt='Text Carson. Can you bring ice?';});
 await utterance(page);
 const card=page.locator('[data-alpha-voice-send-review="send-reviewed-text"]');
 await expect(card).toContainText('Carson (+15550100200)');
 await expect(card).toContainText('Can you bring ice?');
 await expect(card).toContainText('Say “Send this text”');
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await page.evaluate(prompt=>{(window as any).ownedVoiceNavigation.prompt=prompt;},spoken);
 await utterance(page);
 await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.approvedTexts)).toEqual(['send-reviewed-text']);
 await expect(page.getByText('Text submitted.',{exact:true})).toBeVisible();
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await page.evaluate(()=>{(window as any).ownedVoiceNavigation.prompt='Hmm, send this text.';});
 await utterance(page);
 await expect(page.getByText('Give me the recipient and message you want to send.',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;return {requests:f.inputs.length,approvals:f.approvedTexts};})).toEqual({requests:1,approvals:['send-reviewed-text']});
});

test('an addressed draft sends once by voice without leaving Talk or opening Messages',async({page})=>{
 await setup(page,'full');
 await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;f.enableSmsRecovery('same');f.smsDraft=true;f.addressedDraft=true;f.prompt='Draft a text to Carson asking him to bring ice.';});
 await utterance(page);
 const card=page.locator('[data-alpha-voice-send-review="draft-review"]');
 await expect(card).toContainText('Carson (+15550100200)');
 await expect(card).toContainText('Can you bring ice?');
 await expect(card).toContainText('Say “Send this text”');
 expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.approvedTexts??[])).toEqual([]);
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.reviewRefreshes)).toBeGreaterThan(0);
 await page.evaluate(()=>{(window as any).ownedVoiceNavigation.prompt='Send this text.';});
 await utterance(page);
 await expect(page.getByText('Text submitted.',{exact:true})).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('data-active-view','home');
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await utterance(page);
 await expect(page.getByText('Give me the recipient and message you want to send.',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;return {requests:f.inputs.length,approvals:f.approvedTexts};})).toEqual({requests:1,approvals:['draft-review']});
});

test('a changed background SMS review cannot inherit the live voice confirmation',async({page})=>{
 await setup(page,'full');
 await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;f.enableSmsRecovery('changed');f.smsDraft=true;f.addressedDraft=true;f.prompt='Draft a text to Carson asking him to bring ice.';});
 await utterance(page);
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await expect(page.getByText('A different message',{exact:false})).toBeVisible();
 await expect(page.locator('[data-alpha-voice-send-review="draft-review"]')).toHaveCount(0);
 await page.evaluate(()=>{(window as any).ownedVoiceNavigation.prompt='Send this text.';});
 await utterance(page);
 await expect(page.getByText('Give me the recipient and message you want to send.',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.approvedTexts??[])).toEqual([]);
});

test('speaking Send this text with an unresolved draft stages no send and forwards no command',async({page})=>{
 await setup(page,'full');
 await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;f.smsDraft=true;f.prompt='Draft a text to Carson.';});
 await utterance(page);
 await expect(page.getByRole('button',{name:/Draft SMS.*Choose recipient/})).toBeVisible();
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await page.evaluate(()=>{(window as any).ownedVoiceNavigation.prompt='Send this text.';});
 await utterance(page);
 await expect(page.getByText('Give me the recipient and message you want to send.',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;return {requests:f.inputs.length,approvals:f.approvedTexts??[]};})).toEqual({requests:1,approvals:[]});
});

test('speaking Send this text cannot approve an addressed card hidden from the owner',async({page})=>{
 await setup(page,'full');
 await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;f.smsSendReview=true;f.prompt='Text Carson. Can you bring ice?';});
 await utterance(page);
 const card=page.locator('[data-alpha-voice-send-review="send-reviewed-text"]');
 await expect(card).toBeVisible();
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await card.evaluate(row=>row.setAttribute('hidden',''));
 await page.evaluate(()=>{(window as any).ownedVoiceNavigation.prompt='Send this text.';});
 await utterance(page);
 await expect(page.getByText('Give me the recipient and message you want to send.',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.approvedTexts??[])).toEqual([]);
});

test('a vague yes does not approve the open SMS review',async({page})=>{
 await setup(page,'full');
 await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;f.smsSendReview=true;f.prompt='Text Carson. Can you bring ice?';});
 await utterance(page);
 await expect(page.locator('[data-alpha-voice-send-review="send-reviewed-text"]')).toBeVisible();
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 await page.evaluate(()=>{const f=(window as any).ownedVoiceNavigation;f.finishPlayback();f.smsSendReview=false;f.prompt='Yeah.';});
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await utterance(page);
 await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.inputs.length)).toBe(2);
 expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.approvedTexts??[])).toEqual([]);
});

test('Talk speaks calendar clock ranges as ranges without altering phone numbers or dates',async({page})=>{
 await page.goto('/?mode=dev');
 const spoken=await page.evaluate(async()=>{
  const {toSpeakableText}=await import('/src/ui/voice/voice-chat-playback.ts');
  return ['2-3 p.m., 3–4 p.m., or 4-5 p.m.','10:30–11:00','3:00 PM PM','Call 415-555-0100 on 2026-11-21.'].map(toSpeakableText);
 });
 expect(spoken).toEqual(['2 to 3 pm, 3 to 4 pm, or 4 to 5 pm.','10:30 to 11:00','3:00 PM','Call 415-555-0100 on 2026-11-21.']);
});

test('Talk sends natural speech for the recorded Calendar reply and keeps the display text',async({page})=>{
 await setup(page,'full');
 const answer='Here are three 30-minute options for tomorrow afternoon:\n1. Sun, Nov 22, 12:00 PM - 12:30 PM\n2. Sun, Nov 22, 12:30 PM - 1:00 PM\n3. Sun, Nov 22, 1:00 PM - 1:30 PM';
 await page.evaluate(answer=>{(window as any).ownedVoiceNavigation.answer=answer;},answer);
 await utterance(page);
 for(let piece=1;piece<=2;piece++){
  await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.playAdmissions)).toBe(piece);
  await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 }
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 const {spoken,reply}=await page.evaluate(()=>{
  const f=(window as any).ownedVoiceNavigation;
  return {spoken:f.spoken.join(' '),reply:f.shell.S().msgs.findLast((row:any)=>row.from==='agent')?.text};
 });
 expect(reply).toBe(answer);
 expect(spoken).toContain('Sunday, November twenty-second, noon to twelve thirty P M');
 expect(spoken).toContain('one P M to one thirty P M');
 expect(spoken).not.toMatch(/:|\b(?:Sun|Nov)\b/);
});

test('Talk expands a Calendar date heading that ends in a colon',async({page})=>{
 await setup(page,'full');
 const answer='Here are three 30-minute options for tomorrow, Sun, Nov 22:\n\n1. 12:00-12:30 PM\n2. 12:30-1:00 PM\n3. 1:00-1:30 PM';
 await page.evaluate(answer=>{(window as any).ownedVoiceNavigation.answer=answer;},answer);
 await utterance(page);
 await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.playAdmissions)).toBe(1);
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 const {spoken,reply}=await page.evaluate(()=>{
  const f=(window as any).ownedVoiceNavigation;
  return {spoken:f.spoken.join(' '),reply:f.shell.S().msgs.findLast((row:any)=>row.from==='agent')?.text};
 });
 expect(reply).toBe(answer);
 expect(spoken).toContain('Sunday, November twenty-second');
 expect(spoken).toContain('one o\'clock to one thirty P M');
 expect(spoken).not.toMatch(/:|\b(?:Sun|Nov)\b/);
});

test('a spoken exact note title opens its editor from Home and keeps Talk listening',async({page})=>{
 await setup(page,'sheet',false,true);
 await page.evaluate(()=>{
  const f=(window as any).ownedVoiceNavigation;
  f.prompt='In the Notes app, open the note titled Taco Night Groceries.';
  f.notes=[
   {id:'taco-plan',title:'Taco Night Plan',body:'\nDinner at six.',color:'yellow',createdAt:'2026-11-21T12:00:00Z',updatedAt:'2026-11-21T12:00:00Z'},
   {id:'groceries',title:'Taco Night Groceries',body:'\nAvocados, limes, and shredded cheese.',color:'yellow',createdAt:'2026-11-21T12:01:00Z',updatedAt:'2026-11-21T12:01:00Z'},
  ];
  f.releaseNotesRead();
 });
 await expect(page.locator('html')).toHaveAttribute('data-active-view','home');
 await utterance(page);
 await expect(page.locator('html')).toHaveAttribute('data-active-view','notes');
 const editor=page.locator('[data-alpha-subview="notes-editor"]');
 await expect(editor.getByRole('textbox',{name:'Title',exact:true})).toHaveValue('Taco Night Groceries');
 await expect(editor.getByRole('textbox',{name:'Note',exact:true})).toHaveValue('Avocados, limes, and shredded cheese.');
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.spoken))
  .toEqual(['Opened "Taco Night Groceries" in Notes.']);
 expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.inputs.length)).toBe(0);
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
});

for(const mode of ['polite title','casual title','follow-up','one request','existing identical note'] as const)test(`Talk opens the actual saved note for a ${mode}`,async({page},info)=>{
 await setup(page,'sheet',false,true);
 await page.evaluate(mode=>{
  const f=(window as any).ownedVoiceNavigation;
  const at='2026-11-21T12:00:00Z';
  const make=(id:string,title:string)=>({id,title,body:'\nAvocados, limes, and cheese.',color:'yellow',createdAt:at,updatedAt:at});
  const note=make('record-from-receipt','Shopping List');
  const named=mode==='polite title'||mode==='casual title';
  f.notes=[make('other-record',named?'Taco Night Plan':'Shopping List')];
  if(named)f.notes.push(note);
  else {
   f.answer=mode==='follow-up'?'I made the checklist.':'The list is saved, but I could not open it.';
   const reused=mode==='existing identical note';
   f.actionResults=[{effectReceipts:[{
    receiptId:crypto.randomUUID(),operation:'notes.note.create',resource:{kind:'notes.note',id:note.id,version:'1'},
    artifacts:[],idempotency:{key:reused?note.id:null,replayed:reused},observedAt:at,
    ...(reused?{outcome:'noop',reason:'An identical note already exists.'}:{outcome:'applied',commit:{kind:'durable',id:note.id,committedAt:at}}),
   }]}];
   if(reused)f.notes.push(note);else f.noteToCommit=note;
  }
  f.prompt=mode==='polite title'?'Thank you. Can you open the note titled shopping list?':
   mode==='casual title'?'Can you open up that shopping list in the notes app, please?':
   mode==='follow-up'?'Make a checklist in Notes and name it Shopping List.':
   'Make a checklist in Notes called Shopping List and open it.';
  f.releaseNotesRead();
 },mode);
 await utterance(page);
 if(mode==='follow-up'){
  await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
  await page.evaluate(()=>{
   const f=(window as any).ownedVoiceNavigation;
   f.finishPlayback();f.prompt="Yeah. Can you, why didn't you just open the notes view? and switch to that note or open that note?";
  });
  await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
  await utterance(page);
 }
 await expect(page.locator('[data-alpha-subview="notes-editor"]').getByRole('textbox',{name:'Title',exact:true})).toHaveValue('Shopping List');
 await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.shell.canonicalNotesUi.open)).toBe('record-from-receipt');
 await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.spoken.at(-1)))
  .toBe(mode==='one request'?'Saved and opened "Shopping List" in Notes.':'Opened "Shopping List" in Notes.');
 expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.inputs.length)).toBe(mode==='polite title'||mode==='casual title'?0:1);
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await page.screenshot({path:info.outputPath('opened-note.png'),animations:'disabled'});
});

test('typed create and open preserves the composer and opens the committed record',async({page})=>{
 await setup(page,'sheet',false,true);
 await voice(page).getByRole('button',{name:'Stop voice conversation',exact:true}).click();
 await page.evaluate(async()=>{
  const f=(window as any).ownedVoiceNavigation;
  const {connectionController}=await import('/src/runtime/connection-ui.tsx');
  connectionController.getSelectedConversationId=()=>f.room;
  f.allowTyped=true;
  const at='2026-11-21T12:00:00Z',id='typed-new-note';
  f.notes=[];
  f.noteToCommit={id,title:'Trip Budget',body:'\nTrain and hotel.',color:'yellow',createdAt:at,updatedAt:at};
  f.answer='Saved your note.';
  f.actionResults=[{effectReceipts:[{
   receiptId:crypto.randomUUID(),operation:'notes.note.create',resource:{kind:'notes.note',id,version:'1'},
   artifacts:[],idempotency:{key:null,replayed:false},observedAt:at,outcome:'applied',
   commit:{kind:'durable',id,committedAt:at},
  }]}];
  f.releaseNotesRead();
  f.shell.messageReplyTarget=f.shell.messageEditTarget=undefined;
 });
 const composer=page.getByRole('textbox',{name:'Message Alpha',exact:true}).filter({visible:true});
 await composer.fill('Write a note called Trip Budget, then show it.');
 await page.getByRole('button',{name:'Send',exact:true}).filter({visible:true}).click();
 const editor=page.locator('[data-alpha-subview="notes-editor"]');
 await expect(editor.getByRole('textbox',{name:'Title',exact:true})).toHaveValue('Trip Budget');
 await expect(composer).toBeVisible();
 await expect(composer).toHaveValue('');
 await expect(page.getByText('Saved and opened “Trip Budget” in Notes.',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.inputs.length)).toBe(1);
});

test('a spoken title matching two notes asks the owner to choose and opens neither',async({page})=>{
 await setup(page,'sheet',false,true);
 await page.evaluate(()=>{
  const f=(window as any).ownedVoiceNavigation;
  f.prompt='Open the note titled Groceries.';
  f.notes=['first','second'].map(id=>({id,title:'Groceries',body:'\nDifferent list.',color:'yellow',createdAt:'2026-11-21T12:00:00Z',updatedAt:'2026-11-21T12:00:00Z'}));
  f.releaseNotesRead();
 });
 await utterance(page);
 await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.spoken))
  .toEqual(['More than one note is titled "Groceries". Open Notes and choose the one you want.']);
 await expect(page.locator('html')).toHaveAttribute('data-active-view','home');
 await expect(page.locator('[data-alpha-subview="notes-editor"]')).toHaveCount(0);
});

test('a unique spoken shorthand opens the editor from the Notes list without ending Talk',async({page})=>{
 await setup(page,'sheet',false,true);
 await page.evaluate(()=>{
  const f=(window as any).ownedVoiceNavigation;
  f.notes=[
   {id:'site-note',title:'Browser Learning',body:'\nWebsite.',color:'yellow',createdAt:'2026-11-21T12:00:00Z',updatedAt:'2026-11-21T12:00:00Z'},
   {id:'groceries',title:'Browser Grocery Rehearsal',body:'\nAvocados and limes.',color:'yellow',createdAt:'2026-11-21T12:01:00Z',updatedAt:'2026-11-21T12:01:00Z'},
  ];
  f.releaseNotesRead();
 });
 await utterance(page,'notes');
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 await expect(page.getByRole('button',{name:'Open Browser Grocery Rehearsal',exact:true})).toBeVisible();
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.prompt='Open browser grocery note.');
 await utterance(page);
 const editor=page.locator('[data-alpha-subview="notes-editor"]');
 await expect(editor.getByRole('textbox',{name:'Title',exact:true})).toHaveValue('Browser Grocery Rehearsal');
 await expect(editor.getByRole('textbox',{name:'Note',exact:true})).toHaveValue('Avocados and limes.');
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 expect(await page.evaluate(()=>(window as any).ownedVoiceNavigation.inputs.length)).toBe(1);
});

test('a shorthand matching two distinct titles asks for the full title',async({page})=>{
 await setup(page,'sheet',false,true);
 await page.evaluate(()=>{
  const f=(window as any).ownedVoiceNavigation;
  f.prompt='Open grocery note.';
  f.notes=['Grocery Trip','Grocery Rehearsal'].map((title,id)=>({id:'grocery-'+id,title,body:'\nDifferent list.',color:'yellow',createdAt:'2026-11-21T12:00:00Z',updatedAt:'2026-11-21T12:00:00Z'}));
  f.releaseNotesRead();
 });
 await utterance(page);
 await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.spoken))
  .toEqual(['More than one note matches "grocery". Give me the full title.']);
 await expect(page.locator('html')).toHaveAttribute('data-active-view','home');
});

test('Talk leaves recency to the agent and opens a relative phrase when it is explicitly named',async({page})=>{
 await setup(page,'sheet',false,true);
 await page.evaluate(()=>{
  const f=(window as any).ownedVoiceNavigation;
  f.notes=[
   {id:'recipes',title:'Most Recent',body:'\nOlder recipes.',color:'yellow',createdAt:'2026-10-01T12:00:00Z',updatedAt:'2026-10-01T12:00:00Z'},
   {id:'dentist',title:'Dentist appointment',body:'\nNewer note.',color:'yellow',createdAt:'2026-11-21T12:00:00Z',updatedAt:'2026-11-21T12:00:00Z'},
  ];
  f.prompt='Open my most recent note.';
  f.releaseNotesRead();
 });
 await utterance(page);
 await expect.poll(()=>page.evaluate(()=>(window as any).ownedVoiceNavigation.inputs.map((input:any)=>input.text))).toEqual(['Open my most recent note.']);
 await expect(voice(page)).toHaveAttribute('data-voice-state','speaking');
 const editor=page.locator('[data-alpha-subview="notes-editor"]');
 await expect(editor).toHaveCount(0);
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.finishPlayback());
 await expect(voice(page)).toHaveAttribute('data-voice-state','listening');
 await page.evaluate(()=>(window as any).ownedVoiceNavigation.prompt='Open the note “Most Recent”.');
 await utterance(page);
 await expect(editor.getByRole('textbox',{name:'Title',exact:true})).toHaveValue('Most Recent');
});
