/**
 * Alpha's binding to the device-action coordinator. Parsing, capability
 * admission, approve → journal → claim → execute → receipt, journal recovery
 * and reconciliation are the shared queue protocol
 * (plugin-assistant device-actions/client-coordinator); the screen binding,
 * review cards and context notices are Alpha's coordinator
 * (ui/device-actions/client-coordinator.ts). Alpha supplies its product
 * profile: owner-facing name, record copy, the views it ships, its
 * browser-safe workflow validators, the Maps selection and foreground state.
 * Executors and the durable journal slots are registered by the composition
 * root (agent adapter / local-agent storage).
 */
import {
  actionScope,
  deviceJournalContext,
  DeviceActionNotStarted,
  type DeviceActionClientProfile,
  type CurrentDeviceActionRequest,
  type DeviceActionJournal,
  type DeviceCredential,
  type DeviceExecutor as SharedDeviceExecutor,
  type DeviceJournalEntry,
  type DeviceJournalIdentity,
  type DeviceOperation,
  type DeviceRecovery,
  type ForegroundReviewExecutor as SharedForegroundReviewExecutor,
  type PendingReviewItem as SharedPendingReviewItem,
  publishCommittedDeviceChanges as sharedPublishCommittedDeviceChanges,
  type ReviewableDeviceOperation,
  validateDeviceOperation as sharedValidateDeviceOperation,
  validateReviewableDeviceOperation as sharedValidateReviewableDeviceOperation,
  type WorkflowNoticeRoute,
  type WorkflowPresentationOperation,
} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/client-coordinator.ts';
import {
  CAMERA_CONTEXT_NOTICE,
  ContextNotice,
  DeviceActionCoordinator,
  proposalContextNotice as alphaProposalContextNotice,
} from '../ui/device-actions/client-coordinator';
import {isCalendarOperation} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/calendar-contract.ts';
import {isNotesOperation} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/notes-contract.ts';
import {isReminderOperation} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/reminder-contract.ts';
import {isReminderCreate} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/reminder-create-contract.ts';
import {namedCalendarReadTarget} from '../../../../.eliza/client-features/plugins/plugin-calendar/src/client/named-read.ts';
import {browserNavigationSummary} from './action-message-presentation';
import {BrowserOpenRefused} from '../browser/browser-poll';
import {presentDeviceRecordOperation} from './device-record-presentation';
import {validateMapsSelectedObject} from '../maps/agent-context';
import {isMvpView} from '../prototype/mvp-features';
import {alphaViewLabel} from '../product/alpha-product';
import {assertWorkflowOperation,parseWorkflowBinding,parseWorkflowRead,validateWorkflowResult,type WorkflowPhoneReview} from './workflow-device-contract';
import type {AlphaClient,ContextEnvelope,OperationReceipt,VerifiedSession} from './alpha-client';

export {deviceJournalContext,actionScope,CAMERA_CONTEXT_NOTICE,ContextNotice};
export type {CurrentDeviceActionRequest,DeviceCredential,DeviceJournalIdentity,DeviceOperation,DeviceRecovery,ReviewableDeviceOperation,WorkflowNoticeRoute,WorkflowPresentationOperation};
/** Foreground reviews (free/busy, Notes search, name-targeted edits) and their validators are
 * the shared device-review contract bound to the shared Notes, Calendar and reminder contracts. */
export {FOREGROUND_REVIEW_TYPES as FOREGROUND_OPERATION_TYPES,namedTargetValidators,selectedNotesRead,validateForegroundReviewOperation,validateForegroundReviewResult,type ForegroundReviewOperation,type ForegroundReviewResult,type NamedTargetExactOperation} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/foreground-review-contract.ts';
export type JournalEntry = DeviceJournalEntry;
export type ActionJournal = DeviceActionJournal;
export type DeviceExecutor = SharedDeviceExecutor<ContextEnvelope>;
export type ForegroundReviewExecutor = SharedForegroundReviewExecutor<ContextEnvelope>;
export type PendingReviewItem = SharedPendingReviewItem;

