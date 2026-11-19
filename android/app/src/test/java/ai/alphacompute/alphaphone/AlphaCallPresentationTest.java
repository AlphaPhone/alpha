/**
 * What Alpha's call screen and call notices say and offer for each Telecom state, and how
 * {@link AlphaInCallService} owns its calls' notices (ported from the shared
 * TelecomCallPresentationTest, plugin-native-phone at elizaOS pin 1803ea88). The service runs as
 * Alpha installs it: its own channels, icon and call screen.
 */
package ai.alphacompute.alphaphone;

import static org.junit.Assert.assertEquals;
import android.telecom.Call;
import android.app.Notification;
import android.app.NotificationManager;
import android.os.Looper;
import java.lang.reflect.Constructor;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.Shadows;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.LooperMode;
import org.robolectric.util.ReflectionHelpers;
import org.robolectric.util.ReflectionHelpers.ClassParameter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.Test;

@RunWith(RobolectricTestRunner.class)
@Config(manifest = Config.NONE, sdk = 35)
@LooperMode(LooperMode.Mode.PAUSED)
public class AlphaCallPresentationTest {
    private static List<String> offered(int state, boolean audioKnown, boolean speakerRoutable, boolean canHold) {
        AlphaCallPresentation.Controls controls = AlphaCallPresentation.controls(state, audioKnown, speakerRoutable, canHold);
        List<String> names = new ArrayList<>();
        if (controls.answer) names.add("answer");
        if (controls.decline) names.add("decline");
        if (controls.mute) names.add("mute");
        if (controls.keypad) names.add("keypad");
        if (controls.speaker) names.add("speaker");
        if (controls.hold) names.add("hold");
        if (controls.end) names.add("end");
        return names;
    }

    @Test public void initialsAreTheFirstAndLastWordsLetters() {
        assertEquals("AL", AlphaCallPresentation.initials("Ada Lovelace", true));
        assertEquals("AL", AlphaCallPresentation.initials("  ada   king  lovelace ", true));
        assertEquals("A", AlphaCallPresentation.initials("Ada", false));
        assertEquals("DL", AlphaCallPresentation.initials("Dr. Ada M. Lovelace", true));
        assertEquals("ÉM", AlphaCallPresentation.initials("émilie (work) martin", true));
        assertEquals("林", AlphaCallPresentation.initials("林小明", true));
        assertEquals("I", AlphaCallPresentation.initials("411 Info", true));
    }

    @Test public void aNumberWithNoNameIsAHashAndAWithheldCallerIsBlank() {
        assertEquals("#", AlphaCallPresentation.initials(null, true));
        assertEquals("#", AlphaCallPresentation.initials("+1 555 0123", true));
        assertEquals("", AlphaCallPresentation.initials(null, false));
        assertEquals("", AlphaCallPresentation.initials("   ", false));
    }

    @Test public void elapsedTimeGainsAnHourFieldOnlyFromOneHour() {
        assertEquals("0:00", AlphaCallPresentation.elapsed(0));
        assertEquals("0:00", AlphaCallPresentation.elapsed(999));
        assertEquals("0:01", AlphaCallPresentation.elapsed(1000));
        assertEquals("1:05", AlphaCallPresentation.elapsed(65_000));
        assertEquals("59:59", AlphaCallPresentation.elapsed(3_599_999));
        assertEquals("1:00:00", AlphaCallPresentation.elapsed(3_600_000));
        assertEquals("12:03:09", AlphaCallPresentation.elapsed(43_389_000));
        assertEquals("0:00", AlphaCallPresentation.elapsed(-5000));
    }

    @Test public void secondaryLineFollowsTheCallState() {
        assertEquals("(555) 010-0123", AlphaCallPresentation.secondaryLine(Call.STATE_RINGING, "(555) 010-0123", 0, 9000));
        assertEquals("", AlphaCallPresentation.secondaryLine(Call.STATE_RINGING, null, 0, 9000));
        for (int calling : new int[] {Call.STATE_NEW, Call.STATE_DIALING, Call.STATE_CONNECTING, Call.STATE_SELECT_PHONE_ACCOUNT}) {
            assertEquals("Calling…", AlphaCallPresentation.secondaryLine(calling, "(555) 010-0123", 0, 9000));
        }
        assertEquals("1:15", AlphaCallPresentation.secondaryLine(Call.STATE_ACTIVE, "(555) 010-0123", 5000, 80_000));
        // The clock moved back after the call connected.
        assertEquals("0:00", AlphaCallPresentation.secondaryLine(Call.STATE_ACTIVE, null, 5000, 4000));
        // Telecom has not reported a connect time: no invented duration.
        assertEquals("", AlphaCallPresentation.secondaryLine(Call.STATE_ACTIVE, null, 0, 80_000));
        assertEquals("On hold", AlphaCallPresentation.secondaryLine(Call.STATE_HOLDING, null, 5000, 80_000));
        assertEquals("Call ended", AlphaCallPresentation.secondaryLine(Call.STATE_DISCONNECTING, null, 5000, 80_000));
        assertEquals("Call ended", AlphaCallPresentation.secondaryLine(Call.STATE_DISCONNECTED, null, 5000, 80_000));
    }

