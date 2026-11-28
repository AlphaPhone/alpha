package ai.alphacompute.runtime;

import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Core-proxied {@code AlphaVoiceCloud} plugin forwarding all local speech bridge and transcription methods to AlphaCore. */
@CapacitorPlugin(name = "AlphaVoiceCloud")
public final class RemoteVoiceCloudPlugin extends CorePluginProxy {
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private volatile boolean destroyed;

    @Override protected String corePluginName() { return "AlphaVoiceCloud"; }

    @Override protected void handleOnDestroy() {
        destroyed = true;
        super.handleOnDestroy();
    }

    @PluginMethod public void dictationForeground(PluginCall call) { forwardSpeech(call, "dictationForeground"); }
    @PluginMethod public void synthesizeLocalBrowserReading(PluginCall call) { forwardSpeech(call, "synthesizeLocalBrowserReading"); }
    @PluginMethod public void transcribeLocalRecording(PluginCall call) { forwardSpeech(call, "transcribeLocalRecording"); }
    @PluginMethod public void transcribeSavedNote(PluginCall call) { forwardSpeech(call, "transcribeSavedNote"); }
    @PluginMethod public void transcribeVoicemail(PluginCall call) { forwardSpeech(call, "transcribeVoicemail"); }
    @PluginMethod public void cancelVoicemailTranscription(PluginCall call) { forwardSpeech(call, "cancelVoicemailTranscription"); }

    @PluginMethod public void cancel(PluginCall call) { forwardSpeech(call, "cancel"); }
    @PluginMethod public void startRecording(PluginCall call) { forwardSpeech(call, "startRecording"); }
    @PluginMethod public void microphonePermission(PluginCall call) { forwardSpeech(call, "microphonePermission"); }
    @PluginMethod public void stopRecording(PluginCall call) { forwardSpeech(call, "stopRecording"); }
    @PluginMethod public void cancelRecording(PluginCall call) { forwardSpeech(call, "cancelRecording"); }
    @PluginMethod public void releaseLocalSpeech(PluginCall call) { forwardSpeech(call, "releaseLocalSpeech"); }
    @PluginMethod public void holdSpeechEngine(PluginCall call) { forwardSpeech(call, "holdSpeechEngine"); }
    @PluginMethod public void releaseSpeechEngineHold(PluginCall call) { forwardSpeech(call, "releaseSpeechEngineHold"); }
    @PluginMethod public void warmSpeechOutput(PluginCall call) { forwardSpeech(call, "warmSpeechOutput"); }
    @PluginMethod public void localSpeechStatus(PluginCall call) { forwardSpeech(call, "localSpeechStatus"); }
    @PluginMethod public void synthesizeLocal(PluginCall call) { forwardSpeech(call, "synthesizeLocal"); }
    @PluginMethod public void setSpeechOutputMuted(PluginCall call) { forwardSpeech(call, "setSpeechOutputMuted"); }
    @PluginMethod public void play(PluginCall call) { forwardSpeech(call, "play"); }
    @PluginMethod public void stopPlayback(PluginCall call) { forwardSpeech(call, "stopPlayback"); }
    @PluginMethod public void nativeVoiceTiming(PluginCall call) { forwardSpeech(call, "nativeVoiceTiming"); }
    @PluginMethod public void markVoiceTurn(PluginCall call) { forwardSpeech(call, "markVoiceTurn"); }
    @PluginMethod public void clearNativeVoiceTiming(PluginCall call) { forwardSpeech(call, "clearNativeVoiceTiming"); }
    @PluginMethod public void liveCaptureStatus(PluginCall call) { forwardSpeech(call, "liveCaptureStatus"); }
    @PluginMethod public void startLiveCapture(PluginCall call) { forwardSpeech(call, "startLiveCapture"); }
    @PluginMethod public void stopLiveCapture(PluginCall call) { forwardSpeech(call, "stopLiveCapture"); }

    private void forwardSpeech(PluginCall call, String method) {
        String argsJson = call.getData() == null ? "{}" : call.getData().toString();
        runOnWorker(call, () -> {
            var broker = connectBroker();
            if (broker == null) {
                call.reject("AlphaCoreUnavailable", "AlphaCoreUnavailable");
                return;
            }
            try {
                String raw = broker.corePluginCall(corePluginName(), method, argsJson);
                relayInlineSpeechEvents(raw);
                resolveCoreReply(call, raw);
            } catch (android.os.RemoteException | SecurityException refused) {
                String code = refused instanceof SecurityException ? "Rejected" : "AlphaCoreUnavailable";
                call.reject(code, code);
            }
        });
    }

    private void relayInlineSpeechEvents(String raw) {
        if (destroyed || raw == null || raw.isBlank()) return;
        try {
            JSONObject parsed = new JSONObject(raw);
            JSONArray events = parsed.optJSONArray("events");
            if (events != null) {
                for (int index = 0; index < events.length(); index++) {
                    JSONObject item = events.optJSONObject(index);
                    if (item == null) continue;
                    String name = item.optString("name", "");
                    JSONObject payload = item.optJSONObject("payload");
                    if (!name.isEmpty()) {
                        postSpeechEvent(name, payload == null ? new JSObject() : JSObject.fromJSONObject(payload));
                    }
                }
            }
            if (parsed.has("playbackStopped") && parsed.optBoolean("playbackStopped", false)) {
                postSpeechEvent("playbackStopped", new JSObject());
            }
        } catch (JSONException ignored) {
        }
    }

    private void postSpeechEvent(String eventName, JSObject payload) {
        mainHandler.post(() -> {
            if (!destroyed) {
                notifyListeners(eventName, payload);
            }
        });
    }
}
