package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.AlphaTelephonyAccess;
import ai.eliza.plugins.messages.SmsRecords;
import ai.eliza.plugins.messages.SmsRoleConfiguration;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.telephony.PhoneNumberUtils;
import java.util.List;
import java.util.UUID;

/**
 * Alpha's new-message notice for the default SMS app (forked from the shared
 * {@code MmsStore.notifyIncoming}, plugin-native-messages at elizaOS pin 1803ea88). It is posted by
 * {@link AlphaSmsDeliverReceiver} and {@link AlphaMmsResultReceiver} once the message is stored.
 *
 * Everything Android or the shared code reads back is installed identity and unchanged: the channel
 * ({@link SmsRoleConfiguration#channelId}), the tag (the conversation's {@code thread:<row>}, or the
 * message URI when the provider names none) and ID ({@link AlphaTelephonyAccess#NOTICE_ID}), the
 * receipt extra {@value #NOTICE_RECEIPT}, the {@code eliza-sms-notice} data of the tap target, and the
 * "Mark as read" broadcast ({@link AlphaTelephonyAccess#ACTION_MARK_READ}, its extras and its
 * {@code eliza-sms-read} data). The shared receiver and {@code MmsStore.markThreadRead} therefore keep
 * owning the read marker: they check the receipt of the notice shown, retire its action and remove it,
 * exactly as for the shared notice. Every PendingIntent is immutable with request code 0.
 */
final class AlphaMessageNotices {
 private AlphaMessageNotices() {}
 /** The extra that ties a notice to its own "Mark as read" action; shared with MmsStore and MmsResultReceiver. */
 static final String NOTICE_RECEIPT = "ai.eliza.plugins.messages.NOTICE_RECEIPT";
 /** Shared with the quick-reply notice, which posts on the same channel. */
 static final String CHANNEL_DESCRIPTION = "New text messages and replies waiting for you to send. The lock screen shows only “New message”.";
 static final String PUBLIC_TITLE = "New message", UNKNOWN_SENDER = "Unknown sender", SELF = "You", REPLY = "Reply", MARK_READ = "Mark as read";

 /** What an MMS without text says in its notice. */
 static String attachmentsPreview(int attachments) { return attachments == 1 ? "1 attachment" : attachments + " attachments"; }

