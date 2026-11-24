// spec/kit/undo.md, "Story: Take it back"
package ai.alphacompute.alphaphone;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.util.Log;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/** Wakes the SDK journal on time in the running process, with an Android alarm for process loss. */
public final class AlphaTelephonyDeletionWakeup extends BroadcastReceiver {
 private static final String TAG = "AlphaDeletionWakeup";
 private static final String ACTION = "ai.alphacompute.alphaphone.action.RECONCILE_TELEPHONY_DELETIONS";
 private static final long RETRY_DELAY_MS = 30_000;
 private static final ScheduledThreadPoolExecutor WORK = new ScheduledThreadPoolExecutor(1);
 private static long wakeAt = Long.MAX_VALUE;
 private static ScheduledFuture<?> wake;

 static { WORK.setRemoveOnCancelPolicy(true); }

 static synchronized void schedule(Context context, long delay) {
  long deadline = SystemClock.elapsedRealtime() + Math.max(1, delay);
  if (deadline >= wakeAt) return;
  if (wake != null) wake.cancel(false);
  wakeAt = deadline;
  wake = WORK.schedule(() -> elapsed(context, deadline), Math.max(1, delay), TimeUnit.MILLISECONDS);

  try {
   AlarmManager alarms = context.getSystemService(AlarmManager.class);
   if (alarms != null) alarms.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, deadline, operation(context, 0));
  } catch (RuntimeException unavailable) {
   Log.w(TAG, "Telephony deletion recovery alarm unavailable");
  }
 }

 private static PendingIntent operation(Context context, int flags) {
  Intent intent = new Intent(context, AlphaTelephonyDeletionWakeup.class).setAction(ACTION);
  return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE | flags);
 }

 private static synchronized void clearRecoveryIfIdle(Context context) {
  if (wake != null) return;
  try {
   AlarmManager alarms = context.getSystemService(AlarmManager.class);
   PendingIntent operation = operation(context, PendingIntent.FLAG_NO_CREATE);
   if (alarms != null && operation != null) alarms.cancel(operation);
  } catch (RuntimeException unavailable) {
   Log.w(TAG, "Telephony deletion recovery alarm could not be cleared");
  }
 }

 private static void elapsed(Context context, long deadline) {
  synchronized (AlphaTelephonyDeletionWakeup.class) {
   if (wakeAt != deadline) return;
   wakeAt = Long.MAX_VALUE;
   wake = null;
  }
  reconcile(context);
 }

 @Override public void onReceive(Context context, Intent intent) {
  if (intent == null || !ACTION.equals(intent.getAction()) || !AlphaImageCapability.verified(context)) return;
  Context application = context.getApplicationContext();
  PendingResult pending = goAsync();
  WORK.execute(() -> {
   try { reconcile(application); }
   finally { pending.finish(); }
  });
 }

 private static void reconcile(Context context) {
  try {
   if (!AlphaTelephonyDeletions.get(context).reconcile()) {
    clearRecoveryIfIdle(context);
    return;
   }
  } catch (Exception unavailable) {
   Log.w(TAG, "Telephony deletion settlement unavailable");
  }
  // The SDK retries settlement only. A dispatch whose reply was lost stays unknown.
  schedule(context, RETRY_DELAY_MS);
 }
}
