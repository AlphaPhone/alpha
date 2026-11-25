// spec/app/inbox/notices.md, "Story: See whether mail is watched"; spec/app/inbox/notices.md, "Story: Open my message from a notice"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.notifications.MailHistoryReconciliation;
import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONObject;

@CapacitorPlugin(name = "AlphaInboxNotices",
 permissions = @Permission(alias = "notifications", strings = Manifest.permission.POST_NOTIFICATIONS))
public final class AlphaInboxNoticesPlugin extends Plugin {
 private InboxNoticeDelivery inbox;
 private AutoCloseable watching;

 @Override public void load() {
  inbox = InboxNoticeDelivery.get(getContext());
  watching = inbox.subscribe(() -> notifyListeners("changed", new JSObject()));
 }

 @Override protected void handleOnDestroy() {
  if (watching != null) {
   try { watching.close(); }
   catch (Exception ignored) { }
  }
  super.handleOnDestroy();
 }

 private boolean foreground(MainActivity activity) {
  return activity != null && !activity.isAssistantSurface() && !activity.isFinishing() && !activity.isDestroyed()
   && activity.hasWindowFocus() && AlphaAssistActivity.unlocked(activity);
 }

 private MailHistoryReconciliation.Guard foreground() {
  MainActivity activity = getActivity() instanceof MainActivity main ? main : null;
  long visit = activity == null ? -1 : activity.composerVisit();
  return () -> {
   if (!foreground(activity) || activity.composerVisit() != visit) throw new SecurityException("The unlocked Inbox visit changed");
  };
 }

 private interface Operation { JSONObject run() throws Exception; }

 private void execute(PluginCall call, Operation operation) {
  inbox.execute(() -> {
   try { call.resolve(new JSObject(operation.run().toString())); }
   catch (Exception unavailable) { call.reject("Inbox notices are unavailable"); }
  });
 }

 @PluginMethod public void configure(PluginCall call) {
  var foreground = foreground();
  String grant = call.getString("grantId");
  if (grant == null || !grant.matches("[A-Za-z0-9_-]{1,256}")) { call.reject("An exact Gmail grant is required"); return; }
  long attempt = inbox.delivery.begin(grant);
  execute(call, () -> {
   try {
    foreground.check();
    if (!inbox.allowed()) throw new SecurityException("Gmail notifications are disabled");
    var status = inbox.delivery.configure(attempt, call.getString("credentialId"), grant, call.getString("userId"), call.getString("organizationId"), foreground);
    inbox.changed();
    return status;
   } finally {
    inbox.delivery.releaseUnadmittedAttempt(attempt);
   }
  });
 }

 @PluginMethod public void withdraw(PluginCall call) {
  execute(call, () -> {
   inbox.delivery.withdraw(call.getString("grantId"));
   inbox.changed();
   return new JSONObject();
  });
 }

 @PluginMethod public void status(PluginCall call) {
  execute(call, () -> inbox.delivery.status().put("notificationsAllowed", inbox.allowed()));
 }

 @PluginMethod public void pending(PluginCall call) {
  var foreground = foreground();
  execute(call, () -> inbox.delivery.pending(foreground));
 }

 @PluginMethod public void consume(PluginCall call) {
  var foreground = foreground();
  execute(call, () -> {
   inbox.delivery.consume(call.getString("token"), foreground);
   return new JSONObject();
  });
 }

 @PluginMethod public void releaseQuestion(PluginCall call) {
  var foreground = foreground();
  execute(call, () -> {
   inbox.delivery.releaseQuestion(call.getString("token"), foreground);
   return new JSONObject();
  });
 }

 @PluginMethod public void notificationSettings(PluginCall call) {
  var foreground = foreground();
  var activity = getActivity();
  if (activity == null) { call.reject("Unlock Alpha to open settings"); return; }
  activity.runOnUiThread(() -> {
   try {
    foreground.check();
    PermissionState permission = getPermissionState("notifications");
    if (Build.VERSION.SDK_INT >= 33 && (permission == PermissionState.PROMPT || permission == PermissionState.PROMPT_WITH_RATIONALE)) {
     LateLaunch.ask(call, () -> requestPermissionForAlias("notifications", call, "notificationPermission"));
     return;
    }
    boolean granted = Build.VERSION.SDK_INT < 33 || permission == PermissionState.GRANTED;
    Intent intent = new Intent(granted ? Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS : Settings.ACTION_APP_NOTIFICATION_SETTINGS)
     .putExtra(Settings.EXTRA_APP_PACKAGE, activity.getPackageName());
    if (granted) intent.putExtra(Settings.EXTRA_CHANNEL_ID, InboxNoticeDelivery.CHANNEL);
    activity.startActivity(intent);
    call.resolve();
   } catch (Exception unavailable) { call.reject("Inbox notification settings are unavailable"); }
  });
 }

 @PermissionCallback private void notificationPermission(PluginCall call) {
  inbox.changed();
  call.resolve();
 }
}
