package ai.eliza.plugins.messages;

import android.content.Context;
import android.telephony.SmsManager;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Alpha's access to the package-private glue of the shared reviewed SMS/MMS core
 * (plugin-native-messages). Alpha owns the screens and notices of its default-SMS-app
 * components and of its telephony bridge ({@code ai.alphacompute.alphaphone.AlphaTelephonyBase},
 * {@code AlphaSmsComposeActivity}, {@code AlphaSmsDeliverReceiver}, {@code AlphaMmsResultReceiver},
 * {@code AlphaMessageNotices}); the journal, dispatch, MMS file and read-marker logic stays shared and
 * is reached only through this class, so there is one journal per process and one dispatch path.
 *
 * Nothing here has UI, and nothing here changes the shared behaviour: every member forwards to the
 * shared member of the same meaning. The constants are installed identity (notification ID, intent
 * action and extras that pending notices and MMS download PendingIntents name) and are taken from the
 * shared declarations so the two can never drift apart.
 */
public final class AlphaTelephonyAccess {
 private AlphaTelephonyAccess() {}

 // ---- Confirmed sends (SmsTelephony, SmsSendJournal) -------------------------------------------
 // These four were reachable only inside the shared package, behind the shared native review. Alpha
 // shows no such dialog: each must run only for a send the owner already confirmed, either an agent's
 // card the owner approved in the chat, bound to its journal entry by AlphaApprovedSms in
 // AlphaTelephonyBase, or the owner's Send in the Messages composer (AlphaTelephonyPlugin's guard, or
 // AlphaSmsComposeActivity), with the unlocked-phone check, or to record a refusal or cancellation
 // before dispatch. test/native-ui-self-contained.test.mjs admits calls from those two files only.

 /** The platform SmsManager of one subscription. */
 public static SmsManager manager(Context context, int subscriptionId) { return SmsTelephony.manager(context, subscriptionId); }

 /** Journals and dispatches a confirmed SMS ({@link SmsTelephony#dispatch}). Only for an owner-confirmed send. */
 public static SmsSendJournal.Record dispatch(Context context, SmsTelephonyConfiguration config, SmsSendJournal journal, String operationId,
   String[] recipients, String body, int subscriptionId, ArrayList<String> parts, SmsTelephony.DispatchGuard guard) throws IOException {
  return SmsTelephony.dispatch(context, config, journal, operationId, recipients, body, subscriptionId, parts, guard);
 }

 /** Journals and dispatches a confirmed MMS ({@link SmsTelephony#dispatchMms}). Only for an owner-confirmed send. */
 public static SmsSendJournal.Record dispatchMms(Context context, SmsTelephonyConfiguration config, SmsSendJournal journal, String operationId,
   String[] recipients, String body, SmsSendJournal.Attachment[] attachments, byte[] pdu, List<MmsPdu.Part> parts, int subscriptionId,
   SmsTelephony.DispatchGuard guard) throws IOException {
  return SmsTelephony.dispatchMms(context, config, journal, operationId, recipients, body, attachments, pdu, parts, subscriptionId, guard);
 }

 /** The body parts of a reviewed MMS ({@link SmsTelephony#mmsParts}). */
 public static List<MmsPdu.Part> mmsParts(String body, SmsSendJournal.Attachment[] attachments, byte[][] data) { return SmsTelephony.mmsParts(body, attachments, data); }

 /** The PDU transaction ID of a reviewed MMS ({@link SmsTelephony#mmsTransaction}). */
 public static String mmsTransaction(String operationId) { return SmsTelephony.mmsTransaction(operationId); }

 /** Records a terminal decision (cancelled or denied) before any dispatch ({@link SmsSendJournal#decide}). Only for a confirmed send that did not dispatch. */
 public static SmsSendJournal.Record decide(SmsSendJournal journal, String operationId, String[] recipients, String body, int subscriptionId,
   String decision, long now, long boot) throws IOException {
  return journal.decide(operationId, recipients, body, subscriptionId, decision, now, boot);
 }

 /** The MMS form of {@link #decide} ({@link SmsSendJournal#decideMms}). */
 public static SmsSendJournal.Record decideMms(SmsSendJournal journal, String operationId, String[] recipients, String body,
   SmsSendJournal.Attachment[] attachments, int subscriptionId, String decision, long now, long boot) throws IOException {
  return journal.decideMms(operationId, recipients, body, attachments, subscriptionId, decision, now, boot);
 }

 // ---- Downloaded MMS (MmsWapPushReceiver, MmsResultReceiver, MmsStore files) --------------------

 /** Extras of the download PendingIntent {@link MmsWapPushReceiver} creates. */
 public static final String EXTRA_MMS_FILE = MmsWapPushReceiver.EXTRA_FILE, EXTRA_MMS_TRANSACTION = MmsWapPushReceiver.EXTRA_TRANSACTION,
  EXTRA_MMS_LOCATION = MmsWapPushReceiver.EXTRA_LOCATION, EXTRA_MMS_SUBSCRIPTION = MmsWapPushReceiver.EXTRA_SUBSCRIPTION;
 /** The largest PDU the shared parser reads. */
 public static final int MAX_MMS_PDU = MmsPdu.MAX_PDU;
 public static boolean validMmsFileName(String name) { return MmsStore.validFileName(name); }
 public static File mmsFile(Context context, String name) { return MmsStore.file(context, name); }
 public static void deleteMmsFile(Context context, String name) { MmsStore.delete(context, name); }
 /** M-NotifyResp.ind (retrieved) for a stored message ({@link MmsResultReceiver#respond}). */
 public static void respondRetrieved(Context context, SmsRoleConfiguration config, String transaction, int subscriptionId) {
  MmsResultReceiver.respond(context, config, transaction, subscriptionId);
 }

 // ---- Conversation notices (MmsStore, MmsResultReceiver mark-read) ------------------------------

 /** The notification ID of every conversation notice; the tag names the conversation. */
 public static final int NOTICE_ID = MmsStore.NOTICE_ID;
 /** The "Mark as read" broadcast the shared {@link MmsResultReceiver} answers, and its extras. */
 public static final String ACTION_MARK_READ = MmsResultReceiver.ACTION_MARK_READ, EXTRA_READ_THREAD = MmsResultReceiver.EXTRA_THREAD,
  EXTRA_READ_THROUGH = MmsResultReceiver.EXTRA_THROUGH, EXTRA_READ_NOTICE = MmsResultReceiver.EXTRA_NOTICE;
}
