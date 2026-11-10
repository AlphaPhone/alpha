import {cloudRuntimeEnabled,testMocksEnabled} from '../build-flags';
import {createOnDeviceVoice} from './local-voice';
import {speakCloudText} from './cloud-voice';
import {connectionController} from './connection-ui';
import {markTtsPlaybackStarted,markTtsPlaybackEnded} from '../../../../.eliza/client-features/packages/ui/src/voice/tts-playback-activity.ts';
let retirement:Promise<void>=Promise.resolve();
// One message for every speech path refused because an earlier playback or capture could not be
// confirmed stopped (the same text as SPEECH_CLEANUP_NOTICE in speech-cleanup.ts; this module is
// evaluated without its imports by contract tests, so the text is repeated here).
const cleanupUnconfirmed=(error:unknown)=>(error as {code?:unknown}|null)?.code==='speech-cleanup-unconfirmed'&&(error as Error).message!=='Voice media has not finished stopping. Close the app if this continues.'?Object.assign(new Error('Voice media has not finished stopping. Close the app if this continues.',{cause:error}),{code:'speech-cleanup-unconfirmed'}):error;
/** Reviewed app/workflow text uses the selected production runtime profile. */
export async function speakAppText(text:string,signal:AbortSignal,onStarted?:()=>void,queue=false,assertCurrent?:()=>void){
 if(cloudRuntimeEnabled||testMocksEnabled)return speakCloudText(text,signal,onStarted,queue,assertCurrent);
 const owned=new AbortController(),cancel=()=>owned.abort(signal.reason),retire=()=>owned.abort(new DOMException('Voice review changed','AbortError'));
 const current=()=>{owned.signal.throwIfAborted();assertCurrent?.();if(document.hidden||connectionController.getSnapshot().open||document.documentElement.dataset.devBackground==='true')throw new DOMException('Voice review changed','AbortError');};
 signal.addEventListener('abort',cancel,{once:true});window.addEventListener('alpha:device-state',retire);window.addEventListener('pagehide',retire);if(signal.aborted)cancel();
 const previous=retirement;let admitted=false;
 const interrupted=new Promise<never>((_,reject)=>owned.signal.addEventListener('abort',()=>{if(!admitted)reject(owned.signal.reason);},{once:true}));void interrupted.catch(()=>{});
 const pending=(async()=>{
  current();const voice=createOnDeviceVoice();await previous;current();admitted=true;
  if(!voice||!await voice.playbackReady(owned.signal))throw Error('On-device speech is unavailable. Retry local speech or read the text.');
  current();let marked=false;
  try{await voice.speak(text,owned.signal,()=>{current();marked=true;markTtsPlaybackStarted();onStarted?.();},true,{queue,assertCurrent:current});current();}
  finally{if(marked)markTtsPlaybackEnded();}
 })();
 retirement=pending.catch(error=>{if(error?.code==='speech-cleanup-unconfirmed')throw error;});void retirement.catch(()=>{});
 // The caller shows this failure's message; the retirement chain above keeps the original.
 try{await Promise.race([pending,interrupted]);}catch(error){throw cleanupUnconfirmed(error);}finally{signal.removeEventListener('abort',cancel);window.removeEventListener('alpha:device-state',retire);window.removeEventListener('pagehide',retire);}
}
