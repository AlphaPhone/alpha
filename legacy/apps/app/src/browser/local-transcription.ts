/** Browser capture has no local model. Only an explicitly selected development agent may transcribe. */
const BROWSER_ASR_UNAVAILABLE='Browser-local transcription is unavailable. Select a development agent explicitly or use the keyboard.';
type Agent={session:unknown;speechRequest:(audio:Uint8Array|undefined,signal:AbortSignal)=>Promise<{ready?:boolean;text?:string}>};
/** Abort, or reject when the selected agent or its session changed during an await. */
function assertSelected(selected:()=>Agent|null|undefined,agent:Agent,session:unknown,signal:AbortSignal){signal.throwIfAborted();if(selected()!==agent||agent.session!==session)throw new DOMException('Voice selection changed','AbortError');}
export async function browserLocalSpeechStatus(selected:()=>Agent|null|undefined,signal:AbortSignal){
 signal.throwIfAborted();const agent=selected();if(!agent)return {ready:false,execution:'browser',route:'unavailable',reason:BROWSER_ASR_UNAVAILABLE};
 const session=agent.session,result=await agent.speechRequest(undefined,signal);assertSelected(selected,agent,session,signal);
 return {ready:result.ready===true,execution:'browser',route:'local-agent'};
}
export async function transcribeWithSelectedBrowserAgent(selected:()=>Agent|null|undefined,decode:()=>Promise<Uint8Array>,signal:AbortSignal){
 signal.throwIfAborted();const agent=selected();if(!agent)throw Error(BROWSER_ASR_UNAVAILABLE);
 const session=agent.session,audio=await decode();assertSelected(selected,agent,session,signal);
 const result=await agent.speechRequest(audio,signal);assertSelected(selected,agent,session,signal);
 if(typeof result.text!=='string'||!result.text.trim())throw Error('No speech detected.');
 return {text:result.text,local:true,execution:'browser',route:'local-agent',language:'en'};
}
