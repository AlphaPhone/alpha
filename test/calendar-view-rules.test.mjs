// Calendar, reminder and clock rules exercised on the shipped sources with synthetic rows, stores and
// timers only: no browser, Android, Cloud or provider access.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from './support/strip-types.mjs';

const load=path=>stripTypeScriptTypes(readFileSync(path,'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,''));
const DAY=86400000;
// Friday 6 November 2026, 22:30 local time, unless a test moves it.
const start=new Date(2026,10,6,22,30).getTime();
function clock(now=start){const box={now};class FixedDate extends Date{constructor(...args){super(...(args.length?args:[box.now]));}static now(){return box.now;}}return {box,FixedDate};}
const settle=async()=>{for(let i=0;i<64;i++)await Promise.resolve();};
const plain=value=>JSON.parse(JSON.stringify(value));

const daysSource=load('apps/app/src/prototype/calendar-days.ts');
function days(time=clock()){
  const ctx=vm.createContext({Date:time.FixedDate,Intl,Map,Math,Number});
  vm.runInContext('const currentSurfaceLayout=()=>({split:false,calendarDays:1,agenda:false});\n'+daysSource+'\nglobalThis.api={calendarSavedDay,msToLocalMidnight,calendarDayIndex};',ctx);
  return ctx.api;
}

test('after a save Schedule stays on today; other views go to the saved day',()=>{
  const {calendarSavedDay}=days();
  assert.equal(calendarSavedDay('schedule',5),0);
  for(const view of ['day','week','month',undefined,'unknown'])assert.equal(calendarSavedDay(view,5),5);
});

test('the next local midnight is measured from now',()=>{
  const {msToLocalMidnight}=days();
  assert.equal(msToLocalMidnight(start),90*60000);
  assert.equal(msToLocalMidnight(new Date(2026,10,6).getTime()),new Date(2026,10,7).getTime()-new Date(2026,10,6).getTime(),'exactly midnight waits a whole day');
  assert.equal(msToLocalMidnight(new Date(2026,10,6,23,59,59,999).getTime()),1);
});

test('the per-day event lookup offers every event the exact overlap test accepts, in order, without listing the rest',()=>{
  const {calendarDayIndex}=days(),now=start,at=(day,hour,minute=0)=>new Date(2026,10,6+day,hour,minute).getTime();
  const events=[
    {id:'today',begin:at(0,9),end:at(0,10)},
    {id:'overnight',begin:at(0,23),end:at(1,1)},
    {id:'ends-at-midnight',begin:at(1,22),end:at(2,0)},
    {id:'instant',begin:at(3,12),end:at(3,12)},
    {id:'backwards',begin:at(4,10),end:at(4,9)},
    {id:'season',begin:at(-100,0),end:at(100,0)},
    {id:'invalid',begin:Number.NaN,end:at(0,10)},
    {id:'far',begin:at(40,9),end:at(40,10)},
  ];
  const near=calendarDayIndex(events,event=>event,now);
  const bounds=off=>[new Date(2026,10,6+off).getTime(),new Date(2026,10,7+off).getTime()];
  const exact=(list,off)=>{const [dayStart,dayEnd]=bounds(off);return Array.from(list).filter(event=>event.begin<dayEnd&&event.end>dayStart).map(event=>event.id);};
  for(let off=-5;off<=45;off++)assert.deepEqual(exact(near(off),off),exact(events,off),`day ${off}`);
  assert.deepEqual(Array.from(near(0),event=>event.id),['today','overnight','season'],'only events that can touch the day, in their own order');
  assert.deepEqual(Array.from(near(1),event=>event.id),['overnight','ends-at-midnight','season']);
  assert.deepEqual(Array.from(near(20),event=>event.id),['season'],'a day with nothing scans nothing but the long events');
  assert.deepEqual(Array.from(near(4),event=>event.id),['backwards','season']);
});

const viewSource=load('apps/app/src/prototype/google-calendar-view-adapter.ts');
function viewRules(){
  const ctx=vm.createContext({Date,Intl,JSON,Object});
  vm.runInContext(viewSource+'\nglobalThis.api={googleCalendarAttention,googleCalendarAccountLeftPatch,oncePerPass};',ctx);
  return ctx.api;
}

test('a change to an event Google deleted offers one OK that drops it, never Keep mine',()=>{
  const {googleCalendarAttention}=viewRules();
  assert.deepEqual(plain(googleCalendarAttention({phase:'conflict',kind:'update',remote:null})),{text:'Deleted in Google Calendar.',mineLabel:'OK',theirsLabel:'',mine:'keep-google',theirs:null});
  const changed=googleCalendarAttention({phase:'conflict',kind:'update',remote:{revision:'r',begin:1,end:2}});
  assert.equal(changed.text,'Changed in Google Calendar.');assert.equal(changed.mine,'keep-mine');assert.equal(changed.theirs,'keep-google');
  const unseen=googleCalendarAttention({phase:'conflict',kind:'update',unseen:true});
  assert.equal(unseen.text,'Moved or deleted in Google Calendar.');assert.equal(unseen.mineLabel,'Keep mine');
  assert.equal(googleCalendarAttention({phase:'conflict',kind:'delete',remote:{revision:'r',begin:1,end:2}}).text,'Changed in Google Calendar after you deleted it.');
  assert.deepEqual(plain(googleCalendarAttention({phase:'failed',kind:'update',error:{status:'gone'}})),{text:'This event is no longer in Google Calendar.',mineLabel:'OK',theirsLabel:'',mine:'dismiss',theirs:null});
  assert.equal(googleCalendarAttention({phase:'failed',kind:'update',error:{status:'needs-permission'}}).mineLabel,'Allow');
  assert.equal(googleCalendarAttention({phase:'uncertain',kind:'create'}).mine,'add-again');
  for(const phase of ['queued','paused','dispatching','done'])assert.equal(googleCalendarAttention({phase,kind:'update'}),null);
});

test('another Cloud account closes the Google event, delete sheet and edit form of the one that left',()=>{
  const {googleCalendarAccountLeftPatch}=viewRules(),id='google:grant:calendar:event';
  assert.deepEqual(plain(googleCalendarAccountLeftPatch({open:id,openDay:2,deleteAsk:{id,scopes:['this','all']},form:{id,googleEventId:'event'}})),{open:null,openDay:null,deleteAsk:null,form:null});
  assert.deepEqual(plain(googleCalendarAccountLeftPatch({open:null,form:{id:'google:grant:calendar:local:1',googleLocalId:'1'}})),{form:null});
  // Device events, reminders and new-event forms belong to the phone, not the account.
  assert.equal(googleCalendarAccountLeftPatch({open:'calendar:7:1',deleteAsk:{id:'calendar:7:1'},form:{id:null,creationId:'c',cal:'native:local'}}),null);
  assert.equal(googleCalendarAccountLeftPatch({open:'reminder:r1',form:{id:'reminder:r1',alphaReminderId:'r1'}}),null);
  assert.equal(googleCalendarAccountLeftPatch({}),null);
});

test('one render computes the Google overlay once; outside a render every read is fresh',()=>{
  const {oncePerPass}=viewRules();
  let computed=0;const overlay=oncePerPass(()=>({serial:++computed}));
  overlay.begin();
  const first=overlay.get();assert.equal(overlay.get(),first,'the same object within the render');assert.equal(overlay.get(),first);
  overlay.end();assert.equal(computed,1);
  assert.notEqual(overlay.get(),first,'a save handler after the render sees current rows');assert.equal(computed,2);
  overlay.begin();assert.equal(overlay.get().serial,3,'the next render computes again');overlay.end();
});

const formSource=load('apps/app/src/prototype/calendar-form-draft-adapter.ts');
function formHarness(){
  const time=clock(),edits=[],state={form:null};
  class Controller{constructor(){this.state={message:'',conflict:false,error:false,savedText:''};}open(){return Promise.resolve();}edit(text){edits.push(text);}retire(){}consume(){return Promise.resolve();}}
  const ctx=vm.createContext({AssistantDraftController:Controller,assistantDraftStore:async()=>({}),Capacitor:{getPlatform:()=>'web'},openDomainRecovery(){},browserDevProfile:false,window:{confirm:()=>true},Intl,Date:time.FixedDate,JSON,Number,
    encodeCalendarForm:form=>JSON.stringify(form),decodeCalendarForm:text=>({form:JSON.parse(text),zone:'UTC'}),snapshotCalendarForm:form=>form});
  vm.runInContext(formSource+'\nglobalThis.install=installCalendarFormDraftAdapter;globalThis.rules={calendarFormDayShift,calendarFormRetained};',ctx);
  class Shell{live=true;vget(){return state;}vset(_key,patch){Object.assign(state,patch);}toast(){}componentDidMount(){}componentDidUpdate(){}componentWillUnmount(){}}
  ctx.install(Shell,{calendar:{render:()=>({})}});const shell=new Shell();shell.componentDidMount();
  return {time,edits,state,shell,rules:ctx.rules,update:()=>shell.componentDidUpdate({})};
}

test('a form no draft retains keeps its date when midnight passes',()=>{
  const h=formHarness();
  // A new reminder (no creationId) for tomorrow.
  h.state.form={id:null,title:'Call',off:1,t:9,d:1,cal:'alpha-reminders'};h.update();
  assert.equal(h.state.form.off,1);
  h.time.box.now=start+2*3600000;h.update();
  assert.equal(h.state.form.off,0,'tomorrow became today');
  h.update();assert.equal(h.state.form.off,0,'moved once');
  assert.deepEqual(h.edits,[],'still not retained');
  // An edit of a Google event that has not been sent yet.
  h.state.form=null;h.update();
  h.state.form={id:'google:g:c:local:1',googleLocalId:'1',title:'Lunch',off:0,t:12,d:1,cal:'google:g:c'};h.update();
  h.time.box.now+=2*DAY;h.update();
  assert.equal(h.state.form.off,-2);
  // A form opened after the date changed starts from its own day.
  h.state.form=null;h.update();h.time.box.now+=DAY;
  h.state.form={id:null,title:'',off:3,cal:'alpha-reminders'};h.update();
  assert.equal(h.state.form.off,3);
});

test('retained forms keep their own date handling',()=>{
  const h=formHarness(),{calendarFormRetained,calendarFormDayShift}=h.rules;
  assert.equal(calendarFormRetained({id:null,creationId:'c'}),true);
  assert.equal(calendarFormRetained({id:'calendar:1',alphaCalendarId:'1'}),true);
  assert.equal(calendarFormRetained({id:'google:x',googleEventId:'x'}),true);
  assert.equal(calendarFormRetained({id:null}),false);assert.equal(calendarFormRetained({id:'google:x:local:1',googleLocalId:'1'}),false);assert.equal(calendarFormRetained(null),false);
  assert.equal(calendarFormDayShift(new Date(2026,10,6,23,59),new Date(2026,10,7,0,1)),-1);
  assert.equal(calendarFormDayShift(new Date(2026,10,6,1),new Date(2026,10,6,23)),0);
  h.state.form={id:null,creationId:'c1',title:'Trip',off:1};h.update();
  assert.equal(h.edits.length,1,'a creation draft is saved');
  h.time.box.now=start+2*3600000;h.update();
  assert.equal(h.state.form.off,0,'and re-anchored once by its own rule');
});

const reminderSource=load('apps/app/src/prototype/reminder-adapter.ts');
test('device calendar rows reach the view when the reminder store cannot be read',async()=>{
  const patches=[],toasts=[];let fail=true;
  const ctx=vm.createContext({console,Map,Object,JSON,Promise,
    reconcileReminderDeletions:async()=>{if(fail)throw new Error('Pending deletion store is full');return 0;},
    reminderCreations:async()=>({}),reconcileReminderCreations:async()=>0,
    reminderEvents:rows=>rows.map(row=>({id:'reminder:'+row.id,alphaReminderId:row.id,off:0})),
    Capacitor:{getPlatform:()=>'android',isNativePlatform:()=>true,isPluginAvailable:()=>true},
    DailyApps:{surfaceInfo:async()=>({reminderTodoVersion:1}),listReminders:async()=>({reminders:[{id:'fresh'}]})}});
  vm.runInContext(reminderSource+'\nglobalThis.install=installReminderAdapter;',ctx);
  class Shell{live=true;vset(_key,patch){patches.push(patch);}toast(text){toasts.push(text);}openView(){}componentDidMount(){}componentWillUnmount(){}}
  ctx.install(Shell,{calendar:{render:()=>({}),state:{}}});
  const shell=new Shell();
  // The device calendar read just finished for a new range; reminders were read earlier.
  shell.nativeCalendarRows=[{id:'calendar:7:1',alphaCalendarId:'7'}];shell.reminderRows=[{id:'earlier'}];
  await shell.refreshReminders();
  const failed=patches.at(-1);
  assert.equal(failed.reminderStale,true);
  assert.deepEqual(plain(failed.events).map(row=>row.id),['calendar:7:1','reminder:earlier'],'new device rows show with the reminders last read');
  assert.equal(toasts.length,1);
  // No reminders were ever read: the device rows still show.
  shell.reminderRows=undefined;shell.nativeCalendarRows=[{id:'calendar:8:1'}];await shell.refreshReminders();
  assert.deepEqual(plain(patches.at(-1).events).map(row=>row.id),['calendar:8:1']);
  fail=false;await shell.refreshReminders();
  assert.equal(patches.at(-1).reminderStale,false);assert.deepEqual(plain(patches.at(-1).events).map(row=>row.id),['calendar:8:1','reminder:fresh']);
});

const adapterSource=load('apps/app/src/prototype/calendar-adapter.ts');
async function deviceCalendar({view='day'}={}){
  const time=clock(),timers=[],cleared=[],calls=[],toasts=[],reminderRefreshes=[];
  const state={events:[],day:0,month:null,open:null,form:null,view,calPrefs:{}};
  const provider={events:[],saveResult:null,
    async requestAccess(){calls.push('requestAccess');return {status:'granted'};},
    async list(range){calls.push('list');return {status:'ready',events:provider.events,calendars:[{id:'local',local:true,writable:true,account:'Alpha Phone',name:'Phone'}],truncated:false,range};},
    async pendingCreations(){return {status:'ready',creations:[]};},
    async save(request){calls.push('save');return {status:'saved',id:'9',creationId:request.creationId};},
    async acknowledgeCreation(){return {status:'acknowledged'};},
    async prepareAgentSource(){return {status:'unavailable'};}};
  const ctx=vm.createContext({Date:time.FixedDate,Intl,JSON,Map,Math,Number,Object,Promise,console,queueMicrotask,crypto,
    setTimeout:(run,ms)=>{timers.push({run,ms});return timers.length;},clearTimeout:id=>cleared.push(id),
    window:Object.assign(new EventTarget(),{confirm:()=>true}),document:Object.assign(new EventTarget(),{hidden:false}),
    registerPlugin:()=>provider,Capacitor:{getPlatform:()=>'android',isNativePlatform:()=>true,isPluginAvailable:()=>true},
    DailyApps:{async addListener(){return {remove(){}};}},refreshDeletionViews(){},
    openCalendarRecovery(){},openReminderRecovery(){},openReminderCreationRecovery(){},openReminderActionRecovery(){},
    calendarFormTimeProblem:()=>'',mapsEventOriginFor:()=>null,rememberNoteOrigin:async()=>true,forgetNoteOrigin:async()=>{},noteOriginSupported:()=>false,eventNoteOriginId:()=>undefined});
  vm.runInContext('const currentSurfaceLayout=()=>({split:false,calendarDays:1,agenda:false});\n'+daysSource+'\n{'+adapterSource+'\nglobalThis.install=installCalendarAdapter;}',ctx);
  class Shell{live=true;S(){return {view:'calendar'};}vget(){return state;}vset(_key,patch){Object.assign(state,patch);}async refreshReminders(){reminderRefreshes.push(time.box.now);state.events=[...(this.nativeCalendarRows||[])];}toast(text){toasts.push(text);}calendarFormCommitted(){}componentDidMount(){}componentWillUnmount(){}}
  // The base renderer draws the form; everything this adapter adds is layered on its output.
  const views={calendar:{render:current=>({hours:[],week:[],nowTop:0,events:[],calToggles:[],f:current.form?{cals:[]}:undefined})}};
  ctx.install(Shell,views);const shell=new Shell();shell.componentDidMount();await settle();
  const api={now:new time.FixedDate(),get:()=>state,set:patch=>Object.assign(state,patch),isActive:()=>true,toast:text=>toasts.push(text)};
  return {time,timers,cleared,calls,toasts,reminderRefreshes,state,shell,provider,render:()=>views.calendar.render(state,api),close:()=>shell.componentWillUnmount()};
}

test('a device calendar change that could not be confirmed is said where its refresh is offered, and that refresh clears it',async()=>{
  const h=await deviceCalendar();
  try{
    assert.equal(h.render().nativeStatusLabel,'','nothing to retry');
    h.render().nativeStatusRetry();await settle();
    assert.equal(h.calls.includes('requestAccess'),false,'an ordinary retry only reads again');
    h.shell.calendarWriteUncertain=true;h.calls.length=0;
    const out=h.render();
    assert.match(out.nativeStatusLabel,/could not be confirmed\. Tap to refresh and check\./);
    out.nativeStatusRetry();await settle();
    assert.deepEqual(h.calls.slice(0,2),['requestAccess','list']);
    assert.equal(h.shell.calendarWriteUncertain,false,'a completed read lets the owner change events again');
    assert.equal(h.render().nativeStatusLabel,'');
  }finally{h.close();}
});

test('device calendar rows and reminders are read again just after local midnight',async()=>{
  const h=await deviceCalendar();
  try{
    assert.equal(h.timers.length,1);assert.equal(h.timers[0].ms,90*60000+1000);
    const tomorrow=new Date(2026,10,7,9).getTime();
    h.provider.events=[{id:'7',calendarId:'local',title:'Standup',begin:tomorrow,end:tomorrow+3600000}];
    h.shell.nativeCalendarRows=[{id:'calendar:7:'+tomorrow,off:1}];h.calls.length=0;h.reminderRefreshes.length=0;
    // The date changes with Calendar left open.
    h.time.box.now=new Date(2026,10,7,0,0,1).getTime();h.timers[0].run();await settle();
    assert.ok(h.calls.includes('list'),'the provider is read again');
    assert.equal(h.shell.nativeCalendarRows[0].off,0,'tomorrow is today now');
    assert.ok(h.reminderRefreshes.length>=1);
    assert.equal(h.timers.length,2,'armed for the following midnight');assert.equal(h.timers[1].ms,DAY-1000+1000);
  }finally{h.close();}
  assert.deepEqual(h.cleared,[2],'the timer stops with the view');
  const stale=h.timers.length;h.timers[1].run();await settle();
  assert.equal(h.timers.length,stale,'a timer that fires after unmount does nothing');
});

test('saving a device event in Schedule keeps the list on today',async()=>{
  const save=async view=>{
    const h=await deviceCalendar({view});
    try{
      h.state.form={id:null,creationId:'c1',title:'Dinner',off:2,t:19,d:1,where:'',video:false,who:[],cal:'native:local',repeat:'none',alert:null,notes:''};
      await h.render().f.save();await settle();
      assert.ok(h.calls.includes('save'));assert.equal(h.state.form,null);
      return h.state.day;
    }finally{h.close();}
  };
  assert.equal(await save('schedule'),0);
  assert.equal(await save('day'),2);
});

test('the browser alarm poll runs only while the page is visible',async()=>{
  const intervals=[],stopped=[];
  const document=Object.assign(new EventTarget(),{hidden:true,documentElement:{dataset:{}}}),window=new EventTarget();
  const ctx=vm.createContext({window,document,Event,navigator:{},performance,JSON,Promise,
    setInterval:(run,ms)=>{intervals.push({run,ms});return intervals.length;},clearInterval:id=>{if(id!==undefined)stopped.push(id);},
    BrowserAlertAudio:class{stop(){}play(){}},testMocksEnabled:false,browserScreenLocked:()=>false,layoutBrowserDialog(){},
    alertSoundDocument:{read:async initial=>initial(),edit:async()=>false}});
  vm.runInContext(load('apps/app/src/browser/clock.ts')+'\nglobalThis.BrowserClock=BrowserClock;',ctx);
  let reads=0;
  new ctx.BrowserClock({listReminders:async()=>{reads++;return {reminders:[]};}},{list:async()=>({items:[]})});
  assert.equal(intervals.length,0,'a page opened in the background does not poll');
  document.hidden=false;document.dispatchEvent(new Event('visibilitychange'));await settle();
  assert.equal(intervals.length,1);assert.equal(intervals[0].ms,1000);
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(intervals.length,1,'one poll, however often the page reports visible');
  document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));
  assert.deepEqual(stopped,[1],'the poll stops when the page is hidden');
  const before=reads;intervals[0].run();await settle();assert.equal(reads,before,'and a late tick reads nothing');
  document.hidden=false;document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(intervals.length,2,'it starts again when the page returns');
});

