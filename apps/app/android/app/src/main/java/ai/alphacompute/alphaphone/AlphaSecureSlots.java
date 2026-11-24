// spec/app/platform/index.md, "Story: Reach the phone's native capabilities"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.securestore.nativeonly.NativeSecureStore;
import android.content.Context;

final class AlphaSecureSlots {
 private static AlphaSecureSlots shared;
 private final NativeSecureStore store;

 private AlphaSecureSlots(Context context) { store = new NativeSecureStore(context.getApplicationContext()); }

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
