import type {PluginListenerHandle} from '@capacitor/core';
import type {WorkflowNoticeRoute} from './device-actions';
import type {WorkflowRun,RemoteWorkflow} from './workflow-protocol';
export interface WorkflowTap extends WorkflowNoticeRoute {token:string;operationId:string;bindingHash:string;retained:boolean;question?:boolean;notice?:{id:string;revision:string;source:string;appLabel:string;title:string;text:string}}
export interface WorkflowTapNative {
 pendingWorkflowTap():Promise<Partial<WorkflowTap>>;
 /** `discard` returns an explicitly canceled Ask tap to its untapped state; it opens and fills nothing. */
 consumeWorkflowTap(input:{token:string;noticeRevision?:string;discard?:boolean}):Promise<void>;
 addListener(event:'pendingWorkflowTap',listener:()=>void):Promise<PluginListenerHandle>;
}
export interface WorkflowTapBinding {
 scope:string;origin:string;ownerId:string;agentId:string;
 current():boolean;
 receipt(runId:string,workflowId:string,signal:AbortSignal):Promise<WorkflowRun>;
 detail(workflowId:string,signal:AbortSignal):Promise<RemoteWorkflow>;
}
/** Only an authenticated read can open a tap. Never starts, retries or approves a run. */
export async function resolveWorkflowTap(native:WorkflowTapNative,binding:WorkflowTapBinding|null,signal:AbortSignal){
 let tap:Partial<WorkflowTap>;
 try{tap=await native.pendingWorkflowTap();}
 catch{signal.throwIfAborted();return {kind:'lookup-unavailable' as const};}
 signal.throwIfAborted();
 if(!tap.token)return {kind:'none' as const};
 if(!binding||!binding.current()||tap.scope!==binding.scope||tap.origin!==binding.origin||tap.ownerId!==binding.ownerId||tap.agentId!==binding.agentId)return {kind:'other-account' as const};
 if(tap.retained!==true||typeof tap.runId!=='string'||typeof tap.workflowId!=='string'||typeof tap.versionId!=='string')return {kind:'unavailable' as const};
 const run=await binding.receipt(tap.runId,tap.workflowId,signal);signal.throwIfAborted();
 if(!binding.current())throw Error('Agent changed');
 if(run.id!==tap.runId||run.workflowId!==tap.workflowId||run.versionId!==tap.versionId)return {kind:'unavailable' as const};
 const workflow=await binding.detail(tap.workflowId,signal);signal.throwIfAborted();
 if(!binding.current())throw Error('Agent changed');
 if(workflow.id!==tap.workflowId)return {kind:'unavailable' as const};
 // Re-read durable receipt/queue immediately before exposing the result.
 const latest=await native.pendingWorkflowTap();signal.throwIfAborted();
 if(!binding.current())throw Error('Agent changed');
 for(const key of ['token','operationId','bindingHash','scope','origin','ownerId','agentId','workflowId','runId','versionId'] as const)if(latest[key]!==tap[key])return {kind:'unavailable' as const};
 if(latest.question!==tap.question||JSON.stringify(latest.notice)!==JSON.stringify(tap.notice))return {kind:'unavailable' as const};
 if(latest.retained!==true)return {kind:'unavailable' as const};
 return {kind:'ready' as const,token:tap.token,run,workflow,question:tap.question===true,notice:tap.notice};
}
/** What to do with a tap that resolved as ready. A tap whose run was already opened is only consumed again, so a
 * failed consume cannot reopen the same run on every later check. */
export const readyTapStep=(token:string,opened:string|null):'consume-only'|'open'=>token===opened?'consume-only':'open';
/** Why a tap check ended without handling the tap, and when to repeat it. A running workflow operation, or one that
 * started while the tap was being read, defers the check until that operation ends; a view reset with no operation
 * repeats it at once. Any other reason waits for the next resume, connection or tap event. */
export const tapRecheck=(state:{operationRunning:boolean;generationChanged:boolean}):'after-operation'|'now'|'none'=>state.operationRunning?'after-operation':state.generationChanged?'now':'none';
