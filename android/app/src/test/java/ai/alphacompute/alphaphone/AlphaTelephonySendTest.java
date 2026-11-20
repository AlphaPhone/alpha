package ai.alphacompute.alphaphone;

import static org.junit.Assert.*;

import ai.eliza.plugins.actionjournal.ActionJournal;
import ai.eliza.plugins.actionjournal.ActionJournalConfiguration;
import ai.eliza.plugins.messages.AlphaTelephonyAccess;
import ai.eliza.plugins.messages.MessagesTestAccess;
import ai.eliza.plugins.messages.SmsRecords;
import ai.eliza.plugins.messages.SmsSendJournal;
import ai.eliza.plugins.messages.SmsTelephony;
import ai.eliza.plugins.messages.SmsTelephonyConfiguration;

import android.Manifest;
import android.app.AlertDialog;
import android.app.Application;
import android.app.KeyguardManager;
import android.app.role.RoleManager;
import android.content.BroadcastReceiver;
import android.content.ContentProvider;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.pm.ProviderInfo;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.UserManager;
import android.provider.Telephony;
import android.telephony.SubscriptionManager;
import android.telephony.SmsManager;
import android.telephony.TelephonyManager;
import androidx.appcompat.app.AppCompatActivity;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.PluginCall;
import java.lang.reflect.Field;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.Shadows;
import org.robolectric.annotation.Config;
import org.robolectric.shadows.ShadowAlertDialog;
import org.robolectric.shadows.ShadowLooper;
import org.robolectric.shadows.ShadowSubscriptionManager;

/**
 * Alpha's telephony bridge ({@link AlphaTelephonyBase}) and how a send is confirmed: an agent's text
 * dispatches only for the card the owner approved in the chat ({@link AlphaApprovedSms}), with no
 * native dialog, and the Messages composer's own Send. The real bridge methods over controlled
 * worker scheduling, first ported from the shared TelephonyPluginReviewTest (plugin-native-messages,
 * elizaOS pin 1803ea88). Robolectric's SmsManager records sends; no radio or provider effect.
 */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = 29, manifest = Config.NONE)
