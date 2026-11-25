package ai.alphacompute.alphaphone;

import android.content.Context;
import android.content.pm.PackageManager;
import android.telecom.TelecomManager;
import android.telephony.ServiceState;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.telephony.TelephonyManager;
import java.util.List;

/**
 * AP-16 AC-19: what the renderer needs to know about a live call, read from Telecom. The image's
 * system call screen owns every call, so this is the only way Alpha learns that one is live:
 * {@code inCall} (null when phone state cannot be read) and {@code emergency} (null when Telecom
 * cannot say). Nothing here places, ends or changes a call.
 */
final class AlphaCallState {
 private AlphaCallState() {}

 /** One reading. Unknown parts are null, never guessed. */
 static final class Reading {
  final Boolean inCall, emergency;
  Reading(Boolean inCall, Boolean emergency) { this.inCall = inCall; this.emergency = emergency; }
  /** AC-19 holds while a call is live that cannot be ruled out as an emergency call. */
  boolean emergencyLive() { return AlphaCallState.emergencyLive(inCall, emergency); }
 }

 /**
  * The AC-19 rule. In a call whose emergency status is unknown, Alpha behaves as if it were an
  * emergency call: no action is offered or run. With no call, or no phone-state access, it does not.
  */
 static boolean emergencyLive(Boolean inCall, Boolean emergency) {
  return Boolean.TRUE.equals(inCall) && !Boolean.FALSE.equals(emergency);
 }

 /** Telecom can report false when phone-state access is denied. Only use a negative with known access. */
 static boolean canRead(Context context, TelecomManager calls) {
  String packageName = context.getPackageName();
  if (context.checkSelfPermission("android.permission.READ_PRIVILEGED_PHONE_STATE") == PackageManager.PERMISSION_GRANTED ||
    packageName.equals(calls.getDefaultDialerPackage())) return true;
  if (context.checkSelfPermission("android.permission.READ_PHONE_STATE") != PackageManager.PERMISSION_GRANTED) return false;
  android.app.AppOpsManager ops = context.getSystemService(android.app.AppOpsManager.class);
  return ops != null && ops.noteOpNoThrow(android.app.AppOpsManager.OPSTR_READ_PHONE_STATE, context.getApplicationInfo().uid, packageName)
    == android.app.AppOpsManager.MODE_ALLOWED;
 }

 /** The current reading. */
 @android.annotation.SuppressLint("MissingPermission")
 static Reading read(Context context) {
  try {
   TelecomManager calls = context.getSystemService(TelecomManager.class);
   if (calls == null || !canRead(context, calls)) return new Reading(null, null);
   boolean inCall = calls.isInCall();
   if (!canRead(context, calls)) return new Reading(null, null);
   return new Reading(inCall, inCall ? emergencyCall(calls) : Boolean.FALSE);
  } catch (SecurityException denied) {
   return new Reading(null, null);
  } catch (RuntimeException unknown) {
   return new Reading(null, null);
  }
 }

 /** Whether any active voice line is in service, or null when Android did not disclose it. */
 @android.annotation.SuppressLint("MissingPermission")
 static Boolean carrierReady(Context context) {
  TelephonyManager phone = context.getSystemService(TelephonyManager.class);
  if (phone == null) return false;
  try {
   if (!phone.isVoiceCapable()) return false;
   SubscriptionManager manager = context.getSystemService(SubscriptionManager.class);
   List<SubscriptionInfo> lines = manager == null ? null : manager.getActiveSubscriptionInfoList();
   if (lines == null) return inService(phone);
   boolean unknown = false;
   for (SubscriptionInfo line : lines) {
    Boolean state = inService(phone.createForSubscriptionId(line.getSubscriptionId()));
    if (Boolean.TRUE.equals(state)) return true;
    if (state == null) unknown = true;
   }
   return unknown ? null : Boolean.FALSE;
  } catch (RuntimeException unavailable) {
   return inService(phone);
  }
 }

 @android.annotation.SuppressLint("MissingPermission")
 private static Boolean inService(TelephonyManager phone) {
  try {
   ServiceState state = phone.getServiceState();
   return state == null ? null : state.getState() == ServiceState.STATE_IN_SERVICE;
  } catch (RuntimeException unavailable) {
   return null;
  }
 }

 /**
  * TelecomManager#isInEmergencyCall is a system API that needs READ_PRIVILEGED_PHONE_STATE, which
  * the image grants Alpha. It is reached reflectively because the public SDK does not declare it;
  * any failure is "unknown", never "not an emergency".
  */
 static Boolean emergencyCall(Object telecom) {
  try {
   Object answer = telecom.getClass().getMethod("isInEmergencyCall").invoke(telecom);
   return answer instanceof Boolean ? (Boolean) answer : null;
  } catch (ReflectiveOperationException | RuntimeException unknown) {
   return null;
  }
 }
}
