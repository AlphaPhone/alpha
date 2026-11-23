// Agent Calendar deletion Undo (CAL-07): the reviewed delete waits out the Undo window before it is
// sent. Synthetic timers and sends only; no Calendar service, WebView or provider is exercised.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DeferredCalendarDeletes,calendarDeletionHides} from '../apps/app/src/prototype/calendar-deferred-delete.ts';

function timers(){
  const pending=new Map();let next=1;
  return {pending,set(fn,ms){const id=next++;pending.set(id,{fn,ms});return id;},clear(id){pending.delete(id);},fire(){const due=[...pending];pending.clear();for(const [,timer] of due)timer.fn();}};
}
const row=(id,extra={})=>({id,externalId:id,provider:'google',side:'owner',grantId:'g',connectorAccountId:'a',calendarId:'primary',startAt:'2027-01-0'+(extra.day??1)+'T10:00:00.000Z',...extra});
function setup(){
  const clock=timers(),sent=[],failures=[];let refuse=false;
  const deletes=new DeferredCalendarDeletes(()=>10000,clock);
  const stage=event=>deletes.stage({hides:calendarDeletionHides(event),send:async()=>{sent.push(event.id);if(refuse)throw Error('refused');},failed:error=>failures.push(error.message)});
  return {clock,sent,failures,deletes,stage,refuse:value=>{refuse=value;}};
}

test('a confirmed delete is hidden for the Undo window and Undo sends nothing',async()=>{
  const {clock,sent,deletes,stage}=setup(),event=row('a');
  const staged=stage(event);
  assert.equal([...clock.pending.values()][0].ms,10000,'the window is the Undo notice length');
  assert.ok(deletes.hidden(event));assert.deepEqual(sent,[]);
  assert.equal(staged.undo(),true);
  assert.ok(!deletes.hidden(event),'the event shows again');
  clock.fire();await deletes.settled();
  assert.deepEqual(sent,[],'nothing is sent after Undo');
  assert.equal(staged.undo(),false,'Undo works once');
});

test('the delete is sent once when the window ends and stays hidden until a read drops it',async()=>{
  const {clock,sent,deletes,stage}=setup(),event=row('a');
  const staged=stage(event);
  clock.fire();await deletes.settled();
  assert.deepEqual(sent,['a']);
  assert.equal(staged.undo(),false,'too late to undo');
  assert.ok(deletes.hidden(event),'still hidden while the old feed is shown');
  deletes.prune([event]);assert.ok(deletes.hidden(event));
  deletes.prune([]);assert.ok(!deletes.hidden(event));
  clock.fire();await deletes.settled();assert.deepEqual(sent,['a'],'never sent twice');
});

test('a refused delete shows the event again and reports why',async()=>{
  const {clock,failures,deletes,stage,refuse}=setup(),event=row('a');
  refuse(true);stage(event);clock.fire();await deletes.settled();
  assert.deepEqual(failures,['refused']);assert.ok(!deletes.hidden(event));
});

test('one Undo at a time: a second delete sends the first at once',async()=>{
  const {sent,deletes,stage}=setup(),a=row('a'),b=row('b');
  const first=stage(a);stage(b);await deletes.settled();
  assert.deepEqual(sent,['a']);assert.equal(first.undo(),false);
  assert.ok(deletes.hidden(a)&&deletes.hidden(b));assert.ok(deletes.waiting);
});

test('leaving the app sends a waiting delete; a changed session drops it unsent',async()=>{
  const left=setup(),event=row('a');
  left.stage(event);left.deletes.leave();await left.deletes.settled();
  assert.deepEqual(left.sent,['a']);
  const changed=setup();
  const staged=changed.stage(event);changed.deletes.drop();
  assert.ok(!changed.deletes.hidden(event));assert.equal(changed.clock.pending.size,0);
  changed.clock.fire();await changed.deletes.settled();
  assert.deepEqual(changed.sent,[]);assert.equal(staged.undo(),false);
});

