import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewOwnNoticeQuestion} from '../apps/app/src/prototype/own-notice-question.ts';
import {modelTraces,replayTraces} from '../specs/quint/refinement/assistant-model-traces.mjs';

const model={path:'specs/quint/application/OwnNoticeQuestion.qnt',module:'OwnNoticeQuestion'};
const scenarios=['questionIsDraftedTest','homeDuringConsumeStagesNothingTest','homeDuringRecheckSpendsNothingTest',
 'declinedBytesKeepTapTest','changedNoticeAfterConsumeIsReportedTest','unreviewableNoticeIsRefusedTest'];
const witnesses=['SpentAfterCancelWitness','RefusedBytesWitness','SpentButNotKeptWitness'];
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const reports={'Unavailable':'unavailable','This notification changed.':'changed','Couldn’t keep':'not-kept'};
const hold=()=>({...Promise.withResolvers(),pending:true});

/** Run the production helper with held composer admission and closed native ports. */
function createDriver(){
 const window=new EventTarget();
 const previous=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'window',{value:window,configurable:true});
 let current=true,opened=false,recheck,consume,admission,close,homes=0;
 const counts={consumed:0,composed:0,closedCalls:0},messages=[];
 const options={
  notice:{source:'own',id:'reminder',revision:'a'.repeat(64),title:'Owned reminder',text:'Prepare the meeting',appLabel:'Alpha Phone'},
  current:()=>current,
  recheck:()=>{recheck=hold();return recheck.promise;},
  consume:()=>{consume=hold();return consume.promise;},
  async attach(selection){
   const file=await selection.read(selection.current);
   if(!file||!selection.current())return false;
   assert.equal(await file.text(),'Owned reminder\nPrepare the meeting');
   assert.equal(selection.prompt,'Help me with this notification.');
   admission=hold();
   if(!await admission.promise||!selection.current()||!await selection.commit(selection.current)||!selection.current())return false;
   counts.composed++;
   return true;
  },
  report:message=>{messages.push(reports[message]??`unexpected: ${message}`);},
  closed:()=>{counts.closedCalls++;},
 };
 return {
  async open(reviewable){
   if(!reviewable)options.notice.source='third-party';
   opened=true;close=reviewOwnNoticeQuestion(options);await flush();
  },
  noticeChanged(){current=false;},
  async admit(ok){admission.pending=false;admission.resolve(ok);await flush();},
  async abort(){window.dispatchEvent(new Event(homes++%2?'blur':'launcher-home'));await flush();},
  async recheckSettles(ok){recheck.pending=false;recheck.resolve(ok);await flush();},
  async consumeSettles(ok){
   consume.pending=false;
   if(ok){counts.consumed++;consume.resolve();}else consume.reject(Error('Synthetic consume refusal'));
   await flush();
  },
  observe(){
   const phase=!opened?'idle':!close?'refused':recheck?.pending?'rechecking':consume?.pending?'consuming':
    counts.closedCalls?'closed':'queued';
   return {phase,current,committing:recheck!==undefined,ended:counts.closedCalls>0,closedCalls:counts.closedCalls,
    consumed:counts.consumed,composed:counts.composed,report:messages.at(-1)??'none'};
  },
  close(){
   close?.();
   if(admission?.pending)admission.resolve(false);
   if(recheck?.pending)recheck.resolve(false);
   if(consume?.pending)consume.resolve();
   if(previous)Object.defineProperty(globalThis,'window',previous);
   else delete globalThis.window;
  },
 };
}

test('the own-notification attachment follows every OwnNoticeQuestion model trace',{timeout:scaledTimeout(240000)},async()=>{
 const traces=modelTraces({...model,scenarios,witnesses,random:80,steps:30});
 const receipt=await replayTraces(traces,createDriver,{project:({canceled,...observed})=>observed});
 assert.equal(receipt.traces,89);
 assert.ok(receipt.checkpoints>2000,`checkpoints ${receipt.checkpoints}`);
 for(const action of ['open','noticeChanged','admit','abort','recheckSettles','consumeSettles'])
  assert.ok(receipt.actions[action]>0,`${action} was replayed`);
});
