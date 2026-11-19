import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkTraces as check} from '../specs/quint/refinement/check-traces.mjs';
import {captureSources, boundInputs, trace, checkpoint, call, deferred, tick} from '../specs/quint/refinement/application/support.mjs';

// The shared executeNamedCalendarRead (pinned upstream, prepared under .eliza) with Alpha's receipt
// mapping against CalendarNamedRead, over a scripted Calendar plugin. No Android Calendar, Share
// sheet, agent or WebView is exercised.
const driver='test/quint-calendar-named-read.test.mjs';
const shared='.eliza/client-features/plugins/plugin-calendar/src/client/named-read.ts';
const sources=['apps/app/src/ui/calendar/named-read-messages.ts',shared];
captureSources([driver,...sources]);
const {executeNamedCalendarRead}=await import('../'+shared);
const {namedCalendarReadSummary}=await import('../apps/app/src/ui/calendar/named-read-messages.ts');

const sentenceClass=new Map([
  ['Nothing was shared because the matching event is not open in Calendar.','notOpen'],
  ['The event wasn’t shared because its selection, access or review changed.','changed'],
  ['Nothing was shared because the open event doesn’t match the name you asked about.','mismatch'],
  ['Shared the event you chose.','shared'],
]);
const capabilities=['calendar.named-read.v1','calendar.local-event.v1','device.named-target.v1'];
const target={kind:'calendar-event',accountId:'work',sourceRevision:'a'.repeat(64),id:'event-1',revision:'b'.repeat(64)};
const record=title=>({version:1,kind:'calendar_read_selected',sourceId:'work',eventId:'event-1',revision:'b'.repeat(64),
  fields:{title,description:'',location:'',start:'2027-06-11T13:00:00.000Z',end:'2027-06-11T14:00:00.000Z',timeZone:'UTC'}});

async function replay(name,script){
  const counters={selected:false,executes:0,cancels:0,applied:'none',retired:false,aborted:false},operations=[];
  const observe=(outcome='none',sentence='none',sharedOut=false)=>({'s.selected':counters.selected,'s.executes':counters.executes,'s.cancels':counters.cancels,
    's.applied':counters.applied,'s.retired':counters.retired,'s.aborted':counters.aborted,'s.outcome':outcome,'s.sentence':sentence,'s.shared':sharedOut});
  const t=trace(name,observe());
  const reply=deferred(),controller=new AbortController();
  const provider={executeAgent:input=>{operations.push(input.operation);counters.executes++;checkpoint(t,'the exact selected-event read is sent',call('execute'),observe());return reply.promise;},
    cancelAgent:async()=>{counters.cancels++;}};
  const context=script.selected?{view:'calendar',selectedObject:target}:{view:'calendar'};
  // The open Calendar view supplies the selected event before the shared read runs.
  if(script.selected){counters.selected=true;checkpoint(t,'the open Calendar view supplies the selected event',call('admit',true),observe());}
  const running=executeNamedCalendarRead(provider,{type:'calendar_named',action:'read',name:'planning'},'op-1',context,capabilities,controller.signal,
    ()=>{if(counters.retired)throw Error('Calendar selection or review changed');})
    .then(result=>({result,summary:namedCalendarReadSummary(result)}),error=>({error}));
  await tick();
  if(script.retire){counters.retired=true;checkpoint(t,'the selection or screen changes during the read',call('retire'),observe());}
  if(script.abort){controller.abort();counters.aborted=true;await tick();checkpoint(t,'the request is cancelled during the read',call('abort'),observe());}
  if(script.selected){counters.applied=script.reply;reply.resolve(script.reply==='applied'?{status:'applied',result:record(script.title??'Planning review')}:{status:'denied'});}
  const settled=await running;
  const outcome=settled.error?'error':settled.result.status;
  const sentence=settled.error?'none':sentenceClass.get(settled.summary);
  const sharedOut=!settled.error&&settled.result.status==='succeeded';
  assert.ok(sentence,'every receipt is one of Alpha’s sentences');
  for(const operation of operations)assert.equal(operation.type,'calendar_read_selected','only the exact read is ever sent');
  if(!script.selected)checkpoint(t,'no selected event: nothing is read',call('admit',false),observe(outcome,sentence,sharedOut));
  else if(script.retire||script.abort)checkpoint(t,'the late reply shares nothing',call('reply',script.reply),observe(outcome,sentence,sharedOut));
  else if(script.reply==='refused')checkpoint(t,'the phone refused the read',call('reply','refused'),observe(outcome,sentence,sharedOut));
  else{checkpoint(t,'the phone applied the read',call('reply','applied'),observe());
    checkpoint(t,'the title is checked against the name',call('check',outcome==='succeeded'),observe(outcome,sentence,sharedOut));}
  return t;
}

async function checkNamedRead(){
  const scenarios={
    'shared':{selected:true,reply:'applied'},'not-open':{selected:false},'refused':{selected:true,reply:'refused'},
    'mismatch':{selected:true,reply:'applied',title:'Dentist'},'retired-during-read':{selected:true,reply:'applied',retire:true},
    'aborted-during-read':{selected:true,reply:'applied',abort:true},
  };
  const traces=[];
  for(const [name,script] of Object.entries(scenarios))traces.push(await replay(name,script));
  return check(boundInputs({model:'CalendarNamedRead',sources:[...sources,driver],traces,scope:'bounded-component',assumptions:[
    'The shared executeNamedCalendarRead at the pinned upstream and Alpha’s namedCalendarReadSummary execute; the Calendar plugin and the context check are scripted ports. A non-applied reply stands for every refusal status.',
    'agent-adapter.ts binds the context check to the session, device target, visible Calendar view and exact context; that binding is read by source review, not replayed here.']}));
}

test('the named Calendar read refines its owner-selected share model',{timeout:scaledTimeout(240000)},async()=>{
  const receipt=await checkNamedRead();
  assert.ok(receipt.passed&&receipt.inputsUnchanged&&receipt.driverInputsBound,JSON.stringify(receipt.results?.find?.(r=>r.kind!=='passed')??{}).slice(0,3000));
  const last=Object.fromEntries(receipt.traceInputs.map(t=>[t.name,t.steps.at(-1).expect]));
  assert.equal(last.shared['s.shared'],true);assert.equal(last.mismatch['s.sentence'],'mismatch');
  assert.equal(last['not-open']['s.executes'],0);assert.equal(last['aborted-during-read']['s.cancels'],1);
});
