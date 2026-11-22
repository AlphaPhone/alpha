package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.MmsStore;
import ai.eliza.plugins.messages.SmsRoleConfiguration;
import ai.eliza.plugins.messages.SmsTelephony;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.Telephony;
import android.telephony.SmsMessage;

/**
 * SMS_DELIVER for the SMS role on the Alpha AOSP image (forked from the shared SmsDeliverReceiver so
 * that the notice is Alpha's {@link AlphaMessageNotices}). Android delivers each incoming text only to
 * the role holder, which must store it, so the message is persisted through the shared
 * {@link MmsStore} whenever Alpha holds the role; the notice follows. Declared behind BROADCAST_SMS and
 * enabled only on the verified image.
 */
public final class AlphaSmsDeliverReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context context, Intent intent) {
  if (intent == null || !Telephony.Sms.Intents.SMS_DELIVER_ACTION.equals(intent.getAction()) || !MmsStore.isDefaultSmsApp(context)) return;
  SmsMessage[] messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);
  if (messages == null || messages.length == 0) return;
  String sender = null; long timestamp = 0; StringBuilder body = new StringBuilder();
  for (SmsMessage message : messages) {
   if (message == null) continue;
   if (sender == null) sender = message.getDisplayOriginatingAddress();
   if (timestamp == 0) timestamp = message.getTimestampMillis();
   if (message.getDisplayMessageBody() != null) body.append(message.getDisplayMessageBody());
  }
  int subscription = intent.getIntExtra(android.telephony.SubscriptionManager.EXTRA_SUBSCRIPTION_INDEX, -1);
  final SmsRoleConfiguration config = AlphaSmsRole.CONFIGURATION;
  final Context app = context.getApplicationContext();
  final String from = sender, text = body.toString(); final long at = timestamp;
  final PendingResult pending = goAsync();
  try {
   SmsTelephony.WORK.execute(() -> {
    try {
     Uri row = MmsStore.persistIncomingSms(app, from, text, at, subscription);
     try { AlphaMessageNotices.notifyIncoming(app, config, row, from, text); }
     catch (RuntimeException unconfirmed) { android.util.Log.e("AlphaSmsDeliverReceiver", "Incoming SMS stored; notice publication unconfirmed", unconfirmed); }
    } catch (RuntimeException refused) {
     android.util.Log.e("AlphaSmsDeliverReceiver", "Incoming SMS could not be stored", refused);
    } finally { pending.finish(); }
   });
  } catch (java.util.concurrent.RejectedExecutionException closed) { pending.finish(); }
 }
}