    @Test public void timerTicksOnTheCallsOwnSecondBoundary() {
        assertEquals(1000, AlphaCallPresentation.untilNextSecond(5000, 5000));
        assertEquals(750, AlphaCallPresentation.untilNextSecond(5000, 6250));
        assertEquals(1, AlphaCallPresentation.untilNextSecond(5000, 6999));
        assertEquals(1000, AlphaCallPresentation.untilNextSecond(0, 6250));
        assertEquals(1000, AlphaCallPresentation.untilNextSecond(5000, 4000));
    }

    @Test public void aRingingCallOffersOnlyAnswerAndDecline() {
        assertEquals(Arrays.asList("answer", "decline"), offered(Call.STATE_RINGING, true, true, true));
        assertEquals(Arrays.asList("answer", "decline"), offered(Call.STATE_RINGING, false, false, false));
    }

    @Test public void aLiveCallOffersEachControlOnlyWhenItCanWork() {
        assertEquals(Arrays.asList("mute", "keypad", "speaker", "hold", "end"), offered(Call.STATE_ACTIVE, true, true, true));
        assertEquals(Arrays.asList("keypad", "end"), offered(Call.STATE_ACTIVE, false, true, false));
        assertEquals(Arrays.asList("mute", "keypad", "end"), offered(Call.STATE_ACTIVE, true, false, false));
        // The keypad sends tones only into a connected call.
        assertEquals(Arrays.asList("mute", "speaker", "hold", "end"), offered(Call.STATE_HOLDING, true, true, true));
        assertEquals(Arrays.asList("mute", "speaker", "end"), offered(Call.STATE_DIALING, true, true, false));
        assertEquals(Arrays.asList("end"), offered(Call.STATE_CONNECTING, false, false, false));
    }

    @Test public void anEndedCallOffersNothing() {
        assertEquals(Arrays.asList(), offered(Call.STATE_DISCONNECTING, true, true, true));
        assertEquals(Arrays.asList(), offered(Call.STATE_DISCONNECTED, true, true, true));
    }

    @Test public void chipsAndTogglesSayTheirState() {
        assertEquals("Ada Lovelace · On hold", AlphaCallPresentation.chipLabel("Ada Lovelace", Call.STATE_HOLDING));
        assertEquals("Unknown caller · Incoming", AlphaCallPresentation.chipLabel(AlphaCallPresentation.UNKNOWN_CALLER, Call.STATE_RINGING));
        assertEquals("(555) 010-0123 · In call", AlphaCallPresentation.chipLabel("(555) 010-0123", Call.STATE_ACTIVE));
        assertEquals("Ada · Calling…", AlphaCallPresentation.chipLabel("Ada", Call.STATE_DIALING));
        assertEquals("Ada · Call ended", AlphaCallPresentation.chipLabel("Ada", Call.STATE_DISCONNECTED));
        assertEquals("Mute, on", AlphaCallPresentation.toggleDescription("Mute", true));
        assertEquals("Speaker, off", AlphaCallPresentation.toggleDescription("Speaker", false));
        assertEquals("Switch to call, Ada · On hold", AlphaCallPresentation.chipDescription("Ada · On hold"));
    }

    @Test public void theCallNoticeNamesEachTelecomState() {
        assertEquals("Incoming call", AlphaCallPresentation.stateLabel(Call.STATE_RINGING));
        assertEquals("Calling…", AlphaCallPresentation.stateLabel(Call.STATE_DIALING));
        assertEquals("Connecting…", AlphaCallPresentation.stateLabel(Call.STATE_CONNECTING));
        assertEquals("In call", AlphaCallPresentation.stateLabel(Call.STATE_ACTIVE));
        assertEquals("On hold", AlphaCallPresentation.stateLabel(Call.STATE_HOLDING));
        assertEquals("Ending call…", AlphaCallPresentation.stateLabel(Call.STATE_DISCONNECTING));
        assertEquals("Call ended", AlphaCallPresentation.stateLabel(Call.STATE_DISCONNECTED));
        assertEquals("Choose a SIM to call from", AlphaCallPresentation.stateLabel(Call.STATE_SELECT_PHONE_ACCOUNT));
        assertEquals("Getting the call ready…", AlphaCallPresentation.stateLabel(Call.STATE_NEW));
    }

    /** Alpha's call service, as Telecom binds it. */
    private static AlphaInCallService owner() {
        return Robolectric.buildService(AlphaInCallService.class).create().get();
    }

