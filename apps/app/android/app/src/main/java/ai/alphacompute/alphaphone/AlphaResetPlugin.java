// spec/app/settings/reset.md
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.system.reset.DataReset;
import ai.eliza.plugins.system.reset.DataResetPlugin;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ElizaReset")
public final class AlphaResetPlugin extends DataResetPlugin {
 static final DataReset RESET = DataReset.builder("reset-alpha", AlphaResetRecoveryActivity.class)
  .recoveryProcessSuffix(":reset_recovery").logTag("AlphaReset").build();

 @Override protected DataReset reset() { return RESET; }
}
