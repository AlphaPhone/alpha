// spec/app/account/signIn.md, "Story: Sign in with Google"
package ai.alphacompute.alphaphone;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import java.lang.ref.WeakReference;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Translucent, no-history trampoline activity hosted inside AlphaCore when an interactive
 * sign-in operation (such as Credential Manager picker mode or browser OAuth handoff)
 * requires an {@link AppCompatActivity} context.
 */
public final class AlphaCoreSignInActivity extends AppCompatActivity {
    /** Optional sibling package name to return to foreground after sign-in settles. */
    public static final String EXTRA_CALLER_PACKAGE = "ai.alphacompute.extra.CALLER_PACKAGE";
    private static final AtomicReference<WeakReference<AlphaCoreSignInActivity>> ACTIVE =
        new AtomicReference<>(new WeakReference<>(null));

    /** Returns the currently live trampoline activity, or null when headless. */
    static AlphaCoreSignInActivity current() {
        AlphaCoreSignInActivity live = ACTIVE.get().get();
        if (live == null || live.isFinishing() || live.isDestroyed()) return null;
        return live;
    }

    /** Finishes any currently open trampoline activity cleanly on the UI thread. */
    static void finishActive() {
        AlphaCoreSignInActivity live = current();
        if (live != null) {
            live.runOnUiThread(() -> {
                if (!live.isFinishing() && !live.isDestroyed()) {
                    live.finish();
                }
            });
        }
    }

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ACTIVE.set(new WeakReference<>(this));
        AlphaCoreSignInHost.shared(this).onHostActivityResume();
    }

    @Override protected void onResume() {
        super.onResume();
        ACTIVE.set(new WeakReference<>(this));
        AlphaCoreSignInHost.shared(this).onHostActivityResume();
    }

    @Override protected void onDestroy() {
        AlphaCoreSignInActivity current = ACTIVE.get().get();
        if (current == this) {
            ACTIVE.set(new WeakReference<>(null));
        }
        super.onDestroy();
    }
}
