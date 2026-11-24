// spec/kit/undo.md, "Story: Take it back"; spec/app/messages/index.md, "Story: Act on a message"; spec/app/phone/voicemail.md, "Story: Delete a voicemail"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.actionjournal.deletion.DeferredDeletionCoordinator;
import ai.eliza.plugins.messages.MessageDeletion;
import ai.eliza.plugins.messages.TelephonyPlugin;
import ai.eliza.plugins.messages.ThreadDeletion;
import ai.eliza.plugins.messages.VoicemailStore;
import ai.eliza.plugins.securestore.nativeonly.NativeSecureStore;
import ai.eliza.plugins.securestore.nativeonly.SecureSlotPolicy;
import android.content.Context;
import android.os.Build;
import android.os.SystemClock;
import android.os.UserManager;
import android.provider.Settings;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.BooleanSupplier;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/** Binds Alpha's own telephony deletions to the SDK's durable, per-owner Undo window. */
final class AlphaTelephonyDeletions {
 private static final String JOURNAL = "native-delete-journal:v1";
 private static final String INSTALLATION = "native-delete-installation:v1";
 private static final String UNKNOWN_BOOT = "unknown:" + UUID.randomUUID();
 private static DeferredDeletionCoordinator coordinator;

 private AlphaTelephonyDeletions() {}

 static synchronized DeferredDeletionCoordinator get(Context context) {
  if (coordinator == null) coordinator = create(context.getApplicationContext());
  return coordinator;
 }

 static JSONObject stage(Context context, String kind, JSONObject target) throws Exception {
  if (refusal(context, kind) != null) throw new SecurityException("Telephony deletion access changed.");
  return get(context).stageRecord(kind, target);
 }

 private static DeferredDeletionCoordinator create(Context context) {
  // The SDK leaves space for settlement and acknowledgement after the last staged write.
  NativeSecureStore slots = new NativeSecureStore(context, SecureSlotPolicy.parse(Map.of("slots", List.of(Map.of(
   "pattern", Pattern.quote(JOURNAL), "access", "nativeOnly", "limit", 4 * 1024 * 1024)))));
  return new DeferredDeletionCoordinator(
   new DeferredDeletionCoordinator.Configuration(JOURNAL, INSTALLATION),
   new DeferredDeletionCoordinator.Slots() {
    @Override public String read(String slot) throws Exception { return slots.get(slot); }
    @Override public void write(String slot, String value) throws Exception { slots.set(slot, value); }
   },
   new DeferredDeletionCoordinator.Clock() {
    @Override public String continuity() {
     try {
      return "boot:" + Settings.Global.getInt(context.getContentResolver(), Settings.Global.BOOT_COUNT);
     } catch (Settings.SettingNotFoundException | SecurityException unavailable) {
      return UNKNOWN_BOOT;
     }
    }
    @Override public long elapsed() { return SystemClock.elapsedRealtime(); }
    @Override public long wall() { return System.currentTimeMillis(); }
   },
   new DeferredDeletionCoordinator.Owners() {
    @Override public JSONObject identity() { throw unsupported(); }
    @Override public String reviewFence(JSONObject identity) { throw unsupported(); }
   },
   new DeferredDeletionCoordinator.Reminders() {
    @Override public JSONArray pendingDeletions() { return new JSONArray(); }
    @Override public JSONObject stageDeletion(String id, String owner, JSONObject target, JSONObject clock, JSONObject binding) { throw unsupported(); }
    @Override public JSONObject settleDeletion(String id, String owner, JSONObject clock, boolean undo) { throw unsupported(); }
    @Override public void pauseDeletion(String id, String owner, String reason) { throw unsupported(); }
    @Override public JSONObject reminder(String id) { throw unsupported(); }
   },
   new DeferredDeletionCoordinator.CalendarDeletions() {
    @Override public String refusal(JSONObject owner, JSONObject target) { return "access-changed"; }
    @Override public JSONObject dispatch(JSONObject target) { throw unsupported(); }
    @Override public boolean targets(JSONObject target, long sourceId, long eventId) { return false; }
   },
   new DeferredDeletionCoordinator.Records() {
    @Override public String refusal(String kind, JSONObject owner, JSONObject target) {
     return AlphaTelephonyDeletions.refusal(context, kind);
    }
    @Override public JSONObject dispatch(String kind, JSONObject target) {
     BooleanSupplier allowed = () -> AlphaTelephonyDeletions.refusal(context, kind) == null;
     return switch (kind) {
      case "message" -> MessageDeletion.dispatch(context, target, allowed);
      case "thread" -> ThreadDeletion.dispatch(context, target, allowed);
      case "voicemail" -> VoicemailStore.dispatchDeletion(context, target, allowed);
      default -> throw unsupported();
     };
    }
   },
   delay -> AlphaTelephonyDeletionWakeup.schedule(context, delay));
 }

 private static String refusal(Context context, String kind) {
  if (!AlphaImageCapability.verified(context)) return "access-changed";
  UserManager users = context.getSystemService(UserManager.class);
  if (users == null || !users.isUserUnlocked() || (Build.VERSION.SDK_INT >= 31 && !users.isUserForeground())) {
   return "owner-unavailable";
  }
  AlphaCallState.Reading call = AlphaCallState.read(context);
  if (call.inCall == null || call.emergencyLive()) return "access-changed";
  return switch (kind) {
   case "message", "thread" -> MessageDeletion.roleGuard(context).getAsBoolean() ? null : "access-changed";
   case "voicemail" -> TelephonyPlugin.voicemailDeletable(context) ? null : "access-changed";
   default -> "access-changed";
  };
 }

 private static UnsupportedOperationException unsupported() {
  return new UnsupportedOperationException("Only manual telephony deletions are configured.");
 }
}
