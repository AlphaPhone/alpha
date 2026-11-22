import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkTraces as check, qmap, qset} from '../specs/quint/refinement/check-traces.mjs';
import {bundledSource, captureSources, boundInputs, trace, checkpoint, call, deferred, tick} from '../specs/quint/refinement/application/support.mjs';

// The actual DeferredCalendarDeletes helper against AgentCalendarDeferredDelete: controlled timers and
// send results, two synthetic events. No Calendar service, adapter, toast or WebView is exercised.
const driver='test/quint-agent-calendar-deferred-delete.test.mjs';
captureSources([driver]);
const source='apps/app/src/prototype/calendar-deferred-delete.ts';

async function checkDeferredDelete(){
  const loaded=await bundledSource(source),{DeferredCalendarDeletes,calendarDeletionHides}=loaded.exports,traces=[];
  const event=e=>({id:'event-'+e,externalId:'event-'+e,provider:'eliza',side:'owner',grantId:'eliza-calendar',calendarId:'primary',startAt:'2027-01-01T10:00:00.000Z'});
  const scenarios={
    'undo-sends-nothing':[['confirm',1],['undo',1],['confirm',1],['elapse',1],['succeed',1],['readWithout',1]],
    'window-ends-sends-once':[['confirm',1],['elapse',1],['lateUndo',1],['succeed',1],['readWith',1],['readWithout',1]],
    'refused-shows-again':[['confirm',2],['elapse',2],['refused',2],['confirm',2],['elapse',2],['succeed',2]],
    'second-confirm-sends-first':[['confirm',1],['confirm',2],['lateUndo',1],['refused',1],['undo',2]],
    'leave-sends-waiting':[['confirm',1],['leave'],['succeed',1],['confirm',2],['leave'],['refused',2]],
    'retire-drops-waiting':[['confirm',1],['confirm',2],['retire'],['succeed',1],['confirm',2],['undo',2]],
  };
  for(const [name,actions] of Object.entries(scenarios)){
    const timers=new Map();let nextTimer=1;
    const clock={set(fn){const id=nextTimer++;timers.set(id,fn);return id;},clear(id){timers.delete(id);}};
    const deletes=new DeferredCalendarDeletes(()=>10000,clock);
    const confirms={1:0,2:0},sends={1:0,2:0},cancels={1:0,2:0},staged={},replies={1:[],2:[]},feed=new Set([1,2]);
    const phase=e=>{const id=staged[e];const value=id?deletes.phaseOf(id):'none';return value;};
    const observe=()=>({'s.phase':qmap([1,2].map(e=>[e,phase(e)])),'s.confirms':qmap([1,2].map(e=>[e,confirms[e]])),
      's.sends':qmap([1,2].map(e=>[e,sends[e]])),'s.cancels':qmap([1,2].map(e=>[e,cancels[e]])),
      Hidden:qset([1,2].filter(e=>deletes.hidden(event(e))))});
    const t=trace(name,observe());
    for(const [action,e] of actions){
      if(action==='confirm'){
        confirms[e]++;
        const waitingBefore=[1,2].filter(other=>phase(other)==='waiting');
        staged[e]=deletes.stage({hides:calendarDeletionHides(event(e)),send:()=>{sends[e]++;const reply=deferred();replies[e].push(reply);return reply.promise;}}).id;
        assert.ok(waitingBefore.every(other=>phase(other)==='sending'),'a waiting deletion is sent when another is confirmed');
      }else if(action==='undo'){assert.equal(deletes.undo(staged[e]),true);cancels[e]++;}
      else if(action==='lateUndo')assert.equal(deletes.undo(staged[e]),false);
      else if(action==='elapse'){const fire=[...timers.entries()].at(-1);assert.ok(fire,'the window timer is pending');timers.delete(fire[0]);fire[1]();}
      else if(action==='leave')deletes.leave();
      else if(action==='retire'){for(const other of [1,2])if(phase(other)==='waiting')cancels[other]++;deletes.drop();}
      else if(action==='succeed'){replies[e].shift().resolve();await tick();feed.delete(e);}
      else if(action==='refused'){replies[e].shift().reject(Error('refused'));await tick();}
      else if(action==='readWith')deletes.prune([...feed,e].map(event));
      else if(action==='readWithout')deletes.prune([...feed].filter(other=>other!==e).map(event));
      await tick();
      checkpoint(t,action,call(action,...(e===undefined?[]:[e])),observe());
    }
    traces.push(t);
  }
  return check(boundInputs({model:'AgentCalendarDeferredDelete',sources:[source,...loaded.sources,driver],traces,scope:'bounded-component',assumptions:[
    'The actual DeferredCalendarDeletes and calendarDeletionHides execute; timers and the send promise are controlled. Phase, hidden rows and request counts are read from the helper.',
    'The Agent Calendar adapter wiring (toast Undo, leaving the app, account change, the reviewed confirmation and the Calendar service request) is checked by source assertions and the browser spec, not here.']}));
}

test('Agent Calendar deletion Undo replays the actual helper against its model',{timeout:scaledTimeout(240000)},async()=>{
  const receipt=await checkDeferredDelete();
  assert.ok(receipt.passed&&receipt.inputsUnchanged&&receipt.driverInputsBound,JSON.stringify(receipt.results?.find?.(r=>r.kind!=='passed')??{}).slice(0,2000));
  assert.equal(receipt.traces,6);
});
