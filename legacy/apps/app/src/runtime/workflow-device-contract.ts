import type {AlphaNotificationsPlugin} from '../native/alpha-notifications';
import {resolveNoticeTap,type NoticeTapNotice,type PendingNoticeTap} from '../../../../.eliza/client-features/packages/contracts/src/notice-routes.ts';
import type {WorkflowNoticeRoute} from './device-actions';
import type {WorkflowRun,RemoteWorkflow} from './workflow-protocol';
import {
 parseWorkflowPhoneReview as parseSharedPhoneReview,
 workflowApprovalNotice,
 parseWorkflowReminderRead,
 validateWorkflowReadResult,
 type WorkflowPhoneReview,
 type WorkflowReadOperation,
 type WorkflowReadResult,
 type WorkflowReminderReadOperation,
 type WorkflowReminderRow,
} from '../../../../.eliza/client-features/packages/contracts/src/workflow-device.ts';
/** Workflow data scopes are the shared `@elizaos/contracts/workflow-device` contract: reviewed read
 * operations and results, the run's phone review and the step-request check. */
export {
 assertWorkflowOperation,
 parseWorkflowBinding,
 parseWorkflowRead,
 parseWorkflowReminderRead,
 workflowApprovalNotice,
 workflowBytes,
 workflowSha,
} from '../../../../.eliza/client-features/packages/contracts/src/workflow-device.ts';
export type {
 WorkflowDeviceBinding,
 WorkflowDeviceTarget,
 WorkflowPhoneReview,
 WorkflowReadOperation,
 WorkflowReadResult,
 WorkflowReminderReadOperation,
 WorkflowReminderRow,
} from '../../../../.eliza/client-features/packages/contracts/src/workflow-device.ts';
/** A workflow phone step runs only while the owner still has the screen it was approved on in the
 * foreground: the live shell, a visible page, the exact approved context, not sensitive, on
 * Workflows and, for a read, on the run's receipt. The device executor checks it around every
 * await of an approved step, so a step whose screen was left or changed has no effect. */
export function workflowStepScreenCurrent(input:{live:boolean;hidden:boolean;current:unknown;approved:{view?:string;sensitive?:boolean;selectedObject?:{kind?:string}|null};read:boolean}):boolean{
 const approved=input.approved;
 return input.live&&!input.hidden&&JSON.stringify(input.current)===JSON.stringify(approved)&&!approved.sensitive&&approved.view==='workflows'&&(!input.read||approved.selectedObject?.kind==='workflow-run');
}
/** Validates a phone read result against its reviewed scope before any model sees it. */
export const validateWorkflowResult=(operation:WorkflowReadOperation,value:unknown):Promise<WorkflowReadResult>=>validateWorkflowReadResult(operation,value);
/** Validates a phone reminder read against its reviewed owner-day window. */
export async function validateWorkflowReminderResult(operation:WorkflowReminderReadOperation,value:unknown):Promise<{kind:'reminders';reminders:WorkflowReminderRow[]}>{
 const result=await validateWorkflowReadResult(parseWorkflowReminderRead(operation),value);
 if(result.kind!=='reminders')throw new Error('Workflow phone scope could not be verified');
 return result;
}
export async function parseWorkflowPhoneReview(value:unknown,expected:{id:string;workflowId:string;versionId:string}):Promise<WorkflowPhoneReview>{
 const {normalizePhoneSpec}=await import('./phone-workflow-authoring');
 return parseSharedPhoneReview(value,expected,{normalizePhoneSpec:spec=>normalizePhoneSpec(spec) as never});
}

/** A pending tap of one of Alpha's workflow notices (native NoticeRoutes with workflowId, runId and versionId). */
export interface WorkflowTap extends WorkflowNoticeRoute {token:string;operationId:string;bindingHash:string;retained:boolean;question?:boolean;notice?:NoticeTapNotice}
export type WorkflowTapNative=Pick<AlphaNotificationsPlugin,'pendingWorkflowTap'|'consumeWorkflowTap'|'addListener'>;
export interface WorkflowTapBinding {
 scope:string;origin:string;ownerId:string;agentId:string;
 current():boolean;
 receipt(runId:string,workflowId:string,signal:AbortSignal):Promise<WorkflowRun>;
 detail(workflowId:string,signal:AbortSignal):Promise<RemoteWorkflow>;
}
/** Only an authenticated read can open a tap (shared resolveNoticeTap). Never starts, retries or approves a run. */
export async function resolveWorkflowTap(native:Pick<WorkflowTapNative,'pendingWorkflowTap'>,binding:WorkflowTapBinding|null,signal:AbortSignal){
 const result=await resolveNoticeTap({pending:()=>native.pendingWorkflowTap() as Promise<Partial<PendingNoticeTap>>,binding,identifiers:['workflowId','runId','versionId'],signal,
  load:async(tap,signal,checkpoint)=>{
   const runId=tap.runId as string,workflowId=tap.workflowId as string;
   const run=await binding!.receipt(runId,workflowId,signal);checkpoint();
   if(run.id!==runId||run.workflowId!==workflowId||run.versionId!==tap.versionId)return null;
   const workflow=await binding!.detail(workflowId,signal);checkpoint();
   return workflow.id===workflowId?{run,workflow}:null;
  }});
 return result.kind==='ready'?{kind:'ready' as const,token:result.token,run:result.target.run,workflow:result.target.workflow,question:result.question,notice:result.notice}:result;
}
/** What to do with a tap that resolved as ready. A tap whose run was already opened is only consumed again, so a
 * failed consume cannot reopen the same run on every later check. */
export const readyTapStep=(token:string,opened:string|null):'consume-only'|'open'=>{
 //@ verify
 //@ ensures \result === 'consume-only' <==> token === opened
 //@ ensures opened === null ==> \result === 'open'
 return token===opened?'consume-only':'open';
};
/** Why a tap check ended without handling the tap, and when to repeat it. A running workflow operation, or one that
 * started while the tap was being read, defers the check until that operation ends; a view reset with no operation
 * repeats it at once. Any other reason waits for the next resume, connection or tap event. */
export type TapRecheckState={operationRunning:boolean;generationChanged:boolean};
export const tapRecheck=(state:TapRecheckState):'after-operation'|'now'|'none'=>{
 //@ verify
 //@ ensures \result === 'after-operation' || \result === 'now' || \result === 'none'
 //@ ensures \result === 'after-operation' <==> state.operationRunning
 //@ ensures \result === 'now' <==> !state.operationRunning && state.generationChanged
 //@ ensures \result === 'none' <==> !state.operationRunning && !state.generationChanged
 return state.operationRunning?'after-operation':state.generationChanged?'now':'none';
};
