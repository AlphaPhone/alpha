package ai.alphacompute.alphaphone;

import android.content.Context;
import android.telephony.TelephonyCallback;
import android.telephony.TelephonyManager;

/** AP-16 AC-19: the call-state listener's registration and lifecycle. */
public final class CallStateWatchTest {
 static void check(boolean result, String what) { if (!result) throw new AssertionError(what); }
 public static void main(String[] args) {
  Context context = new Context();
  TelephonyManager phone = new TelephonyManager();
  context.services.put(TelephonyManager.class, phone);
  int[] changes = {0};
  AlphaCallStateWatch watch = new AlphaCallStateWatch(context, () -> changes[0]++);
  // Without READ_PHONE_STATE nothing registers; a later grant is picked up by the next ensure().
  check(!watch.ensure() && phone.registered.isEmpty() && !watch.watching(), "no permission: no listener");
  context.granted.add("android.permission.READ_PHONE_STATE");
  check(watch.ensure() && phone.registered.size() == 1 && watch.watching(), "registered once granted");
  check(watch.ensure() && phone.registered.size() == 1, "registered only once");
  ((TelephonyCallback.CallStateListener) phone.registered.get(0)).onCallStateChanged(2);
  check(changes[0] == 1, "a call-state change reaches the renderer");
  watch.stop();
  check(phone.registered.isEmpty() && !watch.watching(), "stop unregisters what was registered");
  watch.stop();
  // A refused registration leaves nothing half-registered; an old Android has no listener.
  phone.refuse = true;
  check(!watch.ensure() && phone.registered.isEmpty() && !watch.watching(), "refused registration");
  phone.refuse = false;
  android.os.Build.VERSION.SDK_INT = 30;
  check(!watch.ensure() && phone.registered.isEmpty(), "before Android 12");
  android.os.Build.VERSION.SDK_INT = 34;
  check(watch.ensure() && phone.registered.size() == 1, "re-registers after a stop");
  System.out.println("PASS call-state watch: grant after start, single registration, change, stop, refusal");
 }
}
