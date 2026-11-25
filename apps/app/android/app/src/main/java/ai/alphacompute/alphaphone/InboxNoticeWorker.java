// spec/app/inbox/notices.md, "Story: Hear about new mail"
package ai.alphacompute.alphaphone;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.Data;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.util.concurrent.TimeUnit;

public final class InboxNoticeWorker extends Worker {
 private static final String PERIODIC = "alpha-gmail-history";
 private static final String CATCHUP = "alpha-gmail-history-catchup";
 private static final String GENERATION = "generation";

 public InboxNoticeWorker(@NonNull Context context, @NonNull WorkerParameters parameters) { super(context, parameters); }

 static void schedule(Context context, String generation) {
  var input = new Data.Builder().putString(GENERATION, generation).build();
  var constraint = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
  var manager = WorkManager.getInstance(context);
  manager.enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.UPDATE,
   new PeriodicWorkRequest.Builder(InboxNoticeWorker.class, 15, TimeUnit.MINUTES).setConstraints(constraint).setInputData(input).build());
  manager.enqueueUniqueWork(CATCHUP + ":" + generation, ExistingWorkPolicy.KEEP,
   new OneTimeWorkRequest.Builder(InboxNoticeWorker.class).setConstraints(constraint).setInputData(input).addTag(CATCHUP).build());
 }

 static void cancel(Context context) {
  var manager = WorkManager.getInstance(context);
  manager.cancelUniqueWork(PERIODIC);
  manager.cancelAllWorkByTag(CATCHUP);
 }

 @NonNull @Override public Result doWork() {
  String generation = getInputData().getString(GENERATION);
  if (generation == null) return Result.success();
  var inbox = InboxNoticeDelivery.get(getApplicationContext());
  try {
   return inbox.delivery.sync(generation, () -> {
    if (isStopped()) throw new SecurityException("Stopped Gmail watch");
   }) ? Result.success() : Result.retry();
  } catch (SecurityException retired) {
   return Result.success();
  } catch (Exception unavailable) {
   return Result.retry();
  } finally {
   inbox.changed();
  }
 }
}
