// Calendar Schedule mode and event search (CAL-17) over synthetic presentation rows; no Calendar read.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calendarListGroups,calendarRowMatches,calendarRowSpan,installCalendarListBack,presentCalendarList} from '../apps/app/src/prototype/calendar-schedule.ts';

const now=new Date(2027,5,10,12,0).getTime();
const at=(day,hour)=>new Date(2027,5,10+day,hour).getTime();
const timed=(id,day,hour,hours=1,extra={})=>({id,title:id,where:'',notes:'',off:day,t:hour,d:hours,calendarInterval:true,calendarIntervalData:{begin:at(day,hour),end:at(day,hour+hours)},...extra});
const allDay=(id,day,days=1)=>({id,title:id,off:day,allDayEndOff:day+days,allDay:true,calendarInterval:true});
const window={timeMin:new Date(2027,4,1).toISOString(),timeMax:new Date(2027,7,1).toISOString()};
function api(state){const sets=[],toasts=[];return {now,sets,toasts,set:patch=>{sets.push(patch);Object.assign(state,patch);},toast:text=>toasts.push(text)};}

test('Schedule lists what is on from today, one heading per day, all-day first',()=>{
  const rows=[timed('past',-2,9),timed('later today',0,15),timed('still on',0,11,2),allDay('holiday',1),timed('tomorrow',1,9),allDay('trip',-1,3)];
  const opened=[];
  const groups=calendarListGroups(rows,now,new Date(2027,5,10).getTime(),Date.parse(window.timeMax),null,(row,off)=>opened.push([row.id,off]));
  assert.deepEqual(groups.map(g=>g.items.map(i=>i.title)),[['trip','still on','later today'],['holiday','tomorrow']]);
  assert.match(groups[0].label,/^Today · /);assert.match(groups[1].label,/^Tomorrow · /);
  assert.match(groups[0].items[0].time,/^All day · until /,'a multi-day item says when it ends');
  groups[1].items[1].open();assert.deepEqual(opened,[['tomorrow',1]]);
});

test('search matches every typed word in title, place or notes, in any case',()=>{
  const row={title:'Team Lunch',where:'Café Nord',notes:'bring slides'};
  for(const query of ['lunch','LUNCH café','slides team','','  '])assert.ok(calendarRowMatches(row,query),query);
  for(const query of ['dinner','lunch dinner'])assert.ok(!calendarRowMatches(row,query),query);
});

test('a timed row uses its original instants; reminders without an interval use their day and hour',()=>{
  assert.deepEqual(calendarRowSpan(timed('x',2,22,12),now),{begin:at(2,22),end:at(2,34)});
  assert.deepEqual(calendarRowSpan({off:1,t:9,d:0},now),{begin:at(1,9),end:at(1,9)});
});

test('the list says which dates it covers and only calls a completed read empty',()=>{
  const state={calendarMode:'schedule',day:0};
  const ready=presentCalendarList(state,api(state),[],window,true,'');
  assert.equal(ready.listMode,true);assert.equal(ready.listEmptyText,'No upcoming events');assert.match(ready.listRange,/^Through /);
  const loading=presentCalendarList(state,api(state),[],window,false,'Couldn’t refresh');
  assert.equal(loading.listEmptyText,'Couldn’t refresh');
  const search={calendarSearch:'zebra'},found=presentCalendarList(search,api(search),[timed('Zebra talk',-20,9)],window,true,'');
  assert.equal(found.searching,true);assert.equal(found.listGroups.length,1,'search covers the whole read window, past included');
  assert.match(found.listRange,/^Searching /);
  assert.equal(presentCalendarList({calendarSearch:'yak'},api({}),[timed('Zebra talk',1,9)],window,true,'').listEmptyText,'No matching events');
  assert.equal(presentCalendarList({},api({}),[],window,true,'').listMode,false,'Day view by default');
});

test('choosing a view closes the event and picker, Schedule starts today, and an open form refuses it',()=>{
  const state={day:3,open:'e',openDay:3,month:0},a=api(state);
  presentCalendarList(state,a,[],window,true,'').calendarViews.find(v=>v.label==='Schedule').pick();
  assert.deepEqual(a.sets.at(-1),{calendarMode:'schedule',month:null,open:null,openDay:null,day:0});
  const busy={form:{id:null}},b=api(busy);
  presentCalendarList(busy,b,[],window,true,'').calendarViews[1].pick();
  presentCalendarList(busy,b,[],window,true,'').openSearch();
  assert.deepEqual(b.sets,[]);assert.deepEqual(b.toasts,['Finish current event','Finish current event']);
});

test('Back closes search after the form, event and picker; an event closed in Schedule returns to today',()=>{
  const calls=[];const views={calendar:{persist:['events'],back:(st,api)=>{if(st.form||st.open||st.month!=null){calls.push('inner');api.set({open:null,form:null,month:null,day:st.openDay??st.day});return true;}return false;}}};
  installCalendarListBack(views);
  assert.ok(views.calendar.persist.includes('calendarMode'));
  const opened={calendarMode:'schedule',open:'e',openDay:4,day:0,calendarSearch:'x'},a=api(opened);
  assert.equal(views.calendar.back(opened,a),true);assert.equal(opened.day,0);assert.equal(opened.calendarSearch,'x','search outlives the event');
  assert.equal(views.calendar.back(opened,a),true);assert.equal(opened.calendarSearch,null);
  assert.equal(views.calendar.back(opened,a),false);
});

test('the Agent Calendar adapter and template present the list modes',()=>{
  const adapter=readFileSync('apps/app/src/prototype/agent-calendar-adapter.ts','utf8'),template=readFileSync('apps/app/src/prototype/template.html','utf8');
  assert.match(adapter,/Object\.assign\(out,presentCalendarList\(state,api,visibleRows,range\(state\)/);
  assert.match(adapter,/installCalendarListBack\(views\)/);
  for(const marker of ['aria-label="Search events" onClick="{{calendar.openSearch}}"','aria-label="Close search"','role="group" aria-label="Calendar view"','data-alpha-calendar-list="{{calendar.listMode}}"','aria-label="{{calendar.listLabel}}"'])assert.ok(template.includes(marker),marker);
});
