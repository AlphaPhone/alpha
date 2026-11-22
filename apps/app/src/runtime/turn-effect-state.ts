import { normalizeEffectReceipts } from '../../../../.eliza/client-features/packages/core/src/types/effects.ts';

/** A turn that failed after its action committed: the owner is told the action went through, never the generic failure. */
export const EFFECT_APPLIED_INTERRUPTED = 'Done · reply cut off';
/** A turn that failed after it only queued a change for the owner's review: nothing changed yet. */
export const EFFECT_AWAITING_APPROVAL_INTERRUPTED = 'Needs your approval · reply cut off';

export type EffectBeforeFailure = 'applied' | 'awaiting-approval';

type Receipt = ReturnType<typeof normalizeEffectReceipts>[number];

/** A change queued for the owner's review: the request row exists, the change does not. A request the
 * provider accepted at once with the changed event named is the change itself (as in app-record-completion). */
function queuedForApproval(receipt: Receipt & { outcome: 'applied' }): boolean {
  if (receipt.resource.kind !== 'calendar.approval_request') return false;
  return !(receipt.commit.kind === 'provider_accepted' && receipt.artifacts.some(artifact => artifact.kind === 'calendar.event'));
}

/**
 * What a failed turn had already done, read from its own receipts: 'applied' when an effect committed
 * and was not rolled back, 'awaiting-approval' when the only committed effect queued an owner-approval
 * request, undefined when nothing committed. Upstream's post-commit interruption
 * (`TURN_INTERRUPTED_AFTER_EFFECT`) counts as applied unless the receipts show only a queued approval.
 *
 * v613 review (2026-11-20): "cancel my dentist appointment" on a linked calendar queued an approval
 * and changed nothing; the reply then failed and the phone said "Done · reply cut off".
 */
export function effectBeforeFailure(reply: { terminalFailure?: unknown; actionResults?: unknown }): EffectBeforeFailure | undefined {
  const code = reply.terminalFailure && typeof reply.terminalFailure === 'object' ? (reply.terminalFailure as { code?: unknown }).code : undefined;
  const receipts = Array.isArray(reply.actionResults) ? reply.actionResults.flatMap(result => {
    if (!result || typeof result !== 'object' || !('effectReceipts' in result)) return [];
    try { return [...normalizeEffectReceipts((result as { effectReceipts: unknown }).effectReceipts)]; }
    catch { return []; }
  }) : [];
  const reverted = new Set(receipts.flatMap(receipt => receipt.outcome === 'rolled_back' ? receipt.rollback.revertedReceiptIds : []));
  const active = receipts.filter((receipt): receipt is Receipt & { outcome: 'applied' } => receipt.outcome === 'applied' && !reverted.has(receipt.receiptId));
  if (active.some(receipt => !queuedForApproval(receipt))) return 'applied';
  if (active.length > 0) return 'awaiting-approval';
  return code === 'TURN_INTERRUPTED_AFTER_EFFECT' ? 'applied' : undefined;
}

/** The owner-facing lead for a failed turn's committed effect. */
export function effectInterruptedText(state: EffectBeforeFailure): string {
  return state === 'awaiting-approval' ? EFFECT_AWAITING_APPROVAL_INTERRUPTED : EFFECT_APPLIED_INTERRUPTED;
}
