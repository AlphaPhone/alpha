import type {DomainRecovery} from '../browser/domain-document';
import {rawSlotDraftRecovery,type DurableDraftRawSlot} from '../ui/state/durable-draft.ts';
/**
 * Recovery of a native draft slot whose JSON no longer reads as a draft, through Alpha's recovery
 * dialog. The shared recovery captures the exact bytes and resets only that capture; this adapter
 * gives the capture the dialog's domain shape.
 */
export function nativeAssistantDraftRecovery(binding:string,slot:DurableDraftRawSlot){
 const shared=rawSlotDraftRecovery(binding,slot);
 return {
  async capture(signal?:AbortSignal):Promise<DomainRecovery>{const {snapshot,raw}=await shared.capture(signal);return {snapshot,raw,format:'domain',legacy:null,legacyChanged:false};},
  reset:(expected:DomainRecovery,signal?:AbortSignal)=>shared.reset(expected,signal),
 };
}
