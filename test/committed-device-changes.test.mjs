// The approval-receipt path (agent-adapter -> publishCommittedDeviceChanges) is what tells an open
// Notes, Calendar or Reminders list to reload after an approved change. The real function runs
// over a synthetic client; only window is an in-process EventTarget.
import test from 'node:test';
import assert from 'node:assert/strict';
import {tsImport} from 'tsx/esm/api';

const {publishCommittedDeviceChanges}=await tsImport('../apps/app/src/runtime/device-actions.ts',import.meta.url);

const session={ownerId:'synthetic-owner',agentId:'synthetic-agent',sessionId:'synthetic-session',origin:'https://agent.example.test'};
const receipt=(committedChanges,proposalId='proposal-1')=>({proposalId,status:'succeeded',summary:'Deleted 1 note',committedChanges});

function client(state){
 const listeners=new Set();
 return {
  getState:()=>({connection:'ready',pending:false,session:{...session},context:{view:'notes',revision:1},...state}),
  subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener);},
  set(next){Object.assign(state,next);for(const listener of [...listeners])listener();},
  listeners,
 };
}

function events(){
 const seen=[];globalThis.window=new EventTarget();
 for(const name of ['alpha:notes-committed','alpha:calendar-committed','alpha:reminders-committed'])window.addEventListener(name,()=>seen.push(name));
 return seen;
}

test('a notes receipt in the idle same session announces alpha:notes-committed once',()=>{
 const seen=events(),agent=client({});
 const delivered=receipt(['notes']);
 publishCommittedDeviceChanges(delivered,agent,session);
 assert.deepEqual(seen,['alpha:notes-committed']);
 publishCommittedDeviceChanges(delivered,agent,session);
 assert.deepEqual(seen,['alpha:notes-committed'],'the same receipt is never announced twice');
 assert.equal(agent.listeners.size,0);
});

test('a receipt waits for the pending turn to finish, then announces',()=>{
 const seen=events(),state={pending:true},agent=client(state);
 publishCommittedDeviceChanges(receipt(['notes','calendar']),agent,session);
 assert.deepEqual(seen,[]);
 agent.set({pending:false});
 assert.deepEqual(seen,['alpha:notes-committed','alpha:calendar-committed']);
});

test('a receipt for another session or a failed operation announces nothing',()=>{
 const seen=events();
 publishCommittedDeviceChanges(receipt(['notes']),client({session:{...session,sessionId:'other-session'}}),session);
 publishCommittedDeviceChanges({...receipt(['notes'],'proposal-2'),status:'failed'},client({}),session);
 assert.deepEqual(seen,[]);
});
