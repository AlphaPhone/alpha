// spec/app/messages/index.md, "Story: Read a conversation"; spec/app/phone/index.md, "Story: Call a number"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.actionjournal.ActionJournal;
import ai.eliza.plugins.messages.SmsTelephony;
import ai.eliza.plugins.messages.SmsTelephonyConfiguration;
import ai.eliza.plugins.messages.TelephonyPlugin;
import android.Manifest;
import android.telephony.TelephonyManager;
import android.webkit.WebView;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;
import org.json.JSONObject;

@CapacitorPlugin(name = "ElizaTelephony", permissions = {
 @Permission(alias = "contacts", strings = { Manifest.permission.READ_CONTACTS }),
 @Permission(alias = "phoneState", strings = { Manifest.permission.READ_PHONE_STATE }),
 @Permission(alias = "sms", strings = { Manifest.permission.READ_SMS }),
 @Permission(alias = "sendSms", strings = { Manifest.permission.SEND_SMS }),
 @Permission(alias = "callLog", strings = { Manifest.permission.READ_CALL_LOG })
})
public final class AlphaTelephonyPlugin extends TelephonyPlugin {
 @Override protected SmsTelephonyConfiguration configuration() { return AlphaTelephony.CONFIGURATION; }

 @Override protected void checkSmsDispatch() {
  if (!AlphaCallState.read(getContext()).clearForMessages()) {
   throw new IllegalStateException("The phone has not ruled out an emergency call");
  }
 }

 void sendComposed(MainActivity activity, WebView view, PluginCall call, boolean mms, JSObject approval, BooleanSupplier active, Consumer<Runnable> queue) {
  long visit = activity.composerVisit();
  BooleanSupplier current = () -> composerCurrent(activity, view, visit, active, true);
  if (!current.getAsBoolean()) {
   call.reject("Open and unlock Messages to send this draft.", "composer-not-started");
   return;
  }
  SmsTelephony.DispatchGuard guard = () -> {
   if (!composerCurrent(activity, view, visit, active, mms)) {
    throw new IllegalStateException("The Messages composer is no longer current");
   }
   if (approval != null) {
    try { requireReviewedText(call.getData(), approval); }
    catch (Exception stale) { throw new IllegalStateException("The approved text is no longer current", stale); }
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
  if (approval.length() != 3 || digest == null || digest.isBlank() || attemptId <= 0 || expiresAt <= System.currentTimeMillis()) {
   throw new SecurityException("The text's approval is no longer current");
  }
  JSONObject entry = DeviceExecutionJournal.of(getContext()).get(operationId);
  if (entry == null || entry.getBoolean("acknowledged") || !operationId.equals(entry.getString("operationId"))
    || !digest.equals(entry.getString("digest")) || !entry.getString("agentAttemptId").matches("[A-Za-z0-9][A-Za-z0-9_-]{0,127}")) {
   throw new SecurityException("No claim for this text");
  }
  JSONObject attempt = entry.getJSONObject("attempt");
  JSONObject operation = new JSONObject().put("type", "sms_send").put("recipients", draft.getJSONArray("recipients"))
    .put("body", draft.getString("body")).put("subscriptionId", draft.getInt("subscriptionId"));
  if (!"Called".equals(attempt.getJSONObject("phase").getString("tag")) || !"Approval".equals(attempt.getString("authority"))
    || attempt.getBoolean("retired") || attempt.getInt("calls") != 1 || attempt.getLong("attemptId") != attemptId
    || !operationId.equals(attempt.getString("operationId")) || !ActionJournal.sameJson(new JSONObject(entry.getString("operation")), operation)) {
   throw new SecurityException("The approved card names another text");
  }
 }

 private boolean composerCurrent(MainActivity activity, WebView view, long visit, BooleanSupplier active, boolean requireClearCall) {
  if (!active.getAsBoolean() || getActivity() != activity || activity.composerVisit() != visit
    || activity.isAssistantSurface() || !view.isShown() || !admitted() || !unlockedForeground()
    || !AlphaDevicePlugin.shareForeground(activity)) return false;
  return (!requireClearCall || AlphaCallState.read(getContext()).clearForMessages())
    && activity.composerVisit() == visit && active.getAsBoolean();
 }

 @Override protected DeletionWindow deletionWindow() {
  return (kind, target) -> AlphaTelephonyDeletions.stage(getContext(), kind, target);
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
