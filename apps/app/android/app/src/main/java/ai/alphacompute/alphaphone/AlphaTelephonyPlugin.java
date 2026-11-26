// spec/app/messages/index.md, "Story: Read a conversation"; spec/app/phone/index.md, "Story: Call a number"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.actionjournal.ActionJournal;
import ai.eliza.plugins.contacts.ContactsEditor;
import ai.eliza.plugins.messages.SmsTelephony;
import ai.eliza.plugins.messages.SmsTelephonyConfiguration;
import ai.eliza.plugins.messages.TelephonyPlugin;
import android.Manifest;
import android.net.Uri;
import android.os.CancellationSignal;
import android.telephony.PhoneNumberUtils;
import android.telephony.TelephonyManager;
import android.webkit.WebView;
import androidx.webkit.JavaScriptReplyProxy;
import com.getcapacitor.Bridge;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "ElizaTelephony", permissions = {
 @Permission(alias = "contacts", strings = { Manifest.permission.READ_CONTACTS }),
 @Permission(alias = "phoneState", strings = { Manifest.permission.READ_PHONE_STATE }),
 @Permission(alias = "sms", strings = { Manifest.permission.READ_SMS }),
 @Permission(alias = "sendSms", strings = { Manifest.permission.SEND_SMS }),
 @Permission(alias = "callLog", strings = { Manifest.permission.READ_CALL_LOG })
})
public final class AlphaTelephonyPlugin extends TelephonyPlugin {
 private static final Pattern LEGACY_DRAFT_REQUEST_ID = Pattern.compile("[A-Za-z0-9_-]{1,128}");

 @Override protected SmsTelephonyConfiguration configuration() { return AlphaTelephony.CONFIGURATION; }

 @Override protected void checkSmsDispatch() {
  if (!AlphaCallState.read(getContext()).clearForMessages()) {
   throw new IllegalStateException("The phone has not ruled out an emergency call");
  }
 }

 void sendComposed(MainActivity activity, WebView view, PluginCall call, boolean mms, JSObject approval, BooleanSupplier active, Consumer<Runnable> queue) {
  Object requestedTicket = approval == null ? null : approval.opt("textAskTicket");
  if (requestedTicket != null && (!(requestedTicket instanceof Integer ticket) || ticket <= 0)) {
   call.reject("The approved text no longer belongs to the open review.", "composer-not-started");
   return;
  }
  int textAskTicket = requestedTicket instanceof Integer ticket ? ticket : 0;
  long visit = activity.composerVisit();
  BooleanSupplier current = () -> composerCurrent(activity, view, visit, textAskTicket, active, true);
  if (!current.getAsBoolean()) {
   call.reject("Open and unlock Messages to send this draft.", "composer-not-started");
   return;
  }
  SmsTelephony.DispatchGuard guard = () -> {
   if (!composerCurrent(activity, view, visit, textAskTicket, active, mms)) {
    throw new IllegalStateException("The Messages composer is no longer current");
   }
   if (approval != null) {
    try { requireReviewedText(call.getData(), approval); }
    catch (Exception stale) { throw new IllegalStateException("The approved text is no longer current", stale); }
    if (!current.getAsBoolean()) throw new IllegalStateException("The text review is no longer in front");
   }
  };
  queue.accept(() -> {
   try {
    if (!current.getAsBoolean()) {
     call.reject("Open and unlock Messages to send this draft.", "composer-not-started");
     return;
    }
    if (approval != null) {
     try { requireReviewedText(call.getData(), approval); }
     catch (Exception stale) {
      call.reject("Approve this exact text again.", "composer-not-started");
      return;
     }
    }
    if (mms) sendOwnerApprovedMms(call, guard);
    else sendOwnerApprovedSms(call, guard);
   } catch (RuntimeException unavailable) {
    call.reject("The Messages send could not be confirmed.");
   }
  });
 }

