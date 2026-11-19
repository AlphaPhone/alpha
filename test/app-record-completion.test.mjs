// A chat reply's canonical effect receipts refresh the open Notes view: the receipts the agent's
// NOTES action returns for a create, an update, a delete and a restore each produce one Notes
// invalidation carrying the committed revision; an identical-note replay changes nothing.
// Evidence class: unit test of the pure receipt mapping; not an agent, model or device run.
import test from 'node:test';
import assert from 'node:assert/strict';
import {appRecordInvalidations,NOTES_INVALIDATED_EVENT,CALENDAR_INVALIDATED_EVENT} from '../apps/app/src/runtime/app-record-completion.ts';

const observedAt='2026-11-17T10:00:00.000Z';
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let next=0;
// The receipt the NOTES action attaches to its result (plugin-notes action.ts).
const applied=(op,{noteId='note-1',revision}={})=>({
 receiptId:uuid(++next),operation:`notes.note.${op}`,
 resource:{kind:'notes.note',id:noteId,...(revision===undefined?{}:{version:String(revision)})},
 artifacts:[],idempotency:{key:null,replayed:false},observedAt,
 outcome:'applied',commit:{kind:'durable',id:noteId,committedAt:observedAt},
});
const replay=(noteId='note-1',revision=4)=>({
 receiptId:uuid(++next),operation:'notes.note.create',resource:{kind:'notes.note',id:noteId,version:String(revision)},
 artifacts:[],idempotency:{key:noteId,replayed:true},observedAt,outcome:'noop',reason:'An identical note already exists.',
});
const result=(...effectReceipts)=>({success:true,effectReceipts});

test('each committed chat change to a note refreshes Notes at the committed revision',()=>{
 for(const op of ['create','update','patch','delete','restore'])
  assert.deepEqual(appRecordInvalidations([result(applied(op,{revision:7}))]),[{event:NOTES_INVALIDATED_EVENT,revision:7}],op);
});

test('an identical-note replay, a failed action and a reply without receipts refresh nothing',()=>{
 assert.deepEqual(appRecordInvalidations([result(replay())]),[]);
 assert.deepEqual(appRecordInvalidations([{success:false,error:'NOTES_NOT_FOUND'}]),[]);
 assert.deepEqual(appRecordInvalidations([{success:true,effectReceipts:[]}]),[]);
 assert.deepEqual(appRecordInvalidations(undefined),[]);
 // An unrecognised operation on a note is not a refresh hint.
 assert.deepEqual(appRecordInvalidations([result(applied('archive',{revision:3}))]),[]);
});

test('one reply yields one Notes refresh at the newest revision, or none named when a revision is unknown',()=>{
 assert.deepEqual(appRecordInvalidations([result(applied('create',{noteId:'a',revision:4})),result(replay('a')),result(applied('delete',{noteId:'b',revision:6}))]),
  [{event:NOTES_INVALIDATED_EVENT,revision:6}]);
 assert.deepEqual(appRecordInvalidations([result(applied('update',{revision:5})),result(applied('delete',{noteId:'b'}))]),[{event:NOTES_INVALIDATED_EVENT}]);
 // A malformed receipt list is skipped; the valid result beside it still refreshes.
 assert.deepEqual(appRecordInvalidations([{effectReceipts:'nope'},result(applied('update',{revision:2}))]),[{event:NOTES_INVALIDATED_EVENT,revision:2}]);
 assert.ok(!appRecordInvalidations([result(applied('create',{revision:1}))]).some(hint=>hint.event===CALENDAR_INVALIDATED_EVENT));
});
