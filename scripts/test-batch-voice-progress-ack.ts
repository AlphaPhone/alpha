import {test,beforeEach,afterEach,mock} from 'node:test';
import assert from 'node:assert/strict';
import type {BatchProgressCue} from '../apps/app/src/runtime/local-agent-stream.ts';
import {loadLocalAgentStream} from './fixtures/local-agent-stream.ts';
const {createBatchProgressAcknowledgment:create,BATCH_CUE_HOLD_MS:HOLD,BATCH_CUE_REPLY_BOUND_MS:BOUND,genuineBatchProgress,batchProgressBinding,emitBatchProgress,batchVoiceProgressEvents:events}=await loadLocalAgentStream();
const turn='11111111-1111-4111-8111-111111111111',room='22222222-2222-4222-8222-222222222222';
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));
// The cue's hold and reply bound run on mocked setTimeout; setImmediate stays real for flushing.
beforeEach(()=>mock.timers.enable({apis:['setTimeout']}));
afterEach(()=>mock.timers.reset());
/** Let a queued cue's hold elapse so its speech starts. */
const held=async()=>{await tick();mock.timers.tick(HOLD);await tick();};
const cue=(patch: Partial<BatchProgressCue> = {}): BatchProgressCue=>({turnId:turn,conversationId:room,ownerId:'owner',kind:'thinking',label:'Checking the calendar',...patch});
function fixture(){
 const abort=new AbortController(),calls: {text: string; signal: AbortSignal}[]=[],history=[{id:'existing'}];
 let retired=true,current=true;
 const input: Parameters<typeof create>[0] = {turnId:turn,conversationId:room,ownerId:'owner',signal:abort.signal,assertCurrent:()=>{if(!current)throw Error('owner/view retired');},captureRetired:()=>retired,speak:async(text,signal,onStarted)=>{calls.push({text,signal});onStarted();}};
 return {abort,calls,history,input,make:()=>create(input),set current(value: boolean){current=value;},set retired(value: boolean){retired=value;}};
}
test('missing genuine cue is negative control: no TTS, no chat/agent/model/tool work',async()=>{
 const f=fixture(),a=f.make();await a.finish();assert.equal(f.calls.length,0);assert.deepEqual(f.history,[{id:'existing'}]);
});
test('genuine planner status speaks the exact model-provided label once',async()=>{
 const f=fixture(),a=f.make();a.progress(cue());await held();a.progress(cue());a.progress(cue({kind:'running_tool',toolName:'calendar.read'}));await a.finish();assert.equal(f.calls.length,1);assert.equal(f.calls[0].text,'Checking the calendar');assert.deepEqual(f.history,[{id:'existing'}]);
});
for(const patch of [{kind:'thinking',label:undefined},{kind:'streaming'},{kind:'waking'},{kind:'speaking'},{kind:'running_tool',toolName:undefined},{kind:'running_action',actionName:undefined}])test('initial/fake/unqualified status never cues '+JSON.stringify(patch),async()=>{
 // These malformed input kinds intentionally exercise runtime admission.
 const f=fixture(),a=f.make();a.progress(cue({...patch, kind: patch.kind as BatchProgressCue['kind']}));await a.finish();assert.equal(f.calls.length,0);
});
for(const patch of [{turnId:'foreign'},{conversationId:'foreign'},{ownerId:'foreign'}])test('foreign turn/room/owner cannot cue '+JSON.stringify(patch),async()=>{
 const f=fixture(),a=f.make();a.progress(cue(patch));await a.finish();assert.equal(f.calls.length,0);
});
test('microphone must already be retired before cue; no forced stop/resume',async()=>{
 const f=fixture();f.retired=false;const a=f.make();a.progress(cue());await held();assert.equal(f.calls.length,0);f.retired=true;a.progress(cue());await held();await a.finish();assert.equal(f.calls.length,1);
});
test('a live path passes no retirement claim (null): its cue plays with the capture open, still once and still preemptable',async()=>{
 const f=fixture();f.retired=false;f.input.captureRetired=null;const a=f.make();a.progress(cue());await held();a.progress(cue());await a.finish();assert.equal(f.calls.length,1);assert.equal(f.calls[0].text,'Checking the calendar');
 const g=fixture();g.input.captureRetired=null;const b=g.make();b.progress(cue());b.replyStarted();await b.finish();assert.equal(g.calls.length,0);
});
test('early final/token preempts cue queued in same turn',async()=>{
 const f=fixture(),a=f.make();a.progress(cue());a.replyStarted();await a.finish();assert.equal(f.calls.length,0);a.progress(cue());await held();assert.equal(f.calls.length,0);
});
test('a reply within the hold means the cue is never spoken',async()=>{
 const f=fixture(),a=f.make();a.progress(cue());await tick();mock.timers.tick(HOLD-1);await tick();assert.equal(f.calls.length,0);
 a.replyStarted();mock.timers.tick(HOLD);await tick();await a.idle();assert.equal(f.calls.length,0);await a.finish();assert.equal(f.calls.length,0);
 a.progress(cue());await held();assert.equal(f.calls.length,0);
});
test('a reply after the cue started lets it finish and reply speech waits for it',async()=>{
 const f=fixture(),playback=Promise.withResolvers<void>();f.input.speak=async(text,signal,onStarted)=>{f.calls.push({text,signal});onStarted();await playback.promise;if(signal.aborted)throw new DOMException('retired','AbortError');};
 const a=f.make();a.progress(cue());await held();assert.equal(f.calls.length,1);
 a.replyStarted();let idle=false;const reply=a.idle().then(()=>{idle=true;});await tick();
 assert.equal(f.calls[0].signal.aborted,false);assert.equal(idle,false);
 playback.resolve();await reply;assert.equal(idle,true);await a.finish();assert.equal(f.calls[0].signal.aborted,false);
 mock.timers.tick(BOUND);assert.equal(f.calls[0].signal.aborted,false);
});
test('a reply while the cue is still being synthesised drops it at once instead of waiting for its audio',async()=>{
 const f=fixture(),audio=Promise.withResolvers<void>();let late:(()=>void)|undefined;
 f.input.speak=async(text,signal,onStarted)=>{f.calls.push({text,signal});late=onStarted;signal.addEventListener('abort',()=>audio.resolve(),{once:true});await audio.promise;throw new DOMException('dropped','AbortError');};
 const a=f.make();a.progress(cue());await held();assert.equal(f.calls.length,1);assert.equal(f.calls[0].signal.aborted,false);
 a.replyStarted();assert.equal(f.calls[0].signal.aborted,true);await a.idle();await a.finish();
 // A start report racing in after the reply cannot turn the dropped cue back into one the reply waits for.
 late!();a.replyStarted();await a.idle();mock.timers.tick(BOUND);assert.equal(f.calls.length,1);
});
test('turn abort during playback still aborts the cue at once, even while the reply waits',async()=>{
 const f=fixture(),cleanup=Promise.withResolvers<void>();f.input.speak=async(text,signal,onStarted)=>{f.calls.push({text,signal});onStarted();await cleanup.promise;if(signal.aborted)throw new DOMException('retired','AbortError');};
 const a=f.make();a.progress(cue());await held();a.replyStarted();const idle=a.idle();await tick();assert.equal(f.calls[0].signal.aborted,false);
 f.abort.abort();assert.equal(f.calls[0].signal.aborted,true);cleanup.resolve();await idle;await a.stop();
});
test('a cue still playing past the bound after the reply is ready is aborted',async()=>{
 const f=fixture(),cleanup=Promise.withResolvers<void>();f.input.speak=async(text,signal,onStarted)=>{f.calls.push({text,signal});onStarted();signal.addEventListener('abort',()=>cleanup.resolve(),{once:true});await cleanup.promise;throw new DOMException('cut','AbortError');};
 const a=f.make();a.progress(cue());await held();a.replyStarted();let idle=false;const reply=a.idle().then(()=>{idle=true;});
 mock.timers.tick(BOUND-1);await tick();assert.equal(f.calls[0].signal.aborted,false);assert.equal(idle,false);
 mock.timers.tick(1);assert.equal(f.calls[0].signal.aborted,true);await reply;assert.equal(idle,true);await a.finish();
});
test('Stop cancels playing acknowledgement, late progress cannot restart',async()=>{
 const f=fixture(),cleanup=Promise.withResolvers<void>();f.input.speak=async(text,signal,onStarted)=>{f.calls.push({text,signal});onStarted();await cleanup.promise;if(signal.aborted)throw new DOMException('retired','AbortError');};const a=f.make();a.progress(cue());await held();const stop=a.stop();assert.equal(f.calls[0].signal.aborted,true);cleanup.resolve();await stop;a.progress(cue());await held();assert.equal(f.calls.length,1);
});
test('parent abort cancels queued acknowledgement before any speech',async()=>{
 const f=fixture(),a=f.make();a.progress(cue());f.abort.abort();await a.stop();assert.equal(f.calls.length,0);
});
test('hide/session/owner currentness blocks queued cue',async()=>{
 const f=fixture(),a=f.make();a.progress(cue());f.current=false;await assert.rejects(a.finish());assert.equal(f.calls.length,0);
});
test('unconfirmed cleanup is not swallowed on final/Stop',async()=>{
 const f=fixture(),bad=Object.assign(Error('cleanup unconfirmed'),{code:'speech-cleanup-unconfirmed'});f.input.speak=async()=>{throw bad;};const a=f.make();a.progress(cue());await held();await assert.rejects(a.finish(),e=>e===bad);await assert.rejects(a.stop(),e=>e===bad);
});
test('reply after cue completed still has zero overlap or repeated cue',async()=>{
 const f=fixture(),a=f.make();a.progress(cue({label:'Checking calendar'}));await held();await a.finish();a.progress(cue());await held();assert.equal(f.calls.length,1);
});
test('request binding admits only actual VOICE_DM clientMessageId and exact room stream path',()=>{
 const r={path:`/api/conversations/${room}/messages/stream`,ownerId:'owner',body:JSON.stringify({channelType:'VOICE_DM',clientMessageId:turn})};assert.deepEqual(batchProgressBinding(r),{turnId:turn,conversationId:room,ownerId:'owner'});
 for(const change of [{body:'{'},{body:JSON.stringify({channelType:'DM',clientMessageId:turn})},{path:'/api/auth/status'},{ownerId:''},{body:JSON.stringify({channelType:'VOICE_DM',clientMessageId:'wrong'})}])assert.equal(batchProgressBinding({...r,...change}),undefined);
});
test('only bound real planner/tool status emits a typed cue; legacy global string is not accepted',()=>{
 const found: BatchProgressCue[] = [];
 const listener = (event: Event) => { assert.ok(event instanceof CustomEvent); found.push(event.detail); };
 events.addEventListener('progress',listener);
 try{emitBatchProgress(undefined,{kind:'thinking',label:'plan'});emitBatchProgress({turnId:turn,conversationId:room,ownerId:'owner'},{kind:'thinking'});assert.equal(found.length,0);
 emitBatchProgress({turnId:turn,conversationId:room,ownerId:'owner'},{kind:'running_tool',toolName:'Calendar.read'});assert.equal(found.length,1);assert.equal(found[0].turnId,turn);assert.ok(Object.isFrozen(found[0]));assert.equal(genuineBatchProgress(found[0]),true);}
 finally{events.removeEventListener('progress',listener);}
});

