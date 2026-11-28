// spec/app/clock/index.md, "Story: Hear and prioritize ringing alerts"
package ai.alphacompute.alphaphone.clock;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import org.json.JSONArray;

@CapacitorPlugin(name = "AlphaClockAlerts", permissions = {
    @Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})
})
public final class AlphaClockAlertsPlugin extends Plugin {
    private JSObject pending = new JSObject();

    private void accept(Intent intent) {
        if (intent == null || !ClockAlerts.OPEN.equals(intent.getAction())) return;
        Uri data = intent.getData();
        if (data == null || !"alpha-clock-open".equals(data.getScheme())) return;
        String token = data.getSchemeSpecificPart();
        ClockAlertReceiver.WORK.execute(() -> {
            try {
                var opened = new ClockAlerts(getContext()).tap(token, false);
                if (!opened.has("token")) return;
                pending = JSObject.fromJSONObject(opened);
                getBridge().executeOnMainThread(() -> notifyListeners("clockAlertOpen", new JSObject(), true));
            } catch (Exception failure) { Log.w("AlphaClockAlerts", "Could not read Clock notification"); }
        });
    }

    @Override public void load() { accept(getActivity().getIntent()); }

    @Override protected void handleOnNewIntent(Intent intent) { accept(intent); }

    @PluginMethod public void reconcile(PluginCall call) {
        JSONArray alerts = call.getArray("alerts");
        if (alerts == null) { call.reject("Clock alerts required"); return; }
        ClockAlertReceiver.WORK.execute(() -> {
            try {
                var context = getContext();
                var store = new ClockAlerts(context);
                var known = Boolean.TRUE.equals(call.getBoolean("ready")) ? call.getArray("known") : null;
                store.reconcile(alerts, known == null ? new JSONArray() : known);
                call.resolve(new JSObject().put("notificationsEnabled", store.notificationsEnabled(alerts)).put("exact", store.exact()));
            } catch (Exception failure) { call.reject("Could not schedule Clock alerts", failure); }
        });
    }

    @PluginMethod public void openNotificationSettings(PluginCall call) {
        try {
            var intent = new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                .putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
            getActivity().startActivity(intent);
            call.resolve();
        } catch (RuntimeException unavailable) { call.reject("Clock notification settings unavailable", unavailable); }
    }

    @PluginMethod public void openExactAlarmSettings(PluginCall call) {
        if (android.os.Build.VERSION.SDK_INT < 31) { call.resolve(); return; }
        try {
            var intent = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                Uri.fromParts("package", getContext().getPackageName(), null));
            getActivity().startActivity(intent);
            call.resolve();
        } catch (RuntimeException unavailable) { call.reject("Exact alarm settings unavailable", unavailable); }
    }

    @PluginMethod public void pendingTap(PluginCall call) {
        ClockAlertReceiver.WORK.execute(() -> call.resolve(pending));
    }

    @PluginMethod public void consumeTap(PluginCall call) {
        String token = call.getString("token");
        ClockAlertReceiver.WORK.execute(() -> {
            try {
                if (token != null && token.equals(pending.getString("token"))) {
                    new ClockAlerts(getContext()).tap(token, true);
                    pending = new JSObject();
                }
                call.resolve();
            } catch (Exception failure) { call.reject("Could not acknowledge Clock alert", failure); }
        });
    }
}
