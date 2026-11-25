// spec/app/digests/index.md
package ai.alphacompute.alphaphone;

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

@CapacitorPlugin(name = "AlphaHostedDigestDelivery",
 permissions = @Permission(alias = "notifications", strings = Manifest.permission.POST_NOTIFICATIONS))
public final class AlphaHostedDigestDeliveryPlugin extends Plugin {
 private HostedDigestDelivery delivery;
 private AutoCloseable watching;

 @Override public void load() {
  delivery = HostedDigestDelivery.get();
  watching = delivery.subscribe(() -> notifyListeners("changed", new JSObject()));
 }

 @Override protected void handleOnDestroy() {
  if (watching != null) {
   try { watching.close(); }
   catch (Exception ignored) { }
   watching = null;
  }
  super.handleOnDestroy();
 }

 interface Operation { JSObject run() throws Exception; }

 private void run(PluginCall call, Operation action) {
  try { call.resolve(action.run()); }
  catch (Exception unavailable) { call.reject("Hosted digest delivery is unavailable"); }
 }

 private void execute(PluginCall call, Operation action) {
  delivery.execute(() -> run(call, action));
 }

 private static JSObject with(String key, JSONObject value) {
  JSObject response = new JSObject();
  response.put(key, value == null ? JSONObject.NULL : value);
  return response;
 }

 @PluginMethod public void read(PluginCall call) {
  delivery.executeRead(() -> run(call, () -> with("snapshot", delivery.read())));
 }

 private static String viewLease(PluginCall call) {
  String lease = call.getString("lease");
  if (lease == null || !lease.matches("[a-f0-9-]{36}")) throw new IllegalArgumentException("Invalid digest view");
  return lease;
 }

 @PluginMethod public void syncManual(PluginCall call) {
  execute(call, () -> {
   delivery.syncManual(viewLease(call));
   return new JSObject();
  });
 }

 @PluginMethod public void setBackground(PluginCall call) {
  Boolean enabled = call.getBoolean("enabled");
  if (enabled == null) {
   call.reject("Choose whether to enable background delivery");
   return;
  }
  execute(call, () -> {
   delivery.setBackground(enabled, viewLease(call));
   return new JSObject();
  });
 }

 @PluginMethod public void enableNotifications(PluginCall call) {
  delivery.executeRead(() -> {
   try {
    var guard = delivery.admitted(viewLease(call));
    var activity = getActivity();
    if (activity == null) { call.reject(LateLaunch.CLOSED); return; }
    activity.runOnUiThread(() -> {
     try {
      guard.check();
      if (activity.isDestroyed() || !activity.hasWindowFocus()) { call.reject(LateLaunch.CLOSED); return; }
      PermissionState state = getPermissionState("notifications");
      if (Build.VERSION.SDK_INT >= 33 && (state == PermissionState.PROMPT || state == PermissionState.PROMPT_WITH_RATIONALE)) {
       LateLaunch.ask(call, () -> requestPermissionForAlias("notifications", call, "notificationPermission"));
       return;
      }
      boolean permissionGranted = Build.VERSION.SDK_INT < 33 || state == PermissionState.GRANTED;
      Intent settings = new Intent(permissionGranted ? Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS : Settings.ACTION_APP_NOTIFICATION_SETTINGS)
       .putExtra(Settings.EXTRA_APP_PACKAGE, activity.getPackageName());
      if (permissionGranted) settings.putExtra(Settings.EXTRA_CHANNEL_ID, HostedDigestNotices.CHANNEL);
      activity.startActivity(settings);
      call.resolve();
     } catch (Exception unavailable) {
      call.reject("Android digest notification settings are unavailable");
     }
    });
   } catch (Exception unavailable) {
    call.reject("Hosted digest delivery is unavailable");
   }
  });
 }

 @PermissionCallback private void notificationPermission(PluginCall call) {
  delivery.refreshNotices();
  call.resolve();
 }

 @PluginMethod public void peekNotice(PluginCall call) {
  delivery.executeRead(() -> run(call, () -> with("notice", delivery.peekNotice())));
 }

 @PluginMethod public void settleNotice(PluginCall call) {
  String token = call.getString("token");
  if (token == null || !token.matches("[a-f0-9-]{36}")) {
   call.reject("Invalid digest notice");
   return;
  }
  String lease = call.getString("questionLease");
  if (lease != null && !lease.matches("[a-f0-9-]{36}")) {
   call.reject("Invalid digest question lease");
   return;
  }
  execute(call, () -> {
   delivery.settleNotice(token, lease);
   return new JSObject();
  });
 }
}
