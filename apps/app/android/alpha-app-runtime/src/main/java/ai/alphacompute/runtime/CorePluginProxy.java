package ai.alphacompute.runtime;

import ai.alphacompute.ipc.AlphaIpcContract;
import ai.alphacompute.ipc.IAlphaPlatformBroker;
import android.os.RemoteException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import org.json.JSONException;
import org.json.JSONObject;

/** Base Capacitor plugin proxy delegating calls over {@link IAlphaPlatformBroker#corePluginCall}. */
public abstract class CorePluginProxy extends Plugin {
    private final ExecutorService workers = Executors.newCachedThreadPool(task -> {
        Thread thread = new Thread(task, "AlphaCoreProxy-" + corePluginName());
        thread.setDaemon(true);
        return thread;
    });

    private CoreServiceConnector<IAlphaPlatformBroker> connector;

    /** Registered Capacitor plugin name hosted inside AlphaCore. */
    protected abstract String corePluginName();

    @Override public void load() {
        super.load();
        connector = new CoreServiceConnector<>(getContext(), AlphaIpcContract.ACTION_PLATFORM_BROKER, IAlphaPlatformBroker.Stub::asInterface);
        connector.warmUp();
    }

    @Override protected void handleOnDestroy() {
        if (connector != null) connector.close();
        workers.shutdownNow();
        super.handleOnDestroy();
    }

    /** Returns an active verified platform broker proxy, or {@code null} when unavailable. */
    protected final IAlphaPlatformBroker connectBroker() {
        CoreServiceConnector<IAlphaPlatformBroker> current = connector;
        return current == null ? null : current.connect();
    }

    /** Runs a background task on this proxy's worker pool, rejecting {@code call} if shut down. */
    protected final void runOnWorker(PluginCall call, Runnable work) {
        try {
            workers.execute(work);
        } catch (RejectedExecutionException closed) {
            call.reject("AlphaCoreUnavailable", "AlphaCoreUnavailable");
        }
    }

    /** Forwards a Capacitor plugin call to {@code AlphaCore} via {@link IAlphaPlatformBroker#corePluginCall}. */
    protected final void forwardToCore(PluginCall call, String method) {
        String argsJson = call.getData() == null ? "{}" : call.getData().toString();
        runOnWorker(call, () -> {
            IAlphaPlatformBroker broker = connectBroker();
            if (broker == null) {
                call.reject("AlphaCoreUnavailable", "AlphaCoreUnavailable");
                return;
            }
            try {
                String raw = broker.corePluginCall(corePluginName(), method, argsJson);
                resolveCoreReply(call, raw);
            } catch (RemoteException | SecurityException refused) {
                String code = refused instanceof SecurityException ? "Rejected" : "AlphaCoreUnavailable";
                call.reject(code, code);
            }
        });
    }

    /** Parses a JSON reply from {@code corePluginCall}, supporting enveloped and flat result objects. */
    protected static void resolveCoreReply(PluginCall call, String raw) {
        if (raw == null || raw.isBlank()) {
            call.reject("Rejected", "Rejected");
            return;
        }
        try {
            JSObject parsed = new JSObject(raw);
            if (parsed.has("error") && !parsed.optBoolean("ok", true)) {
                String code = parsed.optString("error", "Rejected");
                String message = parsed.optString("message", code);
                call.reject(message, code);
                return;
            }
            if (parsed.optBoolean("ok", false) && parsed.has("result") && parsed.length() <= 2) {
                Object inner = parsed.opt("result");
                if (inner instanceof JSONObject object) {
                    call.resolve(JSObject.fromJSONObject(object));
                    return;
                }
                if (inner == null || inner == JSONObject.NULL) {
                    call.resolve();
                    return;
                }
            }
            call.resolve(parsed);
        } catch (JSONException malformed) {
            call.reject("MalformedCoreReply", "MalformedCoreReply");
        }
    }
}
