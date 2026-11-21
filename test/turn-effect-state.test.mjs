// A failed turn's own receipts decide what the owner is told: "Done · reply cut off" only when a
// change committed, "Needs your approval · reply cut off" when the turn only queued an owner-approval
// request (v613 review: "cancel my dentist appointment" on a linked calendar queued an approval, the
// reply failed, and the phone said Done), and nothing when nothing committed.
// Evidence class: unit test of the pure receipt mapping; not an agent, model or device run.
import test from 'node:test';
import assert from 'node:assert/strict';
import {effectBeforeFailure,effectInterruptedText,EFFECT_APPLIED_INTERRUPTED,EFFECT_AWAITING_APPROVAL_INTERRUPTED} from '../apps/app/src/runtime/turn-effect-state.ts';

const observedAt='2026-11-20T10:00:00.000Z';
let next=0;
const base=(operation,resource,artifacts=[])=>({receiptId:`receipt-${++next}`,operation,resource,artifacts,idempotency:{key:`key-${next}`,replayed:false},observedAt});
const applied=(operation,resource,kind='durable',artifacts=[])=>({...base(operation,resource,artifacts),outcome:'applied',commit:{kind,id:resource.id,committedAt:observedAt}});
// The receipt plugin-calendar's calendarApprovalReceipt returns for a linked-calendar change queued for review.
const queued=(verb='cancel')=>applied(`calendar.approval.${verb}`,{kind:'calendar.approval_request',id:'request-1',version:'pending'});
const eventReceipt=verb=>applied(`calendar.event.${verb}`,{kind:'calendar.event',id:'event-1',version:'"etag-1"'});
const failed=(...effectReceipts)=>({terminalFailure:{kind:'reply_generation_error',code:'RATE_LIMITED',transient:true},actionResults:[{success:true,effectReceipts}]});
const interrupted=(...effectReceipts)=>({terminalFailure:{kind:'handler_error',code:'TURN_INTERRUPTED_AFTER_EFFECT',transient:false},actionResults:effectReceipts.length?[{success:true,effectReceipts}]:[]});

test('a queued calendar approval is not reported as done',()=>{
 for(const verb of ['cancel','modify_event','schedule_event'])assert.equal(effectBeforeFailure(failed(queued(verb))),'awaiting-approval',verb);
 // Upstream counts a new request as committed and sends its post-commit interruption code.
 assert.equal(effectBeforeFailure(interrupted(queued())),'awaiting-approval');
 assert.equal(effectInterruptedText('awaiting-approval'),EFFECT_AWAITING_APPROVAL_INTERRUPTED);
 assert.equal(EFFECT_AWAITING_APPROVAL_INTERRUPTED.startsWith('Done'),false);
});

test('a committed change is still done',()=>{
 for(const verb of ['create','update','delete'])assert.equal(effectBeforeFailure(failed(eventReceipt(verb))),'applied',verb);
 // A request the provider accepted at once, naming the changed event, is the change itself.
 assert.equal(effectBeforeFailure(failed(applied('calendar.approval.modify_event',{kind:'calendar.approval_request',id:'request-2'},'provider_accepted',[{kind:'calendar.event',id:'event-1'}]))),'applied');
 // A queued approval beside a committed change: the change is what happened.
 assert.equal(effectBeforeFailure(failed(queued(),eventReceipt('create'))),'applied');
 assert.equal(effectBeforeFailure(failed(applied('workflow.deactivate',{kind:'workflow',id:'workflow-1'}))),'applied');
 // Upstream's post-commit code without receipts keeps its meaning.
 assert.equal(effectBeforeFailure(interrupted()),'applied');
 assert.equal(effectInterruptedText('applied'),EFFECT_APPLIED_INTERRUPTED);
});

test('nothing committed reports no effect',()=>{
 const resource={kind:'calendar.event',id:'event-1'};
 assert.equal(effectBeforeFailure({terminalFailure:{kind:'reply_generation_error'}}),undefined);
 assert.equal(effectBeforeFailure(failed({...base('calendar.event.delete',resource),outcome:'noop',reason:'Nothing matched.'})),undefined);
 assert.equal(effectBeforeFailure(failed({...queued(),outcome:'noop',reason:'replayed'})),undefined);
 const change=eventReceipt('create');
 const undo={...base('calendar.event.delete',resource),outcome:'rolled_back',rollback:{receiptId:'undo-1',revertedReceiptIds:[change.receiptId],rolledBackAt:observedAt}};
 assert.equal(effectBeforeFailure(failed(change,undo)),undefined,'a rolled-back change');
});
