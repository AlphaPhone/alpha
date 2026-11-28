package ai.alphacompute.runtime;

import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Core-proxied {@code ElizaActionJournal} Capacitor plugin delegating device execution journal operations to AlphaCore. */
@CapacitorPlugin(name = "ElizaActionJournal")
public final class RemoteActionJournalPlugin extends CorePluginProxy {
    @Override protected String corePluginName() { return "ElizaActionJournal"; }

    @PluginMethod public void get(PluginCall call) { forwardToCore(call, "get"); }
    @PluginMethod public void list(PluginCall call) { forwardToCore(call, "list"); }
    @PluginMethod public void edit(PluginCall call) { forwardToCore(call, "edit"); }
    @PluginMethod public void telephonyDeletionReceipt(PluginCall call) { forwardToCore(call, "telephonyDeletionReceipt"); }
}
