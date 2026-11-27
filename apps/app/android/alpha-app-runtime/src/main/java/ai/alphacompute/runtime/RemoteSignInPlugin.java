package ai.alphacompute.runtime;

import ai.alphacompute.ipc.AlphaIpcContract;
import ai.alphacompute.ipc.IAlphaPlatformBroker;
import android.os.RemoteException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONException;
import org.json.JSONObject;

/** Drop-in Capacitor {@code ElizaSignIn} proxy delegating scoped sign-in queries and lease upgrades to {@link IAlphaPlatformBroker}. */
@CapacitorPlugin(name = "ElizaSignIn")
public final class RemoteSignInPlugin extends Plugin {
    private final ExecutorService workers = Executors.newCachedThreadPool(task -> {
        Thread thread = new Thread(task, "AlphaRemoteSignIn");
        thread.setDaemon(true);
        return thread;
    });

    private CoreServiceConnector<IAlphaPlatformBroker> connector;

    @Override public void load() {
        connector = new CoreServiceConnector<>(getContext(), AlphaIpcContract.ACTION_PLATFORM_BROKER, IAlphaPlatformBroker.Stub::asInterface);
        connector.warmUp();
    }

    @Override protected void handleOnDestroy() {
        if (connector != null) connector.close();
        workers.shutdownNow();
        super.handleOnDestroy();
    }

    @PluginMethod public void startEmail(PluginCall call) { forward(call, "startEmail"); }
    @PluginMethod public void startPhone(PluginCall call) { forward(call, "startPhone"); }
    @PluginMethod public void startGoogle(PluginCall call) { forward(call, "startGoogle"); }
    @PluginMethod public void upgradeMailLease(PluginCall call) { forward(call, "upgradeMailLease"); }
    @PluginMethod public void cancelMailLeaseUpgrade(PluginCall call) { forward(call, "cancelMailLeaseUpgrade"); }
    @PluginMethod public void reauthenticate(PluginCall call) { forward(call, "reauthenticate"); }
    @PluginMethod public void resend(PluginCall call) { forward(call, "resend"); }
    @PluginMethod public void verify(PluginCall call) { forward(call, "verify"); }
    @PluginMethod public void sendFactorCode(PluginCall call) { forward(call, "sendFactorCode"); }
    @PluginMethod public void cancel(PluginCall call) { forward(call, "cancel"); }
    @PluginMethod public void signOut(PluginCall call) { forward(call, "signOut"); }
    @PluginMethod public void status(PluginCall call) { forward(call, "status"); }
    @PluginMethod public void serviceInfo(PluginCall call) { forward(call, "serviceInfo"); }

    private void forward(PluginCall call, String method) {
        String argsJson = call.getData() == null ? "{}" : call.getData().toString();
        workers.execute(() -> {
            IAlphaPlatformBroker broker = connector.connect();
            if (broker == null) {
                call.reject("SignInUnavailable", "SignInUnavailable");
                return;
            }
            try {
                String raw = broker.signInCall(method, argsJson);
                if (raw == null || raw.isBlank()) {
                    call.reject("Rejected", "Rejected");
                    return;
                }
                JSObject parsed = new JSObject(raw);
                if (parsed.has("error") && !parsed.optBoolean("ok", true)) {
                    String code = parsed.optString("error", "Rejected");
                    String message = parsed.optString("message", code);
                    call.reject(message, code);
                    return;
                }
                call.resolve(parsed);
            } catch (JSONException malformed) {
                call.reject("MalformedSignInReply", "MalformedSignInReply");
            } catch (RemoteException | SecurityException refused) {
                String code = refused instanceof SecurityException ? "Rejected" : "SignInUnavailable";
                call.reject(code, code);
            }
        });
    }
}
