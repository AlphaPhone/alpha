package ai.alphacompute.runtime;

import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Core-proxied {@code AlphaVoiceCloud} Capacitor plugin delegating local speech synthesis and transcription to AlphaCore. */
@CapacitorPlugin(name = "AlphaVoiceCloud")
public final class RemoteVoiceCloudPlugin extends CorePluginProxy {
    @Override protected String corePluginName() { return "AlphaVoiceCloud"; }

    @PluginMethod public void dictationForeground(PluginCall call) { forwardToCore(call, "dictationForeground"); }
    @PluginMethod public void synthesizeLocalBrowserReading(PluginCall call) { forwardToCore(call, "synthesizeLocalBrowserReading"); }
    @PluginMethod public void transcribeLocalRecording(PluginCall call) { forwardToCore(call, "transcribeLocalRecording"); }
    @PluginMethod public void transcribeSavedNote(PluginCall call) { forwardToCore(call, "transcribeSavedNote"); }
    @PluginMethod public void transcribeVoicemail(PluginCall call) { forwardToCore(call, "transcribeVoicemail"); }
    @PluginMethod public void cancelVoicemailTranscription(PluginCall call) { forwardToCore(call, "cancelVoicemailTranscription"); }
}
