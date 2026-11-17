package ai.alphacompute.alphaphone;

import ai.eliza.plugins.contacts.ContactsCatalog;
import ai.eliza.plugins.messages.SmsTelephony;
import ai.eliza.plugins.messages.SmsTelephonyConfiguration;
import android.Manifest;
import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;

/**
 * Contacts, Telecom and SMS on the Alpha AOSP image only (issues #420 and #421). The behaviour is
 * {@link AlphaTelephonyBase} (Alpha's fork of the shared TelephonyPlugin, with Alpha's own send review):
 * roles and SIMs, dialer and SMS handoffs, bounded SMS/MMS provider reads and reviewed native sends
 * journaled by the shared core. Alpha supplies its installed identity ({@link AlphaTelephony}) and the
 * bounded contact search over {@link ContactsCatalog} (shared plugin-native-contacts).
 *
 * MainActivity registers this plugin only when {@link AlphaImageCapability} verifies the image, so a
 * sideloaded launcher APK has no such plugin; each method checks the capability
 * again. Emergency numbers go to the system dialer like any other number.
 */
@CapacitorPlugin(name = "AlphaTelephony", permissions = {
 @Permission(alias = "contacts", strings = { Manifest.permission.READ_CONTACTS }),
 @Permission(alias = "phoneState", strings = { Manifest.permission.READ_PHONE_STATE }),
 @Permission(alias = "sms", strings = { Manifest.permission.READ_SMS }),
 @Permission(alias = "sendSms", strings = { Manifest.permission.SEND_SMS }),
 // Bounded recent calls for the image Phone view (AlphaTelephonyBase.listRecentCalls).
 // The launcher manifest declares READ_CALL_LOG; the image capability still gates access.
 @Permission(alias = "callLog", strings = { Manifest.permission.READ_CALL_LOG })
})
public class AlphaTelephonyPlugin extends AlphaTelephonyBase {
 private final AtomicLong composerVisit = new AtomicLong();

 @Override protected SmsTelephonyConfiguration configuration() { return AlphaTelephony.CONFIGURATION; }

 /** The origin-checked launcher port captures this guard before queueing a send. */
 void sendComposed(PluginCall call, boolean mms, Consumer<Runnable> queue) {
  SmsTelephony.DispatchGuard guard = composerGuard(call);
  if (guard == null) return;
  queue.accept(() -> {
   if (mms) sendOwnerApprovedMms(call, guard);
   else sendOwnerApprovedSms(call, guard);
  });
 }

 private SmsTelephony.DispatchGuard composerGuard(PluginCall call) {
  if (refused(call)) return null;
  final long visit = composerVisit.get();
  final Activity activity = getActivity();
  if (!(activity instanceof MainActivity) || ((MainActivity) activity).isAssistantSurface() || !activity.hasWindowFocus()) {
   call.reject("Open the Messages composer to send this draft.", "unavailable");
   return null;
  }
  return () -> {
   if (composerVisit.get() != visit || getActivity() != activity || !activity.hasWindowFocus())
    throw new IllegalStateException("The Messages composer is no longer in front");
  };
 }

 @Override protected void handleOnPause() { composerVisit.incrementAndGet(); super.handleOnPause(); }
 @Override protected void handleOnResume() { composerVisit.incrementAndGet(); super.handleOnResume(); }
 @Override protected void handleOnDestroy() { composerVisit.incrementAndGet(); super.handleOnDestroy(); }

 @PluginMethod public void smsNoticePending(PluginCall call) {
  if (refused(call)) return;
  JSObject result = new JSObject();
  if (getActivity() instanceof MainActivity && !((MainActivity) getActivity()).isAssistantSurface()) {
   SmsNoticeOpenRequest.Tap tap = SmsNoticeOpenRequest.current();
   if (tap != null) {
    result.put("threadId", tap.threadId);
    result.put("token", tap.token);
   }
  }
  call.resolve(result);
 }

 @PluginMethod public void acknowledgeSmsNotice(PluginCall call) {
  if (refused(call)) return;
  if (getActivity() instanceof MainActivity && !((MainActivity) getActivity()).isAssistantSurface())
   SmsNoticeOpenRequest.acknowledge(call.getString("token"));
  call.resolve();
 }

 /**
  * AP-16 AC-20: the contact a number belongs to, through Android's own number matching (PhoneLookup),
  * so the approval card names the person whatever the size of the address book. Read-only.
  */
 @PluginMethod public void contactForNumber(PluginCall call) {
  if (refused(call)) return;
  String number = call.getString("number", "");
  if (number == null || number.isBlank() || number.length() > 64) { call.reject("Invalid number", "invalid"); return; }
  fencedRead(call, "contacts", "Contacts", cancel -> {
   String name = AlphaContactLookup.name(getContext(), number, cancel);
   JSObject value = new JSObject(); value.put("name", name == null ? JSObject.NULL : clip(name));
   return value;
  });
 }

 /** Bounded same-profile reads, cancelled on background and checked again before publication. */
 @PluginMethod public void searchContacts(PluginCall call) {
  if (refused(call)) return;
  String query = call.getString("query", ""); Integer limit = call.getInt("limit", 25);
  if (query == null || query.length() > 128 || limit == null || limit < 1 || limit > 100) { call.reject("Invalid contact search", "invalid"); return; }
  fencedRead(call, "contacts", "Contacts", cancel -> {
   JSObject bounded = new ContactsCatalog(getContext()).list(query, limit, cancel);
   org.json.JSONArray records = AlphaContactLookup.searchRows(bounded.getJSONArray("contacts"), text -> clip(text));
   JSObject value = new JSObject(); value.put("contacts", records);
   return value;
  });
 }
}
