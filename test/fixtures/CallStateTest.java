package ai.alphacompute.alphaphone;

import android.content.Context;
import android.telecom.TelecomManager;

/** AP-16 AC-19: the native call-state rule the renderer gates Alpha's actions on. */
public final class CallStateTest {
 static void check(boolean result, String what) { if (!result) throw new AssertionError(what); }
 /** Telecom on the image: the system API answers whether the call is an emergency call. */
 public static final class SystemTelecom extends TelecomManager {
  public Boolean emergency;
  public boolean isInEmergencyCall() { if (emergency == null) throw new SecurityException("denied"); return emergency; }
 }
 public static void main(String[] args) {
  if (args.length == 1 && args[0].equals("table")) {
   // Every reading, for the renderer's rule to be compared against (test/call-state-native.test.mjs).
   Boolean[] values = {Boolean.TRUE, Boolean.FALSE, null};
   for (Boolean inCall : values) for (Boolean emergency : values) System.out.println(inCall + "," + emergency + "," + AlphaCallState.emergencyLive(inCall, emergency));
   return;
  }
  // The rule: a live call that cannot be ruled out as an emergency call holds AC-19.
  check(!AlphaCallState.emergencyLive(null, null), "unknown phone state is not a call");
  check(!AlphaCallState.emergencyLive(false, null), "no call");
  check(!AlphaCallState.emergencyLive(true, false), "an ordinary call");
  check(AlphaCallState.emergencyLive(true, true), "an emergency call");
  check(AlphaCallState.emergencyLive(true, null), "a call of unknown kind is treated as an emergency call");

  Context context = new Context();
  SystemTelecom telecom = new SystemTelecom();
  context.services.put(TelecomManager.class, telecom);
  // Without phone-state access Telecom's answer is not trusted.
  telecom.inCall = true; telecom.emergency = true;
  AlphaCallState.Reading denied = AlphaCallState.read(context);
  check(denied.inCall == null && denied.emergency == null && !denied.emergencyLive(), "no access reads as unknown");
  // Alpha is the default dialer on the image.
  telecom.dialer = context.packageName;
  check(AlphaCallState.read(context).emergencyLive(), "a live emergency call");
  telecom.emergency = false;
  check(!AlphaCallState.read(context).emergencyLive(), "a live ordinary call");
  telecom.emergency = null;
  AlphaCallState.Reading unknown = AlphaCallState.read(context);
  check(unknown.inCall && unknown.emergency == null && unknown.emergencyLive(), "a refused system API is unknown, never 'not an emergency'");
  telecom.inCall = false; telecom.emergency = true;
  AlphaCallState.Reading idle = AlphaCallState.read(context);
  check(!idle.inCall && Boolean.FALSE.equals(idle.emergency) && !idle.emergencyLive(), "no call");
  // A public-SDK Telecom without the system API: unknown, so a live call holds AC-19.
  TelecomManager plain = new TelecomManager();
  plain.dialer = context.packageName; plain.inCall = true;
  context.services.put(TelecomManager.class, plain);
  check(AlphaCallState.read(context).emergencyLive(), "no system API: a live call holds AC-19");
  // Phone-state permission with AppOps allowed is also trusted.
  context.packageName = "other"; context.granted.add("android.permission.READ_PHONE_STATE");
  android.app.AppOpsManager ops = new android.app.AppOpsManager(); context.services.put(android.app.AppOpsManager.class, ops);
  check(AlphaCallState.read(context).inCall == null, "AppOps refused");
  ops.mode = android.app.AppOpsManager.MODE_ALLOWED;
  check(Boolean.TRUE.equals(AlphaCallState.read(context).inCall), "AppOps allowed");
  System.out.println("PASS call state: emergency, ordinary, unknown and unreadable calls");
 }
}
