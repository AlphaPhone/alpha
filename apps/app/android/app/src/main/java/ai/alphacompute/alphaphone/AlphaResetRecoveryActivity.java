// spec/app/settings/reset.md
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.system.reset.DataReset;
import ai.eliza.plugins.system.reset.DataResetRecoveryActivity;

public final class AlphaResetRecoveryActivity extends DataResetRecoveryActivity {
 @Override protected DataReset reset() { return AlphaResetPlugin.RESET; }
}
