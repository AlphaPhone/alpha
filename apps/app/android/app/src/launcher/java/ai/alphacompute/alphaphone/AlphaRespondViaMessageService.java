// spec/app/messages/index.md, "Story: Start a new message"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.SmsRoleConfiguration;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.net.Uri;
import android.os.IBinder;
import android.telephony.TelephonyManager;
import java.util.UUID;

public final class AlphaRespondViaMessageService extends Service {
 @Override public IBinder onBind(Intent intent) { return null; }

 @Override public int onStartCommand(Intent intent, int flags, int startId) {
  try {
   if (AlphaImageCapability.verified(this)) {
    SmsDraftOpenRequest.Draft draft = SmsDraftOpenRequest.parse(intent, TelephonyManager.ACTION_RESPOND_VIA_MESSAGE);
    if (draft != null) postReview(draft);
   }
  } catch (RuntimeException unavailable) {
   android.util.Log.w("AlphaSmsReview", "The quick reply review could not be offered");
  } finally { stopSelf(startId); }
  return START_NOT_STICKY;
 }

 private void postReview(SmsDraftOpenRequest.Draft draft) {
  NotificationManager notifications = getSystemService(NotificationManager.class);
  if (notifications == null) return;
  SmsRoleConfiguration config = AlphaSmsRole.CONFIGURATION;
  String ticket = UUID.randomUUID().toString();
  Intent review = new Intent(this, AlphaSmsComposeActivity.class).setAction(Intent.ACTION_SENDTO)
   .setData(Uri.fromParts("smsto", String.join(",", draft.recipients()), null)).setIdentifier(ticket)
   .putExtra("sms_body", draft.body()).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
  PendingIntent open = PendingIntent.getActivity(this, 0, review, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_ONE_SHOT);
  notifications.createNotificationChannel(new NotificationChannel(config.channelId, config.channelName, NotificationManager.IMPORTANCE_HIGH));
  Notification notice = new Notification.Builder(this, config.channelId).setSmallIcon(config.notificationIcon)
   .setContentTitle("Review your reply").setContentText("Nothing is sent until you press Send.").setAutoCancel(true)
   .setVisibility(Notification.VISIBILITY_PRIVATE).setContentIntent(open).build();
  notifications.notify("respond-via-message", 1, notice);
 }
}
