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

/**
 * RESPOND_VIA_MESSAGE for the SMS role on the Alpha AOSP image (forked from the shared
 * RespondViaMessageService; enabled only on the verified image, declared behind
 * SEND_RESPOND_VIA_MESSAGE). A quick reply chosen in a call screen is never sent from here: the reply
 * opens Alpha's compose review ({@link AlphaSmsComposeActivity}) from a notice on the Messages channel
 * (tag {@value #TAG}, ID 1), and only the owner's Send there sends it.
 */
public final class AlphaRespondViaMessageService extends Service {
 /** Installed identity: a later quick reply replaces the notice under this tag. */
 static final String TAG = "respond-via-message";
 static final String TITLE = "Review your reply", TEXT = "Alpha sends nothing until you press Send.";

 @Override public IBinder onBind(Intent intent) { return null; }

 @Override public int onStartCommand(Intent intent, int flags, int startId) {
  try {
   if (intent != null && TelephonyManager.ACTION_RESPOND_VIA_MESSAGE.equals(intent.getAction())) {
    SmsRoleConfiguration config = AlphaSmsRole.CONFIGURATION;
    String text = intent.getStringExtra(Intent.EXTRA_TEXT);
    if (text == null) text = intent.getStringExtra("sms_body");
    Uri data = intent.getData();
    Intent review = new Intent(this, config.composeActivity).setAction(Intent.ACTION_SENDTO).setData(data).putExtra("sms_body", text == null ? "" : text).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    PendingIntent open = PendingIntent.getActivity(this, 0, review, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    NotificationManager notifications = getSystemService(NotificationManager.class);
    if (notifications != null) {
     notifications.createNotificationChannel(new NotificationChannel(config.channelId, config.channelName, NotificationManager.IMPORTANCE_HIGH));
     notifications.notify(TAG, 1, new Notification.Builder(this, config.channelId).setSmallIcon(config.notificationIcon)
      .setContentTitle(TITLE).setContentText(TEXT).setAutoCancel(true).setContentIntent(open)
      .setVisibility(Notification.VISIBILITY_PRIVATE).build());
    }
   }
  } catch (RuntimeException unavailable) {
   android.util.Log.w("AlphaRespondViaMessage", "Quick reply review could not be offered", unavailable);
  } finally { stopSelf(startId); }
  return START_NOT_STICKY;
 }
}
