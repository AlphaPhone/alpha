import {normalizeEffectReceipts} from '../../../../.eliza/client-features/packages/core/src/types/effects.ts';
import {AUTOMATION_RESOURCE_KINDS} from './automations-protocol.ts';
export const AUTOMATIONS_COMMITTED_EVENT='alpha:automations-committed';
type Receipt=ReturnType<typeof normalizeEffectReceipts>[number];
/** Applied, durable receipts of results that succeeded; generic tool success is not proof. */
function committedReceipts(results:readonly unknown[]|undefined):Receipt[] {
 if(!Array.isArray(results))return [];
 return results.flatMap(result=>{
  if(!result||typeof result!=='object'||!('success' in result)||result.success!==true||!('effectReceipts' in result))return [];
  try{return normalizeEffectReceipts(result.effectReceipts).filter(receipt=>receipt.outcome==='applied'&&receipt.commit.kind==='durable');}catch{return [];}
 });
}
/** A saved record of a kind the unified list shows invalidates it. */
export function automationsCommitted(results:readonly unknown[]|undefined):boolean {
 return committedReceipts(results).some(receipt=>(AUTOMATION_RESOURCE_KINDS as readonly string[]).includes(receipt.resource.kind));
}
export type WorkflowChange={workflowId:string;change:string};
// plugin-workflow's WORKFLOW action names its definition receipts `workflow.<op>`.
const WORKFLOW_CHANGE_WORDS:Record<string,string>={'workflow.create':'Created','workflow.modify':'Updated','workflow.activate':'Turned on','workflow.deactivate':'Paused','workflow.restore':'Restored'};
/** The workflows a reply saved or changed, one per workflow with its last change, for a chat card that
 * opens it. Any committed `workflow.definition` receipt counts; an operation Alpha has no word for reads "Changed". */
export function workflowChanges(results:readonly unknown[]|undefined):WorkflowChange[] {
 const last=new Map<string,string>();
 for(const receipt of committedReceipts(results))if(receipt.resource.kind==='workflow.definition'){last.delete(receipt.resource.id);last.set(receipt.resource.id,WORKFLOW_CHANGE_WORDS[receipt.operation]??'Changed');}
 return [...last].map(([workflowId,change])=>({workflowId,change}));
}
