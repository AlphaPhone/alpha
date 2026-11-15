package ai.alphacompute.alphaphone;

import ai.eliza.plugins.media.RecordingWindow;
import android.content.Context;
import com.getcapacitor.PluginCall;
import java.util.function.BooleanSupplier;

/** Selects the app-owned recording window requested by the Notes transcription bridge. */
final class SavedNoteRecordingWindow {
    private SavedNoteRecordingWindow() {}

    static RecordingWindow open(Context context, PluginCall call, BooleanSupplier cancelled) throws Exception {
        if (!call.getData().has("savedNoteId")) return null;
        return RecordingWindow.open(
            AlphaNoteAudioPlugin.recordings(context),
            context.getCacheDir(),
            "noteId",
            call.getString("recordingId"),
            call.getString("savedNoteId"),
            milliseconds(call, "offsetMs"),
            milliseconds(call, "savedDurationMs"),
            cancelled
        );
    }

    private static Long milliseconds(PluginCall call, String key) {
        // Capacitor's getLong only accepts Long. Android JSON may use Integer for milliseconds.
        Object value = call.getData().opt(key);
        return value instanceof Integer || value instanceof Long ? ((Number) value).longValue() : null;
    }
}
