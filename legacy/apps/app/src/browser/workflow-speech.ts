export {speakAppText as speakWorkflowText} from '../runtime/app-speech';
import {noticeActionBlocked} from './notice-action';
import {abortError} from '../lib/abort';

/** Dev pickup is explicit; events while hidden or locked cannot release private speech. */
export function waitForWorkflowPickup(signal:AbortSignal){
 return new Promise<void>((resolve,reject)=>{
  const cleanup=()=>{window.removeEventListener('alpha:dev-pickup',pickup);signal.removeEventListener('abort',cancel);};
  const cancel=()=>{cleanup();reject(abortError('Pickup cancelled'));};
  const pickup=()=>{if(noticeActionBlocked())return;cleanup();resolve();};
  window.addEventListener('alpha:dev-pickup',pickup);signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();
 });
}
