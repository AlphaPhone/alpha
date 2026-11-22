import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkTraces as check} from '../specs/quint/refinement/check-traces.mjs';
import {bundledSource, captureSources, boundInputs, trace, checkpoint, call} from '../specs/quint/refinement/application/support.mjs';

// The actual Schedule/search presentation and Back wrapper (calendar-schedule.ts) against the view
// rules of CalendarPresentation. The inner Back is a stand-in for model.js's calendar Back (form,
// then event to its day, then date picker); reads, rows and provider identities are not exercised.
const driver='test/quint-calendar-presentation-schedule.test.mjs';
captureSources([driver]);
const source='apps/app/src/prototype/calendar-schedule.ts';

async function checkSchedule(){
  const loaded=await bundledSource(source),{presentCalendarList,installCalendarListBack}=loaded.exports,traces=[];
  const now=new Date(2027,5,10,12).getTime(),window={timeMin:new Date(2027,4,1).toISOString(),timeMax:new Date(2027,7,1).toISOString()};
  const row={id:'row',title:'Planning',off:1,t:9,d:1,calendarInterval:true,calendarIntervalData:{begin:new Date(2027,5,11,9).getTime(),end:new Date(2027,5,11,10).getTime()}};
  const scenarios={
    'schedule-return-to-today':[['read'],['chooseView','schedule'],['showEvent'],['back']],
    'search-closes-after-event':[['read'],['chooseView','schedule'],['openSearch'],['showEvent'],['back'],['back']],
    'form-blocks-view-change':[['newForm'],['chooseView','schedule',true],['openSearch',undefined,true]],
    'day-view-keeps-day':[['read'],['showEvent'],['back'],['chooseView','day']],
  };
  for(const [name,actions] of Object.entries(scenarios)){
    const state={day:0,open:null,openDay:null,month:null,form:null},toasts=[];
    const api={now,set:patch=>Object.assign(state,patch),toast:text=>toasts.push(text)};
    const views={calendar:{back:(st,a)=>{if(st.form){a.set({form:null});return true;}if(st.open){a.set({open:null,openDay:null,day:st.openDay});return true;}if(st.month!=null){a.set({month:null});return true;}return false;}}};
    installCalendarListBack(views);
    const out=()=>presentCalendarList({...state},api,[row],window,true,'');
    const observe=()=>({'s.view':state.calendarMode==='schedule'?'schedule':'day','s.day':state.day,'s.openEvent':state.open?1:0,
      's.search':typeof state.calendarSearch==='string','s.form':state.form?'new':'none'});
    const t=trace(name,observe());
    for(const [action,arg,rejected] of actions){
      let modelAction;
      if(action==='read')modelAction=[call('request',false),call('reply',1,1,false)];
      else if(action==='chooseView'){out().calendarViews.find(view=>view.label.toLowerCase()===arg).pick();modelAction=call('chooseView',arg);}
      else if(action==='openSearch'){out().openSearch();modelAction=call('openSearch');}
      else if(action==='showEvent'){
        const listed=out().listGroups.flatMap(group=>group.items);
        if(listed.length)listed[0].open();else api.set({open:row.id,openDay:row.off});
        modelAction=call('showEvent',1,state.openDay);
      }
      else if(action==='back'){views.calendar.back({...state},api);modelAction=call('back');}
      else if(action==='newForm'){api.set({form:{id:null,off:state.day}});modelAction=call('newForm');}
      if(rejected){assert.equal(toasts.at(-1),'Finish current event');modelAction={...modelAction,reject:true};}
      checkpoint(t,action,modelAction,observe());
    }
    traces.push(t);
  }
  return check(boundInputs({model:'CalendarPresentation',id:'CalendarPresentationSchedule',sources:[source,...loaded.sources,driver],traces,scope:'bounded-component',assumptions:[
    'The actual presentCalendarList view choice, search opening, list item open and installCalendarListBack execute. The inner Back stands in for model.js (form, event to its day, date picker).',
    'Read generations, provider rows, owner isolation and drafts are covered by the other CalendarPresentation adapters; here a read only makes the one row visible.']}));
}

test('Schedule and search follow the CalendarPresentation view rules',{timeout:scaledTimeout(240000)},async()=>{
  const receipt=await checkSchedule();
  assert.ok(receipt.passed&&receipt.inputsUnchanged&&receipt.driverInputsBound,JSON.stringify(receipt.results?.find?.(r=>r.kind!=='passed')??{}).slice(0,3000));
  assert.equal(receipt.traces,4);
});
