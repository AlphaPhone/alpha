package ai.alphacompute.alphaphone;

import ai.eliza.plugins.system.reset.DataReset;

/**
 * Alpha's own wording for the native reset: the review dialog, the device-credential prompt, the
 * progress dialog, the result sentences {@link AlphaResetPlugin} resolves with and the
 * {@link ResetRecoveryActivity} screen. Alpha owns every sentence here, so no upstream default is
 * shown. The text describes only what the shared coordinator (plugin-native-system reset.DataReset)
 * does: a package-scoped clear of Alpha's local data, never device-wide media, other apps, remote
 * account data or a Cloud plan. It never claims that a reset finished.
 *
 * <p>The result sentences are a contract with the renderer: Settings maps each one to its own
 * notice (apps/app/src/ui/settings/data-reset.ts DATA_RESET_OUTCOMES, pinned by
 * test/native-copy-mappings.test.mjs), so a change here changes that table in the same commit.
 */
final class AlphaDataResetCopy {
    /** The one instance Alpha shows; the reset plugin and the recovery screen share it. */
    static final AlphaDataResetCopy ALPHA = new AlphaDataResetCopy();

    final String reviewTitle;
    final String disclosure;
    final String cancelLabel;
    final String continueLabel;
    final String credentialTitle;
    final String credentialDescription;
    final String progressTitle;
    final String progressMessage;
    final String reviewClosed;
    final String reviewBusy;
    final String nothingReset;
    final String reviewExpired;
    final String noScreenLock;
    final String authenticationUnavailable;
    final String authenticationCancelled;
    final String prepareFailed;
    final String listenerOff;
    final String recoveryTitle;
    final String recoveryIntro;
    final String reasonAndroid;
    final String reasonUnknown;
    final String reasonListenerPending;
    final String reasonListenerUnreachable;
    final String closedNote;
    final String listenerHint;
    final String availableNote;
    final String settingsAvailableNote;
    final String retryLabel;
    final String listenerSettingsLabel;
    final String phoneLabel;
    final String androidSettingsLabel;
    final String retrying;
    final String dispatched;
    final String deferred;
    final String androidRefused;
    final String listenerPending;
    final String listenerUnreachable;
    final String screenUnavailable;

    private AlphaDataResetCopy() {
        reviewTitle = "Reset Alpha data?";
        // Names Alpha's own data, its calendar and the Cloud revocation; keeps the no-backup,
        // no-undo and scope statements. The button and the credential prompt explain the unlock.
        disclosure = "Permanently delete Alpha's local conversations, Notes and drafts, passwords, settings, downloads in Alpha's private storage, and sign-ins. When Alpha has Calendar access, its \"On this phone\" calendar and events are deleted too. Stop its agent and pending work. There is no backup or undo.\n\n"
                + "Alpha also asks Cloud to revoke this phone's sign-in when Cloud can be reached. Device-wide photos and files, remote Gmail and Cloud data, and your Cloud plan are not deleted or cancelled. Other apps are not reset. Alpha will close; open it again to start fresh.";
        cancelLabel = "Cancel";
        continueLabel = "Continue to unlock";
        credentialTitle = "Reset Alpha data";
        credentialDescription = "Unlock to permanently erase Alpha's local data.";
        progressTitle = "Resetting Alpha";
        // Shown while the bounded Cloud revocation runs; it makes no Cloud claim without a sign-in.
        progressMessage = "Finishing up… Alpha closes in a few seconds.";
        reviewClosed = "Reset review closed. Nothing reset.";
        reviewBusy = "A reset review is already open.";
        nothingReset = "Nothing reset.";
        reviewExpired = "Reset review expired. Nothing reset.";
        noScreenLock = "Set a device screen lock in Android before resetting Alpha data.";
        authenticationUnavailable = "Device authentication is unavailable. Nothing reset.";
        authenticationCancelled = "Reset cancelled. Nothing reset.";
        prepareFailed = "Reset could not be prepared. Close and reopen Alpha before trying again.";
        listenerOff = "The listener is off or can't be reached, so nothing was reset. Turn it on in Android Settings and try again.";
        recoveryTitle = "Reset could not finish";
        recoveryIntro = "You confirmed Reset Alpha data, but the reset has not finished. Alpha's local data has not been deleted yet."
                + " (Alpha may already have asked Cloud to revoke this phone's sign-in.)\n\n";
        reasonAndroid = "Android has not accepted Alpha's request to delete its data. ";
        reasonUnknown = "Why the last attempt stopped was not recorded. ";
        reasonListenerPending = "Alpha deletes its data only after the phone's always-on listener confirms that its consent has been withdrawn, and that confirmation has not arrived. ";
        reasonListenerUnreachable = "Alpha deletes its data only after the phone's always-on listener confirms that its consent has been withdrawn. "
                + "Alpha cannot reach the listener's controls on this phone, so it cannot get that confirmation, and trying again will not finish the reset until the listener is repaired. ";
        closedNote = "Until the reset finishes, Alpha stays closed: its agent, notifications and scheduled work do not run.\n\n";
        listenerHint = "Try again, or open the listener's settings to turn it off first. ";
        availableNote = "Phone and Android Settings remain available.";
        settingsAvailableNote = "Android Settings remains available.";
        retryLabel = "Try reset again";
        listenerSettingsLabel = "Open listener settings";
        phoneLabel = "Phone";
        androidSettingsLabel = "Android Settings";
        retrying = "Trying the reset again…";
        dispatched = "Android is deleting Alpha's data. Alpha will close.";
        deferred = "Reset preparation is unavailable. Try again after the current attempt finishes or storage is available.";
        androidRefused = "Android did not accept the reset. Alpha's local data was not deleted. Try again.";
        listenerPending = "The listener still has not confirmed. Alpha's local data was not deleted. Open its settings to turn it off, then try again.";
        listenerUnreachable = "The listener could not be reached. Alpha's local data was not deleted.";
        screenUnavailable = "That screen is not available on this phone.";
    }

    /**
     * The recovery explanation; never claims deletion happened. The reason is the last failed
     * attempt's outcome ({@link DataReset#lastFailure} or a retry's result); without one the cause
     * is unknown, never inferred from the listener's current state.
     *
     * @param phoneAvailable recovery found a dialer outside Alpha to offer
     */
    String recoveryBody(DataReset.Outcome lastFailure, boolean listenerControllable, boolean phoneAvailable) {
        String reason;
        if (lastFailure == DataReset.Outcome.LISTENER_UNACKNOWLEDGED) reason = listenerControllable ? reasonListenerPending : reasonListenerUnreachable;
        else if (lastFailure == DataReset.Outcome.ANDROID_REFUSED) reason = reasonAndroid;
        else reason = reasonUnknown;
        boolean hint = lastFailure == DataReset.Outcome.LISTENER_UNACKNOWLEDGED && listenerControllable;
        return recoveryIntro + reason + closedNote + (hint ? listenerHint : "") + (phoneAvailable ? availableNote : settingsAvailableNote);
    }

    /** Status after a recovery retry that Android did not dispatch. */
    String retryResult(DataReset.Outcome outcome, boolean listenerControllable) {
        if (outcome == DataReset.Outcome.DISPATCHED) return dispatched;
        if (outcome == DataReset.Outcome.DEFERRED) return deferred;
        if (outcome != DataReset.Outcome.LISTENER_UNACKNOWLEDGED) return androidRefused;
        return listenerControllable ? listenerPending : listenerUnreachable;
    }
}