 /**
  * A new-message notice for the message's conversation. The lock screen sees only "New message"; the
  * sender's contact name (or number) and the text show once unlocked, as a conversation that keeps
  * the texts not yet read. Tapping opens {@link SmsRoleConfiguration#openActivity} with the
  * conversation's thread ID ({@link SmsRoleConfiguration#EXTRA_THREAD_ID}). "Reply" opens the compose
  * review for the sender (nothing is sent from the notice); "Mark as read" marks the conversation read.
  * Throws when Android does not confirm the publication; the previous notice's read action is retired
  * either way.
  */
 static void notifyIncoming(Context context, SmsRoleConfiguration config, Uri message, String sender, String preview) {
  NotificationManager notifications = context.getSystemService(NotificationManager.class);
  if (notifications == null) return;
  NotificationChannel channel = new NotificationChannel(config.channelId, config.channelName, NotificationManager.IMPORTANCE_HIGH);
  channel.setDescription(CHANNEL_DESCRIPTION);
  notifications.createNotificationChannel(channel);
  long thread = threadOf(context, message);
  String tag = thread > 0 ? SmsRecords.threadId(thread) : message.toString();
  Notification previous = shownNotice(notifications, tag);
  String receipt = UUID.randomUUID().toString();
  android.os.Bundle receiptExtras = new android.os.Bundle(); receiptExtras.putString(NOTICE_RECEIPT, receipt);
  Intent show = new Intent(context, config.openActivity).setAction(Intent.ACTION_MAIN)
   .setData(Uri.fromParts("eliza-sms-notice", tag, null)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
  if (thread > 0) show.putExtra(SmsRoleConfiguration.EXTRA_THREAD_ID, tag);
  // Full conversation identity: extras and a 32-bit thread hash cannot distinguish all threads.
  PendingIntent open = PendingIntent.getActivity(context, 0, show, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
  Notification publicVersion = new Notification.Builder(context, config.channelId).setSmallIcon(config.notificationIcon).setContentTitle(PUBLIC_TITLE).build();
  String name = contactName(context, sender);
  String title = name != null ? name : sender == null ? UNKNOWN_SENDER : sender;
  long now = System.currentTimeMillis();
  Notification.Builder notice = new Notification.Builder(context, config.channelId)
   .setSmallIcon(config.notificationIcon)
   .setContentTitle(title)
   .setContentText(preview)
   .setCategory(Notification.CATEGORY_MESSAGE)
   .setVisibility(Notification.VISIBILITY_PRIVATE)
   .setPublicVersion(publicVersion)
   .setAutoCancel(true)
   .addExtras(receiptExtras)
   .setContentIntent(open);
  Notification.MessagingStyle conversation = new Notification.MessagingStyle(new android.app.Person.Builder().setName(SELF).build());
  // The conversation's notice is replaced by each new text; carry over the texts it already showed.
  for (Notification.MessagingStyle.Message earlier : shownMessages(previous)) conversation.addMessage(earlier);
  conversation.addMessage(preview, now, new android.app.Person.Builder().setName(title).build());
  notice.setStyle(conversation);
  if (sender != null && PhoneNumberUtils.isWellFormedSmsAddress(sender)) {
   // The reply is written and sent in the compose review, like every other send.
   Intent reply = new Intent(context, config.composeActivity).setAction(Intent.ACTION_SENDTO).setData(Uri.fromParts("smsto", sender, null)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
   notice.addAction(new Notification.Action.Builder(null, REPLY, PendingIntent.getActivity(context, 0, reply, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT)).build());
  }
  if (thread > 0) {
   Intent read = readIntent(context, config, receipt)
    .putExtra(AlphaTelephonyAccess.EXTRA_READ_THREAD, thread).putExtra(AlphaTelephonyAccess.EXTRA_READ_THROUGH, now).putExtra(AlphaTelephonyAccess.EXTRA_READ_NOTICE, receipt);
   notice.addAction(new Notification.Action.Builder(null, MARK_READ, PendingIntent.getBroadcast(context, 0, read, PendingIntent.FLAG_IMMUTABLE)).addExtras(receiptExtras).build());
  }
  Notification replacement = notice.build();
  // notify() only enqueues publication in Android. Fence the old action before that gap and do not
  // let the next incoming worker rebuild history from a notice Android has not published yet.
  retireReadAction(previous);
  try {
   notifications.notify(tag, AlphaTelephonyAccess.NOTICE_ID, replacement);
   awaitNotice(notifications, tag, receipt);
  } catch (RuntimeException failed) {
   retireReadAction(replacement);
   throw failed;
  }
 }

 /** The broadcast the shared MmsResultReceiver answers for this receipt; MmsStore.ownsNotice matches it. */
 private static Intent readIntent(Context context, SmsRoleConfiguration config, String receipt) {
  return new Intent(AlphaTelephonyAccess.ACTION_MARK_READ).setClass(context, config.mmsResultReceiver).setPackage(context.getPackageName())
   .setData(Uri.fromParts("eliza-sms-read", receipt, null));
 }

 private static void retireReadAction(Notification notice) {
  if (notice == null || notice.actions == null) return;
  String receipt = notice.extras.getString(NOTICE_RECEIPT);
  if (receipt == null) return;
  for (Notification.Action action : notice.actions)
   if (action.actionIntent != null && receipt.equals(action.getExtras().getString(NOTICE_RECEIPT))) action.actionIntent.cancel();
 }

 /** The conversation a stored message belongs to, or 0 when the provider does not say. */
 private static long threadOf(Context context, Uri message) {
  try (Cursor c = context.getContentResolver().query(message, new String[] { android.provider.Telephony.Sms.THREAD_ID }, null, null, null)) {
   return c != null && c.moveToFirst() && !c.isNull(0) ? c.getLong(0) : 0;
  } catch (RuntimeException unreadable) { return 0; }
 }

 /**
  * The sender's name in the owner's contacts when Alpha may read them, otherwise null and the number
  * is shown. One lookup in this profile only; nothing is read from a work profile.
  */
 private static String contactName(Context context, String number) {
  if (number == null || number.trim().isEmpty() || context.checkSelfPermission(android.Manifest.permission.READ_CONTACTS) != android.content.pm.PackageManager.PERMISSION_GRANTED) return null;
  Uri lookup = Uri.withAppendedPath(android.provider.ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(number));
  try (Cursor c = context.getContentResolver().query(lookup, new String[] { android.provider.ContactsContract.PhoneLookup.DISPLAY_NAME }, null, null, null)) {
   String name = c != null && c.moveToFirst() ? c.getString(0) : null;
   return name == null || name.trim().isEmpty() ? null : SmsRecords.clip(name, AlphaTelephonyBase.MAX_TEXT);
  } catch (RuntimeException unreadable) { return null; }
 }

 private static void awaitNotice(NotificationManager notifications, String tag, String receipt) {
  long deadline = System.nanoTime() + java.util.concurrent.TimeUnit.SECONDS.toNanos(3);
  do {
   Notification shown = shownNotice(notifications, tag);
   if (shown != null && receipt.equals(shown.extras.getString(NOTICE_RECEIPT))) return;
   try { Thread.sleep(10); }
   catch (InterruptedException stopped) {
    Thread.currentThread().interrupt();
    throw new IllegalStateException("Conversation notice publication interrupted", stopped);
   }
  } while (System.nanoTime() < deadline);
  throw new IllegalStateException("Conversation notice publication was not confirmed");
 }

 private static Notification shownNotice(NotificationManager notifications, String tag) {
  try {
   for (android.service.notification.StatusBarNotification shown : notifications.getActiveNotifications())
    if (shown.getId() == AlphaTelephonyAccess.NOTICE_ID && tag.equals(shown.getTag())) return shown.getNotification();
  } catch (RuntimeException unreadable) { android.util.Log.w("AlphaMessageNotices", "Current conversation notice unavailable", unreadable); }
  return null;
 }

 /** The texts the conversation's current notice shows, oldest first; empty when it shows none. */
 // Public from API 30; kept as the shared MmsStore reads it on every supported version.
 @android.annotation.SuppressLint("NewApi")
 private static List<Notification.MessagingStyle.Message> shownMessages(Notification shown) {
  try {
   android.os.Parcelable[] messages = shown == null ? null : shown.extras.getParcelableArray(Notification.EXTRA_MESSAGES);
   if (messages != null) return Notification.MessagingStyle.Message.getMessagesFromBundleArray(messages);
  } catch (RuntimeException unreadable) { /* The new text is still shown on its own. */ }
  return java.util.Collections.emptyList();
 }
}
