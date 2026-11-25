// spec/app/messages/index.md, "Story: Read a conversation"; spec/app/phone/index.md, "Story: Call a number"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.SmsTelephonyConfiguration;
import ai.eliza.plugins.messages.TelephonyPlugin;
import android.Manifest;
import android.telephony.TelephonyManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(name = "ElizaTelephony", permissions = {
 @Permission(alias = "contacts", strings = { Manifest.permission.READ_CONTACTS }),
 @Permission(alias = "phoneState", strings = { Manifest.permission.READ_PHONE_STATE }),
 @Permission(alias = "sms", strings = { Manifest.permission.READ_SMS }),
 @Permission(alias = "sendSms", strings = { Manifest.permission.SEND_SMS }),
 @Permission(alias = "callLog", strings = { Manifest.permission.READ_CALL_LOG })
})
public final class AlphaTelephonyPlugin extends TelephonyPlugin {
 @Override protected SmsTelephonyConfiguration configuration() { return AlphaTelephony.CONFIGURATION; }

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
