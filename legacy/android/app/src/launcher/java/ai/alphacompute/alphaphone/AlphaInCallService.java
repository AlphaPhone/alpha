/**
 * Alpha's InCallService for the dialer role on the Alpha AOSP image (#420), forked from the shared
 * TelecomCallService (plugin-native-phone at elizaOS pin 1803ea88) so the call notices are Alpha's.
 * It owns Telecom call lifecycles and opens {@link AlphaCallActivity} independently of WebView or
 * agent startup. Per-call callbacks and notifications are removed with their call. Android owns
 * ringing; UI controls operate on the current Telecom Call, never on a reconstructed phone number.
 * Declared disabled in the launcher manifest behind BIND_INCALL_SERVICE; {@link AlphaTelephonyRoles}
 * enables it only on the verified image, so Telecom can bind it only once the owner has chosen Alpha
 * as the phone app there. Telecom keeps emergency calls working through the system dialer if this
 * service fails.
 *
 * While a call is off the hook on the earpiece the service holds the proximity lock, so the display
 * and its touch input are off at the owner's ear on every screen, the call screen and Alpha alike
 * (Telecom does not do this for the call UI). The lock goes with the call, the route or the service.
 *
 * Installed identity, unchanged from the shared service Alpha configured before: the ringing channel
 * {@value #CHANNEL_ID}, the quiet channel {@value #ONGOING_CHANNEL_ID}, notices tagged by call ID with
 * ID 1, and immutable request-code-0 PendingIntents to the call screen with data
 * {@code alphaphone-call://<command>/<call ID>} and the extras {@code callId} and {@code command}.
 */
package ai.alphacompute.alphaphone;

import android.content.Intent;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Person;
import android.os.Build;
import android.os.PowerManager;
import android.telecom.CallAudioState;
import java.util.ArrayList;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Set;
import android.net.Uri;
import android.telecom.Call;
import android.telecom.InCallService;
import android.telecom.PhoneAccount;
import android.util.Log;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.UUID;

public final class AlphaInCallService extends InCallService {

    private static final String TAG = "AlphaInCallService";
    /** The ringing channel; Android keeps the owner's channel settings under this ID. */
    static final String CHANNEL_ID = "alpha-phone-calls";
    /** Calls that are not ringing: dialing, connected and held calls, without sound or heads-up. */
    static final String ONGOING_CHANNEL_ID = "alpha-phone-calls-ongoing";
    static final String CHANNEL_NAME = "Phone calls", ONGOING_CHANNEL_NAME = "Calls in progress";
    static final String CHANNEL_DESCRIPTION = "Incoming calls. Your ringtone plays from the phone, not from this notice.",
            ONGOING_CHANNEL_DESCRIPTION = "Calls you are dialing, on, or have on hold. Shown without sound.";
    /** Distinguishes notice actions per call; the call screen reads only the extras. */
    static final String CALL_SCHEME = "alphaphone-call";
    /** Status-bar icon of call notices: Alpha's monochrome handset, tinted by Android. */
    static final int NOTIFICATION_ICON = R.drawable.ic_call;
    static final String ANSWER = "Answer", DECLINE = "Decline", END_CALL = "End call";
    /** The proximity lock's tag in power diagnostics. */
    static final String PROXIMITY_TAG = "alphaphone:call-proximity";

    /** Process-wide registry of active calls keyed by stable id. */
    private static final Map<String, Call> ACTIVE_CALLS =
            Collections.synchronizedMap(new LinkedHashMap<>());

    /** Reverse mapping so onCallRemoved can find the id without iterating. */
    private static final Map<Call, String> CALL_IDS =
            Collections.synchronizedMap(new LinkedHashMap<>());

    private static final Set<Runnable> LISTENERS = new LinkedHashSet<>();
    private final Map<Call, Call.Callback> callbacks = new HashMap<>();
    /** Contact names by call ID and number. An empty name is a lookup that found none or is running. Main thread only. */
    private final Map<String, String> names = new HashMap<>();
    /** What each call's notice last said, by call ID (AlphaCallPresentation.noticeContent). Main thread only. */
    private final Map<String, String> posted = new HashMap<>();
    /** Outgoing calls and incoming fallback screens can each launch once. Main thread only. */
    private final Set<String> launched = new HashSet<>();
    private java.util.concurrent.ExecutorService lookups;
    /** The last audio state Telecom reported to this service. Main thread only. */
    private CallAudioState audio;
    /** Held while the display must turn off at the ear; created on first need. Main thread only. */
    private PowerManager.WakeLock proximity;
    private static AlphaInCallService activeService;

