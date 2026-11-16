package ai.alphacompute.alphaphone;

import android.content.Context;

/**
 * AP-16 AC-19: follows Telephony's call-state changes for the renderer. Registration needs
 * READ_PHONE_STATE (Android 12+ TelephonyCallback.CallStateListener); when it is not granted yet,
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
 synchronized boolean ensure() {
  if (listener != null) return true;
  if (android.os.Build.VERSION.SDK_INT < 31) return false;
  if (context.checkSelfPermission("android.permission.READ_PHONE_STATE") != android.content.pm.PackageManager.PERMISSION_GRANTED) return false;
  android.telephony.TelephonyManager phone = context.getSystemService(android.telephony.TelephonyManager.class);
  if (phone == null) return false;
  Listener next = new Listener(changed);
  try {
   phone.registerTelephonyCallback(context.getMainExecutor(), next);
  } catch (SecurityException | IllegalStateException unavailable) {
   return false;
  }
  listener = next;
  return true;
 }

 synchronized void stop() {
  Object registered = listener;
  listener = null;
  if (!(registered instanceof Listener)) return;
  android.telephony.TelephonyManager phone = context.getSystemService(android.telephony.TelephonyManager.class);
  try { if (phone != null) phone.unregisterTelephonyCallback((Listener) registered); } catch (RuntimeException ignored) {}
 }

 @android.annotation.TargetApi(31)
 static final class Listener extends android.telephony.TelephonyCallback implements android.telephony.TelephonyCallback.CallStateListener {
  private final Runnable changed;
  Listener(Runnable changed) { this.changed = changed; }
  @Override public void onCallStateChanged(int state) { changed.run(); }
 }
}
