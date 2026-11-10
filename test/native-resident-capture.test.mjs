import test from 'node:test';
import assert from 'node:assert/strict';
import {openNativeResidentCapture} from '../apps/app/src/runtime/native-resident-capture.ts';

const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
function fixture(){
 const listeners=new Map(),stops=[],results=[],errors=[],edges=[],levels=[];let id,valid=true,startResolve,stopResolve,eventFeed;
 const state={delayStart:false,delayStop:false,ack:true};
 const port={async addListener(name,handler){listeners.set(name,handler);return {remove:async()=>listeners.delete(name)};},
  async startLiveCapture(input){id=input.captureId;if(state.delayStart)await new Promise(resolve=>{startResolve=resolve;});return {captureId:id,sampleRate:16000,echoCancelled:true,nativeAsr:true};},
  async stopLiveCapture(input){stops.push(input);state.onStop?.();if(state.delayStop)await new Promise(resolve=>{stopResolve=resolve;});return {serverClosed:state.ack};}};
 const controller=new AbortController();
 const input={signal:controller.signal,ownerId:'owner',echoCancel:true,current:()=>valid,subscribe:handler=>{eventFeed=handler;return()=>{eventFeed=undefined;};},onSpeechStart:at=>edges.push(['start',at]),onSpeechEnd:at=>edges.push(['end',at]),onSegment:(text)=>results.push(text),onLost:error=>errors.push(error),onLevel:peak=>levels.push(peak)};
 return {state,stops,results,errors,edges,levels,controller,listeners,open:()=>openNativeResidentCapture(port,input),emit:(name,event)=>listeners.get(name)?.(Object.defineProperty(Object.create(event),'captureId',{value:id})),invalidate:()=>{valid=false;},finishStart:()=>startResolve?.(),finishStop:()=>stopResolve?.(),feed:event=>eventFeed?.(event)};
}
test('native path sees metadata and one final; PCM property is never read',async()=>{
 const f=fixture(),capture=await f.open();
 const event={vad:[{type:'speech-start',timestampMs:1},{type:'speech-end',timestampMs:2}],peak:.5};Object.defineProperty(event,'frames',{get(){throw Error('PCM entered renderer');},enumerable:false});
 f.emit('liveCaptureFrames',event);f.emit('liveCaptureTranscript',{final:{turnId:'one',text:'hello',mode:'stream'}});f.emit('liveCaptureTranscript',{final:{turnId:'one',text:'duplicate'}});
 assert.deepEqual(f.results,['hello']);assert.deepEqual(f.edges,[['start',1],['end',2]]);assert.deepEqual(f.levels,[.5]);await capture.close(3);assert.equal(f.stops[0].discard,false);assert.equal(f.listeners.size,0);
});
test('owner change cancels and refuses late transcript',async()=>{
 const f=fixture(),capture=await f.open();f.invalidate();f.emit('liveCaptureTranscript',{final:{turnId:'one',text:'private'}});await flush();assert.equal(f.stops[0].discard,true);assert.equal(f.errors.length,1);assert.deepEqual(f.results,[]);await capture.cancel();
});
test('abort reaches native stop during delayed startup and drops its late acknowledgement',async()=>{
 const f=fixture();f.state.delayStart=true;const opening=f.open();await flush();f.controller.abort();await flush();assert.equal(f.stops.length,1);f.finishStart();await assert.rejects(opening,{name:'AbortError'});assert.equal(f.listeners.size,0);
});
test('abort overtakes graceful close and discards late finals',async()=>{
 const f=fixture(),capture=await f.open();f.emit('liveCaptureFrames',{vad:[{type:'speech-start',timestampMs:1}]});f.state.delayStop=true;
 const closing=capture.close(2);await flush();f.state.delayStop=false;f.controller.abort();await flush();assert.equal(f.stops.length,2);assert.equal(f.stops[1].discard,true);
 f.emit('liveCaptureTranscript',{final:{turnId:'late',text:'discard'}});f.finishStop();await closing;assert.deepEqual(f.results,[]);
});
test('unconfirmed server close is reported and bounded missing final resolves null',async()=>{
 const failed=fixture(),first=await failed.open();failed.state.ack=false;await assert.rejects(first.close(),/not confirmed/);
 const f=fixture(),capture=await f.open();f.emit('liveCaptureFrames',{vad:[{type:'speech-start',timestampMs:1}]});await capture.close(2);assert.deepEqual(f.results,[null]);
});

test('graceful close reconciles a start frame flushed after the Stop tap',async()=>{
 const f=fixture(),capture=await f.open();
 f.state.onStop=()=>{f.emit('liveCaptureFrames',{vad:[{type:'speech-start',timestampMs:1}]});f.emit('liveCaptureEnded',{});f.emit('liveCaptureTranscript',{final:{turnId:'flushed',text:'captured before stop',mode:'stream'}});};
 await capture.close(2);assert.deepEqual(f.results,['captured before stop']);assert.deepEqual(f.edges,[['start',1],['end',2]]);
});

test('a failed or unconfirmed graceful close still delivers one result for the segment it closed',async()=>{
 const unconfirmed=fixture(),first=await unconfirmed.open();unconfirmed.emit('liveCaptureFrames',{vad:[{type:'speech-start',timestampMs:1}]});unconfirmed.state.ack=false;
 await assert.rejects(first.close(2),/not confirmed/);assert.deepEqual(unconfirmed.edges,[['start',1],['end',2]]);assert.deepEqual(unconfirmed.results,[null],'the closed segment is not left waiting for a final');
 const rejected=fixture(),second=await rejected.open();rejected.emit('liveCaptureFrames',{vad:[{type:'speech-start',timestampMs:1}]});rejected.state.onStop=()=>{throw Error('native stop failed');};
 await assert.rejects(second.close(2),/native stop failed/);assert.deepEqual(rejected.results,[null]);
 const discarded=fixture(),third=await discarded.open();discarded.emit('liveCaptureFrames',{vad:[{type:'speech-start',timestampMs:1}]});discarded.state.delayStop=true;
 const closing=third.close(2);await flush();discarded.state.delayStop=false;discarded.controller.abort();discarded.state.ack=false;discarded.finishStop();await assert.rejects(closing);assert.deepEqual(discarded.results,[],'a discarded capture delivers nothing');
});
test('a long conversation keeps delivering finals past the duplicate-final memory',async()=>{
 const {rememberFinishedTurn,FINISHED_TURN_LIMIT}=await import('../apps/app/src/runtime/native-resident-capture.ts');
 const seen=new Set();for(let i=0;i<5;i++)rememberFinishedTurn(seen,`t${i}`,3);assert.deepEqual([...seen],['t2','t3','t4'],'the oldest ids are forgotten first');
 rememberFinishedTurn(seen,'t3',3);assert.deepEqual([...seen],['t2','t3','t4']);
 const f=fixture(),capture=await f.open(),total=FINISHED_TURN_LIMIT+40;
 for(let i=0;i<total;i++){f.emit('liveCaptureFrames',{vad:[{type:'speech-start',timestampMs:i*2+1},{type:'speech-end',timestampMs:i*2+2}]});f.emit('liveCaptureTranscript',{final:{turnId:`turn-${i}`,text:`segment ${i}`,mode:'stream'}});}
 assert.deepEqual(f.errors,[],'the capture is not lost at the memory bound');assert.equal(f.results.length,total);assert.equal(f.results.at(-1),`segment ${total-1}`);
 f.emit('liveCaptureTranscript',{final:{turnId:`turn-${total-1}`,text:'duplicate'}});assert.equal(f.results.length,total,'a recent final is still delivered once');
 await capture.cancel();
});
