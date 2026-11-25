// spec/app/platform/index.md, "Story: Reach the phone's native capabilities"; spec/app/platform/adoption.md, "A journal of the phone that keeps its earlier slot's name is moved into this Alpha's store the first time it is read, and one held only in the earlier store that cannot be moved is never read as empty"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.securestore.nativeonly.NativeSecureStore;
import ai.eliza.plugins.securestore.nativeonly.SecureSlotPolicy;
import android.content.Context;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
 private final Context context;
 private final NativeSecureStore store;
 private final Set<String> settled = new HashSet<>();

 private AlphaSecureSlots(Context context) {
  this.context = context.getApplicationContext();
  store = new NativeSecureStore(this.context, POLICY);
 }

 static synchronized AlphaSecureSlots of(Context context) {
  if (shared == null) shared = new AlphaSecureSlots(context);
  return shared;
 }

 synchronized String read(String slot) throws Exception {
  String current = store.get(slot);
  if (settled.contains(slot) || !AlphaEarlier.JOURNALS.matcher(slot).matches()) return current;
  String earlier;
  try {
   earlier = AlphaEarlier.read(context, slot);
  } catch (Exception unreadable) {
   earlier = null;
  }
  if (earlier != null && current == null && !copied(slot, earlier)) return earlier;
  settled.add(slot);
  if (earlier == null) return current;
  try { AlphaEarlier.clear(context, slot, earlier); } catch (Exception clearedOnTheNextRun) { }
  return current == null ? earlier : current;
 }

 private boolean copied(String slot, String value) {
  try {
   store.set(slot, value);
   return value.equals(store.get(slot));
  } catch (Exception refused) {
   return false;
  }
 }

 synchronized void write(String slot, String value) throws Exception {
  if (value != null) {
   store.set(slot, value);
   return;
  }
  store.remove(slot);
  if (AlphaEarlier.JOURNALS.matcher(slot).matches()) AlphaEarlier.remove(context, slot);
 }
}
