import {installNoteScheduleContract,reviewNoteScheduleContract} from './helpers/note-schedule-contract';
import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import {openLegacyNotes} from './helpers/legacy-notes';
import {openBrowserCalendar,chooseCalendarEventAction} from './helpers/browser-calendar';
import {test,expect,type Page} from '@playwright/test';
import {returnToApps} from './app-navigation';
import {installCloudVoiceFixture} from './cloud-voice-fixture';
import {localBrowserVoice} from './voice-fixture';
test.beforeEach(async({page})=>installNoteScheduleContract(page));

test.setTimeout(420_000);

const transcript='Meeting: we agreed to book the venue for Friday and email the caterer.';
const summary='The team agreed to book the venue.';
const actionText='Book the venue\nEmail the caterer';

const notes=(page:Page)=>page.evaluate(async()=>JSON.parse((await (await import('/src/runtime/browser-notes-document.ts')).readBrowserNotesRaw())||'{"records":[]}').records as any[]);
const reminders=(page:Page)=>page.evaluate(async()=>JSON.parse((await (await import('/src/browser/reminder-store.ts')).reminderDocument.readRaw())||'{"reminders":[]}').reminders as any[]);
const events=(page:Page)=>page.evaluate(async()=>JSON.parse((await (await import('/src/browser/calendar-store.ts')).calendarDocument.readRaw())||'{"events":[]}').events as any[]);
const actions=(page:Page)=>page.evaluate(async()=>(await (await import('/src/browser/development-execution-document.ts')).readExecutionPart({namespace:'local'} as any,'actions',()=>({proposals:[],journal:[]}))) as any);
const phoneContext=(page:Page)=>page.evaluate(async()=>JSON.parse(JSON.stringify((await import('/src/runtime/alpha-client.ts')).alphaClient.getState().context)) as any);
const liveReminders=async(page:Page)=>(await reminders(page)).filter(r=>r.status!=='cancelled').map(r=>r.title).sort();
const eventTitles=async(page:Page)=>(await events(page)).map(e=>e.title).sort();

const ready=async(page:Page,withNotes=false)=>{await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeVisible({timeout:90_000});if(withNotes){await openLegacyNotes(page);await returnToApps(page);}await openBrowserCalendar(page);await returnToApps(page);};
async function openDeviceActions(page:Page){
 await returnToApps(page);
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await openConnectionDiagnostics(page);
 await page.getByText('Development device actions',{exact:true}).click();
}
async function queueAction(page:Page,operation:unknown){
 await openDeviceActions(page);
 await page.getByRole('textbox',{name:'Action JSON'}).fill(JSON.stringify(operation));
 await page.getByRole('button',{name:'Queue action for review'}).click();
 await expect(page.getByText('Action queued. Send a chat message to review it on the current screen.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Close connection settings'}).click();
 await returnToApps(page);
}
async function openSavedRecording(page:Page){
 await openLegacyNotes(page);
 await page.getByRole('button',{name:'Open Venue meeting',exact:true}).click();
 await expect(page.getByRole('button',{name:'Play recording',exact:true})).toBeVisible();
}
async function openHandoffDayInCalendar(page:Page,titles:string){
 await returnToApps(page);
 await openBrowserCalendar(page);
 const event=(await events(page)).find(row=>new RegExp(`^(${titles})$`).test(row.title));
 expect(event).toBeTruthy();
 const date=new Date(event.begin);
 const label=date.toLocaleDateString('en-US',{weekday:'long'})+' '+date.toLocaleDateString('en-US',{month:'long'})+' '+date.getDate();
 await page.getByRole('button',{name:'Month view',exact:true}).click();
 await page.getByRole('dialog',{name:'Choose calendar date',exact:true}).getByRole('button',{name:label,exact:true}).click();
 await expect(page.getByRole('region',{name:'Calendar timeline'})).toBeVisible();
}

