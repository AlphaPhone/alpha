package ai.alphacompute.alphaphone;

import ai.eliza.plugins.actionjournal.ActionJournal;
import ai.eliza.plugins.messages.AlphaTelephonyAccess;
import ai.eliza.plugins.messages.CallLogRows;
import ai.eliza.plugins.messages.MessageDeletion;
import ai.eliza.plugins.messages.MmsPdu;
import ai.eliza.plugins.messages.MmsStore;
import ai.eliza.plugins.messages.PhoneInfoReader;
import ai.eliza.plugins.messages.SmsPageCursor;
import ai.eliza.plugins.messages.SmsProviderReader;
import ai.eliza.plugins.messages.SmsRecords;
import ai.eliza.plugins.messages.SmsSendJournal;
import ai.eliza.plugins.messages.SmsTelephony;
import ai.eliza.plugins.messages.SmsTelephonyConfiguration;
import ai.eliza.plugins.messages.VoicemailStore;
import android.Manifest;
import android.app.role.RoleManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.provider.Telephony;
import android.telecom.TelecomManager;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.telephony.TelephonyManager;
import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Pattern;
import org.json.JSONObject;

/**
 * Alpha's telephony bridge: phone roles, SIMs and SMS/MMS on the verified Alpha AOSP image (issues
 * #420 and #421). Forked from the shared {@code TelephonyPlugin} (plugin-native-messages, elizaOS pin
 * 1803ea88) so that Alpha owns how a send is confirmed (the approved card, or the owner's Send in
 * the Messages composer, never a dialog of its own); the bridge methods, their checks, their order and
 * their answers are otherwise the shared ones. {@link AlphaTelephonyPlugin} subclasses this
 * under the Capacitor plugin name {@code AlphaTelephony} (annotation on the subclass only, so plugin
 * discovery never lists this abstract base), MainActivity registers it only when its
 * {@link SmsTelephonyConfiguration#admission} holds, and it declares the permission aliases
 * {@code contacts}, {@code phoneState}, {@code sms} and {@code sendSms}; declaring {@code callLog}
 * (READ_CALL_LOG) as well offers the bounded recent-calls read. Every method checks the admission
 * again, so a standalone APK, a sideloaded launcher or saved renderer state can never reach a
 * provider, a SIM or the radio.
 *
 * The reviewed-send journal, dispatch, provider readers and stores stay shared (plugin-native-messages);
 * their package-private members are reached through {@link AlphaTelephonyAccess}, so a send uses the
 * one process journal the sent and delivery callbacks ({@link AlphaSmsSendReceiver}) settle. The
 * bridge's own answers (rejections and handoff/placement messages) keep the shared sentences: they are
 * keys the renderer words for the owner (ui/telephony/telephony-messages.ts), never shown as they are.
 *
 * Reads: Telecom/SMS roles and default handlers, active subscriptions (phone-state access) and SMS/MMS
 * threads and messages through the Telephony providers (SMS access), recent calls (call-log access, at
 * most {@link CallLogRows#MAX_CALLS} newest rows), in bounded pages, cancelled on background, lock,
 * screen-off and permission change, and fenced again before publication.
 *
 * Voicemail: while Alpha is the default dialer, the bounded list, audio and heard/delete writes of
 * {@link VoicemailStore} over Android's voicemail provider, under the same fence.
 *
 * Effects: {@link #dial} is a handoff to the owner's dialer, which also owns emergency numbers.
 * {@link #placeCall} asks Telecom for a call only while Alpha holds the dialer role and CALL_PHONE,
 * never for an emergency number, and reports only that Telecom accepted the request. A text is sent
 * natively only when SEND_SMS is held (granted on the image, or through the SMS role), on the unlocked
 * phone in front, and only what the owner confirmed: the exact recipients, text and SIM of an agent's
 * card the owner approved in the chat ({@link AlphaApprovedSms}, bound to that card's journal entry), or
 * the owner's Send in the Messages composer that {@link AlphaTelephonyPlugin} guards. No native dialog
 * asks again. The send then follows {@link SmsTelephony}: "sent" only from sent callbacks, "delivered"
 * only from delivery reports, never resent automatically. Without that permission the SMS app handoff
 * remains, and a handoff is never reported as sent. Roles are requested only through Android's own
 * dialog and only when Alpha declares the components the role needs. While Alpha holds the SMS role,
 * opening a conversation marks its received messages read up to the newest one shown
 * ({@link #markThreadRead}); Android accepts that provider write only from the default SMS app.
 */
@androidx.annotation.RequiresApi(29) // RoleManager and SIM carrier identity; the image targets Android 10 and later.
public abstract class AlphaTelephonyBase extends Plugin {
 public static final Pattern NUMBER = Pattern.compile("^\\+?[0-9]{2,20}$");
 public static final int MAX_RECIPIENTS = 10, MAX_BODY = 5000, MAX_SUBSCRIPTIONS = 8, MAX_TEXT = 256;
 /** Fixed answer for a request that reached a destroyed activity; it claims nothing about the effect. */
 public static final String CLOSED = "Android could not show this request; Alpha may have closed. Reopen Alpha and try again.";
 private static final String[] ALIASES = { "contacts", "phoneState", "sms", "sendSms" };
 /** Optional alias: only a host that declares it (and READ_CALL_LOG in its manifest) offers recent calls. */
 private static final String CALL_LOG = "callLog";
 private boolean callLogDeclared;

 /** The host's migration-sensitive identity and capability profile. Called once from {@link #load()}. */
 protected abstract SmsTelephonyConfiguration configuration();
 /** The answer when the image does not admit this install or the phone is locked or in the background. */
 protected String unavailableMessage() { return AlphaImageCapability.UNAVAILABLE; }

 private SmsTelephonyConfiguration config;
 private final ExecutorService reader = Executors.newSingleThreadExecutor();
 private volatile boolean closed, foreground = true;
 private final AtomicLong generation = new AtomicLong();
 private final java.util.Set<android.os.CancellationSignal> reads = java.util.concurrent.ConcurrentHashMap.newKeySet();
 private final android.content.BroadcastReceiver screenOff = new android.content.BroadcastReceiver() {
  @Override public void onReceive(android.content.Context context, Intent intent) { invalidateReads(); }
 };
 private final android.os.Handler main = new android.os.Handler(android.os.Looper.getMainLooper());
 /** Called on {@link SmsTelephony#WORK}. The journal is read there, and only the notice goes to the UI thread. */
 private final SmsTelephony.Listener sendListener = operationId -> {
  boolean group = false;
  try { SmsSendJournal.Record record = SmsTelephony.journal(getContext(), config).get(operationId); group = record != null && record.group; }
  catch (Exception unreadable) { /* The notice still goes out; the renderer reads the result by ID. */ }
  final boolean mms = group;
  main.post(() -> {
   if (!admitted() || !unlockedForeground()) return;
   JSObject value = new JSObject(); value.put("operationId", operationId); notifyListeners(mms ? "mmsSendUpdated" : "smsSendUpdated", value);
  });
 };

 @Override public void load() {
  CapacitorPlugin annotation = getClass().getAnnotation(CapacitorPlugin.class);
  java.util.Set<String> declared = new java.util.HashSet<>();
  if (annotation != null) for (Permission permission : annotation.permissions()) declared.add(permission.alias());
  for (String alias : ALIASES) if (!declared.contains(alias)) throw new IllegalStateException("Telephony host plugin must declare permission alias " + alias);
  callLogDeclared = declared.contains(CALL_LOG);
  config = configuration();
  androidx.core.content.ContextCompat.registerReceiver(getContext(), screenOff, new android.content.IntentFilter(Intent.ACTION_SCREEN_OFF), androidx.core.content.ContextCompat.RECEIVER_NOT_EXPORTED);
  if (admitted()) {
   SmsTelephony.listen(sendListener);
   // Startup reconciliation: an interrupted dispatch becomes unknown; delivery evidence is re-read.
   SmsTelephony.reconcileLater(getContext(), config);
  }
 }
 protected final SmsTelephonyConfiguration telephonyConfiguration() { return config; }
 protected final boolean admitted() { return config != null && config.admission.admitted(getContext()); }
 /** Unlocked, unclosed, foreground user and activity: the only state in which provider content may be published. */
 protected final boolean unlockedForeground() {
  android.app.KeyguardManager lock = getContext().getSystemService(android.app.KeyguardManager.class);
  android.os.UserManager users = getContext().getSystemService(android.os.UserManager.class);
  return !closed && foreground && lock != null && !lock.isDeviceLocked() && users != null && users.isUserUnlocked()
   && (android.os.Build.VERSION.SDK_INT < 31 || users.isUserForeground()) && getActivity() != null && !getActivity().isFinishing() && !getActivity().isDestroyed();
 }
 private void invalidateReads() { generation.incrementAndGet(); for (android.os.CancellationSignal read : reads) read.cancel(); for (SendCall pending : pendingSends) pending.cancelled = true; stopObserving(); stopObservingVoicemail(); }
 @Override protected void handleOnPause() { foreground = false; invalidateReads(); super.handleOnPause(); }
 @Override protected void handleOnResume() { foreground = true; invalidateReads(); resumeObserving(); resumeObservingVoicemail(); super.handleOnResume(); }
 /** Rejects the call unless the profile admits this install and the phone is unlocked with the host in front. */
 protected final boolean refused(PluginCall call) {
  if (call == null) return true;
  if (admitted() && unlockedForeground()) return false;
  call.reject(unavailableMessage(), "unavailable");
  return true;
 }
 protected static String clip(CharSequence value) {
  String text = value == null ? "" : value.toString();
  return text.length() > MAX_TEXT ? text.substring(0, MAX_TEXT) : text;
 }
 /** Runs a request that launches through the activity; a destroyed activity rejects instead of crashing the bridge thread. */
 protected static boolean launch(PluginCall call, Runnable start) {
  try { start.run(); return true; } catch (IllegalStateException gone) { call.reject(CLOSED); return false; }
 }