    @Override public void onCreate() {
        super.onCreate();
        activeService = this;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH);
        // Telecom provides the ringtone; duplicate channel audio would ring twice.
        channel.setSound(null, null);
        channel.setDescription(CHANNEL_DESCRIPTION);
        getSystemService(NotificationManager.class).createNotificationChannel(channel);
        // Dialing and connected calls are already on the call screen: their ongoing notice stays in
        // the shade and status bar without a heads-up banner over the screen the owner is using.
        NotificationChannel ongoing = new NotificationChannel(ONGOING_CHANNEL_ID, ONGOING_CHANNEL_NAME, NotificationManager.IMPORTANCE_LOW);
        ongoing.setSound(null, null);
        ongoing.enableVibration(false);
        ongoing.setDescription(ONGOING_CHANNEL_DESCRIPTION);
        getSystemService(NotificationManager.class).createNotificationChannel(ongoing);
    }

    public static List<String> callIds() { return new ArrayList<>(ACTIVE_CALLS.keySet()); }
    public static Call call(String id) { return ACTIVE_CALLS.get(id); }
    public static void observe(Runnable listener) { LISTENERS.add(listener); }
    public static void unobserve(Runnable listener) { LISTENERS.remove(listener); }
    private static void publish() {
        for (Runnable listener : new ArrayList<>(LISTENERS)) listener.run();
    }
    public static CallAudioState audioState() { return activeService == null ? null : activeService.getCallAudioState(); }
    public static void mute(boolean muted) { if (activeService != null) activeService.setMuted(muted); }
    public static void route(int route) { if (activeService != null) activeService.setAudioRoute(route); }

    @Override public void onCallAudioStateChanged(CallAudioState state) {
        audio = state;
        holdProximity();
        publish();
    }

    /** Takes or drops the proximity lock for the calls and audio route as they are now. */
    private void holdProximity() {
        CallAudioState state = audio != null ? audio : getCallAudioState();
        int[] states;
        synchronized (ACTIVE_CALLS) {
            states = new int[ACTIVE_CALLS.size()];
            int next = 0;
            for (Call call : ACTIVE_CALLS.values()) states[next++] = call.getState();
        }
        boolean known = state != null;
        int route = known ? state.getRoute() : 0;
        if (AlphaCallPresentation.proximityLock(states, known, route)) {
            if (proximity == null) {
                PowerManager power = getSystemService(PowerManager.class);
                // A phone without the sensor keeps its screen on, as before.
                if (power == null || !power.isWakeLockLevelSupported(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK)) return;
                proximity = power.newWakeLock(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK, PROXIMITY_TAG);
                proximity.setReferenceCounted(false);
            }
            if (!proximity.isHeld()) proximity.acquire();
        } else if (proximity != null && proximity.isHeld()) {
            proximity.release(AlphaCallPresentation.screenOnAtRelease(states, known, route)
                ? 0 : PowerManager.RELEASE_FLAG_WAIT_FOR_NO_PROXIMITY);
        }
    }

    @Override
    public void onCallAdded(Call call) {
        super.onCallAdded(call);
        String callId = UUID.randomUUID().toString();
        ACTIVE_CALLS.put(callId, call);
        CALL_IDS.put(call, callId);
        Call.Callback callback = new CallCallback(callId);
        callbacks.put(call, callback);
        call.registerCallback(callback);
        Log.i(TAG, "Call added id=" + callId + " state=" + call.getState());
        openCallSurface("added", callId, call);
    }

    @Override
    public void onCallRemoved(Call call) {
        super.onCallRemoved(call);
        Call.Callback callback = callbacks.remove(call);
        if (callback != null) call.unregisterCallback(callback);
        String callId = CALL_IDS.remove(call);
        if (callId != null) {
            ACTIVE_CALLS.remove(callId);
            names.keySet().removeIf(key -> key.startsWith(callId + '\n'));
        }
        Log.i(TAG, "Call removed id=" + callId);
        openCallSurface("removed", callId, call);
    }

    private void openCallSurface(String event, String callId, Call call) {
        holdProximity();
        NotificationManager notifications = getSystemService(NotificationManager.class);
        if ("removed".equals(event) || call.getState() == Call.STATE_DISCONNECTED) {
            if (callId != null) {
                posted.remove(callId);
                launched.remove(callId);
                notifications.cancel(callId, 1);
            }
            publish();
            return;
        }
        int state = call.getState();
        Call.Details details = call.getDetails();
        String label = callerLabel(callId, details);
        boolean ringing = AlphaCallPresentation.ringing(state);
        // Telecom reports a burst of state and detail changes as a call starts, and most leave the
        // notice saying what it already says. Posting it again for each one passes Android's per-app
        // notice rate, and Android then drops updates, which can leave a stale notice (a ringing
        // notice on an answered call). The notice is posted only when what it says or offers changes.
        String content = AlphaCallPresentation.noticeContent(label, state);
        if (!content.equals(posted.put(callId, content))) {
            // Only a ringing call alerts. Outgoing and connected calls use the quiet channel.
            Notification.Builder builder = new Notification.Builder(this, ringing ? CHANNEL_ID : ONGOING_CHANNEL_ID)
                .setSmallIcon(NOTIFICATION_ICON)
                .setContentTitle(label)
                .setContentText(AlphaCallPresentation.stateLabel(state))
                .setCategory(Notification.CATEGORY_CALL)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setVisibility(Notification.VISIBILITY_PRIVATE)
                .setContentIntent(callIntent(callId, "show"));
            if (ringing) builder.setFullScreenIntent(callIntent(callId, "show"), true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && ringing) {
                Person person = new Person.Builder().setName(label).setImportant(true).build();
                builder.setStyle(Notification.CallStyle.forIncomingCall(person,
                    callIntent(callId, "reject"), callIntent(callId, "answer")));
            } else {
                // A Telecom-bound service is not an FGS. Ongoing CallStyle without
                // a full-screen intent is rejected by Android; use an ordinary
                // ongoing call notification rather than creating another service.
                if (ringing) builder.addAction(new Notification.Action.Builder(null, ANSWER, callIntent(callId, "answer")).build());
                builder.addAction(new Notification.Action.Builder(null, ringing ? DECLINE : END_CALL, callIntent(callId, ringing ? "reject" : "disconnect")).build());
            }
            notifications.notify(callId, 1, builder.build());
        }
        publish();
        // Android presents the ringing notification as a full-screen intent or a heads-up.
        // A second activity launch here would put the heads-up over Alpha's own call screen.
        boolean waitingForIncomingAlert = ringing || (details != null
            && details.getCallDirection() == Call.Details.DIRECTION_INCOMING
            && state != Call.STATE_ACTIVE && state != Call.STATE_HOLDING);
        boolean launchNow = "added".equals(event) && !waitingForIncomingAlert;
        // Keep the incoming screen available if Android cannot present a banner or full-screen alert.
        if (ringing) {
            NotificationChannel channel = notifications.getNotificationChannel(CHANNEL_ID);
            launchNow = !notifications.areNotificationsEnabled() || channel == null
                || channel.getImportance() < NotificationManager.IMPORTANCE_HIGH;
        }
        if (launchNow && launched.add(callId)) showCall(callId);
    }

    /**
     * The caller's name for the notification: the name Telecom reports, else the owner's contact
     * for the number when this app may read contacts, else the number. The contact is read off the
     * main thread once per call; the notification shows the number until the name arrives.
     */
    private String callerLabel(String callId, Call.Details details) {
        Uri handle = details == null ? null : details.getHandle();
        String number = handle == null ? null : AlphaCallActivity.clean(handle.getSchemeSpecificPart());
        String name = details == null ? null : AlphaCallActivity.clean(details.getCallerDisplayName());
        if (name == null && details != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            name = AlphaCallActivity.clean(details.getContactDisplayName());
        }
        // A network that sends the number as the caller's name has named nobody.
        if (name != null && name.equals(number)) name = null;
        if (name == null && number != null && callId != null && PhoneAccount.SCHEME_TEL.equals(handle.getScheme())
                && checkSelfPermission(android.Manifest.permission.READ_CONTACTS) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            String key = callId + '\n' + number;
            if (names.containsKey(key)) name = AlphaCallActivity.clean(names.get(key));
            else lookUp(key, callId, number);
        }
        return name != null ? name : number != null ? number : AlphaCallPresentation.UNKNOWN_CALLER;
    }

    private void lookUp(String key, String callId, String number) {
        names.put(key, "");
        if (lookups == null) lookups = java.util.concurrent.Executors.newSingleThreadExecutor();
        android.content.ContentResolver resolver = getApplicationContext().getContentResolver();
        android.os.Handler main = new android.os.Handler(android.os.Looper.getMainLooper());
        lookups.execute(() -> {
            String found = AlphaCallActivity.contactName(resolver, number);
            if (found == null) return;
            main.post(() -> {
                // A removed call or a destroyed service has dropped the key; it posts nothing.
                Call call = ACTIVE_CALLS.get(callId);
                if (activeService != this || call == null || !names.containsKey(key)
                        || checkSelfPermission(android.Manifest.permission.READ_CONTACTS) != android.content.pm.PackageManager.PERMISSION_GRANTED) return;
                names.put(key, found);
                openCallSurface("named", callId, call);
            });
        });
    }

    private PendingIntent callIntent(String id, String command) {
        Intent intent = new Intent(this, AlphaCallActivity.class)
            .setData(new Uri.Builder().scheme(CALL_SCHEME).authority(command).appendPath(id).build())
            .putExtra("callId", id).putExtra("command", command)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void showCall(String id) {
        startActivity(new Intent(this, AlphaCallActivity.class).putExtra("callId", id)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP));
    }

    @Override public void onBringToForeground(boolean showDialpad) {
        List<String> ids = callIds();
        if (!ids.isEmpty()) showCall(ids.get(0));
    }

    @Override public void onDestroy() {
        NotificationManager notifications = getSystemService(NotificationManager.class);
        for (Map.Entry<Call, Call.Callback> entry : callbacks.entrySet()) entry.getKey().unregisterCallback(entry.getValue());
        for (String id : callIds()) notifications.cancel(id, 1);
        callbacks.clear();
        names.clear();
        posted.clear();
        launched.clear();
        if (lookups != null) lookups.shutdownNow();
        ACTIVE_CALLS.clear();
        CALL_IDS.clear();
        holdProximity();
        audio = null;
        if (activeService == this) activeService = null;
        publish();
        super.onDestroy();
    }

    // These helpers return false when Telecom has already removed the call.

    public static boolean answerCall(String callId, int videoState) {
        Call call = ACTIVE_CALLS.get(callId);
        if (call == null) {
            Log.w(TAG, "answerCall: unknown id " + callId);
            return false;
        }
        call.answer(videoState);
        return true;
    }

    public static boolean rejectCall(String callId, boolean replyWithMessage, String message) {
        Call call = ACTIVE_CALLS.get(callId);
        if (call == null) {
            Log.w(TAG, "rejectCall: unknown id " + callId);
            return false;
        }
        call.reject(replyWithMessage, message);
        return true;
    }

    public static boolean disconnectCall(String callId) {
        Call call = ACTIVE_CALLS.get(callId);
        if (call == null) {
            Log.w(TAG, "disconnectCall: unknown id " + callId);
            return false;
        }
        call.disconnect();
        return true;
    }

    public static boolean holdCall(String callId, boolean hold) {
        Call call = ACTIVE_CALLS.get(callId);
        if (call == null) {
            Log.w(TAG, "holdCall: unknown id " + callId);
            return false;
        }
        if (hold) {
            call.hold();
        } else {
            call.unhold();
        }
        return true;
    }

    public static boolean playDtmfTone(String callId, char digit) {
        Call call = ACTIVE_CALLS.get(callId);
        if (call == null) {
            Log.w(TAG, "playDtmfTone: unknown id " + callId);
            return false;
        }
        call.playDtmfTone(digit);
        return true;
    }

    public static void stopDtmfTone(String callId) {
        Call call = ACTIVE_CALLS.get(callId);
        if (call != null) call.stopDtmfTone();
    }

    private final class CallCallback extends Call.Callback {
        private final String callId;

        CallCallback(String callId) {
            this.callId = callId;
        }

        @Override
        public void onStateChanged(Call call, int state) {
            super.onStateChanged(call, state);
            // Android can already have posted this callback when unregister runs.
            if (callbacks.get(call) != this || ACTIVE_CALLS.get(callId) != call) return;
            openCallSurface("state-changed", callId, call);
        }

        @Override
        public void onDetailsChanged(Call call, Call.Details details) {
            super.onDetailsChanged(call, details);
            if (callbacks.get(call) != this || ACTIVE_CALLS.get(callId) != call) return;
            openCallSurface("details-changed", callId, call);
        }
    }
}