test('a series delete hides the series; this-and-following hides from the occurrence on',()=>{
  const first=row('s_1',{recurringEventId:'s',day:1}),second=row('s_2',{recurringEventId:'s',day:2}),third=row('s_3',{recurringEventId:'s',day:3}),other=row('o',{day:2});
  const series=calendarDeletionHides(second,'series'),following=calendarDeletionHides(second,'this_and_following'),one=calendarDeletionHides(second,'instance');
  assert.deepEqual([first,second,third,other].map(series),[true,true,true,false]);
  assert.deepEqual([first,second,third,other].map(following),[false,true,true,false]);
  assert.deepEqual([first,second,third,other].map(one),[false,true,false,false]);
  assert.equal(calendarDeletionHides(second,'series')({...third,calendarId:'other'}),false,'another calendar is never hidden');
});

test('the Agent Calendar adapter defers its delete behind Undo and ends the window when the app is left',()=>{
  const adapter=readFileSync('apps/app/src/prototype/agent-calendar-adapter.ts','utf8');
  assert.match(adapter,/const hides=calendarDeletionHides\(e,scopeValue\)/);
  assert.match(adapter,/deletes\.stage\(\{hides,offered,unchanged:/,'the window follows the Undo notice, and a changed row shows again');
  assert.match(adapter,/shell\.undoFn===undoDelete\|\|!!shell\.toastQueue\?\.some/,'a held or queued Undo is still offered');
  assert.match(adapter,/api\.toast\(mode==='decline_invitation'\?'Invitation declined':'Event deleted',\{undo:/);
  assert.match(adapter,/if\(document\.hidden\)deletes\.leave\(\);/);
  assert.match(adapter,/if\(deletes\.waiting\)\{deletes\.drop\(\);if\(this\.live\)\{if\(this\.toastActive&&pendingUndo&&this\.undoFn===pendingUndo\)this\.closeToast\(\);this\.toast\('Not deleted'\);\}\}/,'a dropped deletion takes its stale Undo off the screen');
  assert.doesNotMatch(adapter,/confirmCalendarAction\([^;]+\)\|\|!current\(\)\)return;try\{await calendar!\.delete/,'no immediate delete after the review');
});

test('the window does not end while its Undo is still offered (held by focus or queued)',async()=>{
  const clock=timers(),sent=[];let offered=true;
  const deletes=new DeferredCalendarDeletes(()=>10000,clock),event=row('a');
  const staged=deletes.stage({hides:calendarDeletionHides(event),offered:()=>offered,send:async()=>{sent.push('a');}});
  clock.fire();await deletes.settled();
  assert.deepEqual(sent,[],'nothing is sent while the Undo is on screen');assert.ok(deletes.waiting);
  assert.equal([...clock.pending.values()][0].ms,500,'checked again shortly');
  clock.fire();await deletes.settled();assert.deepEqual(sent,[]);
  assert.equal(staged.undo(),true,'Undo still works after a held window');
  const again=deletes.stage({hides:calendarDeletionHides(event),offered:()=>offered,send:async()=>{sent.push('a');}});
  clock.fire();offered=false;clock.fire();await deletes.settled();
  assert.deepEqual(sent,['a'],'sent once the notice has gone');assert.equal(again.undo(),false);
});

test('a sent decline stops hiding once a read returns its row changed',async()=>{
  const clock=timers(),deletes=new DeferredCalendarDeletes(()=>10000,clock),event=row('a',{metadata:{etag:'1'}});
  deletes.stage({hides:calendarDeletionHides(event),unchanged:value=>value.metadata?.etag==='1',send:async()=>{}});
  const declined={...event,metadata:{etag:'2'}};
  assert.ok(deletes.hidden(declined),'hidden while it waits, whatever the row');
  clock.fire();await deletes.settled();
  assert.ok(deletes.hidden(event),'the old row stays hidden after the send');
  deletes.prune([declined]);
  assert.ok(!deletes.hidden(declined),'the declined row shows again, as the next read reports it');
  assert.ok(!deletes.waiting);
});
