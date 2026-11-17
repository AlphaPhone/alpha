package ai.alphacompute.alphaphone;

import ai.eliza.plugins.system.SenseListenerClient;
import ai.eliza.plugins.system.reset.DataReset;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.util.ArrayList;
import java.util.List;

/**
 * Alpha's recovery screen for a confirmed reset that could not finish (issue #409). The manifest
 * keeps it unexported, {@code excludeFromRecents}, {@code singleTask} with its own task affinity,
 * in its own {@link #PROCESS_SUFFIX} process, which installs none of Alpha's content providers
 * (no WorkManager or startup initializers) and starts no agent, renderer, listener or notification
 * code: AlphaApplication returns early there. The shared coordinator ({@link AlphaDataReset#RESET})
 * starts it after an unfinished attempt.
 *
 * <p>It never reports the reset as complete: on success Android stops every process of the package
 * and the next launch is a first run. Destinations are fixed and package-specific: the same-signer
 * listener's own validated settings activity, a dialer outside Alpha (hidden when there is none) and
 * Android Settings. The wording is {@link AlphaDataResetCopy}.
 *
 * <p>{@code ai.alphacompute.alphaphone.ResetRecoveryActivity} and {@code :reset_recovery} are
 * installed names: an interrupted reset from an earlier build resumes here.
 */
public final class ResetRecoveryActivity extends Activity {
    static final String PROCESS_SUFFIX = ":reset_recovery";

    private final Handler main = new Handler(Looper.getMainLooper());
    private AlphaDataResetCopy text;
    private TextView body, status;
    private Button retry, listenerSettings;
    private String dialer;
    private DataReset.Outcome retried;
    private boolean destroyed;

    /** Alpha's single reset coordinator. */
    private static DataReset reset() {
        return AlphaDataReset.RESET;
    }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        text = AlphaDataResetCopy.ALPHA;
        dialer = dialer();
        int pad = (int) (20 * getResources().getDisplayMetrics().density);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(pad, pad, pad, pad);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(pad, pad + insets.getSystemWindowInsetTop(), pad, pad + insets.getSystemWindowInsetBottom());
            return insets;
        });
        TextView title = new TextView(this);
        title.setText(text.recoveryTitle);
        title.setTextSize(24);
        title.setPadding(0, 0, 0, pad / 2);
        if (android.os.Build.VERSION.SDK_INT >= 28) title.setAccessibilityHeading(true);
        root.addView(title);
        body = new TextView(this);
        body.setTextSize(16);
        root.addView(body);
        status = new TextView(this);
        status.setTextSize(16);
        status.setPadding(0, pad / 2, 0, pad / 2);
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        root.addView(status);
        retry = button(root, text.retryLabel, v -> retry(text));
        listenerSettings = button(root, text.listenerSettingsLabel, v -> open(new SenseListenerClient(this).settingsIntent(), text));
        if (dialer != null) button(root, text.phoneLabel, v -> open(new Intent(Intent.ACTION_DIAL).setPackage(dialer), text));
        button(root, text.androidSettingsLabel, v -> open(new Intent(android.provider.Settings.ACTION_SETTINGS), text));
        ScrollView scroll = new ScrollView(this);
        scroll.addView(root);
        setContentView(scroll);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Already finished (or never requested): this surface has nothing to recover.
        if (!reset().pending(this)) {
            open(getPackageManager().getLaunchIntentForPackage(getPackageName()), null);
            finish();
            return;
        }
        // The listener may have been repaired, or a retry may have changed the cause, while away.
        DataReset.Outcome recorded = reset().lastFailure(this);
        explain(retried != null ? retried : recorded, new SenseListenerClient(this).available());
    }

    /** Body and listener destination from the latest known cause and the listener's current state. */
    private void explain(DataReset.Outcome cause, boolean controllable) {
        body.setText(text.recoveryBody(cause, controllable, dialer != null));
        listenerSettings.setVisibility(controllable ? View.VISIBLE : View.GONE);
    }

    /**
     * The ACTION_DIAL package recovery opens: one outside Alpha, preferring the system dialer, or
     * null. Alpha's own dial pad would start its main process and land back here.
     */
    private String dialer() {
        try {
            String system = null;
            if (android.os.Build.VERSION.SDK_INT >= 29) {
                android.telecom.TelecomManager telecom = getSystemService(android.telecom.TelecomManager.class);
                if (telecom != null) system = telecom.getSystemDialerPackage();
            }
            List<String> packages = new ArrayList<>();
            for (ResolveInfo info : getPackageManager().queryIntentActivities(new Intent(Intent.ACTION_DIAL), android.content.pm.PackageManager.MATCH_DEFAULT_ONLY)) {
                if (info.activityInfo != null && info.activityInfo.exported) packages.add(info.activityInfo.packageName);
            }
            int choice = DataReset.recoveryDialer(getPackageName(), system, packages);
            return choice < 0 ? null : packages.get(choice);
        } catch (RuntimeException unavailable) {
            return null;
        }
    }

    private Button button(LinearLayout root, String label, View.OnClickListener action) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setOnClickListener(action);
        root.addView(button);
        return button;
    }

    private void open(Intent intent, AlphaDataResetCopy text) {
        if (intent == null) {
            if (text != null) status.setText(text.screenUnavailable);
            return;
        }
        try {
            startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } catch (RuntimeException unavailable) {
            if (text != null) status.setText(text.screenUnavailable);
        }
    }

    private void retry(AlphaDataResetCopy text) {
        retry.setEnabled(false);
        status.setText(text.retrying);
        final Context context = getApplicationContext();
        final DataReset reset = reset();
        Thread attempt = new Thread(() -> {
            // Asks Cloud first unless it already answered, within a bounded budget, so a retry
            // never hangs and never skips a reachable revocation.
            DataReset.Outcome outcome = reset.attemptWithRevocation(context, System.currentTimeMillis(), DataReset.INTERACTIVE_DEADLINE_MS);
            boolean controllable = new SenseListenerClient(context).available();
            boolean pending = reset.pending(context);
            DataReset.Outcome recorded = reset.lastFailure(context);
            main.post(() -> {
                if (destroyed) return;
                if (!pending) {
                    // Nothing left to recover: the reset finished or was never requested.
                    open(getPackageManager().getLaunchIntentForPackage(getPackageName()), null);
                    finish();
                    return;
                }
                if (outcome == DataReset.Outcome.LISTENER_UNACKNOWLEDGED || outcome == DataReset.Outcome.ANDROID_REFUSED) retried = outcome;
                explain(retried != null ? retried : recorded, controllable);
                status.setText(text.retryResult(outcome, controllable));
                if (outcome != DataReset.Outcome.DISPATCHED) retry.setEnabled(true);
            });
        }, "alpha-reset-recovery");
        attempt.setDaemon(true);
        attempt.start();
    }

    @Override
    protected void onDestroy() {
        destroyed = true;
        super.onDestroy();
    }
}