/** Review and receipt copy for opening a view, by the name the owner sees rather than its id. */
export function presentOpenView(view:string){const label=alphaViewLabel(view);return {title:`Open ${label}`,description:`Open ${label} on this phone`,appliedSummary:`Opened ${label} on this phone.`};}
/** Alpha ships Home and Reminders plus the enabled MVP views. */
const operations = {admitView:(view:string)=>view==='home'||view==='reminders'||isMvpView(view),parseWorkflowRead};
export const alphaDeviceActionProfile: DeviceActionClientProfile<ContextEnvelope,WorkflowPhoneReview> = {
  appName:'Alpha',
  // The name the owner says. The agent's character carries the same name, so the server and this
  // phone read "Alpha, open …" as the same direct request.
  assistantName:'Alpha',
  operations,
  workflow:{parseBinding:parseWorkflowBinding,parseRead:parseWorkflowRead,validateResult:validateWorkflowResult,assertOperation:assertWorkflowOperation},
  presentRecord:(operation,timeZone)=>operation.type==='open_view'?presentOpenView(operation.view):isCalendarOperation(operation)||isNotesOperation(operation)||isReminderOperation(operation)||isReminderCreate(operation)||operation.type==='create_note'||operation.type==='create_reminder'?presentDeviceRecordOperation(operation,timeZone):undefined,
  browserNavigationSummary,
  mapsSelectionCurrent:validateMapsSelectedObject,
  namedCalendarReadTarget,
  foregroundHidden:()=>typeof document!=='undefined'&&document.hidden,
};
/** Runs an approved Browser open for the device executor. An open that Browser refused before
 * creating or loading any tab closes the attempt as not started, with Browser's reason; any other
 * failure may have reached the tab host and stays an unknown outcome. */
export async function approvedBrowserOpen<T>(open:()=>Promise<T>):Promise<T>{
  try{return await open();}catch(error){if(error instanceof BrowserOpenRefused)throw new DeviceActionNotStarted(error.message);throw error;}
}
export function validateDeviceOperation(value: unknown): DeviceOperation { return sharedValidateDeviceOperation(value,operations); }
/** Every proposal operation, including foreground reviews. */
export function validateReviewableDeviceOperation(value: unknown): ReviewableDeviceOperation { return sharedValidateReviewableDeviceOperation(value,operations); }
/** Owner-facing reason a pending proposal cannot be reviewed from this screen, or undefined. */
export function proposalContextNotice(operation:ReviewableDeviceOperation,context:ContextEnvelope):string|undefined{return alphaProposalContextNotice(operation,context,alphaDeviceActionProfile);}
/** Queue only delivered receipts; publish `alpha:<view>-committed` when the same owner session is idle. */
export function publishCommittedDeviceChanges(receipt:OperationReceipt,client:Pick<AlphaClient,'getState'|'subscribe'>,session:VerifiedSession){
 sharedPublishCommittedDeviceChanges(receipt,client,session,view=>{if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('alpha:'+view+'-committed'));});
}

/** Authenticated structured actions only. Neither reply prose nor restored history
 * can enter this boundary. A durable journal gates every device effect. */
let filesReviewIdentity: ((paths:string[],signal:AbortSignal)=>Promise<string[]>)|undefined;
export function setFilesReviewIdentity(read: (paths:string[],signal:AbortSignal)=>Promise<string[]>) {
  filesReviewIdentity=read;
}
export class DeviceActions extends DeviceActionCoordinator<ContextEnvelope,WorkflowPhoneReview> {
  constructor(session: VerifiedSession, credential: DeviceCredential, scope: string,
    request: (path: string, body: unknown | undefined, signal: AbortSignal) => Promise<unknown>,
    journal: ActionJournal, execute: DeviceExecutor, recover?:DeviceRecovery, reminderTimingV2=false, reminderCreate=false, executeForeground?:ForegroundReviewExecutor) {
    super({session,credential,scope,request,journal,execute,recover,reminderTimingV2,reminderCreate,executeForeground,filesIdentity:async(paths,signal)=>{if(!filesReviewIdentity)throw Error('Files is unavailable');return filesReviewIdentity(paths,signal);},profile:alphaDeviceActionProfile},{currentRequestBrowserPolicy:true,currentRequestTelephonyPolicy:true});
  }
}
