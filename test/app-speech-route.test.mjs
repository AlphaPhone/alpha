import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
const source=stripTypeScriptTypes(readFileSync('apps/app/src/runtime/app-speech.ts','utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,''),{mode:'strip'});
function fixture(ready=true){const f={cloud:0,spoken:[],checks:0};const box={AbortController,DOMException,window:{addEventListener(){},removeEventListener(){}},document:{hidden:false,documentElement:{dataset:{}}},connectionController:{getSnapshot:()=>({})},markTtsPlaybackStarted(){},markTtsPlaybackEnded(){},cloudRuntimeEnabled:false,testMocksEnabled:false,createOnDeviceVoice:()=>({ready:async()=>{throw Error("app speech must not use transcription readiness");},playbackReady:async()=>ready,speak:async(...args)=>{f.spoken.push(args);args[4].assertCurrent();if(f.hold)await new Promise(resolve=>f.release=resolve);}}),speakCloudText:async()=>{f.cloud++;}};vm.runInNewContext(source+';globalThis.speak=speakAppText;',box);return {f,box};}
test('reviewed app speech stays local with strict cleanup, queue and owner checks',async()=>{const {f,box}=fixture();await box.speak('Reviewed text',new AbortController().signal,undefined,true,()=>f.checks++);assert.equal(f.cloud,0);assert.equal(f.spoken[0][0],'Reviewed text');assert.equal(f.spoken[0][3],true);assert.equal(f.spoken[0][4].queue,true);assert.ok(f.checks>=3);});
test('unavailable app speech does not fall back to cloud',async()=>{const {f,box}=fixture(false);await assert.rejects(box.speak('Reviewed text',new AbortController().signal),/On-device speech is unavailable/);assert.equal(f.cloud,0);assert.equal(f.spoken.length,0);});
test('explicit development builds retain their cloud speech fixture route',async()=>{const {f,box}=fixture();box.testMocksEnabled=true;await box.speak('Development text',new AbortController().signal);assert.equal(f.cloud,1);assert.equal(f.spoken.length,0);});

test('cancelled queued app speech returns promptly and never speaks after prior cleanup',async()=>{const {f,box}=fixture();f.hold=true;const first=box.speak('First',new AbortController().signal);while(!f.release)await new Promise(resolve=>setTimeout(resolve,0));const c=new AbortController();const second=box.speak('Cancelled',c.signal);c.abort();await assert.rejects(second,{name:'AbortError'});f.hold=false;f.release();await first;await new Promise(resolve=>setTimeout(resolve,0));assert.equal(f.spoken.length,1);});

test('explicit production Cloud profile uses Cloud speech with mocks off',async()=>{const {f,box}=fixture();box.cloudRuntimeEnabled=true;await box.speak('Reviewed Cloud text',new AbortController().signal);assert.equal(f.cloud,1);assert.equal(f.spoken.length,0);assert.equal(box.testMocksEnabled,false);});

test('app speech refused by an unconfirmed earlier cleanup reports the shared notice and stays refused',async()=>{
 const {SPEECH_CLEANUP_NOTICE,speechCleanupNotice}=await import('../apps/app/src/runtime/speech-cleanup.ts');
 assert.equal(speechCleanupNotice(Object.assign(Error('Owned speech cleanup could not be confirmed.'),{code:'speech-cleanup-unconfirmed'})),SPEECH_CLEANUP_NOTICE);
 assert.equal(speechCleanupNotice(Error('other')),null);assert.equal(speechCleanupNotice(null),null);assert.equal(speechCleanupNotice({code:'voice-http-401'}),null);
 const {f,box}=fixture();const speak=box.createOnDeviceVoice;
 box.createOnDeviceVoice=()=>({...speak(),speak:async()=>{throw Object.assign(Error('Owned speech cleanup could not be confirmed.'),{code:'speech-cleanup-unconfirmed'});}});
 await assert.rejects(box.speak('First',new AbortController().signal),{message:SPEECH_CLEANUP_NOTICE,code:'speech-cleanup-unconfirmed'});
 box.createOnDeviceVoice=speak;
 await assert.rejects(box.speak('Second',new AbortController().signal),{message:SPEECH_CLEANUP_NOTICE,code:'speech-cleanup-unconfirmed'},'the next request meets the same refusal with the same message');
 assert.equal(f.spoken.length,0);
 // Every other path that meets this failure shows the same text.
 const cloud=readFileSync('apps/app/src/runtime/cloud-voice.ts','utf8'),adapter=readFileSync('apps/app/src/prototype/voice-adapter.ts','utf8'),reading=readFileSync('apps/app/src/prototype/local-speech-playback.ts','utf8');
 assert.equal(cloud.split(`'${SPEECH_CLEANUP_NOTICE}'`).length,3);assert.equal(cloud.split('throw cleanupUnconfirmed(error)').length,3);
 assert.doesNotMatch(adapter,/Voice media has not finished stopping/,'the recorder uses the shared constant');
 assert.match(adapter,/Component\.prototype\.startTranscription = function\(\)\{[\s\S]{0,400}if\(retirement\|\|mediaUnconfirmed\)\{this\.toast\(SPEECH_CLEANUP_NOTICE\);return;\}/);
 assert.match(adapter,/Component\.prototype\.startVoice = async function \(\) \{[\s\S]{0,400}if\(retirement\|\|mediaUnconfirmed\)\{this\.toast\(SPEECH_CLEANUP_NOTICE\);return;\}/);
 assert.match(adapter,/error = speechCleanupNotice\(failure\) \|\| /);assert.match(adapter,/voiceStopped=\(value:BatchVoiceState\)=>speechCleanupNotice\(value\.error\)\|\|/);
 assert.match(reading,/state\.message = speechCleanupNotice\(error\) \|\| /);
});
