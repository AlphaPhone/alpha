// spec/app/platform/index.md, "Story: Reach the phone's native capabilities"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.securestore.nativeonly.NativeSecureStore;
import ai.eliza.plugins.securestore.nativeonly.SecureSlotPolicy;
import android.content.Context;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

final class AlphaSecureSlots {
 private static final SecureSlotPolicy POLICY = SecureSlotPolicy.parse(Map.of(
  "nativeOnly", List.of("action-journal", "device-execution"),
  "slots", List.of(Map.of(
   "pattern", Pattern.quote(DeviceExecutionJournal.SLOT),
   "access", "nativeOnly",
   "limit", DeviceExecutionJournal.SLOT_BYTES
  ))
 ));
 private static AlphaSecureSlots shared;
 private final NativeSecureStore store;

 private AlphaSecureSlots(Context context) { store = new NativeSecureStore(context.getApplicationContext(), POLICY); }

 static synchronized AlphaSecureSlots of(Context context) {
  if (shared == null) shared = new AlphaSecureSlots(context);
  return shared;
 }

 String read(String slot) throws Exception { return store.get(slot); }

 void write(String slot, String value) throws Exception {
  if (value == null) store.remove(slot);
  else store.set(slot, value);
 }
}
