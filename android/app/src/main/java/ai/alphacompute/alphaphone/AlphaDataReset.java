package ai.alphacompute.alphaphone;

import ai.eliza.plugins.system.reset.DataReset;

/**
 * Alpha's registration of the shared reset coordinator (plugin-native-system reset.DataReset):
 * installed marker names, recovery component and process and the bounded work that runs before
 * Android's package-scoped clear (ResetBeforeDispatch: Alpha's own calendar, then Cloud key
 * revocation). The coordinator (durable marker, listener acknowledgement first, bounded recovery and
 * fail-closed admission before providers) is upstream. Every screen around it is Alpha's
 * own: the review and fresh device credential (AlphaResetPlugin), the recovery screen
 * (ResetRecoveryActivity) and their wording (AlphaDataResetCopy).
 */
final class AlphaDataReset {
 /** reset-alpha.pending/.failures and :reset_recovery are persisted identities; never rename them. */
 static final DataReset RESET=DataReset.builder("reset-alpha",ResetRecoveryActivity.class)
  .recoveryProcessSuffix(ResetRecoveryActivity.PROCESS_SUFFIX).logTag("AlphaReset")
  .beforeDispatch(ResetBeforeDispatch.STEP).build();
 private AlphaDataReset(){}
}