test('the next occurrence of an old repeating reminder is found without resolving every past date',async()=>{
  const source=stripTypeScriptTypes(readFileSync('apps/app/src/browser/reminder-recurrence.ts','utf8'));
  const {nextReminderOccurrence}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const now=Date.UTC(2026,10,9,12),original=Intl.DateTimeFormat.prototype.formatToParts;let resolved=0;
  Intl.DateTimeFormat.prototype.formatToParts=function(...args){resolved++;return original.apply(this,args);};
  try{
    const daily=nextReminderOccurrence({rule:'daily',zone:'UTC',date:'2016-11-01',time:'09:00',leadMinutes:0},now);
    assert.equal(daily.dueAt,Date.UTC(2026,10,10,9));assert.equal(daily.at,daily.dueAt);assert.equal(daily.date,'2026-11-10');
    assert.equal(daily.skippedDates,(Date.UTC(2026,10,9)-Date.UTC(2016,10,1))/DAY,'every past date is still counted');
    assert.ok(resolved<200,`resolved ${resolved} wall times for one answer`);
    let weekdays=0;for(let day=Date.UTC(2016,10,2);day<=Date.UTC(2026,10,9);day+=DAY)if(![0,6].includes(new Date(day).getUTCDay()))weekdays++;
    const working=nextReminderOccurrence({rule:'weekdays',zone:'UTC',date:'2016-11-01',time:'09:00',leadMinutes:30},now);
    assert.equal(working.dueAt,Date.UTC(2026,10,10,9));assert.equal(working.at,working.dueAt-30*60000);assert.equal(working.skippedDates,weekdays);
    // The furthest zones either side of UTC, with now just before and just after the occurrence.
    for(const [zone,dueAt] of [['Pacific/Kiritimati',Date.UTC(2026,10,8,19)],['Etc/GMT+12',Date.UTC(2026,10,9,21)]]){
      const rule={rule:'daily',zone,date:'2026-11-08',time:'09:00',leadMinutes:0};
      assert.equal(nextReminderOccurrence(rule,dueAt-1).dueAt,dueAt,zone);
      assert.equal(nextReminderOccurrence(rule,dueAt).dueAt,dueAt+DAY,zone);
    }
  }finally{Intl.DateTimeFormat.prototype.formatToParts=original;}
});