public final class AlphaTelephonySendTest {
  public static final class Receiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {}
  }
  public static final class OutboxProvider extends ContentProvider {
    private static final long OWN_ROW = 12;
    final Map<Long, ContentValues> outbox = new HashMap<>();
    int parts;
    int deletes;
    @Override public boolean onCreate() { return true; }
    @Override public Cursor query(Uri uri, String[] columns, String selection, String[] args, String sort) {
      MatrixCursor thread = new MatrixCursor(new String[] {"_id"});
      thread.addRow(new Object[] {1});
      return thread;
    }
    @Override public Uri insert(Uri uri, ContentValues values) {
      if (uri.equals(Telephony.Mms.Outbox.CONTENT_URI)) {
        ContentValues own = new ContentValues(values);
        own.put(Telephony.Mms.CREATOR, getContext().getPackageName());
        outbox.put(OWN_ROW, own);
        ContentValues other = new ContentValues(own);
        other.put(Telephony.Mms.TRANSACTION_ID, "another-send");
        outbox.put(OWN_ROW + 1, other);
        return ContentUris.withAppendedId(Telephony.Mms.CONTENT_URI, OWN_ROW);
      }
      if ("part".equals(uri.getLastPathSegment())) parts++;
      return ContentUris.withAppendedId(uri, 1);
    }
    @Override public int delete(Uri uri, String selection, String[] args) {
      assertEquals(Telephony.Mms.CONTENT_URI, uri);
      assertEquals("_id = ? AND msg_box = ? AND creator = ? AND tr_id = ?", selection);
      assertArrayEquals(new String[] {Long.toString(OWN_ROW), Integer.toString(Telephony.Mms.MESSAGE_BOX_OUTBOX),
        getContext().getPackageName(), AlphaTelephonyAccess.mmsTransaction("cancel-1")}, args);
      deletes++;
      return outbox.remove(OWN_ROW) == null ? 0 : 1;
    }
    @Override public int update(Uri uri, ContentValues values, String selection, String[] args) { throw new UnsupportedOperationException(); }
    @Override public String getType(Uri uri) { return null; }
  }
  static final class Call extends PluginCall {
    volatile JSObject result;
    volatile String error;
    volatile int resolutions;
    Call(String method, JSObject data) { super(null, "Telephony", method, method, data); }
    @Override public void resolve() { resolutions++; }
    @Override public void resolve(JSObject value) { result = value; resolutions++; }
    @Override public void reject(String message, String code, Exception cause, JSObject data) { error = code; }
  }
  static final class Host extends AlphaTelephonyBase {
    final AppCompatActivity activity;
    boolean imageAllowed=true, smsAllowed=true;
    /** The chat's action journal, in memory: the cards the owner approved. */
    final ActionJournal approvals;
    final Map<String, String> deviceClaims = new HashMap<>();
    final java.util.Set<String> contactNumbers = new java.util.HashSet<>();
    Host(AppCompatActivity activity) {
      this.activity = activity;
      Map<String, String> slots = new HashMap<>();
      approvals = new ActionJournal(ActionJournalConfiguration.standard("fixture-approvals"), new ActionJournal.Storage() {
        public String read(String slot) { return slots.get(slot); }
        public void write(String slot, String value) { slots.put(slot, value); }
      }, ActionJournal.BOUNDED_RESULTS);
    }
    @Override protected synchronized boolean reserveSmsClaim(String id, String binding) { return deviceClaims.putIfAbsent(id, binding) == null; }
    @Override protected ActionJournal approvals() { return approvals; }
    @Override protected boolean contactNumber(String number) { return contactNumbers.contains(number); }
    @Override public Context getContext() { return activity; }
    @Override public AppCompatActivity getActivity() { return activity; }
    @Override public PermissionState getPermissionState(String alias) { return alias.equals("sms") && !smsAllowed ? PermissionState.DENIED : PermissionState.GRANTED; }
    @Override protected SmsTelephonyConfiguration configuration() { throw new AssertionError("fixture installs its configuration"); }
    void pause() { handleOnPause(); }
    void sendFromComposer(Call call, SmsTelephony.DispatchGuard guard) {
      if (call.getMethodName().equals("sendMms")) sendOwnerApprovedMms(call, guard);
      else sendOwnerApprovedSms(call, guard);
    }
  }
  private Host host(String identity) throws Exception { return host(identity, false); }
  private Host host(String identity, boolean mms) throws Exception {
    AppCompatActivity activity = Robolectric.buildActivity(AppCompatActivity.class).get();
    activity.setTheme(android.R.style.Theme_Material_Light);
    Shadows.shadowOf((Application) activity.getApplicationContext()).grantPermissions(Manifest.permission.READ_PHONE_STATE);
    Shadows.shadowOf(activity.getSystemService(UserManager.class)).setUserUnlocked(true);
    Shadows.shadowOf(activity.getSystemService(KeyguardManager.class)).setIsDeviceLocked(false);
    Shadows.shadowOf(activity.getSystemService(TelephonyManager.class)).setIsSmsCapable(true);
    Shadows.shadowOf(activity.getSystemService(SubscriptionManager.class)).setActiveSubscriptionInfos(ShadowSubscriptionManager.SubscriptionInfoBuilder.newBuilder().setId(1).setSimSlotIndex(0).setDisplayName("Test SIM").setCarrierName("Test carrier").buildSubscriptionInfo());
    Host host = new Host(activity);
    Map<String, String> slots = new HashMap<>();
    SmsTelephonyConfiguration config = new SmsTelephonyConfiguration(identity, null, identity, "fixture.sent", "fixture.delivered", "fixture", "operation", "index", "fixture.image", Receiver.class, context -> host.imageAllowed, context -> new SmsTelephonyConfiguration.JournalStore() {
      public String read(String slot) { return slots.get(slot); }
      public void write(String slot, String value) { slots.put(slot, value); }
    });
    Field configured = AlphaTelephonyBase.class.getDeclaredField("config"); configured.setAccessible(true);
    configured.set(host, mms ? config.withMmsFiles("fixture.mms") : config);
    return host;
  }
  static final String SCOPE = "a".repeat(64), TEXT = "Original reviewed text", NUMBER = "+15555550123";
  private static JSObject request(String operationId, String body, JSObject identity) {
    JSObject data = new JSObject().put("operationId", operationId).put("recipients", new JSArray(Collections.singletonList(NUMBER))).put("body", body).put("subscriptionId", 1).put("attachments", new JSArray());
    if (identity != null) data.put("journalIdentity", identity);
    return data;
  }
  private static JSObject card(String proposalId) { return new JSObject().put("scope", SCOPE).put("proposalId", proposalId); }
  /** An agent's text whose card names the proposal the owner approved in the chat. */
  private static Call send(String method) { return new Call(method, request("cancel-1", TEXT, card("cancel-1"))); }
  /** The same text with no card: the Messages composer's request, where the owner's Send is the confirmation. */
  private static Call composed(String method) { return new Call(method, request("cancel-1", TEXT, null)); }
  private static org.json.JSONObject smsSend(String body, int subscriptionId) throws Exception {
    return new org.json.JSONObject().put("type", "sms_send").put("recipients", new org.json.JSONArray().put(NUMBER)).put("body", body).put("subscriptionId", subscriptionId);
  }
  /**
   * What the chat records when the owner taps Approve on a card: the proposal reserved under its
   * operation ID, then marked applying once the server granted the claim. Decline records neither.
   */
  private static void approve(Host host, String proposalId, String operationId, org.json.JSONObject operation, long expiresAt, boolean sensitive) throws Exception {
    org.json.JSONObject record = new org.json.JSONObject().put("operation", operation).put("expiresAt", expiresAt).put("context", new org.json.JSONObject().put("view", "messages").put("sensitive", sensitive));
    host.approvals.reserve(SCOPE, proposalId, operationId, "b".repeat(64), record);
    host.approvals.markApplying(SCOPE, proposalId, "attempt-" + proposalId);
  }
  private static void approve(Host host, org.json.JSONObject operation) throws Exception { approve(host, "cancel-1", "cancel-1", operation, System.currentTimeMillis() + 600_000, false); }
  private static SmsTelephonyConfiguration config(Host host) throws Exception {
    Field configured = AlphaTelephonyBase.class.getDeclaredField("config"); configured.setAccessible(true);
    return (SmsTelephonyConfiguration) configured.get(host);
  }
  /** Whether the send journal holds anything for {@link #send}: a refused card leaves no record. */
  private static boolean journaled(Host host) throws Exception {
    return SmsTelephony.journal(host.getContext(), config(host)).existing("cancel-1", SmsSendJournal.sha256(SmsSendJournal.bindingText(new String[] {NUMBER}, TEXT, 1))) != null;
  }
  private static void noRadioAndNoRetainedOwner(Host host) throws Exception {
    assertNull(Shadows.shadowOf(SmsManager.getSmsManagerForSubscriptionId(1)).getLastSentTextMessageParams());
    assertNull(Shadows.shadowOf(SmsManager.getSmsManagerForSubscriptionId(1)).getLastSentMultimediaMessageParams());
    Field owners = AlphaTelephonyBase.class.getDeclaredField("pendingSends"); owners.setAccessible(true);
    assertTrue("settlement releases the pending owner", ((java.util.Set<?>) owners.get(host)).isEmpty());
  }
  private static void noDialog() {
    AlertDialog shown = ShadowAlertDialog.getLatestAlertDialog();
    assertTrue("the approved card is the confirmation: no native dialog asks again", shown == null || !shown.isShowing());
  }
  private static void settle() throws Exception {
    SmsTelephony.WORK.submit(() -> {}).get(10, TimeUnit.SECONDS);
    ShadowLooper.idleMainLooper();
    SmsTelephony.WORK.submit(() -> {}).get(10, TimeUnit.SECONDS);
    SmsTelephony.WORK.submit(() -> {}).get(10, TimeUnit.SECONDS);
  }
  private static void hold(CountDownLatch entered, CountDownLatch release) throws Exception {
    SmsTelephony.WORK.execute(() -> {
      entered.countDown();
      try { assertTrue(release.await(10, TimeUnit.SECONDS)); } catch (InterruptedException stopped) { Thread.currentThread().interrupt(); }
    });
    assertTrue(entered.await(10, TimeUnit.SECONDS));
  }
  @Test public void smsEligibilityMatchesTypedMmsReceiverAndEnabledHostComponents() throws Exception {
    Host host = host("role-eligibility");
    PackageManager manager = host.getContext().getPackageManager();
    var packages = Shadows.shadowOf(manager);
    String self = host.getContext().getPackageName();
    ComponentName sms = new ComponentName(self, self + ".SmsReceiver");
    ComponentName mms = new ComponentName(self, self + ".MmsReceiver");
    ComponentName responder = new ComponentName(self, self + ".MessageResponder");
    ComponentName composer = new ComponentName(self, self + ".MessageComposer");
    packages.addReceiverIfNotPresent(sms).enabled = true;
    packages.addIntentFilterForReceiver(sms, new IntentFilter(Telephony.Sms.Intents.SMS_DELIVER_ACTION));
    packages.addReceiverIfNotPresent(mms).enabled = true;
    IntentFilter mmsFilter = new IntentFilter(Telephony.Sms.Intents.WAP_PUSH_DELIVER_ACTION);
    mmsFilter.addDataType("application/vnd.wap.mms-message");
    packages.addIntentFilterForReceiver(mms, mmsFilter);
    packages.addServiceIfNotPresent(responder).enabled = true;
    IntentFilter respondFilter = new IntentFilter(TelephonyManager.ACTION_RESPOND_VIA_MESSAGE);
    respondFilter.addDataScheme("smsto");
    packages.addIntentFilterForService(responder, respondFilter);
    packages.addActivityIfNotPresent(composer).enabled = true;
    IntentFilter composeFilter = new IntentFilter(Intent.ACTION_SENDTO);
    composeFilter.addDataScheme("smsto");
    packages.addIntentFilterForActivity(composer, composeFilter);

    // Exercise Android IntentFilter resolution, not a preselected ResolveInfo response.
    assertTrue(manager.queryBroadcastReceivers(new Intent(Telephony.Sms.Intents.WAP_PUSH_DELIVER_ACTION).setPackage(self), 0).isEmpty());
    assertEquals(1, manager.queryBroadcastReceivers(new Intent(Telephony.Sms.Intents.WAP_PUSH_DELIVER_ACTION)
      .setType("application/vnd.wap.mms-message").setPackage(self), 0).size());
    assertTrue("a MIME-qualified enabled host can be offered the SMS role", host.eligibleFor(RoleManager.ROLE_SMS));
    assertTrue(host.statusObject().getJSONObject("roles").getJSONObject("sms").getBoolean("eligible"));
    for (ComponentName component : new ComponentName[] {sms, mms, responder, composer}) {
      manager.setComponentEnabledSetting(component, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
      assertFalse("every host component remains required", host.eligibleFor(RoleManager.ROLE_SMS));
      manager.setComponentEnabledSetting(component, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
      assertTrue(host.eligibleFor(RoleManager.ROLE_SMS));
    }
    ComponentName foreign = new ComponentName("other.messages", "other.messages.MmsReceiver");
    packages.addReceiverIfNotPresent(foreign).enabled = true;
    packages.addIntentFilterForReceiver(foreign, mmsFilter);
    manager.setComponentEnabledSetting(mms, PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
    assertFalse("a foreign receiver cannot qualify this host", host.eligibleFor(RoleManager.ROLE_SMS));
    assertFalse(host.getContext().getSystemService(RoleManager.class).isRoleHeld(RoleManager.ROLE_SMS));
    noRadioAndNoRetainedOwner(host);
  }
  @Test public void approveOnTheCardDispatchesOnceWithNoDialog() throws Exception {
    Host host = host("approved-sms");
    Shadows.shadowOf(host.getContext().getSystemService(RoleManager.class)).addAvailableRole(RoleManager.ROLE_SMS);
    approve(host, smsSend(TEXT, 1));
    Call send = send("sendSms");
    host.sendSms(send);
    settle();
    noDialog();
    assertNull(send.error);
    assertEquals("submitted", send.result.getString("status"));
    var manager = Shadows.shadowOf(SmsManager.getSmsManagerForSubscriptionId(1));
    assertNotNull("Approve sent the text", manager.getLastSentTextMessageParams());
    assertEquals(NUMBER, manager.getLastSentTextMessageParams().getDestinationAddress());
    assertEquals(TEXT, manager.getLastSentTextMessageParams().getText());
    assertTrue("the approval admitted its one dispatch", host.approvals.get(SCOPE, "cancel-1").has(AlphaApprovedSms.CLAIM));
    manager.clearLastSentTextMessageParams();

    // The same request again (a retry, a reload) is answered from the send journal and never sends again.
    Call repeat = send("sendSms");
    host.sendSms(repeat);
    settle();
    assertEquals("submitted", repeat.result.getString("status"));
    noRadioAndNoRetainedOwner(host);
  }
  @Test public void declinedOrUnapprovedCardSendsNothing() throws Exception {
    Host host = host("declined-sms");
    // Decline: the chat never marks the proposal applying, or never journals it at all.
    Call none = send("sendSms");
    host.sendSms(none);
    settle();
    assertEquals("not-approved", none.error);
    host.approvals.reserve(SCOPE, "cancel-1", "cancel-1", "b".repeat(64), new org.json.JSONObject().put("operation", smsSend(TEXT, 1))
      .put("expiresAt", System.currentTimeMillis() + 600_000).put("context", new org.json.JSONObject().put("sensitive", false)));
    Call reserved = send("sendSms");
    host.sendSms(reserved);
    settle();
    assertEquals("not-approved", reserved.error);
    // A request that names no card at all is not the composer: it cannot send either.
    Call bare = composed("sendSms");
    host.sendSms(bare);
    settle();
    assertEquals("not-approved", bare.error);
    noDialog();
    assertFalse("nothing was journaled", journaled(host));
    noRadioAndNoRetainedOwner(host);
  }
  @Test public void aMismatchedCardCannotDispatch() throws Exception {
    long later = System.currentTimeMillis() + 600_000;
    java.util.List<java.util.function.Consumer<Host>> cases = java.util.Arrays.asList(
      host -> run(() -> approve(host, smsSend("Another text", 1))),
      host -> run(() -> approve(host, smsSend(TEXT, 2))),
      host -> run(() -> approve(host, new org.json.JSONObject().put("type", "sms_send").put("recipients", new org.json.JSONArray().put("+15555550199")).put("body", TEXT).put("subscriptionId", 1))),
      host -> run(() -> approve(host, "cancel-1", "cancel-1", smsSend(TEXT, 1), System.currentTimeMillis() - 1, false)),
      host -> run(() -> approve(host, "cancel-1", "cancel-1", smsSend(TEXT, 1), later, true)),
      // Another proposal's approval, or one journaled under another operation ID, cannot lend itself to this text.
      host -> run(() -> approve(host, "other-card", "other-card", smsSend(TEXT, 1), later, false)),
      host -> run(() -> approve(host, "cancel-1", "other-operation", smsSend(TEXT, 1), later, false)),
      host -> run(() -> approve(host, new org.json.JSONObject().put("type", "sms_compose").put("target", new org.json.JSONObject().put("kind", "number").put("number", "+15555550199")).put("body", TEXT))),
      host -> run(() -> approve(host, new org.json.JSONObject().put("type", "sms_compose").put("target", new org.json.JSONObject().put("kind", "number").put("number", NUMBER)).put("body", TEXT).put("draft", true))),
      host -> run(() -> approve(host, new org.json.JSONObject().put("type", "phone_call").put("target", new org.json.JSONObject().put("kind", "number").put("number", NUMBER)))));
    for (int i = 0; i < cases.size(); i++) {
      Host host = host("mismatch-" + i);
      cases.get(i).accept(host);
      Call send = send("sendSms");
      host.sendSms(send);
      settle();
      assertEquals("case " + i, "not-approved", send.error);
      assertFalse("case " + i + " journaled nothing", journaled(host));
      noRadioAndNoRetainedOwner(host);
    }
  }
  private interface Step { void run() throws Exception; }
  private static void run(Step step) { try { step.run(); } catch (Exception failed) { throw new AssertionError(failed); } }
  @Test public void aReplayedApprovalCannotDispatchAgain() throws Exception {
    Host host = host("replayed-sms");
    approve(host, smsSend(TEXT, 1));
    // The approval already admitted a dispatch whose send record is gone (lost before it was written).
    AlphaApprovedSms.claim(host.approvals, host::reserveSmsClaim, card("cancel-1"), "cancel-1", new String[] {NUMBER}, TEXT, 1, number -> false, System.currentTimeMillis());
    Call replay = send("sendSms");
    host.sendSms(replay);
    settle();
    assertEquals("not-approved", replay.error);
    noDialog();
    noRadioAndNoRetainedOwner(host);
    // The claim is written once: a second claim of the same approval is refused.
    try { AlphaApprovedSms.claim(host.approvals, host::reserveSmsClaim, card("cancel-1"), "cancel-1", new String[] {NUMBER}, TEXT, 1, number -> false, System.currentTimeMillis()); fail("claimed twice"); }
    catch (SecurityException expected) {}
  }
  @Test public void aTextToANumberOrContactMatchesItsApprovedCard() throws Exception {
    org.json.JSONObject toNumber = new org.json.JSONObject().put("type", "sms_compose").put("target", new org.json.JSONObject().put("kind", "number").put("number", "+1 (555) 555-0123")).put("body", TEXT);
    assertTrue("the card's number in its dialable form", AlphaApprovedSms.approves(toNumber, "p", "op", new String[] {NUMBER}, TEXT, 1, number -> false));
    assertFalse(AlphaApprovedSms.approves(toNumber, "p", "op", new String[] {"+15555550199"}, TEXT, 1, number -> true));
    assertFalse(AlphaApprovedSms.approves(toNumber, "p", "op", new String[] {NUMBER, "+15555550199"}, TEXT, 1, number -> true));
    org.json.JSONObject toContact = new org.json.JSONObject().put("type", "sms_compose").put("target", new org.json.JSONObject().put("kind", "contact").put("query", "Carmen")).put("body", TEXT);
    assertTrue("a contact's number the owner picked", AlphaApprovedSms.approves(toContact, "p", "op", new String[] {NUMBER}, TEXT, 1, NUMBER::equals));
    assertFalse("never a number outside the address book", AlphaApprovedSms.approves(toContact, "p", "op", new String[] {NUMBER}, TEXT, 1, number -> false));
    assertFalse(AlphaApprovedSms.approves(toContact, "p", "op", new String[] {NUMBER}, "Other", 1, NUMBER::equals));
    org.json.JSONObject legacy = new org.json.JSONObject().put("type", "sms_compose").put("query", "Carmen").put("body", TEXT);
    assertTrue(AlphaApprovedSms.approves(legacy, "p", "op", new String[] {NUMBER}, TEXT, 1, NUMBER::equals));
    assertFalse("an sms_send names its proposal as the operation", AlphaApprovedSms.approves(smsSend(TEXT, 1), "p", "op", new String[] {NUMBER}, TEXT, 1, number -> true));

    Host host = host("compose-contact");
    Shadows.shadowOf(host.getContext().getSystemService(RoleManager.class)).addAvailableRole(RoleManager.ROLE_SMS);
    host.contactNumbers.add(NUMBER);
    approve(host, "compose-card", "cancel-1", toContact, System.currentTimeMillis() + 600_000, false);
    Call send = new Call("sendSms", request("cancel-1", TEXT, card("compose-card")));
    host.sendSms(send);
    settle();
    noDialog();
    assertEquals("submitted", send.result.getString("status"));
    assertNotNull(Shadows.shadowOf(SmsManager.getSmsManagerForSubscriptionId(1)).getLastSentTextMessageParams());
    Shadows.shadowOf(SmsManager.getSmsManagerForSubscriptionId(1)).clearLastSentTextMessageParams();
    noRadioAndNoRetainedOwner(host);
  }
  @Test public void theBridgeNeverSendsAnMmsOutsideTheComposer() throws Exception {
    Host host = host("bridge-mms", true);
    Call send = send("sendMms");
    host.sendMms(send);
    settle();
    assertEquals("not-approved", send.error);
    noDialog();
    noRadioAndNoRetainedOwner(host);
  }
  @Test public void smsCancellationBeforeJournalReplyMustRetireQueuedSend() throws Exception { queuedCancellation("sendSms", false); }
  @Test public void mmsCancellationBeforeJournalReplyMustRetireQueuedSend() throws Exception { queuedCancellation("sendMms", false); }
  @Test public void backgroundBeforeJournalReplyMustRetireQueuedSend() throws Exception { queuedCancellation("sendSms", true); }
  private void queuedCancellation(String method, boolean background) throws Exception {
    Host host = host(method.toLowerCase(java.util.Locale.ROOT) + (background ? "-background" : "-cancel"), method.equals("sendMms"));
    if (method.equals("sendSms")) approve(host, smsSend(TEXT, 1));
    else Shadows.shadowOf(host.getContext().getSystemService(RoleManager.class)).addHeldRole(RoleManager.ROLE_SMS);
    CountDownLatch entered = new CountDownLatch(1), release = new CountDownLatch(1);
    hold(entered, release);
    Call send = method.equals("sendSms") ? send(method) : composed(method);
    Call cancel = new Call("cancelSmsReview", new JSObject().put("operationId", "cancel-1"));
    try {
      if (method.equals("sendSms")) host.sendSms(send); else host.sendFromComposer(send, () -> {});
      if (background) host.pause(); else host.cancelSmsReview(cancel);
      ShadowLooper.idleMainLooper();
      if (!background) assertEquals("cancellation has already acknowledged", 1, cancel.resolutions);
      release.countDown();
      settle();
      assertNotNull("retired send must settle explicitly", send.result);
      assertEquals("a cancellation must not become a later denial or a send", "cancelled", send.result.getString("status"));
      noDialog();
      assertEquals(1, send.resolutions);
      noRadioAndNoRetainedOwner(host);
    } finally {
      release.countDown();
      SmsTelephony.WORK.submit(() -> {}).get(10, TimeUnit.SECONDS);
    }
  }
  @Test public void cancellationAfterTheClaimFencesQueuedDispatch() throws Exception {
    Host host = host("after-claim");
    approve(host, smsSend(TEXT, 1));
    Call send = send("sendSms");
    host.sendSms(send);
    // The approval is claimed and the dispatch is queued behind other work when the chat retires the card.
    SmsTelephony.WORK.submit(() -> {}).get(10, TimeUnit.SECONDS);
    assertTrue(host.approvals.get(SCOPE, "cancel-1").has(AlphaApprovedSms.CLAIM));
    CountDownLatch entered = new CountDownLatch(1), release = new CountDownLatch(1);
    hold(entered, release);
    try {
      ShadowLooper.idleMainLooper();
      Call cancel = new Call("cancelSmsReview", new JSObject().put("operationId", "cancel-1"));
      host.cancelSmsReview(cancel);
      assertEquals(1, cancel.resolutions);
      release.countDown();
      settle();
      assertNotNull(send.result);
      assertEquals("cancelled", send.result.getString("status"));
      assertEquals(1, send.resolutions);
      noRadioAndNoRetainedOwner(host);
    } finally {
      release.countDown();
      SmsTelephony.WORK.submit(() -> {}).get(10, TimeUnit.SECONDS);
    }
  }
  @Test public void unrelatedCancellationCannotRetireAnotherSend() throws Exception {
    Host host = host("unrelated");
    Shadows.shadowOf(host.getContext().getSystemService(RoleManager.class)).addAvailableRole(RoleManager.ROLE_SMS);
    approve(host, smsSend(TEXT, 1));
    CountDownLatch entered = new CountDownLatch(1), release = new CountDownLatch(1);
    hold(entered, release);
    Call send = send("sendSms");
    try {
      host.sendSms(send);
      Call other = new Call("cancelSmsReview", new JSObject().put("operationId", "other-operation"));
      host.cancelSmsReview(other);
      assertEquals(1, other.resolutions);
      release.countDown();
      settle();
      assertEquals("submitted", send.result.getString("status"));
      Shadows.shadowOf(SmsManager.getSmsManagerForSubscriptionId(1)).clearLastSentTextMessageParams();
      noRadioAndNoRetainedOwner(host);
    } finally {
      release.countDown();
      SmsTelephony.WORK.submit(() -> {}).get(10, TimeUnit.SECONDS);
    }
  }
  @Test public void cancellationCannotEraseARecordedSubmission() throws Exception {
    Host host = host("recorded");
    SmsSendJournal journal = SmsTelephony.journal(host.getContext(), config(host));
    MessagesTestAccess.recordSubmittedDispatch(journal, "cancel-1", new String[]{"+15555550123"}, "Original reviewed text", 1, new int[]{1}, System.currentTimeMillis(), SmsTelephony.boot(host.getContext()));
    CountDownLatch entered = new CountDownLatch(1), release = new CountDownLatch(1);
    SmsTelephony.WORK.execute(() -> {
      entered.countDown();
      try { assertTrue(release.await(10, TimeUnit.SECONDS)); } catch (InterruptedException stopped) { Thread.currentThread().interrupt(); }
    });
    assertTrue(entered.await(10, TimeUnit.SECONDS));
    try {
      Call send = send("sendSms");
      host.sendSms(send);
      Call cancel = new Call("cancelSmsReview", new JSObject().put("operationId", "cancel-1"));
      host.cancelSmsReview(cancel);
      ShadowLooper.idleMainLooper();
      assertEquals(1, cancel.resolutions);
      release.countDown();
      SmsTelephony.WORK.submit(() -> {}).get(10, TimeUnit.SECONDS);
      assertEquals("submitted", send.result.getString("status"));
      assertEquals(1, send.resolutions);
      noRadioAndNoRetainedOwner(host);
    } finally {
      release.countDown();
      SmsTelephony.WORK.submit(() -> {}).get(10, TimeUnit.SECONDS);
    }
  }
  @Test public void ownerApprovedSmsUsesTheSameReceiptWithoutDialogOrReplay() throws Exception {
    Host host = host("owner-sms");
    RoleManager roles = host.getContext().getSystemService(RoleManager.class);
    Shadows.shadowOf(roles).addAvailableRole(RoleManager.ROLE_SMS);
    Call send = composed("sendSms");
    host.sendFromComposer(send, () -> {});
    settle();
    noDialog();
    assertEquals("submitted", send.result.getString("status"));
    var manager = Shadows.shadowOf(SmsManager.getSmsManagerForSubscriptionId(1));
    assertNotNull(manager.getLastSentTextMessageParams());
    manager.clearLastSentTextMessageParams();

    Call repeat = send("sendSms");
    host.sendSms(repeat);
    settle();
    assertEquals("submitted", repeat.result.getString("status"));
    noRadioAndNoRetainedOwner(host);
  }
  @Test public void ownerApprovedMmsUsesTheSameReceiptWithoutDialogOrReplay() throws Exception {
    Host host = host("owner-mms", true);
    RoleManager roles = host.getContext().getSystemService(RoleManager.class);
    Shadows.shadowOf(roles).addHeldRole(RoleManager.ROLE_SMS);
    Call send = composed("sendMms");
    host.sendFromComposer(send, () -> {});
    settle();
    noDialog();
    assertEquals("submitted", send.result.getString("status"));
    var manager = Shadows.shadowOf(SmsManager.getSmsManagerForSubscriptionId(1));
    assertNotNull(manager.getLastSentMultimediaMessageParams());
    manager.clearLastSentMultimediaMessageParams();

    Call repeat = composed("sendMms");
    host.sendFromComposer(repeat, () -> {});
    settle();
    assertEquals("submitted", repeat.result.getString("status"));
    noRadioAndNoRetainedOwner(host);
  }
  @Test public void withdrawnComposerApprovalCannotDispatchOrBeReplayed() throws Exception {
    Host host = host("owner-withdrawn");
    Call send = composed("sendSms");
    host.sendFromComposer(send, () -> { throw new IllegalStateException("Composer approval withdrawn"); });
    settle();
    assertEquals("denied", send.result.getString("status"));

    Call repeat = composed("sendSms");
    host.sendFromComposer(repeat, () -> {});
    settle();
    assertEquals("denied", repeat.result.getString("status"));
    noRadioAndNoRetainedOwner(host);
  }
  @Test public void mmsRetiredAfterStagingRollsBackOnlyItsOwnRow() throws Exception {
    Host host = host("owner-mms-retired", true);
    RoleManager roles = host.getContext().getSystemService(RoleManager.class);
    Shadows.shadowOf(roles).addHeldRole(RoleManager.ROLE_SMS);
    ProviderInfo threads = new ProviderInfo(); threads.authority = "mms-sms";
    Robolectric.buildContentProvider(OutboxProvider.class).create(threads);
    ProviderInfo messages = new ProviderInfo(); messages.authority = "mms";
    OutboxProvider provider = Robolectric.buildContentProvider(OutboxProvider.class).create(messages).get();
    Call send = composed("sendMms");
    host.sendFromComposer(send, () -> {
      if (!provider.outbox.isEmpty()) throw new IllegalStateException("Composer retired during provider staging");
    });
    settle();
    assertEquals("denied", send.result.getString("status"));
    assertEquals(1, provider.parts);
    assertEquals(1, provider.deletes);
    assertEquals(Collections.singleton(OutboxProvider.OWN_ROW + 1), provider.outbox.keySet());
    assertEquals(0, MessagesTestAccess.mmsDirectory(host.getContext()).list().length);

    Call repeat = composed("sendMms");
    host.sendFromComposer(repeat, () -> {});
    settle();
    assertEquals("denied", repeat.result.getString("status"));
    assertEquals(1, provider.deletes);
    noRadioAndNoRetainedOwner(host);
  }
  public static final class DeleteProvider extends ContentProvider {
    static int reads,writes; static Runnable onRead,onDelete;
    @Override public boolean onCreate(){return true;}
    @Override public String getType(Uri uri){return null;}
    @Override public Uri insert(Uri uri,ContentValues values){throw new UnsupportedOperationException();}
    @Override public int update(Uri uri,ContentValues values,String where,String[]args){throw new UnsupportedOperationException();}
    @Override public Cursor query(Uri uri,String[]projection,String where,String[]args,String order){
      reads++;MatrixCursor row=new MatrixCursor(new String[]{"_id","thread_id","date","type"});row.addRow(new Object[]{7,9,1700000000123L,SmsRecords.INBOX});
      Runnable action=onRead;onRead=null;if(action!=null)action.run();return row;
    }
    @Override public int delete(Uri uri,String where,String[]args){
      writes++;assertEquals(Telephony.Sms.CONTENT_URI,uri);Runnable action=onDelete;onDelete=null;if(action!=null)action.run();return 1;
    }
  }
  private static void settleDeletion(Host host)throws Exception{
    Field field=AlphaTelephonyBase.class.getDeclaredField("reader");field.setAccessible(true);
    java.util.concurrent.ExecutorService reader=(java.util.concurrent.ExecutorService)field.get(host);
    reader.submit(()->{}).get(10,TimeUnit.SECONDS);ShadowLooper.idleMainLooper();
  }
  private static Call deleteCall(){
    JSObject data=new JSObject();data.put("id","sms:7");data.put("kind","sms");data.put("threadId","thread:9");data.put("date",1700000000123L);return new Call("deleteMessage",data);
  }
  private static void deleteProvider(){
    DeleteProvider.reads=DeleteProvider.writes=0;DeleteProvider.onRead=DeleteProvider.onDelete=null;
    ProviderInfo info=new ProviderInfo();info.authority="sms";Robolectric.buildContentProvider(DeleteProvider.class).create(info);
  }
  @Test public void deleteRequiresImageForegroundUnlockedDefaultSmsAndReadAuthority()throws Exception{
    deleteProvider();Host denied=host("delete-image");denied.imageAllowed=false;Call call=deleteCall();denied.deleteMessage(call);assertEquals("unavailable",call.error);
    Host background=host("delete-background");background.pause();call=deleteCall();background.deleteMessage(call);assertEquals("unavailable",call.error);
    Host ordinary=host("delete-role");call=deleteCall();ordinary.deleteMessage(call);assertEquals("role-required",call.error);
    Host permission=host("delete-permission");Shadows.shadowOf(permission.getContext().getSystemService(RoleManager.class)).addHeldRole(RoleManager.ROLE_SMS);permission.smsAllowed=false;
    call=deleteCall();permission.deleteMessage(call);assertEquals("permission-required",call.error);
    Host locked=host("delete-locked");Shadows.shadowOf(locked.getContext().getSystemService(KeyguardManager.class)).setIsDeviceLocked(true);call=deleteCall();locked.deleteMessage(call);assertEquals("unavailable",call.error);
    assertEquals(0,DeleteProvider.reads);assertEquals(0,DeleteProvider.writes);
  }
  @Test public void deleteRechecksLifecycleBeforeEffectAndKeepsKnownContentFreeOutcomeAfterwards()throws Exception{
    deleteProvider();Host before=host("delete-race");Shadows.shadowOf(before.getContext().getSystemService(RoleManager.class)).addHeldRole(RoleManager.ROLE_SMS);
    DeleteProvider.onRead=before::pause;Call denied=deleteCall();before.deleteMessage(denied);settleDeletion(before);
    assertEquals("unavailable",denied.error);assertEquals(0,DeleteProvider.writes);
    Host after=host("delete-known");DeleteProvider.onDelete=()->{after.smsAllowed=false;after.pause();};Call known=deleteCall();after.deleteMessage(known);settleDeletion(after);
    assertNull(known.error);assertEquals("deleted",known.result.getString("status"));assertEquals(1,DeleteProvider.writes);
  }

  @Test @Config(sdk=36) public void deleteRefusesANonForegroundAndroidUserProfile()throws Exception{
    deleteProvider();Host host=host("delete-profile");
    Shadows.shadowOf(host.getContext().getSystemService(RoleManager.class)).addHeldRole(RoleManager.ROLE_SMS);
    Shadows.shadowOf(host.getContext().getSystemService(UserManager.class)).setUserForeground(false);
    Call call=deleteCall();host.deleteMessage(call);
    assertEquals("unavailable",call.error);assertEquals(0,DeleteProvider.reads);assertEquals(0,DeleteProvider.writes);
  }
  @Test public void deleteRechecksRoleAndReadPermissionDuringIdentityLookup()throws Exception{
    for(boolean roleLoss:new boolean[]{true,false}){
      deleteProvider();Host host=host(roleLoss?"delete-role-race":"delete-permission-race");
      RoleManager roles=host.getContext().getSystemService(RoleManager.class);Shadows.shadowOf(roles).addHeldRole(RoleManager.ROLE_SMS);
      DeleteProvider.onRead=()->{if(roleLoss)Shadows.shadowOf(roles).removeHeldRole(RoleManager.ROLE_SMS);else host.smsAllowed=false;};
      Call call=deleteCall();host.deleteMessage(call);settleDeletion(host);
      assertEquals("unavailable",call.error);assertEquals(0,DeleteProvider.writes);
    }
  }

}