    @Test public void callNotificationKeepsThePlatformCallGlyphAndOpensAlphasCallScreen() throws Exception {
        AlphaInCallService owner = owner();
        try {
            owner.onCallAdded(activeCall());
            Notification notice = owner.getSystemService(NotificationManager.class).getActiveNotifications()[0].getNotification();
            assertEquals(android.R.drawable.sym_action_call, notice.getSmallIcon().getResId());
            // A call with no handle names nobody.
            assertEquals("Unknown caller", notice.extras.getCharSequence(Notification.EXTRA_TITLE).toString());
            assertEquals("In call", notice.extras.getCharSequence(Notification.EXTRA_TEXT).toString());
            android.content.Intent show = Shadows.shadowOf(notice.contentIntent).getSavedIntent();
            assertEquals(AlphaCallActivity.class.getName(), show.getComponent().getClassName());
            assertEquals("alphaphone-call", show.getData().getScheme());
            assertEquals("show", show.getData().getAuthority());
            assertEquals(show.getStringExtra("callId"), show.getData().getLastPathSegment());
            assertEquals("show", show.getStringExtra("command"));
            assertEquals("End call", notice.actions[0].title.toString());
            android.content.Intent end = Shadows.shadowOf(notice.actions[0].actionIntent).getSavedIntent();
            assertEquals("disconnect", end.getStringExtra("command"));
        } finally { owner.onDestroy(); }
    }

    @Test public void ringingAlertsAndConnectedCallsUseTheQuietChannel() throws Exception {
        AlphaInCallService owner = owner();
        try {
            NotificationManager manager = owner.getSystemService(NotificationManager.class);
            Call call = activeCall();
            ReflectionHelpers.setField(call, "mState", Call.STATE_RINGING);
            owner.onCallAdded(call);
            Notification ringing = manager.getActiveNotifications()[0].getNotification();
            assertEquals("alpha-phone-calls", ringing.getChannelId());
            assertEquals("Phone calls", manager.getNotificationChannel(ringing.getChannelId()).getName().toString());
            org.junit.Assert.assertNotNull("a ringing call opens the call screen over the lock screen", ringing.fullScreenIntent);
            assertEquals(NotificationManager.IMPORTANCE_HIGH,
                manager.getNotificationChannel(ringing.getChannelId()).getImportance());

            ReflectionHelpers.setField(call, "mState", Call.STATE_ACTIVE);
            queueState(call);
            Shadows.shadowOf(Looper.getMainLooper()).idle();
            Notification connected = manager.getActiveNotifications()[0].getNotification();
            assertEquals("alpha-phone-calls-ongoing", connected.getChannelId());
            android.app.NotificationChannel quiet = manager.getNotificationChannel(connected.getChannelId());
            assertEquals(NotificationManager.IMPORTANCE_LOW, quiet.getImportance());
            org.junit.Assert.assertNull(quiet.getSound());
            org.junit.Assert.assertFalse(quiet.shouldVibrate());
        } finally {
            owner.onDestroy();
        }
    }

    private static Call activeCall() throws Exception {
        // API 35's actual Call constructor initializes Android's callback registry.
        for (Constructor<?> constructor : Call.class.getDeclaredConstructors()) {
            if (constructor.getParameterCount() != 5) continue;
            constructor.setAccessible(true);
            Call call = (Call) constructor.newInstance(null, "owned-call", null, "test", 0);
            ReflectionHelpers.setField(call, "mState", Call.STATE_ACTIVE);
            return call;
        }
        throw new AssertionError("API 35 Call constructor not found");
    }

