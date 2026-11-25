// spec/app/platform/adoption.md, "The page reads the earlier Alpha's encrypted store where it is and never writes it: it may only read one of the earlier page's own slots, or clear it while it still holds what was read"; spec/app/platform/adoption.md, "Background work the earlier Alpha queued never runs: at every start the phone cancels each job queued for the work manager the earlier Alpha shipped, and only those"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.Context;
import java.io.File;
import java.util.regex.Pattern;

/** What the earlier Alpha left on the phone: its encrypted slot store, read where it is, and the jobs it queued. */
final class AlphaEarlier {
 private AlphaEarlier() {}

 private static final String DIRECTORY = "connection-credentials";
 private static final String KEY = "alpha.connection.aes.v1";
 private static final String DIGEST = "[a-f0-9]{64}";
 private static final String SMS_DRAFT = "sms-draft:v1:(new|thread:[1-9][0-9]{0,18})";
 private static final String WORK_MANAGER_SERVICE = "androidx.work.impl.background.systemjob.SystemJobService";
 private static final int MIB = 1024 * 1024;

 /** The earlier page's own drafts and pending records, which an area of this Alpha moves through `AlphaConnection`. */
 static final Pattern PAGE_SLOTS = Pattern.compile(String.join("|",
  "inbox-drafts:v1:[\\s\\S]*", "inbox-operation:v1:" + DIGEST, SMS_DRAFT,
  "assistant-draft:v1:" + DIGEST, "alpha-proposal:v1", "stage-session:v1",
  "workflow-draft:v1:" + DIGEST, "clock-handoff:v1:device",
  "reminder-creations:v1:device", "reminder-deletions:v1:device", "calendar-linked-sync:v1:" + DIGEST,
  "notes-draft:v1:device", "note-origins:v1:device", "notes-audio-deletions:v1:device"));

 /** The phone's journals this Alpha keeps under the earlier names, moved into its own store when first read. */
 static final Pattern JOURNALS = Pattern.compile(String.join("|",
  "action-journal:v1:[\\s\\S]*", "sms-send-ledger:v1:device", "alpha-sms-operation:v1:[\\s\\S]*",
  "workflow-notice-delivery:v1", "workflow-approval-notices:v1", "workflow-notice-taps:v1", "workflow-notice-owner:v1"));

 /** The byte limit the earlier Alpha gave each slot it wrote (its `AlphaCredentialStore.slotLimit`). */
 private static int limit(String slot) {
  if (slot.equals("sms-send-ledger:v1:device") || slot.equals("notes-audio-deletions:v1:device")) return MIB;
  if (slot.matches(SMS_DRAFT) || slot.startsWith("inbox-drafts:v1:") || slot.matches("inbox-operation:v1:" + DIGEST)) return 8 * MIB;
  if (slot.matches("calendar-linked-sync:v1:" + DIGEST)) return 4 * MIB;
  if (slot.matches("note-audio-metadata:v1:[A-Za-z0-9_-]{1,100}") || slot.equals("note-origins:v1:device")) return 512 * 1024;
  if (slot.equals("notes-records:v1:device") || slot.equals("notes-draft:v1:device")) return 32 * MIB;
  if (slot.equals("notes-trash:v1:device")) return 30 * MIB;
  if (slot.equals("notes-folders:v1:device")) return 64 * 1024;
  return 256 * 1024;
 }

 private static int retained(String slot) { return slot.equals("notes-trash:v1:device") ? 32 * MIB : limit(slot); }

 private static File directory(Context context) { return new File(context.getNoBackupFilesDir(), DIRECTORY); }

 /** The earlier store as it is installed. Reading never creates its key; only Notes recordings still write in it. */
 static JsonCredentialSlots store(Context context) {
  return new JsonCredentialSlots(directory(context), KEY, AlphaEarlier::limit, AlphaEarlier::retained);
 }

 /** What the earlier store holds in `slot`, or null where it holds nothing. Throws where the slot cannot be read. */
 static String read(Context context, String slot) throws Exception {
  return directory(context).isDirectory() ? store(context).read(slot) : null;
 }

 /** Clears `slot` only while it still holds `expected`; true when it was cleared. */
 static boolean clear(Context context, String slot, String expected) throws Exception {
  return directory(context).isDirectory() && store(context).compareExchange(slot, expected, null);
 }

 /** Clears `slot`, whatever it holds. */
 static void remove(Context context, String slot) throws Exception {
  if (directory(context).isDirectory()) store(context).remove(slot);
 }

 /** Cancels every job of this app queued for the work manager the earlier Alpha shipped and this one does not. */
 static void retireWork(Context context) {
  JobScheduler jobs = context.getSystemService(JobScheduler.class);
  if (jobs == null) return;
  try {
   for (JobInfo job : jobs.getAllPendingJobs()) {
    if (WORK_MANAGER_SERVICE.equals(job.getService().getClassName())) jobs.cancel(job.getId());
   }
  } catch (RuntimeException cancelledAtTheNextStart) {
   android.util.Log.w("AlphaEarlier", "Earlier work not cancelled yet", cancelledAtTheNextStart);
  }
 }
}
