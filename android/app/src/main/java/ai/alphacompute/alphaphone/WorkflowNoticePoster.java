package ai.alphacompute.alphaphone;

import ai.eliza.plugins.notifications.HostNoticePoster;
import ai.eliza.plugins.notifications.NoticeDelivery;
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
 * Alpha's workflow step and approval notices. Private contents are hidden on the lock screen and only
 * pending approvals use the high-importance channel. A notice's tap and its Ask action open Alpha's
 * launch activity with an opaque route token (WorkflowNoticeTaps); neither carries a decision,
 * RemoteInput or send.
 *
 * Copied from the shared ai.eliza.plugins.notifications.HostNoticePoster (elizaOS, MIT) so that Alpha
 * owns these notices; the posting, redaction, timeouts, quiet group and stale-tap revocation are
 * unchanged. Channel IDs, the tag prefix, actions, route prefix and request code 0 are installed
 * identities. {@link #CONFIG} hands the same identities to the shared NotificationsHostPlugin, which
 * routes taps and recognizes these channels; it never posts with them (AlphaNotificationsPlugin
 * builds its delivery with this poster).
 */
final class WorkflowNoticePoster implements WorkflowNoticeDelivery.Poster {
 static final String CHANNEL="alpha_workflow_steps",APPROVAL_CHANNEL="alpha_workflow_approvals";
 private static final String CHANNEL_NAME="Workflow updates",CHANNEL_DESCRIPTION="Messages your workflows send";
 private static final String APPROVAL_CHANNEL_NAME="Workflow approvals",APPROVAL_CHANNEL_DESCRIPTION="A workflow step needs your approval";
 private static final String TAG_PREFIX="alpha-workflow-",QUIET_GROUP="alpha_quiet_approvals";
 private static final String STEP_PUBLIC_TITLE="Alpha Phone workflow",APPROVAL_PUBLIC_TITLE="Alpha Phone",LOCKED_TEXT="Unlock to review this notification.",ASK_LABEL="Ask Alpha";
 private static final int SMALL_ICON=R.drawable.notification_icon;
 /** Installed identities for the shared NotificationsHostPlugin's tap routing and channel recognition. */
 static final HostNoticePoster.Config CONFIG=new HostNoticePoster.Config(
  CHANNEL,CHANNEL_NAME,CHANNEL_DESCRIPTION,APPROVAL_CHANNEL,APPROVAL_CHANNEL_NAME,APPROVAL_CHANNEL_DESCRIPTION,
  SMALL_ICON,TAG_PREFIX,WorkflowNoticeTaps.ACTION,WorkflowNoticeTaps.ASK_ACTION,WorkflowNoticeTaps.PREFIX,
  STEP_PUBLIC_TITLE,APPROVAL_PUBLIC_TITLE,LOCKED_TEXT,ASK_LABEL,QUIET_GROUP,WorkflowNoticeDelivery.STEP_NOTICE_TIMEOUT_MS);
 /** Looks up the route token prepared for a notice ID (see NoticeRoutes.token). */
 interface Routes{String token(String id)throws Exception;}
 private final Context context;private final Routes routes;
 WorkflowNoticePoster(Context context){this(context,id->WorkflowNoticeTapsFactory.create(context).token(id));}
 WorkflowNoticePoster(Context context,Routes routes){
  this.context=context.getApplicationContext();this.routes=java.util.Objects.requireNonNull(routes);
  NotificationChannel channel=new NotificationChannel(CHANNEL,CHANNEL_NAME,NotificationManager.IMPORTANCE_DEFAULT);channel.setDescription(CHANNEL_DESCRIPTION);channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);manager().createNotificationChannel(channel);
  NotificationChannel approvals=new NotificationChannel(APPROVAL_CHANNEL,APPROVAL_CHANNEL_NAME,NotificationManager.IMPORTANCE_HIGH);approvals.setDescription(APPROVAL_CHANNEL_DESCRIPTION);approvals.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);manager().createNotificationChannel(approvals);
 }
 private NotificationManager manager(){return context.getSystemService(NotificationManager.class);}
 private String tag(String id){return TAG_PREFIX+id;}
 private String channelFor(String id){return NoticeDelivery.approvalId(id)?APPROVAL_CHANNEL:CHANNEL;}
 private boolean allowed(String name){
  if(Build.VERSION.SDK_INT>=33&&context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return false;
  NotificationChannel channel=manager().getNotificationChannel(name);if(!manager().areNotificationsEnabled()||channel==null||channel.getImportance()==NotificationManager.IMPORTANCE_NONE)return false;
  NotificationChannelGroup group=channel.getGroup()==null?null:manager().getNotificationChannelGroup(channel.getGroup());return group==null||!group.isBlocked();
 }
 @Override public boolean allowed(){return allowed(CHANNEL);}
 @Override public boolean approvalsAllowed(){return allowed(APPROVAL_CHANNEL);}
 private Intent launch(String action,String token){
  Intent launch=context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
  if(launch==null||token==null)throw new IllegalStateException("Notice route unavailable");
  return launch.setAction(action).setData(Uri.parse(WorkflowNoticeTaps.PREFIX+token));
 }
 private PendingIntent tap(String id,boolean question)throws Exception{
  return PendingIntent.getActivity(context,0,launch(question?WorkflowNoticeTaps.ASK_ACTION:WorkflowNoticeTaps.ACTION,routes.token(id)),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
 }
 private Notification redacted(String channel,String title){return new Notification.Builder(context,channel).setSmallIcon(SMALL_ICON).setContentTitle(title).setContentText(LOCKED_TEXT).build();}
 /** Visible for builder tests. An unopened step notice times out; opening it cancels it. */
 Notification.Builder step(String title,String body,PendingIntent tap){
  return new Notification.Builder(context,CHANNEL).setSmallIcon(SMALL_ICON).setContentTitle(title).setContentText(body).setStyle(new Notification.BigTextStyle().bigText(body)).setVisibility(Notification.VISIBILITY_PRIVATE).setPublicVersion(redacted(CHANNEL,STEP_PUBLIC_TITLE)).setOnlyAlertOnce(true).setAutoCancel(false).setTimeoutAfter(WorkflowNoticeDelivery.STEP_NOTICE_TIMEOUT_MS).setCategory(Notification.CATEGORY_STATUS).setContentIntent(tap);
 }
 /** Visible for builder tests. Redacted approval request that disappears when the approval expires; tapping only opens the run. */
 Notification.Builder approval(String title,String body,long timeoutMs,PendingIntent tap){
  if(timeoutMs<=0)throw new IllegalArgumentException("Approval already expired");
  return new Notification.Builder(context,APPROVAL_CHANNEL).setSmallIcon(SMALL_ICON).setContentTitle(title).setContentText(body).setVisibility(Notification.VISIBILITY_PRIVATE).setPublicVersion(redacted(APPROVAL_CHANNEL,APPROVAL_PUBLIC_TITLE)).setOnlyAlertOnce(true).setAutoCancel(false).setTimeoutAfter(timeoutMs).setCategory(Notification.CATEGORY_REMINDER).setContentIntent(tap);
 }
 /** Ask only opens a reviewed draft; there is no RemoteInput, send or decision action. */
 Notification.Action question(PendingIntent tap){
  Notification.Action.Builder ask=new Notification.Action.Builder(null,ASK_LABEL,tap);
  if(Build.VERSION.SDK_INT>=31)ask.setAuthenticationRequired(true);
  return ask.build();
 }
 @Override public void post(String id,String title,String body)throws Exception{
  if(!allowed())throw new SecurityException("Notification delivery is disabled");
  manager().notify(tag(id),0,step(title,body,tap(id,false)).addAction(question(tap(id,true))).build());awaitListed(id);
 }
 /** notify() hands the notice to the system asynchronously, so an immediate read of the active list
  * can miss it and the receipt would record "unknown" for a notice Android is about to show. Wait
  * briefly (callers are never on the main thread); a notice still missing afterwards stays "unknown". */
 private void awaitListed(String id){
  long end=SystemClock.elapsedRealtime()+2000;
  while(SystemClock.elapsedRealtime()<end){
   for(StatusBarNotification row:manager().getActiveNotifications())if(row.getId()==0&&tag(id).equals(row.getTag()))return;
   try{Thread.sleep(20);}catch(InterruptedException interrupted){Thread.currentThread().interrupt();return;}
  }
 }
 @Override public void postApproval(String id,String title,String body,long timeoutMs)throws Exception{
  if(!NoticeDelivery.approvalId(id)||!approvalsAllowed())throw new SecurityException("Approval notifications are disabled");
  manager().notify(tag(id),0,approval(title,body,timeoutMs,tap(id,false)).addAction(question(tap(id,true))).build());awaitListed(id);
 }
 @Override public void postApprovalQuiet(String id,String title,String body,long timeoutMs)throws Exception{
  if(!NoticeDelivery.approvalId(id)||!approvalsAllowed())throw new SecurityException("Approval notifications are disabled");
  // Group children with SUMMARY-only alert behavior cannot sound/vibrate, even on the high channel.
  manager().notify(tag(id),0,approval(title,body,timeoutMs,tap(id,false)).addAction(question(tap(id,true))).setGroup(QUIET_GROUP).setGroupAlertBehavior(Notification.GROUP_ALERT_SUMMARY).build());awaitListed(id);
 }
 @Override public void cancel(String id){
  manager().cancel(tag(id),0);
  try{String token=routes.token(id);if(token!=null&&context.getPackageManager().getLaunchIntentForPackage(context.getPackageName())!=null)for(String action:new String[]{WorkflowNoticeTaps.ACTION,WorkflowNoticeTaps.ASK_ACTION}){
   // Intent.filterEquals distinguishes actions, so the notice's Ask PendingIntent is revoked separately.
   PendingIntent pending=PendingIntent.getActivity(context,0,launch(action,token),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_NO_CREATE);if(pending!=null)pending.cancel();
  }}catch(Exception failure){throw new IllegalStateException("Stale notice tap could not be invalidated",failure);}
 }
 private StatusBarNotification active(String id){for(StatusBarNotification row:manager().getActiveNotifications())if(row.getId()==0&&tag(id).equals(row.getTag()))return row;return null;}
 private static CharSequence text(Notification notice){return notice.extras.getCharSequence(Notification.EXTRA_BIG_TEXT,notice.extras.getCharSequence(Notification.EXTRA_TEXT,""));}
 /** Android shows at most 1024 characters of text, so a longer accepted body matches its exact prefix. */
 @Override public boolean matches(String id,String title,String body){StatusBarNotification row=active(id);if(row==null)return false;Notification notice=row.getNotification();return channelFor(id).equals(notice.getChannelId())&&title.contentEquals(notice.extras.getCharSequence(Notification.EXTRA_TITLE,""))&&NoticeDelivery.sameText(body,text(notice));}
 @Override public boolean shown(String id){return active(id)!=null;}
 @Override public String[] shownText(String id){
  StatusBarNotification row=active(id);if(row==null||!channelFor(id).equals(row.getNotification().getChannelId()))return null;
  Notification notice=row.getNotification();return new String[]{String.valueOf(notice.extras.getCharSequence(Notification.EXTRA_TITLE,"")),String.valueOf(text(notice))};
 }
}