test('named tool and action status without a model label stays silent without consuming the cue',async()=>{
 const f=fixture(),a=f.make();a.progress(cue({kind:'running_tool',toolName:'calendar.read',label:undefined}));a.progress(cue({kind:'running_action',actionName:'CALENDAR',label:undefined}));await held();assert.equal(f.calls.length,0);
 a.progress(cue({label:'Let me check your calendar.'}));await held();await a.finish();assert.equal(f.calls.length,1);assert.equal(f.calls[0].text,'Let me check your calendar.');
});
for(const label of ['', '   ', 'x'.repeat(161)])test('invalid model label remains silent '+label.length,async()=>{const f=fixture(),a=f.make();a.progress(cue({label}));await held();await a.finish();assert.equal(f.calls.length,0);});
test('queued speech keeps the validated model wording even if its source object is mutated',async()=>{const f=fixture(),a=f.make(),value=cue({label:'Checking your saved notes.'});a.progress(value);value.label='Different words';await held();await a.finish();assert.equal(f.calls[0].text,'Checking your saved notes.');});

for (const status of [{kind:'running_tool',toolName:'calendar.read'},{kind:'running_action',actionName:'CALENDAR'}] as const) test('named '+status.kind+' with a synthetic label stays visual-only and does not consume the model cue',async()=>{
 const f=fixture(),a=f.make();a.progress(cue({...status,label:'Synthetic system status'}));await held();assert.equal(f.calls.length,0);
 a.progress(cue({label:'Checking your calendar now.'}));await held();await a.finish();assert.equal(f.calls.length,1);assert.equal(f.calls[0].text,'Checking your calendar now.');
});
