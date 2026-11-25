// spec/kit/undo.md
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.actionjournal.ActionJournal;
import ai.eliza.plugins.actionjournal.ActionJournalConfiguration;
import ai.eliza.plugins.actionjournal.ActionJournalPlugin;
import ai.eliza.plugins.actionjournal.deletion.DeferredDeletionCoordinator;
import ai.eliza.plugins.actionjournal.deletion.DeferredDeletionJournal;
import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.Callable;
import java.util.regex.Pattern;
import org.json.JSONObject;

@CapacitorPlugin(name = "ElizaActionJournal")
public final class AlphaActionJournalPlugin extends ActionJournalPlugin {
 private static ActionJournal shared;

 static synchronized ActionJournal journal(Context context) {
  if (shared == null) {
   AlphaSecureSlots slots = AlphaSecureSlots.of(context);
   shared = new ActionJournal(ActionJournalConfiguration.standard("action-journal:v1"), new ActionJournal.Storage() {
    @Override public String read(String slot) throws Exception { return slots.read(slot); }
    @Override public void write(String slot, String value) throws Exception { slots.write(slot, value); }
   }, (JSONObject entry, String status, JSONObject result) -> {
    if (result != null && !entry.getString("operationId").equals(result.optString("operationId"))) throw new IllegalArgumentException("The result names another operation");
   });
  }
  return shared;
 }

 @Override protected ActionJournal createJournal() { return journal(getContext()); }

 private static final double MAX_REVISION = 9_007_199_254_740_991d;
 private static final Pattern DELETION_ID = Pattern.compile("[A-Za-z0-9_-]{1,128}");

 private void deviceWork(PluginCall call, Callable<JSObject> operation) {
  Runnable refused = () -> call.reject(refusal());
  PluginWorkers.submit(worker(), () -> {
   if (destroyed()) {
    refused.run();
    return;
   }
   try {
    call.resolve(operation.call());
   } catch (Exception error) {
    refused.run();
   }
  }, refused);
 }

 @Override @PluginMethod public void get(PluginCall call) {
  if (call.getData().has("scope")) {
   super.get(call);
   return;
  }
  deviceWork(call, () -> {
   JSONObject entry = DeviceExecutionJournal.of(getContext()).get(call.getString("proposalId"));
   JSObject reply = entryResponse(entry);
   if (entry != null) reply.put("digest", entry.getString("digest"));
   return reply;
  });
 }

 @Override @PluginMethod public void list(PluginCall call) {
  if (call.getData().has("scope")) {
   super.list(call);
   return;
  }
  deviceWork(call, () -> new JSObject().put("entries", DeviceExecutionJournal.of(getContext()).list()));
 }

 @PluginMethod public void edit(PluginCall call) {
  deviceWork(call, () -> {
   Object raw = call.getData().opt("expectedRevision");
   if (call.getData().has("scope") || !(raw instanceof Number revision) || revision.doubleValue() < 0
     || revision.doubleValue() >= MAX_REVISION || revision.doubleValue() != Math.floor(revision.doubleValue())) {
    throw new IllegalArgumentException("Invalid journal revision");
   }
   JSONObject payload = call.getData().getJSONObject("next");
   boolean kept = DeviceExecutionJournal.of(getContext()).edit(call.getString("proposalId"), revision.longValue(), new JSONObject(payload.toString()));
   return new JSObject().put("kept", kept);
  });
 }

 /** Only the recorded outcome of the owner's exact telephony deletion leaves the journal. */
 @PluginMethod public void telephonyDeletionReceipt(PluginCall call) {
  deviceWork(call, () -> {
   String kind = call.getString("kind", "");
   String id = call.getString("id", "");
   if (!("message".equals(kind) || "voicemail".equals(kind) || "contact".equals(kind)) || id == null || !DELETION_ID.matcher(id).matches()) {
    throw new IllegalArgumentException("Invalid telephony deletion identity");
   }
   DeferredDeletionCoordinator coordinator = deletions();
   JSONObject row = coordinator.receipt(kind, id);
   if (row == null || !DeferredDeletionJournal.same(row.getJSONObject("owner"), coordinator.manualOwner())) {
    return new JSObject();
   }
   deletions(); // The foreground and image must still admit publication after the durable read.
   String phase = row.getString("phase");
   return switch (phase) {
    case "deleted", "undone", "conflict", "unknown" -> new JSObject().put("kind", kind).put("id", id).put("phase", phase);
    default -> new JSObject();
   };
  });
 }

 @Override protected DeferredDeletionCoordinator deletions() {
  if (!AlphaImageCapability.verified(getContext()) || !AlphaDevicePlugin.shareForeground(getActivity())) {
   throw new SecurityException("Open and unlock Alpha to review pending deletions.");
  }
  return AlphaTelephonyDeletions.get(getContext());
 }
}
