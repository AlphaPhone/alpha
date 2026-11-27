package ai.alphacompute.alphaphone.overlay;

import ai.alphacompute.alphaphone.MainActivity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.service.voice.VoiceInteractionService;
import android.service.voice.VoiceInteractionSession;
import java.lang.ref.WeakReference;

/** {@code ROLE_ASSISTANT} entry service hosting the system-wide Ask Alpha overlay across Launcher3 and third-party apps. */
public final class AlphaVoiceInteractionService extends VoiceInteractionService {
    public static final String EXTRA_ENTRY_SOURCE = "alpha.overlay.entrySource";
    public static final String EXTRA_START_VOICE = "alpha.overlay.startVoice";
    public static final String EXTRA_INITIAL_QUERY = "alpha.overlay.initialQuery";
    private static final String ACTION_TEXT_ASK = "ai.alphacompute.alphaphone.TEXT_ASK";

    private static volatile WeakReference<AlphaVoiceInteractionService> liveService = new WeakReference<>(null);

    @Override public void onReady() {
        super.onReady();
        liveService = new WeakReference<>(this);
    }

    @Override public void onShutdown() {
        AlphaVoiceInteractionService current = liveService.get();
        if (current == this) {
            liveService = new WeakReference<>(null);
        }
        super.onShutdown();
    }

    /** Shows the active Ask Alpha {@link VoiceInteractionSession}, falling back to {@link MainActivity} if unbound. */
    public static boolean showOverlay(Context context, Bundle args) {
        AlphaVoiceInteractionService service = liveService.get();
        Bundle payload = args == null ? new Bundle() : new Bundle(args);
        if (service != null) {
            try {
                service.showSession(
                    payload,
                    VoiceInteractionSession.SHOW_WITH_ASSIST | VoiceInteractionSession.SHOW_WITH_SCREENSHOT
                );
                return true;
            } catch (SecurityException | RuntimeException ignored) {
            }
        }
        if (context == null) return false;
        Intent fallback = new Intent(context, MainActivity.class)
            .setAction(ACTION_TEXT_ASK)
            .putExtras(payload)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            context.startActivity(fallback);
            return true;
        } catch (SecurityException | ActivityNotFoundException | RuntimeException unavailable) {
            return false;
        }
    }
}
