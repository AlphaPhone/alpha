package ai.alphacompute.alphaphone;

import ai.eliza.plugins.securestore.nativeonly.NativeSecureStore;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** ElizaSecureStore: the upstream hardware-backed slot store (@elizaos/os secure-store) for the renderer's named slots, Cloud slots namespaced by the deployment. */
@CapacitorPlugin(name = "ElizaSecureStore")
public final class ElizaSecureStorePlugin extends Plugin {
 private static final Object EXCHANGE = new Object();
 private final ExecutorService worker = Executors.newSingleThreadExecutor();
 private NativeSecureStore store;

 @Override public void load() { store = new NativeSecureStore(getContext()); }

 private interface Work { void run() throws Exception; }

 private void off(PluginCall call, Work work) {
  worker.execute(() -> { try { work.run(); } catch (Exception error) { call.reject("Secure storage is unavailable"); } });
 }

 private static String slot(PluginCall call) {
  String key = call.getString("key");
  if (key == null || key.isEmpty() || key.length() > 200) throw new IllegalArgumentException("A slot name is required");
  return CloudDeployment.storageSlot(key);
 }

 @PluginMethod public void get(PluginCall call) {
  off(call, () -> { JSObject out = new JSObject(); out.put("value", store.get(slot(call))); call.resolve(out); });
 }

 @PluginMethod public void set(PluginCall call) {
  off(call, () -> {
   String value = call.getString("value");
   if (value == null) { call.reject("A value is required"); return; }
   synchronized (EXCHANGE) { store.set(slot(call), value); }
   call.resolve();
  });
 }

 @PluginMethod public void remove(PluginCall call) {
  off(call, () -> { boolean removed; synchronized (EXCHANGE) { removed = store.remove(slot(call)); } JSObject out = new JSObject(); out.put("removed", removed); call.resolve(out); });
 }

 @PluginMethod public void compareAndExchange(PluginCall call) {
  off(call, () -> {
   String key = slot(call), expected = call.getString("expected"), next = call.getString("value");
   boolean exchanged;
   synchronized (EXCHANGE) {
    String current = store.get(key);
    exchanged = expected == null ? current == null : expected.equals(current);
    if (exchanged) { if (next == null) store.remove(key); else store.set(key, next); }
   }
   JSObject out = new JSObject(); out.put("exchanged", exchanged); call.resolve(out);
  });
 }

 @PluginMethod public void status(PluginCall call) {
  off(call, () -> {
   JSObject out = new JSObject();
   try { store.ensureAvailable(); out.put("available", true); } catch (Exception unavailable) { out.put("available", false); }
   call.resolve(out);
  });
 }

 @Override protected void handleOnDestroy() { worker.shutdown(); }
}