 // Capacitor's inherited permission request launches through the activity; answer a late call instead of throwing.
 @Override @PluginMethod public void requestPermissions(PluginCall call) { if (refused(call)) return; launch(call, () -> super.requestPermissions(call)); }
 @Override @PluginMethod public void checkPermissions(PluginCall call) { if (refused(call)) return; super.checkPermissions(call); }

 /** Presence of this method in the injected plugin headers is how renderers detect the profile. */
 @PluginMethod public void imageCapability(PluginCall call) {
  if (refused(call)) return;
  JSObject value = new JSObject();
  value.put("version", 1); value.put("image", true); value.put("feature", config.imageFeature);
  call.resolve(value);
 }

 @PluginMethod public void status(PluginCall call) { if (!refused(call)) call.resolve(statusObject()); }

 private JSObject roleState(RoleManager roles, String role, boolean eligible) {
  JSObject value = new JSObject();
  boolean available = roles != null && roles.isRoleAvailable(role);
  value.put("available", available);
  value.put("held", available && roles.isRoleHeld(role));
  value.put("eligible", eligible);
  return value;
 }
 /** Whether the host declares, and has enabled, what Android requires before it grants the role. A request that could only be refused is never shown. */
 protected boolean eligibleFor(String role) {
  PackageManager packages = getContext().getPackageManager();
  String self = getContext().getPackageName();
  if (RoleManager.ROLE_DIALER.equals(role))
   return declares(packages.queryIntentActivities(new Intent(Intent.ACTION_DIAL).setPackage(self), 0))
     && declares(packages.queryIntentServices(new Intent("android.telecom.InCallService").setPackage(self), 0));
  if (RoleManager.ROLE_SMS.equals(role))
   return declares(packages.queryBroadcastReceivers(new Intent(Telephony.Sms.Intents.SMS_DELIVER_ACTION).setPackage(self), 0))
     && declares(packages.queryBroadcastReceivers(new Intent(Telephony.Sms.Intents.WAP_PUSH_DELIVER_ACTION).setType("application/vnd.wap.mms-message").setPackage(self), 0))
     && declares(packages.queryIntentServices(new Intent(TelephonyManager.ACTION_RESPOND_VIA_MESSAGE).setData(Uri.fromParts("smsto", "0", null)).setPackage(self), 0))
     && declares(packages.queryIntentActivities(new Intent(Intent.ACTION_SENDTO).setData(Uri.fromParts("smsto", "0", null)).setPackage(self), 0));
  return false;
 }
 private static boolean declares(List<ResolveInfo> found) { return found != null && !found.isEmpty(); }

 protected JSObject statusObject() {
  JSObject value = new JSObject();
  TelephonyManager telephony = getContext().getSystemService(TelephonyManager.class);
  TelecomManager telecom = getContext().getSystemService(TelecomManager.class);
  RoleManager roles = getContext().getSystemService(RoleManager.class);
  value.put("version", 2);
  value.put("voiceCapable", telephony != null && telephony.isVoiceCapable());
  value.put("smsCapable", telephony != null && telephony.isSmsCapable());
  JSObject permissions = new JSObject();
  PermissionState contacts = getPermissionState("contacts"), phoneState = getPermissionState("phoneState");
  PermissionState sms = getPermissionState("sms"), sendSms = getPermissionState("sendSms");
  permissions.put("contacts", contacts.toString());
  permissions.put("phoneState", phoneState.toString());
  permissions.put("sms", sms.toString());
  permissions.put("sendSms", sendSms.toString());
  if (callLogDeclared) permissions.put(CALL_LOG, getPermissionState(CALL_LOG).toString());
  value.put("permissions", permissions);
  // Direct sends need SEND_SMS (granted, or held through the SMS role) and phone-state access to
  // confirm the reviewed SIM is active. Otherwise the SMS app handoff is the only path.
  boolean direct = telephony != null && telephony.isSmsCapable() && sendSms == PermissionState.GRANTED && phoneState == PermissionState.GRANTED;
  value.put("sendMode", direct ? "direct" : "handoff");
  // Reviewed MMS (group messages and attachments): direct sends, the host's MMS file provider and the
  // SMS role, because Android stores nothing a default SMS app sends. The carrier is checked per send.
  value.put("mmsSend", direct && config != null && config.mmsFileAuthority != null && MmsStore.isDefaultSmsApp(getContext()));
  JSObject roleStates = new JSObject();
  roleStates.put("dialer", roleState(roles, RoleManager.ROLE_DIALER, eligibleFor(RoleManager.ROLE_DIALER)));
  roleStates.put("sms", roleState(roles, RoleManager.ROLE_SMS, eligibleFor(RoleManager.ROLE_SMS)));
  value.put("roles", roleStates);
  String dialer, smsApp;
  try { dialer = telecom == null ? null : telecom.getDefaultDialerPackage(); } catch (RuntimeException unreadable) { dialer = null; }
  try { smsApp = Telephony.Sms.getDefaultSmsPackage(getContext()); } catch (RuntimeException unreadable) { smsApp = null; }
  value.put("defaultDialer", dialer == null ? JSONObject.NULL : dialer);
  value.put("defaultSms", smsApp == null ? JSONObject.NULL : smsApp);
  Object subscriptions = phoneState == PermissionState.GRANTED ? subscriptions() : JSONObject.NULL;
  value.put("subscriptions", subscriptions);
  // The system default SMS subscription, only when it is one of the active SIMs read above.
  Object defaultSubscription = JSONObject.NULL;
  if (subscriptions instanceof JSArray) {
   JSArray rows = (JSArray) subscriptions;
   for (int i = 0; i < rows.length(); i++) { JSONObject row = rows.optJSONObject(i); if (row != null && row.optBoolean("defaultSms")) defaultSubscription = row.optInt("id"); }
  }
  value.put("defaultSmsSubscriptionId", defaultSubscription);
  return value;
 }
 /** Active SIM subscriptions, or JSON null when Android refuses the read: never an empty list in its place. */
 private Object subscriptions() {
  List<SubscriptionInfo> active = SmsTelephony.activeSubscriptions(getContext(), config);
  if (active == null) return JSONObject.NULL;
  JSArray rows = new JSArray();
  int sms = SubscriptionManager.getDefaultSmsSubscriptionId(), voice = SubscriptionManager.getDefaultVoiceSubscriptionId();
  for (SubscriptionInfo info : active) {
   if (rows.length() >= MAX_SUBSCRIPTIONS) break;
   if (info == null || info.getSubscriptionId() < 0 || info.getSimSlotIndex() < 0) continue;
   JSObject row = new JSObject();
   row.put("id", info.getSubscriptionId()); row.put("slot", info.getSimSlotIndex());
   row.put("displayName", clip(info.getDisplayName())); row.put("carrierName", clip(info.getCarrierName()));
   row.put("defaultSms", info.getSubscriptionId() == sms); row.put("defaultVoice", info.getSubscriptionId() == voice);
   rows.put(row);
  }
  return rows;
 }

 /**
  * The owner's SIM lines for a Settings page: carrier, own number, network and device identifiers
  * ({@link PhoneInfoReader}). It needs no permission of its own: {@code access} says which parts
  * Android let this app read, and a part it refused is absent or null, never an error. Without
  * phone-state access the lines are empty and {@code access.phoneState} is false. Read only while
  * unlocked and in front, on the reader thread, and fenced again before publication.
  */
 @PluginMethod public void phoneInfo(PluginCall call) {
  if (refused(call)) return;
  fenced(call, () -> true, "Phone information", cancel -> PhoneInfoReader.read(getContext(), SmsTelephony.activeSubscriptions(getContext(), config), cancel), true);
 }

