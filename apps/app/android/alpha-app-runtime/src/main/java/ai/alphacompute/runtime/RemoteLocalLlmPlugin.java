package ai.alphacompute.runtime;

import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Core-proxied {@code AlphaLocalLlm} plugin delegating on-device Gemma catalog, downloads, lifecycle, and inference to AlphaCore. */
@CapacitorPlugin(name = "AlphaLocalLlm")
public final class RemoteLocalLlmPlugin extends CorePluginProxy {
    @Override protected String corePluginName() { return "AlphaLocalLlm"; }

    @PluginMethod public void catalog(PluginCall call) { forwardToCore(call, "catalog"); }
    @PluginMethod public void status(PluginCall call) { forwardToCore(call, "status"); }
    @PluginMethod public void download(PluginCall call) { forwardToCore(call, "download"); }
    @PluginMethod public void cancelDownload(PluginCall call) { forwardToCore(call, "cancelDownload"); }
    @PluginMethod public void activate(PluginCall call) { forwardToCore(call, "activate"); }
    @PluginMethod public void unload(PluginCall call) { forwardToCore(call, "unload"); }
    @PluginMethod public void delete(PluginCall call) { forwardToCore(call, "delete"); }
    @PluginMethod public void generate(PluginCall call) { forwardToCore(call, "generate"); }
    @PluginMethod public void setMode(PluginCall call) { forwardToCore(call, "setMode"); }
}