 private void requireReviewedText(JSObject draft, JSObject approval) throws Exception {
  String operationId = draft.getString("operationId");
  String digest = approval.getString("digest");
  long attemptId = approval.getLong("attemptId"), expiresAt = approval.getLong("expiresAt");
  JSONObject contact = approval.optJSONObject("contact");
  int fields = 3 + (contact == null ? 0 : 1) + (approval.has("textAskTicket") ? 1 : 0);
  if (approval.length() != fields || digest == null || digest.isBlank() || attemptId <= 0 || expiresAt <= System.currentTimeMillis()) {
   throw new SecurityException("The text's approval is no longer current");
  }
  JSONObject entry = DeviceExecutionJournal.of(getContext()).get(operationId);
  if (entry == null || entry.getBoolean("acknowledged") || !operationId.equals(entry.getString("operationId"))
    || !digest.equals(entry.getString("digest")) || !entry.getString("agentAttemptId").matches("[A-Za-z0-9][A-Za-z0-9_-]{0,127}")) {
   throw new SecurityException("No claim for this text");
  }
  JSONObject attempt = entry.getJSONObject("attempt");
  if (!"Called".equals(attempt.getJSONObject("phase").getString("tag")) || !"Approval".equals(attempt.getString("authority"))
    || attempt.getBoolean("retired") || attempt.getInt("calls") != 1 || attempt.getLong("attemptId") != attemptId
    || !operationId.equals(attempt.getString("operationId")) || !reviewedDraft(new JSONObject(entry.getString("operation")), draft, contact)) {
   throw new SecurityException("The approved card names another text");
  }
 }

 private boolean reviewedDraft(JSONObject operation, JSObject draft, JSONObject contact) throws Exception {
  JSONArray recipients = draft.getJSONArray("recipients");
  String body = draft.getString("body");
  if ("sms_send".equals(operation.optString("type"))) {
   return contact == null && ActionJournal.sameJson(operation, new JSONObject().put("type", "sms_send").put("recipients", recipients)
     .put("body", body).put("subscriptionId", draft.getInt("subscriptionId")));
  }
  if (!"sms_compose".equals(operation.optString("type")) || operation.has("draft") || operation.has("replyThreadId")
    || !operation.getString("body").equals(body) || recipients.length() != 1) return false;
  String number = recipients.getString(0);
  JSONObject target = operation.optJSONObject("target");
  if (target != null && "number".equals(target.optString("kind"))) {
   return contact == null && number.equals(PhoneNumberUtils.normalizeNumber(target.getString("number")));
  }
  if (contact == null || contact.length() != 3 || (target == null ? !operation.has("query") : !"contact".equals(target.optString("kind")))) return false;
  JSObject current = new ContactsEditor(getContext()).get(contact.getString("id"), new CancellationSignal());
  if (!contact.getString("lookup").equals(current.getString("lookup")) || !contact.getString("version").equals(current.getString("version"))) return false;
  JSONArray numbers = current.getJSONArray("phoneNumbers");
  for (int i = 0; i < numbers.length(); i++) {
   if (number.equals(PhoneNumberUtils.normalizeNumber(numbers.getJSONObject(i).getString("number")))) return true;
  }
  return false;
 }

 private boolean composerCurrent(MainActivity activity, WebView view, long visit, int textAskTicket, BooleanSupplier active, boolean requireClearCall) {
  if (!active.getAsBoolean() || getActivity() != activity || activity.composerVisit() != visit
    || activity.assistantVisit() != textAskTicket || !view.isShown() || !admitted() || !unlockedForeground()
    || !AlphaDevicePlugin.shareForeground(activity)) return false;
  return (!requireClearCall || AlphaCallState.read(getContext()).clearForMessages())
    && activity.composerVisit() == visit && active.getAsBoolean();
 }

 @Override protected DeletionWindow deletionWindow() {
  return (kind, target) -> AlphaTelephonyDeletions.stage(getContext(), kind, target);
 }

 /** Called on the UI thread by the packaged main-frame port, including its frame-bound reply. */
 void accessLegacyDraft(MainActivity activity, WebView view, Bridge bridge, String text, JavaScriptReplyProxy reply) {
  long visit = activity.composerVisit();
  BooleanSupplier current = () -> composerCurrent(activity, view, visit, 0, () -> true, false);
  boolean opened = legacyPage(view, current);
  bridge.execute(() -> {
   JSObject request;
   try { request = new JSObject(text); }
   catch (JSONException invalid) { return; }
   if (!(request.opt("requestId") instanceof String id) || !LEGACY_DRAFT_REQUEST_ID.matcher(id).matches()) return;
   JSObject answer = opened && current.getAsBoolean() ? readOrRetireLegacyDraft(request) : legacyDraftUnavailable();
   bridge.executeOnMainThread(() -> {
    JSObject response = legacyPage(view, current) ? answer : legacyDraftUnavailable();
    try { reply.postMessage(response.put("requestId", id).toString()); }
    catch (RuntimeException detached) { return; }
   });
  });
 }

