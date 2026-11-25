// spec/app/platform/adoption.md, "The earlier Alpha's encrypted store is read where it is and never written: the page may only read one of the earlier page's own slots, or clear it while it still holds what was read"
package ai.alphacompute.alphaphone;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

/** The earlier page's encrypted slots, under the name the earlier page reached them by: read, or cleared, never written. */
@CapacitorPlugin(name = "AlphaConnection")
public final class AlphaConnectionPlugin extends Plugin {
 private final ExecutorService worker = Executors.newSingleThreadExecutor();

 @PluginMethod public void secureRead(PluginCall call) {
  String slot = pageSlot(call);
  if (slot == null) { call.reject("Secure storage read failed"); return; }
  PluginWorkers.submit(worker, () -> {
   try {
    String value = AlphaEarlier.read(getContext(), slot);
    call.resolve(new JSObject().put("value", value == null ? JSONObject.NULL : value));
   } catch (Exception unreadable) {
    call.reject("Secure storage read failed");
   }
  }, () -> call.reject("Secure storage read failed"));
 }

 @PluginMethod public void secureCompareExchange(PluginCall call) {
  String slot = pageSlot(call);
  Object expected = call.getData().opt("expectedValue");
  if (slot == null || !(expected instanceof String held) || !call.getData().has("value") || !call.getData().isNull("value")) {
   call.reject("Secure draft update failed");
   return;
  }
  PluginWorkers.submit(worker, () -> {
   try {
    call.resolve(new JSObject().put("status", AlphaEarlier.clear(getContext(), slot, held) ? "saved" : "conflict"));
   } catch (Exception unchanged) {
    call.reject("Secure draft update failed");
   }
  }, () -> call.reject("Secure draft update failed"));
 }

 private static String pageSlot(PluginCall call) {
  String slot = call.getString("slot");
  return slot != null && AlphaEarlier.PAGE_SLOTS.matcher(slot).matches() ? slot : null;
 }

 @Override protected void handleOnDestroy() {
  worker.shutdownNow();
  super.handleOnDestroy();
 }
}
