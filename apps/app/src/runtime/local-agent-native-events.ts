import type {NativeVoiceEventPort} from '../native/agent';
export type {NativeVoiceEventPort};
/** One `alphaVoiceEvent` frame as native sends it; every field is checked before use. */
type VoiceEventFrame = {subscriptionId?: unknown; type?: unknown; event?: {type?: unknown; stream?: unknown} | null} | null | undefined;
export function subscribeNativeVoiceEvents(port: NativeVoiceEventPort, ownerId: string, listener: (envelope: unknown) => void): () => void {
 const subscriptionId=crypto.randomUUID();
 let active=true,dispatched=false,remove:(()=>Promise<void>)|undefined;
 const quiet=(work:Promise<unknown>)=>{void work.catch(()=>{});};
 const close=()=>{if(!active)return;active=false;if(remove)quiet(remove());if(dispatched)quiet(port.unsubscribeVoiceEvents({subscriptionId}));};
 void (async()=>{
  try{
   const handle=await port.addListener('alphaVoiceEvent',raw=>{
    const value=raw as VoiceEventFrame;
    if(!active||value?.subscriptionId!==subscriptionId)return;
    if(value.type==='end'){close();return;}
    const envelope=value.event;
    if(value.type==='event'&&envelope?.type==='agent_event'&&envelope.stream==='voice-transcript')listener(envelope);
   });
   remove=()=>handle.remove();
   if(!active){quiet(remove());return;}
   dispatched=true;
   const result=await port.subscribeVoiceEvents({subscriptionId,ownerId});
   if(result.subscriptionId!==subscriptionId)close();
   // Stop may race native admission. Cancel again after acknowledgement.
   if(!active)quiet(port.unsubscribeVoiceEvents({subscriptionId}));
  }catch{close();}
 })();
 return close;
}