 /** Asks for contacts, phone-state, SMS or send access in Android's own dialog, only from an explicit request. */
 @PluginMethod public void requestAccess(PluginCall call) {
  if (refused(call)) return;
  String access = call.getString("access", "");
  if (!java.util.Arrays.asList(ALIASES).contains(access) && !(callLogDeclared && CALL_LOG.equals(access))) { call.reject("Choose contacts, phone-state, SMS or send access", "invalid"); return; }
  if (getPermissionState(access) == PermissionState.GRANTED) { call.resolve(statusObject()); return; }
  launch(call, () -> requestPermissionForAlias(access, call, "accessResult"));
 }
 /**
  * Answers a permission or role request. Android delivers the answer before the activity resumes, so
  * the foreground gate would refuse a grant that worked. Until the host is unlocked in front again the
  * answer holds only permission and role state: the SIM list reads as not yet read.
  */
 private void answer(PluginCall call) {
  if (call == null) return;
  if (!admitted() || closed) { call.reject(unavailableMessage(), "unavailable"); return; }
  JSObject value = statusObject();
  if (!unlockedForeground()) { value.put("subscriptions", JSONObject.NULL); value.put("defaultSmsSubscriptionId", JSONObject.NULL); }
  call.resolve(value);
 }
 @PermissionCallback private void accessResult(PluginCall call) { invalidateReads(); answer(call); }

 /** Opens Android's role dialog for the dialer or SMS role. The user decides; the result is re-read. */
 @PluginMethod public void requestRole(PluginCall call) {
  if (refused(call)) return;
  String name = call.getString("role", "");
  String role = "dialer".equals(name) ? RoleManager.ROLE_DIALER : "sms".equals(name) ? RoleManager.ROLE_SMS : null;
  if (role == null) { call.reject("Choose the dialer or SMS role", "invalid"); return; }
  RoleManager roles = getContext().getSystemService(RoleManager.class);
  if (roles == null || !roles.isRoleAvailable(role)) { call.reject("This device does not offer that role", "unavailable"); return; }
  if (roles.isRoleHeld(role)) { call.resolve(statusObject()); return; }
  if (!eligibleFor(role)) { call.reject("This app cannot hold this role in this build. Your current app keeps it.", "not-eligible"); return; }
  launch(call, () -> startActivityForResult(call, roles.createRequestRoleIntent(role), "roleResult"));
 }
 @ActivityCallback private void roleResult(PluginCall call, ActivityResult result) { answer(call); }

 /** One bounded provider read on the reader thread, published only if nothing changed meanwhile. */
 protected interface Read { JSObject read(android.os.CancellationSignal cancel) throws Exception; }
 /**
  * Runs a read that needs the permission alias, cancelled on background, lock, screen-off and
  * permission change, and fenced again on the main thread before the result is published.
  */
 protected final void fencedRead(PluginCall call, String alias, String noun, Read read) { fenced(call, alias, noun, read, true); }
 /**
  * Runs a provider write under the same entry fence as {@link #fencedRead}, then reports its
  * outcome even if access changed while it ran. The write cannot be undone, so rejecting
  * afterwards would claim nothing changed when something did. The outcome must carry no content.
  */
 protected final void fencedWrite(PluginCall call, String alias, String noun, Read write) { fenced(call, alias, noun, write, false); }
 private void fenced(PluginCall call, String alias, String noun, Read read, boolean fenceResult) {
  fenced(call, () -> getPermissionState(alias) == PermissionState.GRANTED, noun, read, fenceResult);
 }
 /** The same fence for access Android grants without a runtime permission dialog (the dialer role's voicemail access). */
 private void fenced(PluginCall call, java.util.function.BooleanSupplier granted, String noun, Read read, boolean fenceResult) {
  if (!granted.getAsBoolean()) { call.reject(noun + " access is not granted", "permission-required"); return; }
  final long access = generation.get();
  final android.os.CancellationSignal cancel = new android.os.CancellationSignal(); reads.add(cancel);
  try {
   reader.execute(() -> {
    try {
     if (!current(access, cancel, granted)) throw new SecurityException();
     JSObject value = read.read(cancel);
     main.post(() -> {
      if (fenceResult && !current(access, cancel, granted)) call.reject(noun + " access changed. Refresh after unlocking.", "unavailable");
      else call.resolve(value);
     });
    } catch (MessageDeletion.Refused refusal) { call.reject(refusal.getMessage(), refusal.code);
    } catch (VoicemailStore.Refused refusal) { call.reject(refusal.getMessage(), refusal.code);
    } catch (Exception unreadable) { call.reject(noun + " could not be read. Check access and refresh.", "unavailable"); }
    finally { reads.remove(cancel); }
   });
  } catch (java.util.concurrent.RejectedExecutionException gone) { reads.remove(cancel); call.reject(CLOSED); }
 }
 private boolean current(long access, android.os.CancellationSignal cancel, java.util.function.BooleanSupplier granted) {
  return !cancel.isCanceled() && access == generation.get() && unlockedForeground() && admitted() && granted.getAsBoolean();
 }

