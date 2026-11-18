import type {NativeViewEventPort} from '../native/agent';
export type {NativeViewEventPort} from '../native/agent';
type ViewEventFrame={subscriptionId?:unknown;type?:unknown;event?:{type?:unknown;stream?:unknown;payload?:{clientId?:unknown;frame?:unknown}}}|null|undefined;
/** Live-only native renderer events over the existing resident IPC feed; frames are untrusted. */
export function subscribeNativeViewEvents(port:NativeViewEventPort,ownerId:string,clientId:string,listener:(frame:unknown)=>void,ended:()=>void){
 const subscriptionId=crypto.randomUUID();let active=true,dispatched=false,remove:(()=>Promise<void>)|undefined;
 const quiet = (work: () => Promise<unknown>) => {
  try { void work().catch(() => {}); }
  catch { /* Cleanup failure cannot prevent the terminal callback. */ }
 };
 const close=()=>{if(!active)return;active=false;if(remove)quiet(remove);if(dispatched)quiet(()=>port.unsubscribeViewEvents({subscriptionId}));ended();};
 const ready=(async()=>{
  const handle=await port.addListener('alphaViewEvent',frame=>{
   const value=frame as ViewEventFrame;
   if(!active||value?.subscriptionId!==subscriptionId)return;
   if(value.type==='end'){close();return;}
   const event=value.event;
   if(value.type==='event'&&event?.type==='agent_event'&&event.stream==='view-interact'&&event.payload?.clientId===clientId)listener(event.payload.frame);
  });remove=()=>handle.remove();if(!active){quiet(remove);throw Error('Renderer retired');}
  dispatched=true;const reply=await port.subscribeViewEvents({subscriptionId,ownerId,clientId});
  if(!active||reply.subscriptionId!==subscriptionId){close();quiet(()=>port.unsubscribeViewEvents({subscriptionId}));throw Error('Renderer subscription changed');}
 })().catch(error=>{close();throw error;});
 return {ready,close};
}
