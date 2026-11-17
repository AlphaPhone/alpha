/**
 * Owner issue 4: a call keeps going when the owner leaves Alpha's call screen, so the WebView shows
 * an ongoing-call bar over every Alpha view (apps/app/src/runtime/ongoing-call.ts). This plugin tells
 * it which of {@link AlphaInCallService}'s calls are live, their state and connect time, and an
 * {@code ongoingCall} event on each change. It reports no number or name.
 *
 * Its two actions are the call screen's own: {@code showCall} opens {@link AlphaCallActivity} on the
 * call, as the call notice does, and {@code endCall} declines a ringing call or disconnects any other,
 * as the call screen's Decline and End do. Both act only on a call Telecom still has; nothing here
 * places a call. Registered only on the verified image, with the dialer role's InCallService.
 */
package ai.alphacompute.alphaphone;

import android.content.Intent;
import android.telecom.Call;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AlphaOngoingCall")
public final class AlphaOngoingCallPlugin extends Plugin {
    private final Runnable changed = () -> notifyListeners("ongoingCall", snapshot());

    @Override public void load() {
        super.load();
        AlphaInCallService.observe(changed);
    }

    @Override protected void handleOnDestroy() {
        AlphaInCallService.unobserve(changed);
        super.handleOnDestroy();
    }

    /** The live calls, oldest first: {@code {calls: [{id, state, connectedAt}]}}. */
    static JSObject snapshot() {
        JSArray calls = new JSArray();
        for (String id : AlphaInCallService.callIds()) {
            Call call = AlphaInCallService.call(id);
            if (call == null) continue;
            String state = AlphaCallPresentation.ongoingState(call.getState());
            if (state == null) continue;
            Call.Details details = call.getDetails();
            long connected = details == null ? 0 : details.getConnectTimeMillis();
            JSObject row = new JSObject();
            row.put("id", id);
            row.put("state", state);
            boolean live = "active".equals(state) || "held".equals(state);
            row.put("connectedAt", live && connected > 0 ? (Object) connected : JSObject.NULL);
            calls.put(row);
        }
        JSObject out = new JSObject();
        out.put("calls", calls);
        return out;
    }

    @PluginMethod public void ongoingCall(PluginCall call) { call.resolve(snapshot()); }

    /** Opens the call screen on the call, as its notice does. */
    @PluginMethod public void showCall(PluginCall call) {
        String id = call.getString("id");
        boolean known = id != null && AlphaInCallService.call(id) != null;
        if (known) {
            getContext().startActivity(new Intent(getContext(), AlphaCallActivity.class).putExtra("callId", id)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP));
        }
        JSObject out = new JSObject();
        out.put("shown", known);
        call.resolve(out);
    }

    /** Declines a ringing call and disconnects any other, as the call screen's Decline and End do. */
    @PluginMethod public void endCall(PluginCall call) {
        JSObject out = new JSObject();
        out.put("ended", end(call.getString("id")));
        call.resolve(out);
    }

    static boolean end(String id) {
        Call current = id == null ? null : AlphaInCallService.call(id);
        if (current == null) return false;
        return current.getState() == Call.STATE_RINGING
            ? AlphaInCallService.rejectCall(id, false, null)
            : AlphaInCallService.disconnectCall(id);
    }
}