 private JSObject handoff(String status, String target, String handler, String message) {
  JSObject value = new JSObject();
  value.put("status", status); value.put("target", target); value.put("handler", handler == null ? JSONObject.NULL : handler); value.put("message", message);
  return value;
 }
 private void open(PluginCall call, Intent intent, String target, String done) {
  if (refused(call)) return;
  ResolveInfo handler = getContext().getPackageManager().resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY);
  if (handler == null || handler.activityInfo == null) { call.resolve(handoff("unavailable", target, null, "No app on this phone handles this.")); return; }
  try {
   getActivity().startActivity(intent);
   String name = "android".equals(handler.activityInfo.packageName) ? null : handler.activityInfo.packageName;
   call.resolve(handoff("handed-off", target, name, done));
  } catch (ActivityNotFoundException missing) {
   call.resolve(handoff("unavailable", target, null, "No app on this phone handles this."));
  } catch (RuntimeException failure) {
   call.resolve(handoff("failed", target, null, "The app could not be opened. Nothing was sent or dialed."));
  }
 }

 /**
  * The newest recent calls, at most {@link CallLogRows#MAX_CALLS}, of one dial-shape {@code number} when set,
  * read only while unlocked and in front,
  * cancelled on background, lock, screen-off and permission change and fenced again before publication.
  * Numbers are reduced to the dial shape (withheld or undialable entries become ""); voicemail
  * transcriptions, accounts and locations are not read. A host that does not declare call-log access
  * has no recent-calls read: it answers unavailable, never an empty list.
  */
 @PluginMethod public void listRecentCalls(PluginCall call) {
  if (refused(call)) return;
  if (!callLogDeclared) { call.reject("Recent calls are not available in this install.", "unavailable"); return; }
  final int limit = CallLogRows.limit(call.getInt("limit", 25));
  if (limit < 0) { call.reject("Recent-calls limit must be 1 to 50", "invalid"); return; }
  final String number = call.getString("number");
  if (number != null && !CallLogRows.number(number).equals(number)) { call.reject("Not a dialable phone number", "invalid"); return; }
  fencedRead(call, CALL_LOG, "Recent calls", cancel -> {
   // The query keeps only rows that can hold the number with any separators; the loop keeps exact
   // dial-shape matches. The provider row limit applies only when every row is published.
   Uri uri = number != null ? android.provider.CallLog.Calls.CONTENT_URI
     : android.provider.CallLog.Calls.CONTENT_URI.buildUpon()
       .appendQueryParameter(android.provider.CallLog.Calls.LIMIT_PARAM_KEY, String.valueOf(limit)).build();
   String selection = number == null ? null : android.provider.CallLog.Calls.NUMBER + " LIKE ?";
   String[] selectionArgs = number == null ? null : new String[] { "%" + String.join("%", number.split("")) + "%" };
   String[] projection = {
    android.provider.CallLog.Calls._ID, android.provider.CallLog.Calls.NUMBER, android.provider.CallLog.Calls.CACHED_NAME,
    android.provider.CallLog.Calls.DATE, android.provider.CallLog.Calls.DURATION, android.provider.CallLog.Calls.TYPE,
    android.provider.CallLog.Calls.NEW };
   JSArray rows = new JSArray();
   try (android.database.Cursor cursor = getContext().getContentResolver().query(uri, projection, selection, selectionArgs,
     android.provider.CallLog.Calls.DATE + " DESC, " + android.provider.CallLog.Calls._ID + " DESC", cancel)) {
    if (cursor == null) throw new IllegalStateException("Call log unavailable");
    long previous = Long.MAX_VALUE; java.util.Set<String> seen = new java.util.HashSet<>();
    while (rows.length() < limit && cursor.moveToNext()) {
     cancel.throwIfCanceled();
     String id = cursor.getString(0); long date = cursor.getLong(3);
     // A row the shared parser would refuse (bad ID, repeated, out of order) fails the whole read; it is never skipped or repaired.
     if (!CallLogRows.publishable(id, date, previous) || !seen.add(id)) throw new IllegalStateException("Unreadable call-log row");
     previous = date;
     String rowNumber = CallLogRows.number(cursor.getString(1));
     if (number != null && !number.equals(rowNumber)) continue;
     JSObject row = new JSObject();
     row.put("id", id);
     row.put("number", rowNumber);
     String name = cursor.isNull(2) ? null : cursor.getString(2);
     row.put("cachedName", name == null || name.trim().isEmpty() ? JSONObject.NULL : clip(name.trim()));
     row.put("date", date);
     row.put("durationSeconds", CallLogRows.duration(cursor.getLong(4)));
     row.put("type", CallLogRows.type(cursor.getInt(5)));
     row.put("isNew", !cursor.isNull(6) && cursor.getInt(6) != 0);
     rows.put(row);
    }
   }
   JSObject value = new JSObject(); value.put("calls", rows);
   return value;
  });
 }

 /** Opens the user's dialer with this number. The call is placed, or not, there; emergency numbers stay with the system. */
 @PluginMethod public void dial(PluginCall call) {
  if (refused(call)) return;
  String number = call.getString("number", "");
  if (number == null || !NUMBER.matcher(number).matches()) { call.reject("Not a dialable phone number", "invalid"); return; }
  open(call, new Intent(Intent.ACTION_DIAL, Uri.fromParts("tel", number, null)), "dialer",
    "Your phone app is open with the number. Place the call there; this app does not know whether it connects.");
 }

 /** What became of a place-call request. It never says a call connected or was answered. */
 private static JSObject placement(String status, String message) {
  JSObject value = new JSObject(); value.put("status", status); value.put("message", message);
  return value;
 }
 /**
  * Hands a {@code tel:} URI to Telecom on the default calling account and answers {@code "placed"}
  * (Telecom took the request; nothing is known about the call), {@code "failed"} (Android refused
  * it) or {@code "unavailable"}: the same Telecom request the shared {@code TelecomDial.originate}
  * makes for Alpha's dial pad.
  */
 @android.annotation.SuppressLint("MissingPermission") // placeCall checks the dialer role and CALL_PHONE first.
 protected String originate(Uri tel) {
  TelecomManager telecom = getContext().getSystemService(TelecomManager.class);
  if (telecom == null) return "unavailable";
  try {
   android.os.Bundle extras = new android.os.Bundle();
   android.telecom.PhoneAccountHandle account = telecom.getDefaultOutgoingPhoneAccount(tel.getScheme());
   if (account != null) extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, account);
   telecom.placeCall(tel, extras);
   return "placed";
  } catch (SecurityException denied) { return "failed"; }
 }
 /**
  * Places a call the owner asked for, through Telecom, only while the host holds the dialer role and
  * CALL_PHONE and is unlocked in front. An emergency number is never placed from here: the dial
  * screen opens with it, as {@link #dial} does, and the answer is {@code "emergency-handoff"}; a
  * number Android cannot classify is treated the same way. With a call already ringing or in
  * progress the answer is {@code "busy"} and nothing is placed. {@code "placed"} means only that
  * Telecom accepted the request.
  */
 @android.annotation.SuppressLint("MissingPermission")
 @PluginMethod public void placeCall(PluginCall call) {
  if (refused(call)) return;
  String number = call.getString("number", "");
  if (number == null || !NUMBER.matcher(number).matches()) { call.reject("Not a dialable phone number", "invalid"); return; }
  TelephonyManager telephony = getContext().getSystemService(TelephonyManager.class);
  TelecomManager telecom = getContext().getSystemService(TelecomManager.class);
  boolean emergency;
  try { emergency = telephony == null || telephony.isEmergencyNumber(number); } catch (RuntimeException unclassified) { emergency = true; }
  if (emergency) {
   try {
    getActivity().startActivity(new Intent(Intent.ACTION_DIAL, Uri.fromParts("tel", number, null)));
    call.resolve(placement("emergency-handoff", "The dial screen is open with this number. Place the call there."));
   } catch (ActivityNotFoundException missing) { call.resolve(placement("unavailable", "No app on this phone handles this. Nothing was dialed."));
   } catch (RuntimeException failure) { call.resolve(placement("failed", "The dial screen could not be opened. Nothing was dialed.")); }
   return;
  }
  if (telecom == null || !telephony.isVoiceCapable()) { call.resolve(placement("unavailable", "This phone cannot place calls.")); return; }
  if (!dialerRoleHeld()) { call.reject("Make this app your phone app to place calls here.", "role-required"); return; }
  if (getContext().checkSelfPermission(Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) { call.reject("Phone-call access is not granted", "permission-required"); return; }
  final boolean inCall;
  try { inCall = telecom.isInCall(); }
  catch (RuntimeException unreadable) { call.resolve(placement("unavailable", "The phone's call state could not be read. Nothing was dialed.")); return; }
  if (inCall) { call.resolve(placement("busy", "A call is already in progress. Nothing was dialed.")); return; }
  String status = originate(Uri.fromParts("tel", number, null));
  if ("placed".equals(status)) call.resolve(placement("placed", "Android accepted the call request. This does not show whether the call connects."));
  else if ("failed".equals(status)) call.resolve(placement("failed", "Android refused the call request. Nothing was dialed."));
  else call.resolve(placement("unavailable", "This phone cannot place calls."));
 }

 /** Opens the user's SMS app with the reviewed recipients and text. A handoff cannot choose the SIM, so a SIM choice is refused. */
 @PluginMethod public void composeSms(PluginCall call) {
  if (refused(call)) return;
  if (call.getData().has("subscriptionId")) { call.reject("Choose the SIM in your messaging app", "invalid"); return; }
  JSArray recipients = call.getArray("recipients");
  String body = call.getString("body", "");
  if (recipients == null || recipients.length() < 1 || recipients.length() > MAX_RECIPIENTS || body == null || body.trim().isEmpty() || body.length() > MAX_BODY) { call.reject("Invalid message", "invalid"); return; }
  StringBuilder to = new StringBuilder();
  for (int index = 0; index < recipients.length(); index++) {
   String number = recipients.optString(index, "");
   if (!NUMBER.matcher(number).matches()) { call.reject("Invalid recipient", "invalid"); return; }
   if (to.length() > 0) to.append(';');
   to.append(number);
  }
  Intent intent = new Intent(Intent.ACTION_SENDTO, Uri.fromParts("smsto", to.toString(), null)).putExtra("sms_body", body);
  open(call, intent, "sms", "Text is ready in your messaging app. Nothing has been sent.");
 }

 // ---- SMS/MMS provider reads -------------------------------------------------------------------

 private static long before(PluginCall call) { return date(call, "before"); }
 /** A date option in milliseconds: 0 when absent, -1 when it is not a positive whole number. */
 private static long date(PluginCall call, String key) {
  Object raw = call.getData().opt(key);
  if (raw == null || raw == JSONObject.NULL) return 0;
  if (!(raw instanceof Number)) return -1;
  double value = ((Number) raw).doubleValue();
  return Double.isFinite(value) && value == Math.rint(value) && value > 0 && value < 9.0e15 ? (long) value : -1;
 }

 /** Conversation threads, newest first. */
 @PluginMethod public void listThreads(PluginCall call) {
  if (refused(call)) return;
  Integer limit = call.getInt("limit", 20); long before = before(call);
  if (limit == null || limit < 1 || limit > SmsRecords.MAX_THREADS || before < 0) { call.reject("Invalid thread page", "invalid"); return; }
  final SmsPageCursor cursor;
  try { cursor = SmsPageCursor.parse(call.getString("cursor"), true); } catch (RuntimeException invalid) { call.reject("Invalid thread cursor", "invalid"); return; }
  fencedRead(call, "sms", "Messages", cancel -> SmsProviderReader.threads(getContext(), limit, before, cursor, cancel));
 }

 /** Messages of one thread, SMS and MMS, newest first. */
 @PluginMethod public void listMessages(PluginCall call) {
  if (refused(call)) return;
  Integer limit = call.getInt("limit", 25); long before = before(call); long thread = SmsRecords.threadRow(call.getString("threadId", ""));
  if (limit == null || limit < 1 || limit > SmsRecords.MAX_MESSAGES || before < 0 || thread < 1) { call.reject("Invalid message page", "invalid"); return; }
  final SmsPageCursor cursor;
  try { cursor = SmsPageCursor.parse(call.getString("cursor"), false); } catch (RuntimeException invalid) { call.reject("Invalid message cursor", "invalid"); return; }
  fencedRead(call, "sms", "Messages", cancel -> SmsProviderReader.messages(getContext(), thread, limit, before, cursor, cancel));
 }

 /** Reads the latest SMS sender through the foreground fence, masked by default. */
 @PluginMethod public void latestIncomingSender(PluginCall call) {
  if (refused(call)) return;
  fencedRead(call, "sms", "Messages", cancel -> SmsProviderReader.latestIncomingSender(getContext(), cancel, call.getBoolean("includeAddress", false)));
 }

 /**
  * Marks a conversation's received messages read, up to the newest one the owner has on screen
  * ({@code throughDate}, milliseconds), and removes its notice. Keeping read state is the default SMS
  * app's job and Android accepts the write only from that app: elsewhere nothing changes and the
  * answer says so. Same admission, permission and fence as the reads; no content is returned.
  */
 @PluginMethod public void markThreadRead(PluginCall call) {
  if (refused(call)) return;
  long thread = SmsRecords.threadRow(call.getString("threadId", "")), through = date(call, "throughDate");
  if (thread < 1 || through <= 0) { call.reject("Invalid conversation", "invalid"); return; }
  // A write: the entry fence still refuses it when locked, backgrounded or not granted, but once
  // rows are marked read the count is reported (it carries no message content).
  fencedWrite(call, "sms", "Messages", cancel -> {
   JSObject value = new JSObject();
   boolean holder = MmsStore.isDefaultSmsApp(getContext());
   value.put("defaultSmsApp", holder);
   value.put("updated", holder ? MmsStore.markThreadRead(getContext(), thread, through) : 0);
   return value;
  });
 }

 /** Deletes exactly one message the owner selected and confirmed in the host UI; no radio or retry. */
 @PluginMethod public void deleteMessage(PluginCall call) {
  if (refused(call)) return;
  final MessageDeletion.Reference target;
  try { target=MessageDeletion.reference(call.getData()); }
  catch (IllegalArgumentException invalid) { call.reject("Invalid selected message", "invalid"); return; }
  if (!MmsStore.isDefaultSmsApp(getContext())) { call.reject("The default messaging app is required", "role-required"); return; }
  final long selectedGeneration=generation.get();
  fencedWrite(call,"sms","Messages",cancel -> MessageDeletion.delete(getContext(),target,cancel,() ->
    selectedGeneration==generation.get() && admitted() && unlockedForeground()
      && getPermissionState("sms")==PermissionState.GRANTED && MmsStore.isDefaultSmsApp(getContext())));
 }

 // ---- Incoming/outgoing change observation ----------------------------------------------------

 private boolean observeWanted, observing;
 private long observedSequence;
 private final Runnable emitChange = () -> {
  if (!observing || !unlockedForeground() || !admitted() || getPermissionState("sms") != PermissionState.GRANTED) return;
  JSObject value = new JSObject(); value.put("sequence", ++observedSequence);
  // No content leaves here: the renderer re-reads a bounded page.
  notifyListeners("messagesChanged", value);
  SmsTelephony.reconcileLater(getContext(), config);
 };
 private final android.database.ContentObserver providerObserver = new android.database.ContentObserver(main) {
  // Coalesced: at most one notice per 750 ms however many rows change.
  @Override public void onChange(boolean self) { main.removeCallbacks(emitChange); main.postDelayed(emitChange, 750); }
 };
 private void startObserving() {
  if (observing) return;
  android.content.ContentResolver resolver = getContext().getContentResolver();
  try {
   resolver.registerContentObserver(Telephony.Sms.CONTENT_URI, true, providerObserver);
   resolver.registerContentObserver(Telephony.Mms.CONTENT_URI, true, providerObserver);
   resolver.registerContentObserver(Telephony.MmsSms.CONTENT_URI, true, providerObserver);
   observing = true;
  } catch (RuntimeException refusedObserver) { resolver.unregisterContentObserver(providerObserver); observing = false; }
 }
 private void stopObserving() {
  main.removeCallbacks(emitChange);
  if (!observing) return;
  observing = false;
  getContext().getContentResolver().unregisterContentObserver(providerObserver);
 }
 private void resumeObserving() {
  if (!observeWanted || !admitted() || getPermissionState("sms") != PermissionState.GRANTED || !unlockedForeground()) return;
  startObserving();
  main.removeCallbacks(emitChange); main.post(emitChange);
 }

 /** Starts or stops content-free change notices ("messagesChanged") while the host is unlocked in the foreground. */
 @PluginMethod public void observeMessages(PluginCall call) {
  if (refused(call)) return;
  Boolean enabled = call.getBoolean("enabled", false);
  if (enabled == null || !enabled) { observeWanted = false; stopObserving(); call.resolve(); return; }
  if (getPermissionState("sms") != PermissionState.GRANTED) { call.reject("Messages access is not granted", "permission-required"); return; }
  observeWanted = true; startObserving();
  if (!observing) { observeWanted = false; call.reject("Messages could not be observed", "unavailable"); return; }
  call.resolve();
 }

 // ---- Visual voicemail (VoicemailContract) ----------------------------------------------------

 private static final String READ_VOICEMAIL = "com.android.voicemail.permission.READ_VOICEMAIL", WRITE_VOICEMAIL = "com.android.voicemail.permission.WRITE_VOICEMAIL";
 private boolean dialerRoleHeld() {
  RoleManager roles = getContext().getSystemService(RoleManager.class);
  return roles != null && roles.isRoleAvailable(RoleManager.ROLE_DIALER) && roles.isRoleHeld(RoleManager.ROLE_DIALER);
 }
 /** Android lets the default dialer, or a holder of the voicemail permission, read or change every source's voicemail. No dialog grants it. */
 private boolean voicemailReadable() { return dialerRoleHeld() || getContext().checkSelfPermission(READ_VOICEMAIL) == PackageManager.PERMISSION_GRANTED; }
 private boolean voicemailWritable() { return dialerRoleHeld() || getContext().checkSelfPermission(WRITE_VOICEMAIL) == PackageManager.PERMISSION_GRANTED; }
 /** The default calling account as {flattened component, account ID}, or two nulls when Android names none or refuses the read. */
 @android.annotation.SuppressLint("MissingPermission")
 private String[] voiceAccount() {
  try {
   TelecomManager telecom = getContext().getSystemService(TelecomManager.class);
   android.telecom.PhoneAccountHandle handle = telecom == null ? null : telecom.getDefaultOutgoingPhoneAccount("tel");
   if (handle != null) return new String[] { handle.getComponentName().flattenToString(), handle.getId() };
  } catch (RuntimeException unreadable) { /* Every source's status then counts. */ }
  return new String[] { null, null };
 }
 private boolean callLogReadable() { return callLogDeclared && getPermissionState(CALL_LOG) == PermissionState.GRANTED; }
 private static long voicemail(PluginCall call) { return VoicemailStore.row(call.getString("id")); }

 /**
  * Whether this app may read voicemail, and the carrier state its sources report for the default
  * calling account: {@code {access, state}}. Without access the state is null (not read), never
  * "unsupported".
  */
 @PluginMethod public void voicemailStatus(PluginCall call) {
  if (refused(call)) return;
  if (!voicemailReadable()) { JSObject value = new JSObject(); value.put("access", false); value.put("state", JSONObject.NULL); call.resolve(value); return; }
  final String[] account = voiceAccount();
  fenced(call, this::voicemailReadable, "Voicemail", cancel -> {
   JSObject value = new JSObject(); value.put("access", true); value.put("state", VoicemailStore.carrierState(getContext(), account[0], account[1], cancel));
   return value;
  }, true);
 }
 /** The newest voicemails (at most {@link VoicemailStore#MAX_VOICEMAILS}) with the carrier state; see {@link VoicemailStore#list}. */
 @PluginMethod public void listVoicemail(PluginCall call) {
  if (refused(call)) return;
  final int limit = VoicemailStore.limit(call.getInt("limit", 25));
  if (limit < 0) { call.reject("Voicemail limit must be 1 to 50", "invalid"); return; }
  final String[] account = voiceAccount(); final boolean names = callLogReadable();
  fenced(call, this::voicemailReadable, "Voicemail", cancel -> VoicemailStore.list(getContext(), limit, account[0], account[1], names, cancel), true);
 }
 /** Asks the voicemail's source to download its audio when it is not on the phone; see {@link VoicemailStore#fetch}. */
 @PluginMethod public void fetchVoicemailAudio(PluginCall call) {
  if (refused(call)) return;
  final long id = voicemail(call);
  if (id < 0) { call.reject("Invalid voicemail", "invalid"); return; }
  fenced(call, this::voicemailReadable, "Voicemail", cancel -> { JSObject value = new JSObject(); value.put("status", VoicemailStore.fetch(getContext(), id, cancel)); return value; }, true);
 }
 /** One voicemail's audio in base64, at most {@link VoicemailStore#MAX_AUDIO_BYTES}, for playback and on-device transcription. */
 @PluginMethod public void voicemailAudio(PluginCall call) {
  if (refused(call)) return;
  final long id = voicemail(call);
  if (id < 0) { call.reject("Invalid voicemail", "invalid"); return; }
  fenced(call, this::voicemailReadable, "Voicemail", cancel -> VoicemailStore.audio(getContext(), id, cancel), true);
 }
 /**
  * One voicemail decoded to 16 kHz mono PCM16 WAV in base64 for on-device transcription
  * ({@link VoicemailPcm}). The decode runs on the reader thread and is cancelled, and its result
  * dropped, when the host leaves the foreground or the phone locks.
  */
 @PluginMethod public void voicemailPcm(PluginCall call) {
  if (refused(call)) return;
  final long id = voicemail(call);
  if (id < 0) { call.reject("Invalid voicemail", "invalid"); return; }
  fenced(call, this::voicemailReadable, "Voicemail", cancel -> VoicemailStore.pcm(getContext(), id, cancel), true);
 }
 /** Marks one voicemail heard: {@code {status: "marked" | "not-found"}}. Reported even if access changed meanwhile. */
 @PluginMethod public void markVoicemailHeard(PluginCall call) {
  if (refused(call)) return;
  final long id = voicemail(call);
  if (id < 0) { call.reject("Invalid voicemail", "invalid"); return; }
  fenced(call, this::voicemailWritable, "Voicemail", cancel -> { JSObject value = new JSObject(); value.put("status", VoicemailStore.markHeard(getContext(), id) ? "marked" : "not-found"); return value; }, false);
 }
 /** Deletes one voicemail the owner chose: {@code {status: "deleted" | "not-found"}}. Reported even if access changed meanwhile. */
 @PluginMethod public void deleteVoicemail(PluginCall call) {
  if (refused(call)) return;
  final long id = voicemail(call);
  if (id < 0) { call.reject("Invalid voicemail", "invalid"); return; }
  fenced(call, this::voicemailWritable, "Voicemail", cancel -> { JSObject value = new JSObject(); value.put("status", VoicemailStore.delete(getContext(), id) ? "deleted" : "not-found"); return value; }, false);
 }

 private boolean voicemailWanted, voicemailObserving;
 private long voicemailSequence;
 private final Runnable emitVoicemailChange = () -> {
  if (!voicemailObserving || !unlockedForeground() || !admitted() || !voicemailReadable()) return;
  JSObject value = new JSObject(); value.put("sequence", ++voicemailSequence);
  // No content leaves here: the renderer re-reads a bounded list.
  notifyListeners("voicemailChanged", value);
 };
 private final android.database.ContentObserver voicemailObserver = new android.database.ContentObserver(main) {
  @Override public void onChange(boolean self) { main.removeCallbacks(emitVoicemailChange); main.postDelayed(emitVoicemailChange, 750); }
 };
 private void startObservingVoicemail() {
  if (voicemailObserving) return;
  android.content.ContentResolver resolver = getContext().getContentResolver();
  try {
   resolver.registerContentObserver(android.provider.VoicemailContract.Voicemails.CONTENT_URI, true, voicemailObserver);
   resolver.registerContentObserver(android.provider.VoicemailContract.Status.CONTENT_URI, true, voicemailObserver);
   voicemailObserving = true;
  } catch (RuntimeException refusedObserver) { resolver.unregisterContentObserver(voicemailObserver); voicemailObserving = false; }
 }
 private void stopObservingVoicemail() {
  main.removeCallbacks(emitVoicemailChange);
  if (!voicemailObserving) return;
  voicemailObserving = false;
  getContext().getContentResolver().unregisterContentObserver(voicemailObserver);
 }
 private void resumeObservingVoicemail() {
  if (!voicemailWanted || !admitted() || !voicemailReadable() || !unlockedForeground()) return;
  startObservingVoicemail();
  main.removeCallbacks(emitVoicemailChange); main.post(emitVoicemailChange);
 }
 /** Starts or stops content-free change notices ("voicemailChanged") while the host is unlocked in the foreground. */
 @PluginMethod public void observeVoicemail(PluginCall call) {
  if (refused(call)) return;
  Boolean enabled = call.getBoolean("enabled", false);
  if (enabled == null || !enabled) { voicemailWanted = false; stopObservingVoicemail(); call.resolve(); return; }
  if (!voicemailReadable()) { call.reject("Voicemail access is not granted", "permission-required"); return; }
  voicemailWanted = true; startObservingVoicemail();
  if (!voicemailObserving) { voicemailWanted = false; call.reject("Voicemail could not be observed", "unavailable"); return; }
  call.resolve();
 }

 // ---- Approved native sends ------------------------------------------------------------------

 /** Every queued send keeps its own cancellation owner until its original bridge call settles. */
 private final java.util.Set<SendCall> pendingSends = java.util.concurrent.ConcurrentHashMap.newKeySet();
 private final class SendCall extends PluginCall {
  private final PluginCall original;
  private final SmsTelephony.DispatchGuard ownerGuard;
  private volatile boolean cancelled;
  SendCall(PluginCall original) { this(original, null); }
  SendCall(PluginCall original, SmsTelephony.DispatchGuard ownerGuard) {
   super(null, original.getPluginId(), original.getCallbackId(), original.getMethodName(), original.getData());
   this.original = original;
   this.ownerGuard = ownerGuard;
   pendingSends.add(this);
  }
  @Override public void resolve() { pendingSends.remove(this); original.resolve(); }
  @Override public void resolve(JSObject value) { pendingSends.remove(this); original.resolve(value); }
  @Override public void reject(String message, String code, Exception cause, JSObject data) { pendingSends.remove(this); original.reject(message, code, cause, data); }
 }
 /** Why a direct send is not permitted now, or null. Nothing is sent when this is non-null. */
 private String sendBlocker(int subscriptionId) {
  TelephonyManager telephony = getContext().getSystemService(TelephonyManager.class);
  if (telephony == null || !telephony.isSmsCapable()) return "This phone cannot send text messages.";
  if (getPermissionState("sendSms") != PermissionState.GRANTED) return "This app may not send texts. Use your messaging app.";
  if (getPermissionState("phoneState") != PermissionState.GRANTED) return "Allow phone-state access so the SIM can be confirmed.";
  return activeSubscription(subscriptionId) == null ? "That SIM is not active now. Review the message again." : null;
 }
 private SubscriptionInfo activeSubscription(int id) {
  List<SubscriptionInfo> active = SmsTelephony.activeSubscriptions(getContext(), config);
  if (active != null) for (SubscriptionInfo info : active) if (info != null && info.getSubscriptionId() == id && info.getSimSlotIndex() >= 0) return info;
  return null;
 }
 private SmsTelephony.DispatchGuard sendGuard(SendCall call, int sub, SubscriptionInfo chosen,
   java.util.function.BooleanSupplier blocked) {
  final int slot = chosen.getSimSlotIndex(), carrier = chosen.getCarrierId();
  return () -> {
   SubscriptionInfo current = activeSubscription(sub);
   if (call.cancelled || !admitted() || !unlockedForeground() || blocked.getAsBoolean()
     || current == null || current.getSimSlotIndex() != slot || current.getCarrierId() != carrier)
    throw new IllegalStateException("Approved SIM or access changed");
   if (call.ownerGuard != null) call.ownerGuard.check();
  };
 }
 private static String[] numbers(JSArray recipients) {
  if (recipients == null) return null;
  String[] out = new String[recipients.length()];
  for (int i = 0; i < out.length; i++) { Object value = recipients.opt(i); if (!(value instanceof String)) return null; out[i] = (String) value; }
  return out;
 }
 /** The action journal the chat records each approved card in ({@link AlphaApprovedSms}). */
 protected ActionJournal approvals() { return AlphaActionJournal.get(getContext()); }
 /** Whether this exact number belongs to a contact (Android's own number matching). Runs on {@link SmsTelephony#WORK}. */
 protected boolean contactNumber(String number) {
  if (getPermissionState("contacts") != PermissionState.GRANTED) return false;
  try { return AlphaContactLookup.name(getContext(), number, new android.os.CancellationSignal()) != null; }
  catch (RuntimeException unreadable) { return false; }
 }

 /**
  * Sends an agent-proposed text natively once the owner approved its card in the chat. The approved
  * card is the confirmation: no dialog follows. The request names the card's journal entry
  * ({@code journalIdentity}: scope and proposal ID), and {@link AlphaApprovedSms} admits exactly the
  * recipients, text and SIM that entry approved, once; anything else is refused with "not-approved"
  * and nothing is journaled or sent. The operation ID is the idempotency key: a repeated ID returns
  * its journaled result and never sends again. The result is the shared `SmsSendResult`; "submitted"
  * proves only that Android accepted the request. The journal is read and written on
  * {@link SmsTelephony#WORK}, and the platform send calls run there.
  */
 @PluginMethod public void sendSms(PluginCall call) {
  if (refused(call)) return;
  startSms(new SendCall(call));
 }
 /**
  * Host-native entry point for a composer where the owner already approved this exact operation.
  * Only the host can establish that authorization. Its guard must throw if the same owner approval
  * is no longer valid and must be safe to call on the send worker, including for multipart sends.
  */
 protected final void sendOwnerApprovedSms(PluginCall call, SmsTelephony.DispatchGuard ownerGuard) {
  java.util.Objects.requireNonNull(ownerGuard);
  if (!refused(call)) startSms(new SendCall(call, ownerGuard));
 }
 private void startSms(SendCall call) {
  String operationId = call.getString("operationId"), body = call.getString("body");
  String[] recipients = numbers(call.getArray("recipients"));
  Object rawSubscription = call.getData().opt("subscriptionId");
  int subscriptionId = rawSubscription instanceof Integer ? (Integer) rawSubscription : -1;
  final JSONObject approval = call.ownerGuard == null ? call.getData().optJSONObject("journalIdentity") : null;
  try { SmsSendJournal.validate(operationId, recipients, body, subscriptionId); }
  catch (IllegalArgumentException invalid) { call.reject("Invalid reviewed message", "invalid"); return; }
  SmsTelephony.WORK.execute(() -> {
   final SmsSendJournal journal;
   final SmsSendJournal.Record existing;
   final String binding;
   try {
    journal = SmsTelephony.journal(getContext(), config);
    binding = SmsSendJournal.sha256(SmsSendJournal.bindingText(recipients, body, subscriptionId));
    existing = journal.existing(operationId, binding);
   } catch (SmsSendJournal.Expired expired) { call.reject("This request is too old to read back. Nothing was sent again.", "expired"); return; }
   catch (IllegalStateException reused) { call.reject("This request was already used for a different message. Nothing was sent.", "invalid"); return; }
   catch (Exception unreadable) { call.reject("The send record could not be read. Nothing was sent.", "unavailable"); return; }
   if (existing != null) { call.resolve(SmsTelephony.result(existing)); return; }
   if (call.ownerGuard == null) {
    try { AlphaApprovedSms.claim(approvals(), approval, operationId, recipients, body, subscriptionId, this::contactNumber, System.currentTimeMillis()); }
    catch (Exception notApproved) { call.reject("This text is not the one approved on its card. Nothing was sent.", "not-approved"); return; }
   }
   main.post(() -> sendSmsOnMain(call, journal, binding, operationId, recipients, body, subscriptionId));
  });
 }
 private void sendSmsOnMain(SendCall call, SmsSendJournal journal, String binding, String operationId, String[] recipients, String body, int subscriptionId) {
  final long now = System.currentTimeMillis(), boot = SmsTelephony.boot(getContext());
  if (call.cancelled) { decide(call, journal, operationId, recipients, body, subscriptionId, "cancelled", now, boot); return; }
  if (refused(call)) return;
  if (sendBlocker(subscriptionId) != null || !unlockedForeground()) { decide(call, journal, operationId, recipients, body, subscriptionId, "denied", now, boot); return; }
  final ArrayList<String> parts;
  try { parts = AlphaTelephonyAccess.manager(getContext(), subscriptionId).divideMessage(body); }
  catch (RuntimeException unavailable) { decide(call, journal, operationId, recipients, body, subscriptionId, "denied", now, boot); return; }
  // Too long for SMS: refused before any platform call and recorded as denied, like the other refusals.
  if (parts == null || parts.isEmpty() || parts.size() > SmsSendJournal.MAX_PARTS_PER_RECIPIENT) { decide(call, journal, operationId, recipients, body, subscriptionId, "denied", now, boot); return; }
  SubscriptionInfo sim = activeSubscription(subscriptionId);
  if (sim == null) { decide(call, journal, operationId, recipients, body, subscriptionId, "denied", now, boot); return; }
  final int sub = subscriptionId;
  final SmsTelephony.DispatchGuard guard = sendGuard(call, sub, sim, () -> sendBlocker(sub) != null);
  SmsTelephony.WORK.execute(() -> {
   try { call.resolve(SmsTelephony.result(AlphaTelephonyAccess.dispatch(getContext(), config, journal, operationId, recipients, body, sub, parts, guard))); }
   catch (Exception unrecorded) {
    final SmsSendJournal.Record record;
    try { record = journal.existing(operationId, binding); }
    catch (SmsSendJournal.Expired expired) { call.reject("This request is too old to read back. Nothing was sent again.", "expired"); return; }
    catch (IllegalStateException reused) { call.reject("This request was already used for a different message. Nothing was sent.", "invalid"); return; }
    // If nothing reached Android, close the ID against later dispatch.
    if (record != null) call.resolve(SmsTelephony.result(record));
    else decide(call, journal, operationId, recipients, body, sub, call.cancelled ? "cancelled" : "denied", now, boot);
   }
  });
 }
 private void decide(PluginCall call, SmsSendJournal journal, String operationId, String[] recipients, String body, int subscriptionId, String decision, long now, long boot) {
  SmsTelephony.WORK.execute(() -> {
   try { call.resolve(SmsTelephony.result(AlphaTelephonyAccess.decide(journal, operationId, recipients, body, subscriptionId, decision, now, boot))); }
   catch (Exception unrecorded) { call.reject("Nothing was sent.", "unavailable"); }
  });
 }

 /**
  * An invalidated agent approval (the chat retired its card, or the action was aborted) cancels only
  * its own send, while it is still queued before dispatch; it is then recorded "cancelled". A send
  * already handed to Android keeps its receipt. The bridge name is the shared one.
  */
 @PluginMethod public void cancelSmsReview(PluginCall call) {
  if (refused(call)) return;
  final String operationId = call.getString("operationId", "");
  for (SendCall pending : pendingSends) if (operationId.equals(pending.getString("operationId"))) pending.cancelled = true;
  call.resolve();
 }

 /** Bounded receipt metadata only; drafts and phone numbers never enter this history response. */
 @PluginMethod public void smsSendHistory(PluginCall call) {
  if (refused(call)) return;
  try {
   JSArray rows = new JSArray();
   for (SmsSendJournal.Record record : SmsTelephony.journal(getContext(), config).recent(SmsSendJournal.MAX_RECORDS)) if (!record.group) rows.put(SmsTelephony.result(record));
   JSObject result = new JSObject(); result.put("receipts", rows); call.resolve(result);
  } catch (Exception unreadable) { call.reject("The send history could not be read.", "unavailable"); }
 }

 /** The journaled result of a reviewed send. Reading never sends. */
 @PluginMethod public void smsSendResult(PluginCall call) {
  if (refused(call)) return;
  String operationId = call.getString("operationId", "");
  if (operationId == null || !SmsSendJournal.OPERATION.matcher(operationId).matches()) { call.reject("Invalid send", "invalid"); return; }
  try {
   SmsSendJournal.Record record = SmsTelephony.journal(getContext(), config).get(operationId);
   if (record == null || record.group) call.reject("No send with this ID", "not-found"); else call.resolve(SmsTelephony.result(record));
  } catch (Exception unreadable) { call.reject("The send record could not be read.", "unavailable"); }
 }

 // ---- Reviewed native MMS (mms.send.v1) ----------------------------------------------------------

 /** Why a reviewed MMS is not permitted now, or null. Nothing is sent when this is non-null. */
 private String mmsBlocker(int subscriptionId) {
  String sms = sendBlocker(subscriptionId);
  if (sms != null) return sms;
  if (config.mmsFileAuthority == null) return "This app cannot send group messages or pictures.";
  if (!MmsStore.isDefaultSmsApp(getContext())) return "Make this app your SMS app to send group messages and pictures.";
  try {
   android.os.Bundle carrier = AlphaTelephonyAccess.manager(getContext(), subscriptionId).getCarrierConfigValues();
   if (carrier != null && !carrier.getBoolean(android.telephony.SmsManager.MMS_CONFIG_MMS_ENABLED, true)) return "This SIM's carrier does not allow MMS.";
  } catch (RuntimeException unreadable) { return "This SIM's MMS settings could not be read."; }
  return null;
 }
 private int mmsMaxBytes(int subscriptionId) {
  try {
   android.os.Bundle carrier = AlphaTelephonyAccess.manager(getContext(), subscriptionId).getCarrierConfigValues();
   int max = carrier == null ? 0 : carrier.getInt(android.telephony.SmsManager.MMS_CONFIG_MAX_MESSAGE_SIZE, 0);
   return max > 0 ? Math.min(max, SmsSendJournal.MAX_MMS_BYTES + 64 * 1024) : 300 * 1024;
  } catch (RuntimeException unreadable) { return 300 * 1024; }
 }
 /** The bound attachments and their exact bytes; null when a field, the size or the SHA-256 does not match. */
 private static Object[] attachments(JSArray raw) {
  if (raw == null || raw.length() > SmsSendJournal.MAX_MMS_ATTACHMENTS) return null;
  SmsSendJournal.Attachment[] bound = new SmsSendJournal.Attachment[raw.length()];
  byte[][] data = new byte[raw.length()][];
  for (int i = 0; i < bound.length; i++) {
   JSONObject a = raw.optJSONObject(i);
   if (a == null || a.length() != 5) return null;
   String type = a.optString("contentType", null), name = a.optString("name", null), sha = a.optString("sha256", null), encoded = a.optString("data", null);
   Object size = a.opt("size");
   if (type == null || name == null || sha == null || encoded == null || !(size instanceof Integer) || encoded.length() > (SmsSendJournal.MAX_MMS_BYTES / 3 + 1) * 4) return null;
   try { data[i] = java.util.Base64.getDecoder().decode(encoded); } catch (IllegalArgumentException invalid) { return null; }
   if (data[i].length != (Integer) size || !sha.equals(sha256(data[i]))) return null;
   bound[i] = new SmsSendJournal.Attachment(type, name, sha, (Integer) size);
  }
  return new Object[] { bound, data };
 }
 private static String sha256(byte[] bytes) {
  try {
   byte[] digest = java.security.MessageDigest.getInstance("SHA-256").digest(bytes);
   StringBuilder hex = new StringBuilder(64);
   for (byte b : digest) hex.append(Character.forDigit((b >> 4) & 15, 16)).append(Character.forDigit(b & 15, 16));
   return hex.toString();
  } catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
 }

 /**
  * The bridge's MMS entry point. No agent card proposes an MMS, so there is no approval that could
  * confirm one here: pictures and group messages are sent only from the Messages composer, where the
  * owner's Send is the confirmation ({@link #sendOwnerApprovedMms}). Nothing is journaled or sent.
  */
 @PluginMethod public void sendMms(PluginCall call) {
  if (refused(call)) return;
  call.reject("Send pictures and group messages from the Messages composer. Nothing was sent.", "not-approved");
 }
 /**
  * Sends one MMS the owner sent from the Messages composer to every recipient (a group conversation
  * when there are several), with its text and image attachments. The operation ID is the caller's
  * idempotency key: a repeat returns its journaled `MmsSendResult` and never sends again. A send
  * retired before dispatch records "cancelled". "sent" is the carrier's send confirmation; MMS
  * delivery is never claimed. As for {@link #sendSms}, the journal and the platform send call stay
  * off the UI thread. See {@link #sendOwnerApprovedSms} for the guard.
  */
 protected final void sendOwnerApprovedMms(PluginCall call, SmsTelephony.DispatchGuard ownerGuard) {
  java.util.Objects.requireNonNull(ownerGuard);
  if (!refused(call)) startMms(new SendCall(call, ownerGuard));
 }
 private void startMms(SendCall call) {
  String operationId = call.getString("operationId"), body = call.getString("body");
  String[] recipients = numbers(call.getArray("recipients"));
  Object rawSubscription = call.getData().opt("subscriptionId");
  int subscriptionId = rawSubscription instanceof Integer ? (Integer) rawSubscription : -1;
  Object[] bound = attachments(call.getArray("attachments"));
  if (bound == null) { call.reject("Invalid reviewed message", "invalid"); return; }
  final SmsSendJournal.Attachment[] attachments = (SmsSendJournal.Attachment[]) bound[0];
  final byte[][] data = (byte[][]) bound[1];
  try { SmsSendJournal.validateMms(operationId, recipients, body, attachments, subscriptionId); }
  catch (IllegalArgumentException invalid) { call.reject("Invalid reviewed message", "invalid"); return; }
  SmsTelephony.WORK.execute(() -> {
   final SmsSendJournal journal;
   final SmsSendJournal.Record existing;
   final String binding;
   try {
    journal = SmsTelephony.journal(getContext(), config);
    binding = SmsSendJournal.sha256(SmsSendJournal.mmsBindingText(recipients, body, attachments, subscriptionId));
    existing = journal.existing(operationId, binding);
    if (existing != null && !existing.group) throw new IllegalStateException("operation reused");
   } catch (SmsSendJournal.Expired expired) { call.reject("This request is too old to read back. Nothing was sent again.", "expired"); return; }
   catch (IllegalStateException reused) { call.reject("This request was already used for a different message. Nothing was sent.", "invalid"); return; }
   catch (Exception unreadable) { call.reject("The send record could not be read. Nothing was sent.", "unavailable"); return; }
   if (existing != null) { call.resolve(SmsTelephony.result(existing)); return; }
   main.post(() -> sendMmsOnMain(call, journal, binding, operationId, recipients, body, attachments, data, subscriptionId));
  });
 }
 private void sendMmsOnMain(SendCall call, SmsSendJournal journal, String binding, String operationId, String[] recipients, String body, SmsSendJournal.Attachment[] attachments, byte[][] data, int subscriptionId) {
  final long now = System.currentTimeMillis(), boot = SmsTelephony.boot(getContext());
  if (call.cancelled) { decideMms(call, journal, operationId, recipients, body, attachments, subscriptionId, "cancelled", now, boot); return; }
  if (refused(call)) return;
  final String[] to = recipients; final int sub = subscriptionId;
  if (mmsBlocker(sub) != null || !unlockedForeground()) { decideMms(call, journal, operationId, to, body, attachments, sub, "denied", now, boot); return; }
  final List<MmsPdu.Part> parts = AlphaTelephonyAccess.mmsParts(body, attachments, data);
  final byte[] pdu;
  try { pdu = MmsPdu.encodeSendRequest(AlphaTelephonyAccess.mmsTransaction(operationId), java.util.Arrays.asList(recipients), null, parts); }
  catch (IllegalArgumentException invalid) { call.reject("Invalid reviewed message", "invalid"); return; }
  if (pdu.length > mmsMaxBytes(sub)) { call.reject("This message is larger than the carrier allows. Remove or shrink an attachment and review again.", "too-large"); return; }
  SubscriptionInfo sim = activeSubscription(sub);
  if (sim == null) { decideMms(call, journal, operationId, to, body, attachments, sub, "denied", now, boot); return; }
  final SmsTelephony.DispatchGuard guard = sendGuard(call, sub, sim, () -> mmsBlocker(sub) != null);
  SmsTelephony.WORK.execute(() -> {
   try { call.resolve(SmsTelephony.result(AlphaTelephonyAccess.dispatchMms(getContext(), config, journal, operationId, to, body, attachments, pdu, parts, sub, guard))); }
   catch (Exception unrecorded) {
    final SmsSendJournal.Record record;
    try {
     record = journal.existing(operationId, binding);
     if (record != null && !record.group) throw new IllegalStateException("operation reused");
    } catch (SmsSendJournal.Expired expired) { call.reject("This request is too old to read back. Nothing was sent again.", "expired"); return; }
    catch (IllegalStateException reused) { call.reject("This request was already used for a different message. Nothing was sent.", "invalid"); return; }
    if (record != null) call.resolve(SmsTelephony.result(record));
    else decideMms(call, journal, operationId, to, body, attachments, sub, call.cancelled ? "cancelled" : "denied", now, boot);
   }
  });
 }
 private void decideMms(PluginCall call, SmsSendJournal journal, String operationId, String[] recipients, String body, SmsSendJournal.Attachment[] attachments, int subscriptionId, String decision, long now, long boot) {
  SmsTelephony.WORK.execute(() -> {
   try { call.resolve(SmsTelephony.result(AlphaTelephonyAccess.decideMms(journal, operationId, recipients, body, attachments, subscriptionId, decision, now, boot))); }
   catch (Exception unrecorded) { call.reject("Nothing was sent.", "unavailable"); }
  });
 }

 /** The journaled result of a reviewed MMS. Reading never sends. */
 @PluginMethod public void mmsSendResult(PluginCall call) {
  if (refused(call)) return;
  String operationId = call.getString("operationId", "");
  if (operationId == null || !SmsSendJournal.OPERATION.matcher(operationId).matches()) { call.reject("Invalid send", "invalid"); return; }
  try {
   SmsSendJournal.Record record = SmsTelephony.journal(getContext(), config).get(operationId);
   if (record == null || !record.group) call.reject("No send with this ID", "not-found"); else call.resolve(SmsTelephony.result(record));
  } catch (Exception unreadable) { call.reject("The send record could not be read.", "unavailable"); }
 }

 @Override protected void handleOnDestroy() { closed = true; invalidateReads(); SmsTelephony.stopListening(sendListener); getContext().unregisterReceiver(screenOff); reader.shutdown(); super.handleOnDestroy(); }
}
