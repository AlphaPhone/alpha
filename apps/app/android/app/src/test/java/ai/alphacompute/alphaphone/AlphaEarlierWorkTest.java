// spec/app/platform/adoption.md, "Background work the earlier Alpha queued under a worker this Alpha does not ship never runs: at every start the phone cancels that work, and only that"
package ai.alphacompute.alphaphone;

import static org.junit.Assert.assertEquals;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Configuration;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkInfo;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import androidx.work.testing.SynchronousExecutor;
import androidx.work.testing.WorkManagerTestInitHelper;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(manifest = Config.NONE, sdk = 35)
public final class AlphaEarlierWorkTest {
 /** Stands in for a worker the earlier Alpha shipped: its work carries that worker's class name as the work manager tagged it. */
 public static final class EarlierWorker extends Worker {
  public EarlierWorker(@NonNull Context context, @NonNull WorkerParameters parameters) { super(context, parameters); }

  @NonNull @Override public Result doWork() { return Result.success(); }
 }

 private static List<String> cancelled(WorkManager work, List<String> names) throws Exception {
  List<String> found = new ArrayList<>();
  for (String name : names) if (work.getWorkInfosForUniqueWork(name).get().get(0).getState() == WorkInfo.State.CANCELLED) found.add(name);
  return found;
 }

 @Test public void theEarlierAlphasWorkIsCancelledAndThisAlphasMailAndHostedChecksAreKept() throws Exception {
  Context context = RuntimeEnvironment.getApplication();
  WorkManagerTestInitHelper.initializeTestWorkManager(context, new Configuration.Builder().setExecutor(new SynchronousExecutor()).build());
  WorkManager work = WorkManager.getInstance(context);
  work.enqueueUniqueWork("alpha-delete-window", ExistingWorkPolicy.REPLACE, new OneTimeWorkRequest.Builder(EarlierWorker.class)
   .addTag("ai.alphacompute.alphaphone.DeletionWorker").setInitialDelay(1, TimeUnit.HOURS).build());
  work.enqueueUniquePeriodicWork("alpha-notes-trash-backstop", ExistingPeriodicWorkPolicy.KEEP, new PeriodicWorkRequest.Builder(EarlierWorker.class, 6, TimeUnit.HOURS)
   .addTag("ai.alphacompute.alphaphone.AlphaNoteAudioPlugin$NotesTrashBackstopWorker").setInitialDelay(1, TimeUnit.HOURS).build());
  work.enqueueUniqueWork("alpha-source-renewal-s1", ExistingWorkPolicy.REPLACE, new OneTimeWorkRequest.Builder(EarlierWorker.class)
   .addTag("ai.alphacompute.alphaphone.HostedDeliveryWorker").setInitialDelay(1, TimeUnit.HOURS).build());
  GmailDeliveryWorker.schedule(context, "g1");
  HostedDigestWorker.schedule(context, "a1");

  AlphaEarlier.retireWork(context);

  List<String> earlier = List.of("alpha-delete-window", "alpha-notes-trash-backstop", "alpha-source-renewal-s1");
  List<String> own = List.of("alpha-gmail-periodic", "alpha-gmail-catchup:g1", "alpha-hosted-results-periodic", "alpha-hosted-results-catchup");
  assertEquals(List.of(earlier, List.of()), List.of(cancelled(work, earlier), cancelled(work, own)));
 }
}
