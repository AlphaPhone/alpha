import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkTraces as check} from '../specs/quint/refinement/check-traces.mjs';
import {captureSources, boundInputs, trace, checkpoint, call} from '../specs/quint/refinement/application/support.mjs';

// The actual executeCalendarAvailability against CalendarAvailabilityReview: a scripted provider and
// review hooks report each step the source takes, with the counters it has reached. No Android
// CalendarProvider, permission dialog, WebView or agent is exercised.
const driver='test/quint-calendar-availability-review.test.mjs';
const sources=['apps/app/src/ui/calendar/availability-review.ts','apps/app/src/runtime/calendar-availability.ts',
  'vendor/eliza/plugins/plugin-calendar/src/client/availability-review.ts'];
captureSources([driver,...sources]);
const {executeCalendarAvailability,SOURCE_LIST_ATTEMPTS}=await import('../apps/app/src/runtime/calendar-availability.ts');

const ZONE='America/New_York';
const operation={type:'calendar_availability',start:'2026-10-13T04:00:00.000Z',end:'2026-10-14T04:00:00.000Z',timeZone:ZONE};
const calendars=[{id:'1',name:'Work',account:'owner@example.org',sourceRevision:'a'.repeat(64)}];
const busyEvent={start:'2026-10-13T13:00:00.000Z',end:'2026-10-13T13:30:00.000Z',allDay:false,availability:'busy'};
/** Provider answers for each model read result. */
const answers={free:{status:'ready',freshness:'local',events:[]},busy:{status:'ready',freshness:'local',events:[busyEvent]},
  stale:{status:'ready',freshness:'remote',events:[]},changed:{status:'changed'},zone:{status:'timezone-changed'},
  tooMany:{status:'too-many'},error:{status:'unavailable'}};
const lists={ready:{status:'ready',timeZone:ZONE,calendars},empty:{status:'ready',timeZone:ZONE,calendars:[]},
  unavailable:{status:'unavailable'},denied:{status:'permission-required'},zone:{status:'timezone-changed'}};

async function replay(name,script){
  const counters={attempts:0,reads:0,chosen:false,confirmed:false,reviewed:'none',latest:'none',retired:false};
  const observe=(outcome='none',shared='none')=>({'s.attempts':counters.attempts,'s.reads':counters.reads,'s.chosen':counters.chosen,
    's.confirmed':counters.confirmed,'s.reviewed':counters.reviewed,'s.latest':counters.latest,'s.retired':counters.retired,'s.outcome':outcome,'s.shared':shared});
  const t=trace(name,observe());
  const step=(label,action)=>checkpoint(t,label,action,observe());
  let retireAt=script.retireAfter,listIndex=0,readIndex=0;
  const maybeRetire=point=>{if(retireAt===point){counters.retired=true;step('the reviewed context retires',call('retire'));retireAt=undefined;}};
  const provider={
    requestWorkflowReadAccess:async()=>{step('time zones agree before anything is asked',call('zoneCheck',true));
      const granted=script.permission!=='denied';step('permission answer',call('permission',granted));return {status:granted?'granted':'denied'};},
    availabilitySources:async()=>{const status=script.lists[listIndex++];counters.attempts++;step('source list attempt',call('list',status));return structuredClone(lists[status]);},
    readAvailability:async()=>{
      const result=script.reads[readIndex++];counters.reads++;
      if(counters.reads===1){if(result==='free'||result==='busy')counters.reviewed=result;step('the reviewed read',call('read',result));}
      else{counters.latest=result;step('the repeated read before sharing',call('reread',result));}
      return structuredClone(answers[result]);
    },
  };
  const review={
    chooseCalendars:async(offered,_op,_signal,current)=>{current();const picked=script.choose!==false;counters.chosen=picked;step('owner chooses calendars',call('choose',picked));maybeRetire('choose');return picked?offered.map(source=>source.id):null;},
    confirmResult:async(_result,_chosen,_signal,current)=>{current();const yes=script.confirm!==false;counters.confirmed=yes;step('owner confirms the exact result',call('confirm',yes));maybeRetire('confirm');return yes;},
  };
  const outcome=await executeCalendarAvailability(provider,operation,script.context??ZONE,new AbortController().signal,
    ()=>{if(counters.retired)throw Error('Retired context');},review,()=>ZONE,async()=>{});
  const shared=outcome.status==='succeeded'?outcome.foregroundResult.status:'none';
  if(!t.steps.length)checkpoint(t,'time zones disagree: nothing is asked or read',call('zoneCheck',false),observe(outcome.status,shared));
  else if(counters.retired)checkpoint(t,'interrupted review fails',call('interrupted'),observe(outcome.status,shared));
  else t.steps.at(-1).expect=observe(outcome.status,shared);
  assert.ok(outcome.status==='failed'||outcome.status==='succeeded');
  if(outcome.status==='failed')assert.match(outcome.summary,/Nothing was shared\.$/);
  return t;
}

