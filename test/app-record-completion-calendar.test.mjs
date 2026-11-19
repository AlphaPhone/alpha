// A chat reply's canonical effect receipts refresh Calendar and Home: a committed event create,
// update or delete, and an approved change the provider accepted, each produce one Calendar
// invalidation. Queuing or declining a review, a replay, a failure and a preview change no event.
// Evidence class: unit test of the pure receipt mapping; not an agent, model or device run.
import test from 'node:test';
import assert from 'node:assert/strict';
import {appRecordInvalidations,CALENDAR_INVALIDATED_EVENT,NOTES_INVALIDATED_EVENT} from '../apps/app/src/runtime/app-record-completion.ts';

const observedAt='2026-11-17T10:00:00.000Z';
let next=0;
const base=(operation,resource,artifacts=[])=>({receiptId:`receipt-${++next}`,operation,resource,artifacts,idempotency:{key:'operation-key',replayed:false},observedAt});
const applied=(operation,resource,kind='durable',artifacts=[])=>({...base(operation,resource,artifacts),outcome:'applied',commit:{kind,id:resource.id,committedAt:observedAt}});
// The receipt the CALENDAR action returns for a built-in calendar write (plugin-calendar calendar-handler.ts).
const eventReceipt=(verb,version='"etag-1"')=>applied(`calendar.event.${verb}`,{kind:'calendar.event',id:'event-1',version});
// The receipt for a change queued for the owner's review: a request row, not an event.
const queued=()=>applied('calendar.approval.modify_event',{kind:'calendar.approval_request',id:'request-1',version:'pending'});
const result=(...effectReceipts)=>({success:true,effectReceipts});
const calendarHints=results=>appRecordInvalidations(results).filter(hint=>hint.event===CALENDAR_INVALIDATED_EVENT);

test('each committed chat change to an event refreshes Calendar once',()=>{
 for(const verb of ['create','update','delete'])assert.deepEqual(appRecordInvalidations([result(eventReceipt(verb))]),[{event:CALENDAR_INVALIDATED_EVENT}],verb);
 assert.deepEqual(appRecordInvalidations([result(eventReceipt('create')),result(eventReceipt('update','"etag-2"'),eventReceipt('delete','deleted:"etag-2"'))]),[{event:CALENDAR_INVALIDATED_EVENT}],'one reply gives one hint');
});
test('an approved change the provider accepted refreshes Calendar; queuing or declining a review does not',()=>{
 const event={kind:'calendar.event',id:'event-1'};
 assert.equal(calendarHints([result(applied('calendar.approval.resolve',{kind:'calendar.approval',id:'request-1'},'provider_accepted',[event]))]).length,1);
 assert.equal(calendarHints([result(applied('calendar.event.update',{kind:'calendar.approval_request',id:'request-1'},'provider_accepted',[event]))]).length,1);
 assert.deepEqual(appRecordInvalidations([result(queued())]),[]);
 assert.deepEqual(appRecordInvalidations([result(applied('calendar.approval.resolve',{kind:'calendar.approval',id:'request-1'}))]),[],'a declined review changed no event');
 assert.deepEqual(appRecordInvalidations([result(applied('calendar.approval.resolve',{kind:'calendar.approval',id:'request-1'},'provider_accepted'))]),[],'an acceptance that names no event');
 assert.deepEqual(appRecordInvalidations([result(applied('calendar.approval.resolve',{kind:'calendar.approval',id:'request-1'},'durable',[event]))]),[],'a resolution the provider has not accepted');
});
test('a receipt that committed no event change leaves Calendar alone',()=>{
 const resource={kind:'calendar.event',id:'event-1'};
 for(const receipt of [
  {...base('calendar.event.create',resource),outcome:'noop',reason:'An identical event already exists.'},
  {...base('calendar.event.update',resource),outcome:'failed',failure:{code:'CALENDAR_WRITE_FAILED',retryable:true,acceptance:'not_accepted'}},
  {...base('calendar.event.delete',resource),outcome:'preview'},
  applied('calendar.event.read',resource),
  applied('calendar.event.create',{kind:'calendar.availability',id:'window-1'}),
 ])assert.deepEqual(appRecordInvalidations([result(receipt)]),[],receipt.operation+' '+receipt.outcome);
 for(const results of [undefined,[],[null,'text',{success:true}],[{effectReceipts:'not-a-list'}],[{effectReceipts:[{operation:'calendar.event.create'}]}]])assert.deepEqual(appRecordInvalidations(results),[]);
});
test('a malformed result does not hide a committed change in the same reply, and each record kind gets its own hint',()=>{
 assert.deepEqual(appRecordInvalidations([{effectReceipts:[{operation:'calendar.event.create'}]},result(eventReceipt('update'))]),[{event:CALENDAR_INVALIDATED_EVENT}]);
 const note=applied('notes.note.update',{kind:'notes.note',id:'note-1',version:'7'});
 assert.deepEqual(appRecordInvalidations([result(note,eventReceipt('create'))]),[{event:NOTES_INVALIDATED_EVENT,revision:7},{event:CALENDAR_INVALIDATED_EVENT}]);
});