test('Journey B: recorded note UI and retained scheduling contract save one event and reminder, then edit and delete them',async({page})=>{
 page.setDefaultTimeout(15_000);
 const dialogs:string[]=[];
 page.on('dialog',d=>{dialogs.push(d.message());void d.accept();});
 await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){this.muted=true;return play.call(this);};});
 await page.goto('/?mode=dev');await ready(page,true);

 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await openConnectionDiagnostics(page);
 await page.getByRole('textbox',{name:'Scripted reply'}).fill(JSON.stringify({summary,actions:actionText.split('\n')}));
 await page.getByRole('button',{name:'Save development reply'}).click();
 await page.getByRole('button',{name:'Connect development profile'}).click();
 await returnToApps(page);await openBrowserCalendar(page);await returnToApps(page);

 await installCloudVoiceFixture(page,transcript);
 await page.bringToFront();
 await page.evaluate(()=>{
  const ctx=new AudioContext(),osc=ctx.createOscillator(),gain=ctx.createGain(),sink=ctx.createMediaStreamDestination();gain.gain.value=.1;osc.connect(gain);gain.connect(sink);osc.start();
  document.addEventListener('click',()=>{void ctx.resume();},{once:true,capture:true});
  const Original=MediaRecorder;(window as any).recordedBytes=0;
  window.MediaRecorder=class extends Original{constructor(stream:MediaStream,options?:MediaRecorderOptions){super(stream,options);this.addEventListener('dataavailable',event=>{(window as any).recordedBytes+=event.data.size;});}};
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>sink.stream},configurable:true});(window as any).fixture={ctx,osc};
 });
 await openLegacyNotes(page);
 await page.getByRole('button',{name:'Record voice note',exact:true}).click();
 const recorder=page.locator('[data-alpha-subview="notes-recorder"]');
 await expect(recorder).toHaveAttribute('data-recorder-state','recording');
 await expect.poll(()=>page.evaluate(()=>(window as any).recordedBytes)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>(window as any).cloudVoiceFixture.transcriptions)).toEqual([]);
 await recorder.getByRole('button',{name:'Stop recording',exact:true}).click();
 await expect(page.getByRole('button',{name:'Play recording',exact:true})).toBeVisible();
 await page.getByRole('textbox',{name:'Title',exact:true}).fill('Venue meeting');
 await page.getByRole('button',{name:'Generate transcript',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).cloudVoiceFixture.transcriptions.length)).toBe(1);
 await expect.poll(async()=>(await notes(page)).filter(n=>n.kind==='voice'&&n.title==='Venue meeting'&&n.body===transcript&&!!n.audio?.audioId).length).toBe(1);
 await page.evaluate(async()=>{const {ctx,osc}=(window as any).fixture;osc.stop();await ctx.close();});

 await page.reload();await ready(page,true);
 await localBrowserVoice(page);
 await openSavedRecording(page);
 await expect(page.getByText(transcript,{exact:true}).first()).toBeVisible();
 await expect(page.getByRole('button',{name:'Read aloud',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).voiceFixture.spoken as string[])).toEqual([]);
 const recorded=(await notes(page))[0];

 await page.getByRole('button',{name:'Ask Alpha about this transcript',exact:true}).click();
 await expect(page.getByRole('group',{name:'Attached transcript',exact:true})).toBeVisible();
 await expect(page.getByRole('dialog',{name:'Ask about selected content'})).toHaveCount(0);
 await page.getByRole('button',{name:'Send',exact:true}).click();
 await page.getByText('Review summary note',{exact:true}).click();
 const summaryReview=page.getByRole('dialog',{name:'Save summary'});
 await expect(summaryReview.getByRole('textbox',{name:'Summary note text'})).toHaveValue(summary);
 await expect(summaryReview.getByRole('textbox',{name:'Action items'})).toHaveValue(actionText);
 expect((await notes(page))[0]).toEqual(recorded);
 await summaryReview.getByRole('button',{name:'Save recording summary',exact:true}).click();
 await expect(summaryReview).toHaveCount(0);
 await expect(page.getByText('Recording summary saved',{exact:true})).toBeVisible();
 const summarized=await notes(page);
 expect(summarized).toHaveLength(1);
 expect(summarized[0]).toMatchObject({id:recorded.id,audio:recorded.audio,body:transcript,summary:[summary],actions:[{t:'Book the venue',done:false},{t:'Email the caterer',done:false}]});
 expect(await reminders(page)).toHaveLength(0);expect(await events(page)).toHaveLength(0);

 await page.getByRole('button',{name:'Minimize chat',exact:true}).click();
 await reviewNoteScheduleContract(page,'reminder');
 await expect(page.getByRole('textbox',{name:'Title',exact:true})).toHaveValue('');
 await expect(page.getByRole('textbox',{name:'Notes',exact:true})).toHaveValue(actionText);
 await expect(page.getByRole('button',{name:'Save event',exact:true})).toBeDisabled();
 expect(await reminders(page)).toHaveLength(0);
 await page.getByRole('textbox',{name:'Title',exact:true}).fill('Book the venue');
 await page.getByRole('button',{name:'Save event',exact:true}).click();
 await expect.poll(async()=>(await reminders(page)).length).toBe(1);
 const handoffReminder=(await reminders(page))[0];
 expect(handoffReminder).toMatchObject({title:'Book the venue',body:actionText,status:'scheduled'});
 expect(await events(page)).toHaveLength(0);

 await page.getByRole('button',{name:/^Book the venue,/}).click();
 await expect(page.getByText('From note: Venue meeting',{exact:true})).toBeVisible();

 await returnToApps(page);
 await openSavedRecording(page);
 await reviewNoteScheduleContract(page,'event');
 await expect(page.getByRole('textbox',{name:'Title',exact:true})).toHaveValue('');
 await expect(page.getByRole('textbox',{name:'Notes',exact:true})).toHaveValue(actionText);
 await expect(page.getByRole('button',{name:'Save event',exact:true})).toBeDisabled();
 expect(await events(page)).toHaveLength(0);expect(await reminders(page)).toHaveLength(1);
 await page.getByRole('textbox',{name:'Title',exact:true}).fill('Venue walkthrough');
 await page.getByRole('button',{name:'Save event',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Venue walkthrough',level:1})).toBeVisible();
 await expect(page.getByText('From note: Venue meeting',{exact:true})).toBeVisible();
 const handoffEvent=(await events(page))[0];
 expect(await events(page)).toHaveLength(1);
 expect(handoffEvent).toMatchObject({calendarId:'local',title:'Venue walkthrough',body:actionText,begin:handoffReminder.at});
 expect(handoffEvent.end-handoffEvent.begin).toBe(3_600_000);
 expect(await reminders(page)).toHaveLength(1);

 const hour=Math.ceil(Date.now()/3_600_000)*3_600_000;
 const dueAt=new Date(hour+72*3_600_000).toISOString(),eventStart=new Date(hour+48*3_600_000).toISOString(),eventEnd=new Date(hour+49*3_600_000).toISOString();
 await queueAction(page,{type:'create_reminder',title:'Email the caterer',dueAt});
 await page.getByRole('textbox',{name:'Ask Alpha',exact:true}).fill('Review my reminder action');
 await page.getByRole('textbox',{name:'Ask Alpha',exact:true}).press('Enter');
 const approveReminder=page.getByRole('button',{name:/^Create reminder/});
 await expect(approveReminder).toHaveCount(1);
 expect(await liveReminders(page)).toEqual(['Book the venue']);
 await approveReminder.click();
 await expect.poll(async()=>(await actions(page)).proposals.filter((p:any)=>p.payload.operation.type==='create_reminder').map((p:any)=>[p.state,p.receipt?.outcome])).toEqual([['completed','applied']]);
 await expect(page.getByRole('button',{name:/^Message actions: Created reminder “Email the caterer”/}).first()).toBeVisible();
 expect(await liveReminders(page)).toEqual(['Book the venue','Email the caterer']);
 expect((await reminders(page)).find(r=>r.title==='Email the caterer')).toMatchObject({at:Date.parse(dueAt),status:'scheduled'});

 await returnToApps(page);
 await openBrowserCalendar(page);
 await page.getByRole('button',{name:'New event',exact:true}).click();
 await expect.poll(async()=>(await phoneContext(page)).selectedObject?.kind).toBe('calendar-source');
 const source=(await phoneContext(page));
 const eventZone=source.timeZone==='Asia/Tokyo'?'Europe/Paris':'Asia/Tokyo';
 const calendarCreate={type:'calendar_create',source:{sourceId:source.selectedObject.id,sourceRevision:source.selectedObject.revision},fields:{title:'Venue booking call',description:'From the venue meeting note',location:'Main hall',start:eventStart,end:eventEnd,timeZone:eventZone}};
 await page.getByRole('button',{name:'Back to calendar',exact:true}).last().click();
 await queueAction(page,calendarCreate);
 await openBrowserCalendar(page);
 await page.getByRole('button',{name:'New event',exact:true}).click();
 await expect.poll(async()=>(await phoneContext(page)).selectedObject?.revision).toBe(calendarCreate.source.sourceRevision);
 await page.getByRole('button',{name:'Open conversation',exact:true}).click();
 await page.getByRole('textbox',{name:'Message Alpha',exact:true}).fill('Review my calendar action');
 await page.getByRole('textbox',{name:'Message Alpha',exact:true}).press('Enter');
 const approveEvent=page.getByRole('button',{name:/^Create event/});
 await expect(approveEvent).toHaveCount(1);
 expect(await eventTitles(page)).toEqual(['Venue walkthrough']);
 await approveEvent.click();
 const calendarReview=page.getByRole('dialog',{name:'Review calendar change'});
 const zoned=(iso:string)=>new Intl.DateTimeFormat('en-US',{timeZone:eventZone,year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(iso));
 expect((await calendarReview.getByRole('paragraph').innerText()).split('\n')).toEqual([
  'Create event',
  '“Venue booking call”',
  'App calendar · Alpha Phone',
  `${zoned(eventStart)} – ${zoned(eventEnd)}`,
  `Time zone: ${eventZone} (this phone is set to ${source.timeZone})`,
  'No invites sent',
  'Location: Main hall',
  'From the venue meeting note',
 ]);
 expect(await eventTitles(page)).toEqual(['Venue walkthrough']);
 await calendarReview.getByRole('button',{name:'Confirm',exact:true}).click();
 await expect.poll(async()=>(await actions(page)).proposals.filter((p:any)=>p.payload.operation.type==='calendar_create').map((p:any)=>[p.state,p.receipt?.outcome])).toEqual([['completed','applied']]);
 await expect(page.getByRole('button',{name:/^Message actions: Created event “Venue booking call”/}).first()).toBeVisible();
 expect(await eventTitles(page)).toEqual(['Venue booking call','Venue walkthrough']);

 await page.reload();await ready(page,true);
 expect(await eventTitles(page)).toEqual(['Venue booking call','Venue walkthrough']);
 expect(await liveReminders(page)).toEqual(['Book the venue','Email the caterer']);
 expect(await reminders(page)).toHaveLength(2);
 expect((await events(page)).find(e=>e.title==='Venue booking call')).toMatchObject({calendarId:'local',body:'From the venue meeting note',location:'Main hall',begin:Date.parse(eventStart),end:Date.parse(eventEnd),timeZone:eventZone});
 expect((await events(page)).find(e=>e.title==='Venue booking call')).not.toHaveProperty('who');
 expect((await events(page)).find(e=>e.title==='Venue booking call')).not.toHaveProperty('allDay');
 const recordedActions=await actions(page);
 expect(recordedActions.proposals.map((p:any)=>[p.payload.operation.type,p.state,p.receipt?.outcome])).toEqual([['create_reminder','completed','applied'],['calendar_create','completed','applied']]);
 expect(recordedActions.journal.map((j:any)=>[j.record.operation.type,j.phase,j.status])).toEqual([['create_reminder','terminal','succeeded'],['calendar_create','terminal','succeeded']]);
 expect(recordedActions.proposals[1].receipt.result).toMatchObject({kind:'calendar_create',sourceId:'local',eventId:(await events(page)).find(e=>e.title==='Venue booking call').id});
 await openDeviceActions(page);
 await page.getByRole('button',{name:'Check with agent'}).click();
 const connection=page.getByRole('dialog',{name:'Development connections'});
 await expect(connection.getByText(/Create event · “Venue booking call” · Completed · succeeded/)).toHaveCount(1);
 await expect(connection.getByText(/Create reminder · .*Email the caterer.* · Completed · succeeded/)).toHaveCount(1);
 await page.getByRole('button',{name:'Close connection settings'}).click();

 await openHandoffDayInCalendar(page,'Book the venue|Venue walkthrough');
 await page.getByRole('button',{name:/^Venue walkthrough,/}).click();
 await chooseCalendarEventAction(page,'Edit event');
 await expect(page.getByRole('textbox',{name:'Title',exact:true})).toHaveValue('Venue walkthrough');
 await page.getByRole('textbox',{name:'Title',exact:true}).fill('Venue walkthrough edited');
 await page.getByRole('textbox',{name:'Location',exact:true}).fill('Main hall');
 await page.getByRole('button',{name:'Save event',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Venue walkthrough edited',level:1})).toBeVisible();
 await expect(page.getByText('From note: Venue meeting',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Open note Venue meeting',exact:true}).click();
 await expect(page.getByRole('button',{name:'Play recording',exact:true})).toBeVisible();
 await expect(page.getByText(transcript,{exact:true}).first()).toBeVisible();
 await openHandoffDayInCalendar(page,'Book the venue|Venue walkthrough edited');
 await page.getByRole('button',{name:/^Book the venue,/}).click();
 await expect(page.getByText('From note: Venue meeting',{exact:true})).toBeVisible();
 await chooseCalendarEventAction(page,'Edit event');
 await expect(page.getByRole('textbox',{name:'Title',exact:true})).toHaveValue('Book the venue');
 await page.getByRole('textbox',{name:'Title',exact:true}).fill('Book the venue edited');
 await page.getByRole('button',{name:'Start later',exact:true}).click();
 await page.getByRole('button',{name:'Save event',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Book the venue edited',level:1})).toBeVisible();
 await page.reload();await ready(page,true);
 expect(await eventTitles(page)).toEqual(['Venue booking call','Venue walkthrough edited']);
 expect((await events(page)).find(e=>e.title==='Venue walkthrough edited')).toMatchObject({id:handoffEvent.id,location:'Main hall',body:actionText,begin:handoffEvent.begin,end:handoffEvent.end});
 expect(await liveReminders(page)).toEqual(['Book the venue edited','Email the caterer']);
 expect((await reminders(page)).find(r=>r.title==='Book the venue edited')).toMatchObject({body:actionText,at:handoffReminder.at+15*60_000,status:'scheduled'});

 await openHandoffDayInCalendar(page,'Book the venue edited|Venue walkthrough edited');
 await page.getByRole('button',{name:/^Venue walkthrough edited,/}).click();
 const deleteReview=page.getByRole('dialog',{name:'Delete calendar event?'});
 await chooseCalendarEventAction(page,'Delete event');
 await expect(deleteReview).toContainText('Venue walkthrough edited');
 await deleteReview.getByRole('button',{name:'Cancel',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Venue walkthrough edited',level:1})).toBeVisible();
 expect(await eventTitles(page)).toEqual(['Venue booking call','Venue walkthrough edited']);
 await chooseCalendarEventAction(page,'Delete event');
 await deleteReview.getByRole('button',{name:'Delete event',exact:true}).click();
 await expect.poll(()=>eventTitles(page),{timeout:15000}).toEqual(['Venue booking call']);
 await expect(page.getByRole('button',{name:/^Venue walkthrough edited,/})).toHaveCount(0);
 await page.getByRole('button',{name:/^Book the venue edited,/}).click();
 await chooseCalendarEventAction(page,'Delete event');
 await page.getByRole('dialog',{name:'Delete reminder?',exact:true}).getByRole('button',{name:'Delete reminder',exact:true}).click();
 await expect.poll(()=>liveReminders(page),{timeout:15000}).toEqual(['Email the caterer']);
 await expect(page.getByRole('button',{name:/^Book the venue edited,/})).toHaveCount(0);
 await page.reload();await ready(page,true);
 expect(await eventTitles(page)).toEqual(['Venue booking call']);
 expect(await liveReminders(page)).toEqual(['Email the caterer']);
 expect((await reminders(page)).filter(r=>r.title==='Book the venue edited').map(r=>r.status)).toEqual(['cancelled']);
 const finalNotes=await notes(page);
 expect(finalNotes).toHaveLength(1);
 expect(finalNotes[0]).toMatchObject({id:recorded.id,audio:recorded.audio,body:transcript,summary:[summary]});
 for(const message of dialogs)expect(message).toBe('Replace the retained unsaved form with a new event?');
});

test('Journey B: a calendar proposal for a changed source is refused, and leaving an open review saves nothing',async({page})=>{
 await page.goto('/?mode=dev');await ready(page);
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await openConnectionDiagnostics(page);
 await page.getByRole('button',{name:'Connect development profile'}).click();
 await returnToApps(page);await openBrowserCalendar(page);await returnToApps(page);
 const hour=Math.ceil(Date.now()/3_600_000)*3_600_000;
 const fields=(title:string,timeZone:string)=>({title,description:'',location:'',start:new Date(hour+48*3_600_000).toISOString(),end:new Date(hour+49*3_600_000).toISOString(),timeZone});
 const openSource=async()=>{
  await returnToApps(page);
  await openBrowserCalendar(page);
  await page.getByRole('button',{name:'New event',exact:true}).click();
  await expect.poll(async()=>(await phoneContext(page)).selectedObject?.kind).toBe('calendar-source');
  return phoneContext(page);
 };
 const propose=async(operation:unknown,message:string)=>{
  await page.getByRole('button',{name:'Back to calendar',exact:true}).last().click();
  await queueAction(page,operation);
  await openSource();
  await page.getByRole('button',{name:'Open conversation',exact:true}).click();
  await page.getByRole('textbox',{name:'Message Alpha',exact:true}).fill(message);
  await page.getByRole('textbox',{name:'Message Alpha',exact:true}).press('Enter');
 };
 const source=await openSource();
 const review=page.getByRole('dialog',{name:'Review calendar change'});

 const stale=source.selectedObject.revision.split('').reverse().join('');
 expect(stale).not.toBe(source.selectedObject.revision);
 await propose({type:'calendar_create',source:{sourceId:source.selectedObject.id,sourceRevision:stale},fields:fields('Stale source event',source.timeZone)},'Review my stale calendar action');
 await expect(page.getByRole('button',{name:/^Message actions: Development reply/})).toHaveCount(1);
 await expect(page.getByRole('button',{name:/^Create event/})).toHaveCount(0);
 await expect(page.getByText('Stale source event',{exact:false})).toHaveCount(0);
 await expect(review).toHaveCount(0);
 expect(await eventTitles(page)).toEqual([]);
 expect((await actions(page)).proposals.map((p:any)=>[p.payload.operation.fields.title,p.state])).toEqual([['Stale source event','pending']]);

 await page.getByRole('button',{name:'Minimize chat',exact:true}).click();
 await propose({type:'calendar_create',source:{sourceId:source.selectedObject.id,sourceRevision:source.selectedObject.revision},fields:fields('Abandoned review event',source.timeZone)},'Review my calendar action');
 const approve=page.getByRole('button',{name:/^Create event/});
 await expect(approve).toHaveCount(1);
 await approve.click();
 await expect(review).toContainText('“Abandoned review event”');
 await expect(review).toContainText(`Time zone: ${source.timeZone}\n`);
 await expect(review).not.toContainText('this phone is set to');
 await page.evaluate(()=>window.dispatchEvent(new Event('alpha-back',{cancelable:true})));
 await expect(review).toHaveCount(0);
 expect(await eventTitles(page)).toEqual([]);
 await page.reload();await ready(page);
 expect(await eventTitles(page)).toEqual([]);
 const recorded=await actions(page);
 expect(recorded.journal.filter((j:any)=>j.status==='succeeded')).toEqual([]);
});
