package ai.alphacompute.alphaphone;

import ai.eliza.plugins.system.reset.DataReset;
import ai.eliza.plugins.system.reset.ResetAuthorization;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Alpha's native reset review: its own disclosure dialog, then a fresh Android device-credential
 * confirmation, then the shared coordinator ({@link AlphaDataReset#RESET}, plugin-native-system
 * reset.DataReset). Renderer arguments carry no authority: {@code review()} takes none, and only
 * this plugin's own dialog and Android's credential result can record a reset. The single-use
 * review token is the shared ResetAuthorization; the screens and their wording
 * ({@link AlphaDataResetCopy}) are Alpha's.
 *
 * <p>Results are {@code {status, message}}: {@code cancelled} or {@code unavailable} when nothing
 * was reset, including when a same-signer listener is installed but cannot acknowledge. A
 * confirmed reset never resolves as completed: Android stops the process, and an unfinished reset
 * opens {@link ResetRecoveryActivity} instead.
 *
 * <p>{@code AlphaReset} and the activity callback name {@code authenticated} are installed names.
 */
@CapacitorPlugin(name = "AlphaReset")
public final class AlphaResetPlugin extends Plugin {
    private final ResetAuthorization authorization = new ResetAuthorization();
    private long authenticationToken;
    private PluginCall authenticationCall;
    private AlertDialog review;
    private boolean destroyed;

    /** Alpha's single reset coordinator, shared with AlphaApplication and the recovery screen. */
    private static DataReset reset() {
        return AlphaDataReset.RESET;
    }

    private static AlphaDataResetCopy copy() {
        return AlphaDataResetCopy.ALPHA;
    }

    private static void result(PluginCall call, String status, String message) {
        JSObject value = new JSObject();
        value.put("status", status);
        value.put("message", message);
        call.resolve(value);
    }

    @PluginMethod
    public void review(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            AlphaDataResetCopy text = copy();
            if (destroyed || getActivity().isFinishing()) {
                result(call, "cancelled", text.reviewClosed);
                return;
            }
            final long owner;
            try {
                owner = authorization.begin();
            } catch (IllegalStateException busy) {
                result(call, "unavailable", text.reviewBusy);
                return;
            }
            review = new AlertDialog.Builder(getActivity())
                    .setTitle(text.reviewTitle)
                    .setMessage(text.disclosure)
                    .setNegativeButton(text.cancelLabel, (dialog, which) -> {
                        authorization.retire();
                        result(call, "cancelled", text.nothingReset);
                    })
                    .setOnCancelListener(dialog -> {
                        authorization.retire();
                        result(call, "cancelled", text.nothingReset);
                    })
                    .setPositiveButton(text.continueLabel, (dialog, which) -> {
                        if (destroyed || !authorization.confirm(owner)) {
                            result(call, "cancelled", text.reviewExpired);
                            return;
                        }
                        KeyguardManager keyguard = getContext().getSystemService(KeyguardManager.class);
                        Intent unlock = keyguard == null ? null : keyguard.createConfirmDeviceCredentialIntent(text.credentialTitle, text.credentialDescription);
                        if (unlock == null) {
                            authorization.retire();
                            result(call, "unavailable", text.noScreenLock);
                            return;
                        }
                        try {
                            authenticationToken = owner;
                            authenticationCall = call;
                            startActivityForResult(call, unlock, "authenticated");
                        } catch (RuntimeException unavailable) {
                            authorization.retire();
                            result(call, "unavailable", text.authenticationUnavailable);
                        }
                    })
                    .create();
            review.show();
        });
    }

    @ActivityCallback
    private void authenticated(PluginCall call, ActivityResult response) {
        AlphaDataResetCopy text = copy();
        if (call == null || call != authenticationCall || destroyed
                || !authorization.authenticate(authenticationToken, response.getResultCode() == Activity.RESULT_OK)) {
            if (call != null) result(call, "cancelled", text.authenticationCancelled);
            return;
        }
        authenticationCall = null;
        DataReset reset = reset();
        Context context = getContext().getApplicationContext();
        final Handler main = new Handler(Looper.getMainLooper());
        DataReset.Scheduler scheduler = new DataReset.Scheduler() {
            @Override public void post(Runnable task) { main.post(task); }
            @Override public void postDelayed(Runnable task, long delayMs) { main.postDelayed(task, delayMs); }
        };
        try {
            // A same-signer listener that is off or ungranted would hold the reset closed in
            // recovery; refuse now, while nothing has been recorded.
            if (!reset.recordIfListenerReachable(context)) {
                result(call, "unavailable", text.listenerOff);
                return;
            }
        } catch (Exception failure) {
            result(call, "unavailable", text.prepareFailed);
            // The marker landed though a later step failed: the confirmed reset still revokes first.
            if (reset.pending(context)) reset.dispatchAfterBeforeDispatch(context, DataReset.INTERACTIVE_DEADLINE_MS, scheduler);
            return;
        }
        // Recorded first: whatever happens below, the next launch completes the reset.
        showProgress(text);
        reset.dispatchAfterBeforeDispatch(context, DataReset.INTERACTIVE_DEADLINE_MS, scheduler);
    }

    /** Keep the confirmed reset visible until Android dispatches it. */
    private void showProgress(AlphaDataResetCopy text) {
        try {
            if (review != null) review.dismiss();
            new AlertDialog.Builder(getActivity()).setTitle(text.progressTitle).setMessage(text.progressMessage).setCancelable(false).create().show();
        } catch (RuntimeException unavailable) {
            // The reset proceeds either way.
        }
    }

    @Override
    protected void handleOnDestroy() {
        destroyed = true;
        authenticationCall = null;
        authorization.retire();
        if (review != null) review.dismiss();
        super.handleOnDestroy();
    }
}
