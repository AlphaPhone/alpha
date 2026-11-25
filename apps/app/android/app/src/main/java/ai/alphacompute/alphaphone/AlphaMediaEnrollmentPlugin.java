package ai.alphacompute.alphaphone;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.security.SecureRandom;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;

/** Keeps the enrolled phone’s generated key in the native credential store. */
@CapacitorPlugin(name="AlphaMediaEnrollment")
public final class AlphaMediaEnrollmentPlugin extends Plugin {
 private static final Pattern SLOT = Pattern.compile("device:[a-f0-9]{64}");
 private static final Pattern KEY = Pattern.compile("[a-f0-9]{64}");
 private static final Object LOCK = new Object();
 private final ExecutorService worker = Executors.newSingleThreadExecutor();

 @PluginMethod public void enrollmentKey(PluginCall call) {
  String slot = call.getString("slot", "");
  if (!SLOT.matcher(slot).matches()) { call.reject("Invalid device identity."); return; }
  PluginWorkers.submit(worker, () -> {
   try {
    synchronized (LOCK) {
     AlphaSecureSlots slots = AlphaSecureSlots.of(getContext());
     String kept = slots.read(slot);
     String key;
     if (kept == null) {
      byte[] bytes = new byte[32];
      new SecureRandom().nextBytes(bytes);
      StringBuilder hex = new StringBuilder(64);
      for (byte value : bytes) hex.append(Character.forDigit((value & 0xff) >>> 4, 16)).append(Character.forDigit(value & 15, 16));
      key = hex.toString();
      String written = new JSObject().put("key", key).toString();
      slots.write(slot, written);
      if (!written.equals(slots.read(slot))) throw new IllegalStateException();
     } else key = new JSObject(kept).getString("key");
     if (key == null || !KEY.matcher(key).matches()) throw new IllegalStateException();
     call.resolve(new JSObject().put("key", key));
    }
   } catch (Exception unavailable) {
    call.reject("The enrolled phone is unavailable.");
   }
  }, () -> call.reject("The enrolled phone is unavailable."));
 }

 @PluginMethod public void authority(PluginCall call) {
  Activity activity = getActivity();
  if (activity == null) { call.resolve(new JSObject().put("active", false)); return; }
  activity.runOnUiThread(() -> call.resolve(new JSObject().put("active", AlphaDevicePlugin.shareForeground(activity))));
 }

 @Override protected void handleOnDestroy() {
  worker.shutdown();
  super.handleOnDestroy();
 }
}
