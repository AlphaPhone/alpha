package ai.alphacompute.alphaphone;

import android.content.Context;

/**
 * AP-16 AC-19: follows Telephony's call-state changes for the renderer. Registration needs
 * READ_PHONE_STATE (Android 12+ TelephonyCallback); when it is not granted yet,
 * {@link #ensure()} registers on a later call (each read, each resume), so a grant that arrives
 * after start is picked up. {@link #stop()} unregisters exactly what was registered.
 */
final class AlphaCallStateWatch {
 private final Context context;
 private final Runnable changed;
 private Object listener;

 AlphaCallStateWatch(Context context, Runnable changed) { this.context = context; this.changed = changed; }

 boolean watching() { return listener != null; }

 /** Registers once possible; true while registered. */
 @SuppressWarnings("deprecation")
 synchronized boolean ensure() {
  if (listener != null) return true;
  if (context.checkSelfPermission("android.permission.READ_PHONE_STATE") != android.content.pm.PackageManager.PERMISSION_GRANTED) return false;
  android.telephony.TelephonyManager phone = context.getSystemService(android.telephony.TelephonyManager.class);
  if (phone == null) return false;
  if (android.os.Build.VERSION.SDK_INT >= 31) {
   Listener next = new Listener(changed);
   try {
    phone.registerTelephonyCallback(context.getMainExecutor(), next);
   } catch (SecurityException | IllegalStateException unavailable) {
    return false;
   }
   listener = next;
   return true;
  }
  android.telephony.PhoneStateListener legacy = new android.telephony.PhoneStateListener(context.getMainExecutor()) {
   @Override public void onCallStateChanged(int state, String phoneNumber) { changed.run(); }
   @Override public void onServiceStateChanged(android.telephony.ServiceState state) { changed.run(); }
  };
  try {
   phone.listen(legacy, android.telephony.PhoneStateListener.LISTEN_CALL_STATE | android.telephony.PhoneStateListener.LISTEN_SERVICE_STATE);
  } catch (SecurityException | IllegalStateException unavailable) {
   return false;
  }
  listener = legacy;
  return true;
 }

 @SuppressWarnings("deprecation")
 synchronized void stop() {
  Object registered = listener;
  listener = null;
  android.telephony.TelephonyManager phone = context.getSystemService(android.telephony.TelephonyManager.class);
  if (phone == null) return;
  if (registered instanceof Listener && android.os.Build.VERSION.SDK_INT >= 31) {
   try { phone.unregisterTelephonyCallback((Listener) registered); } catch (RuntimeException ignored) {}
  } else if (registered instanceof android.telephony.PhoneStateListener) {
   try { phone.listen((android.telephony.PhoneStateListener) registered, android.telephony.PhoneStateListener.LISTEN_NONE); } catch (RuntimeException ignored) {}
  }
 }

 @android.annotation.TargetApi(31)
 static final class Listener extends android.telephony.TelephonyCallback implements android.telephony.TelephonyCallback.CallStateListener, android.telephony.TelephonyCallback.ServiceStateListener {
  private final Runnable changed;
  Listener(Runnable changed) { this.changed = changed; }
  @Override public void onCallStateChanged(int state) { changed.run(); }
  @Override public void onServiceStateChanged(android.telephony.ServiceState state) { changed.run(); }
 }
}
