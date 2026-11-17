package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.AlphaTelephonyAccess;
import ai.eliza.plugins.messages.MmsPdu;
import ai.eliza.plugins.messages.MmsResultReceiver;
import ai.eliza.plugins.messages.MmsStore;
import ai.eliza.plugins.messages.SmsRoleConfiguration;
import ai.eliza.plugins.messages.SmsTelephony;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import java.io.File;
import java.nio.file.Files;

/**
 * Results of the platform MMS service for the SMS role on the Alpha AOSP image (explicit intents only;
 * enabled only on the verified image). A finished download is parsed and stored through the shared
 * {@link MmsStore}, Alpha's notice ({@link AlphaMessageNotices}) is posted, and the download is answered
 * with M-NotifyResp.ind (retrieved); a failed download stores nothing, and the carrier repeats the
 * notification. This download path is forked from the shared MmsResultReceiver so the notice is
 * Alpha's; the response results and the notice's "Mark as read" action stay with the shared receiver
 * ({@code super.onReceive}), which checks that the notice shown still owns the action.
 */
public final class AlphaMmsResultReceiver extends MmsResultReceiver {
 @Override protected SmsRoleConfiguration configuration() { return AlphaSmsRole.CONFIGURATION; }

 @Override public void onReceive(Context context, Intent intent) {
  final SmsRoleConfiguration config = configuration();
  if (intent == null || !config.mmsDownloadedAction.equals(intent.getAction())) { super.onReceive(context, intent); return; }
  final String name = intent.getStringExtra(AlphaTelephonyAccess.EXTRA_MMS_FILE);
  final boolean ok = getResultCode() == Activity.RESULT_OK;
  final Context app = context.getApplicationContext();
  if (!AlphaTelephonyAccess.validMmsFileName(name)) return;
  final String transaction = intent.getStringExtra(AlphaTelephonyAccess.EXTRA_MMS_TRANSACTION), location = intent.getStringExtra(AlphaTelephonyAccess.EXTRA_MMS_LOCATION);
  final int subscription = intent.getIntExtra(AlphaTelephonyAccess.EXTRA_MMS_SUBSCRIPTION, -1);
  final PendingResult pending = goAsync();
  try {
   SmsTelephony.WORK.execute(() -> {
    try { if (ok && MmsStore.isDefaultSmsApp(app)) store(app, config, name, transaction, location, subscription); }
    catch (Exception failed) { android.util.Log.e("AlphaMmsResultReceiver", "Downloaded MMS not stored", failed); }
    finally { AlphaTelephonyAccess.deleteMmsFile(app, name); pending.finish(); }
   });
  } catch (java.util.concurrent.RejectedExecutionException closed) { AlphaTelephonyAccess.deleteMmsFile(app, name); pending.finish(); }
 }

 private static void store(Context context, SmsRoleConfiguration config, String name, String transaction, String location, int subscription) throws Exception {
  File file = AlphaTelephonyAccess.mmsFile(context, name);
  if (!file.isFile() || file.length() > AlphaTelephonyAccess.MAX_MMS_PDU) throw new IllegalStateException("Downloaded MMS unavailable");
  MmsPdu.Message message = MmsPdu.parse(Files.readAllBytes(file.toPath()));
  if (message.type != MmsPdu.RETRIEVE_CONF) throw new IllegalStateException("Download was not a retrieved MMS");
  if (message.transactionId == null) message.transactionId = transaction;
  if (message.transactionId != null && MmsStore.hasTransaction(context, message.transactionId)) return;
  Uri row = MmsStore.persistIncomingMms(context, message, subscription, location);
  String text = MmsPdu.text(message);
  int attachments = MmsPdu.attachments(message).size();
  try { AlphaMessageNotices.notifyIncoming(context, config, row, message.from, text.isEmpty() ? AlphaMessageNotices.attachmentsPreview(attachments) : text); }
  catch (RuntimeException unconfirmed) { android.util.Log.e("AlphaMmsResultReceiver", "Incoming MMS stored; notice publication unconfirmed", unconfirmed); }
  if (transaction != null) AlphaTelephonyAccess.respondRetrieved(context, config, transaction, subscription);
 }
}
