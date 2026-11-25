// spec/app/digests/index.md
package ai.alphacompute.alphaphone;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.BackoffPolicy;
import androidx.work.Data;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/** Best-effort refresh of an already opted-in inbox over the resident service. */
public final class HostedDigestWorker extends Worker {
 private static final String PERIODIC = "alpha-hosted-results-periodic";
 private static final String CATCHUP = "alpha-hosted-results-catchup";
 private static final String ACTIVATION = "activation";
 private volatile Future<Void> current;

 public HostedDigestWorker(@NonNull Context context, @NonNull WorkerParameters params) {
  super(context, params);
 }

 static void schedule(Context context, String activation) {
  Data input = new Data.Builder().putString(ACTIVATION, activation).build();
  WorkManager manager = WorkManager.getInstance(context);
  manager.enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.UPDATE,
   new PeriodicWorkRequest.Builder(HostedDigestWorker.class, 15, TimeUnit.MINUTES)
    .setInputData(input).setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build());
  manager.enqueueUniqueWork(CATCHUP, ExistingWorkPolicy.REPLACE,
   new OneTimeWorkRequest.Builder(HostedDigestWorker.class)
    .setInputData(input).setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build());
 }

 static void cancel(Context context) {
  WorkManager manager = WorkManager.getInstance(context);
  manager.cancelUniqueWork(PERIODIC);
  manager.cancelUniqueWork(CATCHUP);
 }

 @NonNull @Override public Result doWork() {
  String activation = getInputData().getString(ACTIVATION);
  if (activation == null) return Result.success();
  try {
   var delivery = HostedDigestDelivery.running();
   if (delivery == null) return Result.retry();
   current = delivery.<Void>submit(() -> { delivery.syncScheduled(activation); return null; });
   if (isStopped()) current.cancel(true);
   current.get();
   return Result.success();
  } catch (InterruptedException interrupted) {
   Thread.currentThread().interrupt();
   return Result.retry();
  } catch (ExecutionException failure) {
   return failure.getCause() instanceof SecurityException ? Result.success() : Result.retry();
  } catch (java.util.concurrent.CancellationException stopped) {
   return Result.retry();
  } finally {
   current = null;
  }
 }

 @Override public void onStopped() {
  Future<Void> task = current;
  if (task != null) task.cancel(true);
 }
}
