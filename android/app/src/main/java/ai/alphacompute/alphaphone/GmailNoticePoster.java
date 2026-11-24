package ai.alphacompute.alphaphone;

import ai.eliza.plugins.notifications.MailBackgroundDelivery;
import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationChannelGroup;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.SystemClock;
import android.service.notification.StatusBarNotification;

/**
 * Alpha's content-free new-mail notices for the shared background new-mail check
 * (MailBackgroundDelivery, see GmailBackground). A notice names no sender, subject or body; its tap and
 * its authenticated Ask action open MainActivity with only an opaque ledger key, which AlphaGmailPlugin
 * hands to MailBackgroundDelivery.capture. Private on the lock screen, with a redacted public version.
 *
 * Copied from the shared ai.eliza.plugins.notifications.MailNoticePoster (elizaOS, MIT) so that Alpha
 * owns these notices; posting, lifetime, grouping, the bounded post observation and stale-tap
 * revocation are unchanged. The channel ID, action, URI prefixes, tag prefix and request code 0 are
 * installed identities.
 */
final class GmailNoticePoster implements MailBackgroundDelivery.Notices {
 static final String CHANNEL="alpha-gmail",ACTION="ai.alphacompute.alphaphone.OPEN_GMAIL_NOTICE";
 private static final String OPEN_PREFIX="alpha-gmail:",ASK_PREFIX="alpha-gmail-ask:",TAG_PREFIX="alpha-gmail-";
 // Owner-facing text lives in res/values/alpha-notices.xml.
 private static final int SMALL_ICON=R.drawable.notification_icon;
 /** A tap on one of these notices: the ledger key and whether it was the Ask action. */
 static final class Tap {final String key;final boolean question;private Tap(String key,boolean question){this.key=key;this.question=question;}}
 private static final long LIFETIME_MS=86400000L;
 private final Context context;private final NotificationManager manager;
 GmailNoticePoster(Context context){
  this.context=context.getApplicationContext();manager=this.context.getSystemService(NotificationManager.class);
  NotificationChannel channel=new NotificationChannel(CHANNEL,this.context.getString(R.string.alpha_gmail_channel_name),NotificationManager.IMPORTANCE_DEFAULT);channel.setDescription(this.context.getString(R.string.alpha_gmail_channel_description));channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);manager.createNotificationChannel(channel);
 }
 /** The tap an intent carries, or null for any other intent. */
 Tap tap(Intent intent){
  if(intent==null||!ACTION.equals(intent.getAction())||intent.getData()==null)return null;
  String uri=intent.getData().toString();boolean question=uri.startsWith(ASK_PREFIX);
  if(!question&&!uri.startsWith(OPEN_PREFIX))return null;
  return new Tap(uri.substring((question?ASK_PREFIX:OPEN_PREFIX).length()),question);
 }
 /** A blocked channel group (AlphaNotificationChannels puts this channel in one) is refused like a blocked channel. */
 @Override public boolean allowed(){NotificationChannel c=manager.getNotificationChannel(CHANNEL);if(!((Build.VERSION.SDK_INT<33||context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED)&&manager.areNotificationsEnabled()&&c!=null&&c.getImportance()!=NotificationManager.IMPORTANCE_NONE))return false;NotificationChannelGroup group=c.getGroup()==null?null:manager.getNotificationChannelGroup(c.getGroup());return group==null||!group.isBlocked();}
 @Override public boolean active(String key){for(StatusBarNotification n:manager.getActiveNotifications())if((TAG_PREFIX+key).equals(n.getTag()))return true;return false;}
 private Intent intent(String key,boolean question){
  return new Intent(context,MainActivity.class).setAction(ACTION).setData(Uri.parse((question?ASK_PREFIX:OPEN_PREFIX)+key)).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
 }
 @Override public void post(String key){
  PendingIntent tap=PendingIntent.getActivity(context,0,intent(key,false),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
  PendingIntent askTap=PendingIntent.getActivity(context,0,intent(key,true),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
  Notification.Action.Builder ask=new Notification.Action.Builder(null,context.getString(R.string.alpha_notice_ask),askTap);if(Build.VERSION.SDK_INT>=31)ask.setAuthenticationRequired(true);
  Notification redacted=new Notification.Builder(context,CHANNEL).setSmallIcon(SMALL_ICON).setContentTitle(context.getString(R.string.alpha_notice_public_title)).setContentText(context.getString(R.string.alpha_notice_tap_to_open)).build();
  manager.notify(TAG_PREFIX+key,0,new Notification.Builder(context,CHANNEL).setSmallIcon(SMALL_ICON).setContentTitle(context.getString(R.string.alpha_gmail_title)).setContentText(context.getString(R.string.alpha_gmail_text)).setPublicVersion(redacted).setVisibility(Notification.VISIBILITY_PRIVATE).setContentIntent(tap).addAction(ask.build()).setOnlyAlertOnce(true).setAutoCancel(true).setTimeoutAfter(LIFETIME_MS).setCategory(Notification.CATEGORY_EMAIL).setGroup(TAG_PREFIX).build());
  // A bounded observation distinguishes posted from uncertain; the caller never replays an uncertain post.
  long until=SystemClock.elapsedRealtime()+500;
  while(!active(key)&&SystemClock.elapsedRealtime()<until){try{Thread.sleep(25);}catch(InterruptedException interrupted){Thread.currentThread().interrupt();break;}}
 }
 @Override public void cancel(String key){
  manager.cancel(TAG_PREFIX+key,0);
  for(boolean question:new boolean[]{false,true}){PendingIntent pending=PendingIntent.getActivity(context,0,intent(key,question),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_NO_CREATE);if(pending!=null)pending.cancel();}
 }
 @Override public void cancelAll(){for(StatusBarNotification n:manager.getActiveNotifications())if(n.getTag()!=null&&n.getTag().startsWith(TAG_PREFIX))cancel(n.getTag().substring(TAG_PREFIX.length()));}
}