async function checkAvailability(){
  const ok={lists:['ready'],reads:['free','free']};
  const scenarios={
    'free-share':ok,'busy-share':{lists:['ready'],reads:['busy','busy']},
    'zone-changed':{context:'Europe/Paris',lists:[],reads:[]},'denied':{permission:'denied',lists:[],reads:[]},
    'list-retry':{lists:['unavailable','unavailable','ready'],reads:['free','free']},
    'list-exhausted':{lists:Array(SOURCE_LIST_ATTEMPTS).fill('unavailable'),reads:[]},
    'list-denied':{lists:['denied'],reads:[]},'list-zone':{lists:['zone'],reads:[]},'no-calendars':{lists:['empty'],reads:[]},
    'cancel-choice':{lists:['ready'],choose:false,reads:[]},
    ...Object.fromEntries(['stale','changed','zone','tooMany','error'].map(result=>['refused-read-'+result,{lists:['ready'],reads:[result]}])),
    'decline-result':{lists:['ready'],reads:['free'],confirm:false},
    'changed-during-review':{lists:['ready'],reads:['free','busy']},
    'changed-calendar-on-reread':{lists:['ready'],reads:['busy','changed']},
    'retired-after-choice':{lists:['ready'],reads:[],retireAfter:'choose'},
    'retired-after-confirm':{lists:['ready'],reads:['free'],retireAfter:'confirm'},
  };
  const traces=[];for(const [name,script] of Object.entries(scenarios))traces.push(await replay(name,script));
  return check(boundInputs({model:'CalendarAvailabilityReview',sources:[...sources,driver],traces,scope:'bounded-component',assumptions:[
    'The actual executeCalendarAvailability, shared source/event parsers and calendarAvailability computation execute. The provider, review hooks, device zone and retry pause are scripted ports; each step is reported where the source calls them.',
    'A refused read is one provider status per model result (remote freshness stands for unknown freshness). Busy-interval contents, transparency and all-day mapping are checked by scripts/test-calendar-availability-flow.ts.',
    'Retirement is the reviewed-context check throwing at the next await boundary after a review hook; signal abort is not replayed here.']}));
}

test('the actual availability check refines its reviewed-share model',{timeout:scaledTimeout(240000)},async()=>{
  const receipt=await checkAvailability();
  assert.ok(receipt.passed&&receipt.inputsUnchanged&&receipt.driverInputsBound,JSON.stringify(receipt.results?.find?.(r=>r.kind!=='passed')??{}).slice(0,3000));
  const last=Object.fromEntries(receipt.traceInputs.map(t=>[t.name,t.steps.at(-1).expect]));
  assert.equal(last['free-share']['s.shared'],'free');assert.equal(last['busy-share']['s.shared'],'busy');
  assert.equal(last['changed-during-review']['s.shared'],'none');assert.equal(last['list-exhausted']['s.reads'],0);
  assert.equal(last['retired-after-confirm']['s.outcome'],'failed');
});
