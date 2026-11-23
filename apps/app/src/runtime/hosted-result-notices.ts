import { registerPlugin } from '../platform-plugins';
import type { AlphaHostedResultsPlugin, HostedResultRoute } from '../native/alpha-hosted-results';
import type { DigestResult } from './hosted-digests';
export type { HostedResultRoute };
export const hostedResultNative=registerPlugin<AlphaHostedResultsPlugin>('AlphaHostedResults');
export interface HostedResultBinding {
 scope:string;origin:string;ownerId:string;agentId:string;
 current():boolean;
 revalidate(signal:AbortSignal):Promise<boolean>;
 history():Promise<DigestResult[]>;
}
/** Throws when the request was cancelled or the bound account is no longer current. */
function fence(binding:HostedResultBinding,signal:AbortSignal){signal.throwIfAborted();if(!binding.current())throw new Error('Hosted account changed');}
export async function publishHostedResult(native:AlphaHostedResultsPlugin,binding:HostedResultBinding,result:DigestResult,signal:AbortSignal){
 fence(binding,signal);
 const resultState=await native.publishResult({scope:binding.scope,origin:binding.origin,ownerId:binding.ownerId,agentId:binding.agentId,runId:result.runId,workflowId:result.workflowId,workflowVersionId:result.workflowVersionId});
 fence(binding,signal);
 if(!['posted','opened','denied','uncertain'].includes(resultState.phase))throw new Error('Notice outcome unknown');
 return resultState;
}
export type HostedResultTap={kind:'none'|'other-account'|'unavailable'}|{kind:'ready';token:string;question:boolean;result:DigestResult};
/** No automatic account selection, workflow execution, or unverified result display. */
export async function resolveHostedResultTap(native:AlphaHostedResultsPlugin,binding:HostedResultBinding|null,signal:AbortSignal):Promise<HostedResultTap>{
 const tap=await native.pendingResult();signal.throwIfAborted();if(!tap.token)return {kind:'none'};
 if(!binding||!binding.current()||tap.scope!==binding.scope||tap.origin!==binding.origin||tap.ownerId!==binding.ownerId||tap.agentId!==binding.agentId)return {kind:'other-account'};
 if(!await binding.revalidate(signal))return {kind:'unavailable'};fence(binding,signal);
 const result=(await binding.history()).find(row=>row.runId===tap.runId&&row.workflowId===tap.workflowId&&row.workflowVersionId===tap.workflowVersionId);
 fence(binding,signal);
 if(!result||tap.retained!==true)return {kind:'unavailable'};
 return {kind:'ready',token:tap.token,question:tap.question===true,result};
}