    public static final class HeldContacts extends android.content.ContentProvider {
        static java.util.concurrent.CountDownLatch entered, release;
        @Override public boolean onCreate() { return true; }
        @Override public android.database.Cursor query(android.net.Uri uri, String[] columns, String selection, String[] args, String order) {
            entered.countDown();
            try { if (!release.await(10, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("Contact fixture was not released"); }
            catch (InterruptedException stopped) { Thread.currentThread().interrupt(); return null; }
            android.database.MatrixCursor rows = new android.database.MatrixCursor(columns);
            rows.addRow(new Object[] {"Private contact name"}); return rows;
        }
        @Override public String getType(android.net.Uri uri) { return null; }
        @Override public android.net.Uri insert(android.net.Uri uri, android.content.ContentValues values) { throw new UnsupportedOperationException(); }
        @Override public int delete(android.net.Uri uri, String selection, String[] args) { throw new UnsupportedOperationException(); }
        @Override public int update(android.net.Uri uri, android.content.ContentValues values, String selection, String[] args) { throw new UnsupportedOperationException(); }
    }

    private static Call contactCall() throws Exception {
        Call call = activeCall();
        for (Constructor<?> constructor : Call.Details.class.getDeclaredConstructors()) {
            Object[] args = new Object[constructor.getParameterCount()];
            Class<?>[] types = constructor.getParameterTypes();
            for (int i = 0; i < types.length; i++) {
                if (types[i] == int.class) args[i] = 0;
                else if (types[i] == long.class) args[i] = 0L;
                else if (types[i] == boolean.class) args[i] = false;
            }
            try {
                constructor.setAccessible(true);
                Call.Details details = (Call.Details) constructor.newInstance(args);
                ReflectionHelpers.setField(details, "mHandle", android.net.Uri.parse("tel:+15555550100"));
                ReflectionHelpers.setField(call, "mDetails", details); return call;
            } catch (ReflectiveOperationException unavailable) { /* Try another framework constructor. */ }
        }
        throw new AssertionError("Android Call.Details constructor unavailable");
    }

    @Test public void revokedContactsPermissionFencesAnAlreadyRunningNameLookup() throws Exception { contactLookup("revoked"); }
    @Test public void removedCallFencesAnAlreadyRunningNameLookup() throws Exception { contactLookup("removed"); }
    @Test public void destroyedServiceFencesAnAlreadyRunningNameLookup() throws Exception { contactLookup("destroyed"); }
    @Test public void cachedContactNameIsNotReusedAfterPermissionWithdrawal() throws Exception { contactLookup("cached"); }
    private static void contactLookup(String retirement) throws Exception {
        android.app.Application app = org.robolectric.RuntimeEnvironment.getApplication();
        Shadows.shadowOf(app).grantPermissions(android.Manifest.permission.READ_CONTACTS);
        HeldContacts.entered = new java.util.concurrent.CountDownLatch(1);
        HeldContacts.release = new java.util.concurrent.CountDownLatch(1);
        android.content.pm.ProviderInfo info = new android.content.pm.ProviderInfo(); info.authority = "com.android.contacts";
        Robolectric.buildContentProvider(HeldContacts.class).create(info);
        AlphaInCallService owner = owner();
        boolean destroyed = false;
        try {
            Call call = contactCall(); owner.onCallAdded(call);
            org.junit.Assert.assertTrue(HeldContacts.entered.await(10, java.util.concurrent.TimeUnit.SECONDS));
            java.util.concurrent.ExecutorService worker = ReflectionHelpers.getField(owner, "lookups");
            if (retirement.equals("revoked")) Shadows.shadowOf(app).denyPermissions(android.Manifest.permission.READ_CONTACTS);
            if (retirement.equals("removed")) owner.onCallRemoved(call);
            if (retirement.equals("destroyed")) { owner.onDestroy(); destroyed = true; }
            HeldContacts.release.countDown();
            if (!destroyed) worker.submit(() -> {}).get(10, java.util.concurrent.TimeUnit.SECONDS);
            else org.junit.Assert.assertTrue(worker.awaitTermination(10, java.util.concurrent.TimeUnit.SECONDS));
            Shadows.shadowOf(Looper.getMainLooper()).idle();
            if (retirement.equals("cached")) {
                assertEquals("Private contact name", owner.getSystemService(NotificationManager.class).getActiveNotifications()[0].getNotification().extras.getCharSequence(Notification.EXTRA_TITLE).toString());
                Shadows.shadowOf(app).denyPermissions(android.Manifest.permission.READ_CONTACTS);
                queueState(call); Shadows.shadowOf(Looper.getMainLooper()).idle();
            }
            android.service.notification.StatusBarNotification[] notices = owner.getSystemService(NotificationManager.class).getActiveNotifications();
            if (retirement.equals("revoked") || retirement.equals("cached")) {
                assertEquals(1, notices.length);
                assertEquals("+15555550100", notices[0].getNotification().extras.getCharSequence(Notification.EXTRA_TITLE).toString());
            } else assertEquals(0, notices.length);
        } finally {
            HeldContacts.release.countDown();
            if (!destroyed) owner.onDestroy();
        }
    }

    private static void queueState(Call call) {
        // This is Android's asynchronous callback dispatcher, not a fake callback.
        ReflectionHelpers.callInstanceMethod(call, "fireStateChanged", ClassParameter.from(int.class, call.getState()));
    }

    @Test public void removedCallCannotRepublishAnAlreadyQueuedStateCallback() throws Exception {
        AlphaInCallService owner = owner();
        try {
            Call call = activeCall();
            owner.onCallAdded(call);
            NotificationManager notifications = owner.getSystemService(NotificationManager.class);
            org.junit.Assert.assertEquals(1, notifications.getActiveNotifications().length);
            queueState(call);
            owner.onCallRemoved(call);
            org.junit.Assert.assertEquals(0, notifications.getActiveNotifications().length);
            Shadows.shadowOf(Looper.getMainLooper()).idle();
            org.junit.Assert.assertEquals(0, notifications.getActiveNotifications().length);
            org.junit.Assert.assertFalse(AlphaInCallService.answerCall("missing", 0));
            org.junit.Assert.assertFalse(AlphaInCallService.disconnectCall("missing"));
        } finally { owner.onDestroy(); }
    }

    @Test public void removedCallCannotRepublishAnAlreadyQueuedDetailsCallback() throws Exception {
        AlphaInCallService owner = owner();
        try {
            Call call = activeCall();
            owner.onCallAdded(call);
            ReflectionHelpers.callInstanceMethod(call, "fireDetailsChanged", ClassParameter.from(Call.Details.class, null));
            owner.onCallRemoved(call);
            Shadows.shadowOf(Looper.getMainLooper()).idle();
            org.junit.Assert.assertEquals(0, owner.getSystemService(NotificationManager.class).getActiveNotifications().length);
        } finally { owner.onDestroy(); }
    }

    @Test public void destroyedOwnerCannotRepublishAnAlreadyQueuedCall() throws Exception {
        AlphaInCallService owner = owner();
        Call call = activeCall();
        owner.onCallAdded(call);
        queueState(call);
        owner.onDestroy();
        Shadows.shadowOf(Looper.getMainLooper()).idle();
        org.junit.Assert.assertTrue(AlphaInCallService.callIds().isEmpty());
        org.junit.Assert.assertEquals(0, owner.getSystemService(NotificationManager.class).getActiveNotifications().length);
    }

    @Test public void removingOneCallRetainsTheOtherCallAndItsNotification() throws Exception {
        AlphaInCallService owner = owner();
        try {
            Call first = activeCall(), second = activeCall();
            owner.onCallAdded(first); owner.onCallAdded(second);
            org.junit.Assert.assertEquals(2, AlphaInCallService.callIds().size());
            queueState(first); owner.onCallRemoved(first);
            Shadows.shadowOf(Looper.getMainLooper()).idle();
            org.junit.Assert.assertEquals(1, AlphaInCallService.callIds().size());
            org.junit.Assert.assertSame(second, AlphaInCallService.call(AlphaInCallService.callIds().get(0)));
            org.junit.Assert.assertEquals(1, owner.getSystemService(NotificationManager.class).getActiveNotifications().length);
        } finally { owner.onDestroy(); }
    }

    @Test public void currentCallStillPublishesItsNativeStateChange() throws Exception {
        AlphaInCallService owner = owner();
        try {
            Call call = activeCall(); owner.onCallAdded(call);
            ReflectionHelpers.setField(call, "mState", Call.STATE_HOLDING); queueState(call);
            Shadows.shadowOf(Looper.getMainLooper()).idle();
            NotificationManager notifications = owner.getSystemService(NotificationManager.class);
            org.junit.Assert.assertEquals(1, notifications.getActiveNotifications().length);
            Notification notification = notifications.getActiveNotifications()[0].getNotification();
            org.junit.Assert.assertEquals("On hold", notification.extras.getString(Notification.EXTRA_TEXT));
        } finally { owner.onDestroy(); }
    }

    @Test public void theCallNoticeIsPostedOnlyWhenWhatItSaysOrOffersChanges() throws Exception {
        assertEquals(AlphaCallPresentation.noticeContent("Maya", Call.STATE_DIALING), AlphaCallPresentation.noticeContent("Maya", Call.STATE_DIALING));
        org.junit.Assert.assertNotEquals(AlphaCallPresentation.noticeContent("Maya", Call.STATE_DIALING), AlphaCallPresentation.noticeContent("Maya", Call.STATE_ACTIVE));
        org.junit.Assert.assertNotEquals(AlphaCallPresentation.noticeContent("Maya", Call.STATE_DIALING), AlphaCallPresentation.noticeContent("555 0100", Call.STATE_DIALING));
        AlphaInCallService owner = owner();
        try {
            NotificationManager manager = owner.getSystemService(NotificationManager.class);
            Call call = activeCall();
            ReflectionHelpers.setField(call, "mState", Call.STATE_DIALING);
            owner.onCallAdded(call);
            Notification dialing = manager.getActiveNotifications()[0].getNotification();
            // Telecom repeats a state and reports detail changes that leave the notice as it is: a
            // burst of them as a call starts must not post the same notice again (Android sheds
            // notices past its per-app rate, and a shed update leaves a stale notice).
            for (int repeat = 0; repeat < 8; repeat++) {
                queueState(call);
                ReflectionHelpers.callInstanceMethod(call, "fireDetailsChanged", ClassParameter.from(Call.Details.class, null));
            }
            Shadows.shadowOf(Looper.getMainLooper()).idle();
            org.junit.Assert.assertSame("an unchanged notice is not posted again", dialing, manager.getActiveNotifications()[0].getNotification());
            ReflectionHelpers.setField(call, "mState", Call.STATE_ACTIVE); queueState(call);
            Shadows.shadowOf(Looper.getMainLooper()).idle();
            Notification connected = manager.getActiveNotifications()[0].getNotification();
            org.junit.Assert.assertNotSame("a changed state is posted", dialing, connected);
            assertEquals("In call", connected.extras.getString(Notification.EXTRA_TEXT));
            // A second call with the same words still gets its own notice, and a removed call's
            // notice content is forgotten with it.
            owner.onCallRemoved(call);
            org.junit.Assert.assertEquals(0, manager.getActiveNotifications().length);
            Call again = activeCall(); owner.onCallAdded(again);
            org.junit.Assert.assertEquals(1, manager.getActiveNotifications().length);
        } finally { owner.onDestroy(); }
    }

    @Test public void theOngoingCallBarIsToldOnlyTheStatesTheOwnerSees() {
        assertEquals("ringing", AlphaCallPresentation.ongoingState(Call.STATE_RINGING));
        assertEquals("ringing", AlphaCallPresentation.ongoingState(Call.STATE_SIMULATED_RINGING));
        org.junit.Assert.assertTrue(AlphaCallPresentation.ringing(Call.STATE_RINGING));
        org.junit.Assert.assertTrue(AlphaCallPresentation.ringing(Call.STATE_SIMULATED_RINGING));
        for (int state : new int[] {Call.STATE_DIALING, Call.STATE_CONNECTING, Call.STATE_ACTIVE, Call.STATE_HOLDING, Call.STATE_DISCONNECTING}) {
            org.junit.Assert.assertFalse(AlphaCallPresentation.ringing(state));
        }
        for (int state : new int[] {Call.STATE_NEW, Call.STATE_SELECT_PHONE_ACCOUNT, Call.STATE_DIALING, Call.STATE_CONNECTING, Call.STATE_PULLING_CALL}) {
            assertEquals("dialing", AlphaCallPresentation.ongoingState(state));
        }
        assertEquals("active", AlphaCallPresentation.ongoingState(Call.STATE_ACTIVE));
        assertEquals("held", AlphaCallPresentation.ongoingState(Call.STATE_HOLDING));
        org.junit.Assert.assertNull(AlphaCallPresentation.ongoingState(Call.STATE_DISCONNECTING));
        org.junit.Assert.assertNull(AlphaCallPresentation.ongoingState(Call.STATE_DISCONNECTED));
        org.junit.Assert.assertNull(AlphaCallPresentation.ongoingState(Call.STATE_AUDIO_PROCESSING));
    }

    @Test public void theOngoingCallBarCountsFromTheConnectTimeOnlyOnceTheCallIsActive() {
        long connect = 1_763_400_000_000L;
        // A call still dialing, connecting or ringing has no clock, even if Telecom already carries a time.
        for (int state : new int[] {Call.STATE_NEW, Call.STATE_SELECT_PHONE_ACCOUNT, Call.STATE_CONNECTING, Call.STATE_DIALING,
                Call.STATE_PULLING_CALL, Call.STATE_RINGING, Call.STATE_SIMULATED_RINGING, Call.STATE_DISCONNECTING, Call.STATE_DISCONNECTED}) {
            org.junit.Assert.assertNull(AlphaCallPresentation.ongoingConnectedAt(state, connect));
        }
        assertEquals(Long.valueOf(connect), AlphaCallPresentation.ongoingConnectedAt(Call.STATE_ACTIVE, connect));
        assertEquals(Long.valueOf(connect), AlphaCallPresentation.ongoingConnectedAt(Call.STATE_HOLDING, connect));
        // ACTIVE before Telecom has set the connect time: no clock rather than one from now.
        org.junit.Assert.assertNull(AlphaCallPresentation.ongoingConnectedAt(Call.STATE_ACTIVE, 0));
    }

    private static Call callWithConnectTime(int state, long connect) throws Exception {
        Call call = contactCall();
        ReflectionHelpers.setField(call, "mState", state);
        ReflectionHelpers.setField(call.getDetails(), "mConnectTimeMillis", connect);
        return call;
    }

    @Test public void theOngoingCallBarIsToldTheDialingStateAndThenTheConnectTime() throws Exception {
        AlphaInCallService owner = owner();
        try {
            long connect = System.currentTimeMillis() - 42_000;
            Call call = callWithConnectTime(Call.STATE_DIALING, connect);
            owner.onCallAdded(call);
            org.json.JSONObject row = AlphaOngoingCallPlugin.snapshot().getJSONArray("calls").getJSONObject(0);
            assertEquals("dialing", row.getString("state"));
            org.junit.Assert.assertTrue(row.isNull("connectedAt"));
            ReflectionHelpers.setField(call, "mState", Call.STATE_ACTIVE);
            row = AlphaOngoingCallPlugin.snapshot().getJSONArray("calls").getJSONObject(0);
            assertEquals("active", row.getString("state"));
            assertEquals(connect, row.getLong("connectedAt"));
        } finally { owner.onDestroy(); }
    }

    @Test public void theOngoingCallBarReadsEachLiveCallWithoutWhoItIsWith() throws Exception {
        AlphaInCallService owner = owner();
        try {
            org.junit.Assert.assertEquals("{\"calls\":[]}", AlphaOngoingCallPlugin.snapshot().toString());
            Call active = activeCall(), ringing = activeCall(), ended = activeCall();
            ReflectionHelpers.setField(ringing, "mState", Call.STATE_RINGING);
            ReflectionHelpers.setField(ended, "mState", Call.STATE_DISCONNECTING);
            owner.onCallAdded(active); owner.onCallAdded(ringing); owner.onCallAdded(ended);
            java.util.List<String> ids = AlphaInCallService.callIds();
            org.json.JSONArray calls = AlphaOngoingCallPlugin.snapshot().getJSONArray("calls");
            // The ending call is not shown; the others are, oldest first, with no number or name.
            assertEquals(2, calls.length());
            org.json.JSONObject first = calls.getJSONObject(0), second = calls.getJSONObject(1);
            assertEquals(ids.get(0), first.getString("id"));
            assertEquals("active", first.getString("state"));
            org.junit.Assert.assertTrue(first.isNull("connectedAt"));
            assertEquals(3, first.length());
            assertEquals(ids.get(1), second.getString("id"));
            assertEquals("ringing", second.getString("state"));
            // A call Telecom no longer has cannot be ended from the bar.
            org.junit.Assert.assertFalse(AlphaOngoingCallPlugin.end("gone"));
            org.junit.Assert.assertFalse(AlphaOngoingCallPlugin.end(null));
        } finally { owner.onDestroy(); }
    }
    private static final int EARPIECE = android.telecom.CallAudioState.ROUTE_EARPIECE, SPEAKER = android.telecom.CallAudioState.ROUTE_SPEAKER,
        WIRED = android.telecom.CallAudioState.ROUTE_WIRED_HEADSET, BLUETOOTH = android.telecom.CallAudioState.ROUTE_BLUETOOTH;

    @Test public void theDisplayTurnsOffAtTheEarOnlyForACallOffTheHookOnTheEarpiece() {
        for (int state : new int[] {Call.STATE_CONNECTING, Call.STATE_DIALING, Call.STATE_ACTIVE, Call.STATE_HOLDING, Call.STATE_PULLING_CALL})
            org.junit.Assert.assertTrue("off the hook: " + state, AlphaCallPresentation.proximityLock(new int[] {state}, true, EARPIECE));
        // A call that only rings needs the screen to answer; an ending or ended call needs nothing.
        for (int state : new int[] {Call.STATE_RINGING, Call.STATE_NEW, Call.STATE_SELECT_PHONE_ACCOUNT, Call.STATE_DISCONNECTING, Call.STATE_DISCONNECTED})
            org.junit.Assert.assertFalse("not off the hook: " + state, AlphaCallPresentation.proximityLock(new int[] {state}, true, EARPIECE));
        // Off the earpiece the phone is not at the ear.
        for (int route : new int[] {SPEAKER, WIRED, BLUETOOTH})
            org.junit.Assert.assertFalse("route " + route, AlphaCallPresentation.proximityLock(new int[] {Call.STATE_ACTIVE}, true, route));
        // No audio state from Telecom, or no call: the screen is left alone.
        org.junit.Assert.assertFalse(AlphaCallPresentation.proximityLock(new int[] {Call.STATE_ACTIVE}, false, EARPIECE));
        org.junit.Assert.assertFalse(AlphaCallPresentation.proximityLock(new int[] {}, true, EARPIECE));
        // A second call ringing while the owner is on one keeps the lock.
        org.junit.Assert.assertTrue(AlphaCallPresentation.proximityLock(new int[] {Call.STATE_RINGING, Call.STATE_ACTIVE}, true, EARPIECE));
    }

    @Test public void theDisplayReturnsAtOnceOnlyWhenALiveCallLeavesTheEarpiece() {
        org.junit.Assert.assertTrue(AlphaCallPresentation.screenOnAtRelease(new int[] {Call.STATE_ACTIVE}, true, SPEAKER));
        org.junit.Assert.assertTrue(AlphaCallPresentation.screenOnAtRelease(new int[] {Call.STATE_DIALING}, true, BLUETOOTH));
        // The call ended at the ear: the display waits until the phone is taken away.
        org.junit.Assert.assertFalse(AlphaCallPresentation.screenOnAtRelease(new int[] {}, true, EARPIECE));
        org.junit.Assert.assertFalse(AlphaCallPresentation.screenOnAtRelease(new int[] {Call.STATE_DISCONNECTED}, true, EARPIECE));
        org.junit.Assert.assertFalse(AlphaCallPresentation.screenOnAtRelease(new int[] {}, true, SPEAKER));
        org.junit.Assert.assertFalse(AlphaCallPresentation.screenOnAtRelease(new int[] {Call.STATE_ACTIVE}, false, 0));
    }

    private static android.telecom.CallAudioState audio(int route) {
        return new android.telecom.CallAudioState(false, route, EARPIECE | SPEAKER | BLUETOOTH);
    }

    private static boolean proximityHeld() {
        android.os.PowerManager.WakeLock lock = org.robolectric.shadows.ShadowPowerManager.getLatestWakeLock();
        return lock != null && lock.isHeld();
    }

    @Test public void theCallServiceHoldsTheProximityLockWhileACallIsAtTheEar() throws Exception {
        AlphaInCallService owner = owner();
        // The lock level is asked of the service's own power manager.
        Shadows.shadowOf(owner.getSystemService(android.os.PowerManager.class)).setIsWakeLockLevelSupported(android.os.PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK, true);
        try {
            Call call = activeCall();
            ReflectionHelpers.setField(call, "mState", Call.STATE_DIALING);
            // The route Telecom last reported decides, here a call placed with the speaker on.
            owner.onCallAudioStateChanged(audio(SPEAKER));
            owner.onCallAdded(call);
            org.junit.Assert.assertFalse("placed on the speaker", proximityHeld());
            owner.onCallAudioStateChanged(audio(EARPIECE));
            org.junit.Assert.assertTrue("dialing on the earpiece", proximityHeld());
            android.os.PowerManager.WakeLock lock = org.robolectric.shadows.ShadowPowerManager.getLatestWakeLock();
            assertEquals(AlphaInCallService.PROXIMITY_TAG, Shadows.shadowOf(lock).getTag());
            // The speaker means the owner is looking at the phone.
            owner.onCallAudioStateChanged(audio(SPEAKER));
            org.junit.Assert.assertFalse("on the speaker", proximityHeld());
            owner.onCallAudioStateChanged(audio(EARPIECE));
            org.junit.Assert.assertTrue("back on the earpiece", proximityHeld());
            org.junit.Assert.assertSame("one lock for the service", lock, org.robolectric.shadows.ShadowPowerManager.getLatestWakeLock());
            // Connected and on hold keep it; the call ending drops it.
            ReflectionHelpers.setField(call, "mState", Call.STATE_ACTIVE); queueState(call);
            Shadows.shadowOf(Looper.getMainLooper()).idle();
            org.junit.Assert.assertTrue("connected", proximityHeld());
            ReflectionHelpers.setField(call, "mState", Call.STATE_DISCONNECTED); queueState(call);
            Shadows.shadowOf(Looper.getMainLooper()).idle();
            org.junit.Assert.assertFalse("ended", proximityHeld());
            // A removed call and a destroyed service hold nothing.
            ReflectionHelpers.setField(call, "mState", Call.STATE_ACTIVE); queueState(call);
            Shadows.shadowOf(Looper.getMainLooper()).idle();
            org.junit.Assert.assertTrue(proximityHeld());
            owner.onCallRemoved(call);
            org.junit.Assert.assertFalse("removed", proximityHeld());
            Call again = activeCall(); owner.onCallAdded(again);
            org.junit.Assert.assertTrue("a second call on the earpiece", proximityHeld());
        } finally { owner.onDestroy(); }
        org.junit.Assert.assertFalse("destroyed", proximityHeld());
    }

    @Test public void aRingingCallAndAPhoneWithoutTheSensorKeepTheScreenOn() throws Exception {
        AlphaInCallService owner = owner();
        try {
            // No proximity lock level on this phone: nothing is created or held.
            Call call = activeCall(); owner.onCallAdded(call);
            owner.onCallAudioStateChanged(audio(EARPIECE));
            org.junit.Assert.assertNull(org.robolectric.shadows.ShadowPowerManager.getLatestWakeLock());
            owner.onCallRemoved(call);
            // With the sensor, an incoming call that only rings leaves the screen on to answer it.
            Shadows.shadowOf(owner.getSystemService(android.os.PowerManager.class)).setIsWakeLockLevelSupported(android.os.PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK, true);
            Call ringing = activeCall();
            ReflectionHelpers.setField(ringing, "mState", Call.STATE_RINGING);
            owner.onCallAdded(ringing);
            owner.onCallAudioStateChanged(audio(EARPIECE));
            org.junit.Assert.assertFalse("ringing", proximityHeld());
            ReflectionHelpers.setField(ringing, "mState", Call.STATE_ACTIVE); queueState(ringing);
            Shadows.shadowOf(Looper.getMainLooper()).idle();
            org.junit.Assert.assertTrue("answered", proximityHeld());
        } finally { owner.onDestroy(); }
    }
}
