import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
// The ongoing-call bar's state and clock (apps/app/src/runtime/ongoing-call.ts). Owner report on
// v609: the bar must say what the call screen says while the call dials, count from Android's
// connect time once it is active, and keep its place as "Call ended" for a moment when the call goes.
const bundle=await build({entryPoints:['apps/app/src/runtime/ongoing-call.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {callBarStatus,presentCallBar,ENDED_CALL_BAR,nextCallBarPhase,parseOngoingCalls,installOngoingCallBar,CALL_ENDED_HOLD_MS}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const now=1_763_400_000_000;

test('a dialing or connecting call says Calling…, never a clock, whatever time it carries',()=>{
 assert.equal(callBarStatus('dialing',null,now),'Calling…');
 assert.equal(callBarStatus('dialing',now-5_000,now),'Calling…');
 assert.equal(callBarStatus('ringing',null,now),'Incoming call');
 assert.equal(callBarStatus('ringing',now-5_000,now),'Incoming call');
 assert.equal(presentCallBar({state:'dialing',connectedAt:null},now,()=>{},()=>{}).returnLabel,'Return to call, Calling…');
 assert.equal(presentCallBar({state:'ringing',connectedAt:null},now,()=>{},()=>{}).endLabel,'Decline');
});

test('an active call counts from the connect time Android reports, not from when the bar appeared',()=>{
 assert.equal(callBarStatus('active',now-42_000,now),'On call · 0:42');
 assert.equal(callBarStatus('active',now-3_725_000,now),'On call · 1:02:05');
 // Dialing then active: the clock starts at the connect time, not at the dialing reading's time.
 const dialedAt=now-30_000,connectedAt=now-7_000;
 assert.equal(callBarStatus('dialing',null,dialedAt),'Calling…');
 assert.equal(callBarStatus('active',connectedAt,now),'On call · 0:07');
 // Active before Telecom set a connect time: no invented 0:00.
 assert.equal(callBarStatus('active',null,now),'On call');
 assert.equal(callBarStatus('held',now-9_000,now),'On hold');
 assert.equal(presentCallBar({state:'active',connectedAt:now-61_000},now,()=>{},()=>{}).ended,false);
});

test('the native reading keeps its exact shape',()=>{
 assert.deepEqual(parseOngoingCalls({calls:[{id:'a',state:'dialing',connectedAt:null}]}),[{id:'a',state:'dialing',connectedAt:null}]);
 assert.equal(parseOngoingCalls({calls:[{id:'a',state:'connecting',connectedAt:null}]}),null);
});

test('a malformed refresh clears the bar and an earlier refresh cannot restore it', async () => {
 const previousDocument = globalThis.document;
 const visibility = new EventTarget();
 globalThis.document = visibility;
 const call = {calls: [{id: 'a', state: 'active', connectedAt: Date.now() - 1_000}]};
 let response = Promise.resolve(call);
 let resolveEarlier;
 const plugin = {
  ongoingCall: () => response,
  addListener: async () => ({remove() {}}),
 };
 class Shell {
  renderVals() { return {isOn: true}; }
  setState() {}
 }
 installOngoingCallBar(Shell, {}, plugin);
 const shell = new Shell();
 try {
  shell.componentDidMount();
  await new Promise(setImmediate);
  assert.equal(shell.renderVals().hasCallBar, true);
  response = new Promise(resolve => { resolveEarlier = resolve; });
  visibility.dispatchEvent(new Event('visibilitychange'));
  response = Promise.resolve({calls: [{id: 'a', state: 'unknown', connectedAt: null}]});
  visibility.dispatchEvent(new Event('visibilitychange'));
  await new Promise(setImmediate);
  assert.equal(shell.renderVals().hasCallBar, false);
  resolveEarlier(call);
  await new Promise(setImmediate);
  assert.equal(shell.renderVals().hasCallBar, false);
 } finally {
  shell.componentWillUnmount();
  if (previousDocument === undefined) delete globalThis.document;
  else globalThis.document = previousDocument;
 }
});

test('an ended call keeps its bar for the hold time, then the bar goes',()=>{
 let memory={shown:false,endedUntil:0},step;
 step=nextCallBarPhase(memory,true,true,true,now);assert.equal(step.phase,'live');memory=step.memory;
 step=nextCallBarPhase(memory,false,true,true,now+10);assert.equal(step.phase,'ended');memory=step.memory;
 assert.equal(memory.endedUntil,now+10+CALL_ENDED_HOLD_MS);
 assert.ok(CALL_ENDED_HOLD_MS>=1000&&CALL_ENDED_HOLD_MS<=2000);
 step=nextCallBarPhase(memory,false,true,true,now+10+CALL_ENDED_HOLD_MS-1);assert.equal(step.phase,'ended');memory=step.memory;
 step=nextCallBarPhase(memory,false,true,true,now+10+CALL_ENDED_HOLD_MS);assert.equal(step.phase,'none');
 assert.deepEqual(step.memory,{shown:false,endedUntil:0});
});

test('a new call during the ended moment shows at once',()=>{
 let step=nextCallBarPhase({shown:true,endedUntil:0},false,true,true,now);
 step=nextCallBarPhase(step.memory,true,true,true,now+200);
 assert.equal(step.phase,'live');assert.deepEqual(step.memory,{shown:true,endedUntil:0});
});

test('leaving the places the bar shows, or an untrusted reading, removes it without "Call ended"',()=>{
 assert.equal(nextCallBarPhase({shown:true,endedUntil:0},false,false,true,now).phase,'none');
 assert.equal(nextCallBarPhase({shown:false,endedUntil:now+500},false,false,true,now).phase,'none');
 const untrusted=nextCallBarPhase({shown:true,endedUntil:0},false,true,false,now);
 assert.equal(untrusted.phase,'none');assert.deepEqual(untrusted.memory,{shown:false,endedUntil:0});
 assert.equal(nextCallBarPhase({shown:false,endedUntil:0},false,true,true,now).phase,'none');
});

test('the ended bar offers nothing to press and tells a screen reader the call ended',()=>{
 const bar=ENDED_CALL_BAR;
 assert.equal(bar.status,'Call ended');assert.equal(bar.ended,true);assert.equal(bar.announcement,'Call ended');
 assert.equal(bar.open(),undefined);assert.equal(bar.end(),undefined);
});