 private JSObject readOrRetireLegacyDraft(JSObject request) {
  Object kind = request.opt("kind");
  Object thread = request.opt("threadId");
  Object raw = request.opt("expected");
  boolean retire = "retire".equals(kind);
  try {
   if (retire ? request.length() != 4 || !(raw instanceof String expected) || expected.isEmpty()
     || expected.length() > AlphaLegacySms.DRAFT_BYTES : !"read".equals(kind) || request.length() != 3) {
    throw new IllegalArgumentException();
   }
   AlphaLegacySms.draftSlot(thread);
  } catch (IllegalArgumentException invalid) {
   return legacyDraftError("Invalid saved Messages draft", "invalid");
  }
  try {
   JSObject result = new JSObject();
   if (retire) {
    boolean removed = AlphaLegacySms.retireDraft(getContext(), thread, (String) raw);
    result.put("status", removed ? "removed" : "conflict");
   } else {
    String value = AlphaLegacySms.readDraft(getContext(), thread);
    result.put("value", value == null ? JSONObject.NULL : value);
   }
   return new JSObject().put("result", result);
  } catch (Exception unavailable) {
   return legacyDraftUnavailable();
  }
 }

 private static JSObject legacyDraftUnavailable() {
  return legacyDraftError("Saved Messages drafts are unavailable", "unavailable");
 }

 private static JSObject legacyDraftError(String message, String code) {
  return new JSObject().put("error", new JSObject().put("message", message).put("code", code));
 }

 private static boolean legacyPage(WebView view, BooleanSupplier current) {
  String url = view.getUrl();
  return current.getAsBoolean() && url != null && AlphaMessagesComposerPort.packagedOrigin(Uri.parse(url));
 }

 @Override protected void handleOnResume() {
  super.handleOnResume();
  if (admitted() && unlockedForeground() && SmsNoticeOpenRequest.current() != null) {
   // The signal carries no thread data. The renderer reads it after the foreground check.
   notifyListeners("smsNotice", new JSObject(), true);
  }
 }

 /** The Android classification of a provider-normalized number for the current phone. */
 @android.annotation.SuppressLint("MissingPermission")
 @PluginMethod public void classifyDialNumber(PluginCall call) {
  if (refused(call)) return;
  String number = call.getString("number", "");
  if (number == null || !NUMBER.matcher(number).matches()) {
   call.reject("Not a dialable phone number", "invalid");
   return;
  }
  String kind;
  try {
   TelephonyManager phone = getContext().getSystemService(TelephonyManager.class);
   kind = phone == null ? "unknown" : phone.isEmergencyNumber(number) ? "emergency" : "ordinary";
  } catch (RuntimeException unreadable) {
   kind = "unknown";
  }
  JSObject result = new JSObject();
  result.put("kind", kind);
  call.resolve(result);
 }

 /** An owner tap can open ACTION_DIAL, which requires its own Call press. */
 @PluginMethod public void ownerDialScreen(PluginCall call) {
  if (refused(call)) return;
  if (AlphaCallState.read(getContext()).emergencyLive()) {
   call.reject("Wait for the possible emergency call to end.", "unavailable");
   return;
  }
  super.dial(call);
 }

 private MainActivity smsDraftOwner() {
  return getActivity() instanceof MainActivity activity && admitted() && unlockedForeground()
   && !activity.isAssistantSurface() && AlphaDevicePlugin.shareForeground(activity) ? activity : null;
 }

 void wakeSmsDraft() {
  MainActivity activity = smsDraftOwner();
  if (activity != null && SmsDraftOpenRequest.current(activity) != null) notifyListeners("smsDraft", new JSObject(), true);
 }

 @PluginMethod public void smsDraftPending(PluginCall call) {
  MainActivity activity = smsDraftOwner();
  SmsDraftOpenRequest.Offer offer = activity == null ? null : SmsDraftOpenRequest.current(activity);
  JSObject result = new JSObject();
  if (offer != null) {
   result.put("token", offer.token());
   result.put("recipients", new JSONArray(offer.draft().recipients()));
   result.put("body", offer.draft().body());
  }
  call.resolve(result);
 }

 @PluginMethod public void acknowledgeSmsDraft(PluginCall call) {
  MainActivity activity = smsDraftOwner();
  if (activity != null) SmsDraftOpenRequest.acknowledge(activity, call.getString("token"));
  call.resolve();
 }

 @PluginMethod public void smsNoticePending(PluginCall call) {
  if (refused(call)) return;
  SmsNoticeOpenRequest.Tap tap = SmsNoticeOpenRequest.current();
  JSObject result = new JSObject();
  if (tap != null) {
   result.put("threadId", tap.threadId());
   result.put("token", tap.token());
  }
  call.resolve(result);
 }

 @PluginMethod public void acknowledgeSmsNotice(PluginCall call) {
  if (refused(call)) return;
  SmsNoticeOpenRequest.acknowledge(call.getString("token"));
  call.resolve();
 }
}