test('a repeating browser event whose skipped date maps to the next day is emitted once',()=>{
  const begin=Date.UTC(2026,10,1,9),skipped='2026-11-03';
  const ctx=vm.createContext({Date,Number,Math,Set,Error,
    calendarWall:instant=>new Date(instant).toISOString().slice(0,-1),
    // The zone has no 3 November: its wall time resolves to the same instant as 4 November's.
    calendarInstant:wall=>Date.parse((wall.startsWith(skipped)?wall.replace(skipped,'2026-11-04'):wall)+'Z')});
  vm.runInContext(load('apps/app/src/browser/calendar-recurrence.ts')+'\nglobalThis.expand=expandCalendarSeries;',ctx);
  const row={id:'series',begin,end:begin+3600000,timeZone:'UTC',repeat:'daily'};
  const {events,truncated}=ctx.expand(row,{begin:Date.UTC(2026,10,1),end:Date.UTC(2026,10,8)});
  assert.equal(truncated,false);
  assert.deepEqual(Array.from(events,event=>new Date(event.begin).toISOString().slice(0,10)),['2026-11-01','2026-11-02','2026-11-04','2026-11-05','2026-11-06','2026-11-07']);
  assert.equal(new Set(Array.from(events,event=>event.id)).size,events.length);
  const year=ctx.expand(row,{begin:Date.UTC(2026,10,1),end:Date.UTC(2027,10,1)},400);
  assert.equal(year.events.length,364);assert.equal(new Set(Array.from(year.events,event=>event.begin)).size,364);
  assert.equal(ctx.expand(row,{begin:Date.UTC(2026,10,1),end:Date.UTC(2027,10,1)},10).truncated,true);
});

test('a linked row whose local event is gone is found by lookup',()=>{
  const source=readFileSync('apps/app/src/runtime/calendar-sync-controller.ts','utf8');
  assert.match(source,/const localMissing = missingLocalEvent\(events\);/);assert.match(source,/localMissing\(row\.localEventId\) &&/);
  const ctx=vm.createContext({Set});
  vm.runInContext(stripTypeScriptTypes(source.slice(source.indexOf('export function missingLocalEvent')).replace(/^export /gm,''))+'\nglobalThis.missingLocalEvent=missingLocalEvent;',ctx);
  const missing=ctx.missingLocalEvent([{id:'a',revision:'1'},{id:'b',revision:'2'}]);
  assert.equal(missing('a'),false);assert.equal(missing('b'),false);assert.equal(missing('c'),true);
  assert.equal(ctx.missingLocalEvent([])('a'),true);
});
