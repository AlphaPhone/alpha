// spec/kit/undo.md
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.actionjournal.ActionJournal;
import ai.eliza.plugins.actionjournal.ActionJournalConfiguration;
import ai.eliza.plugins.actionjournal.ActionJournalPlugin;
import ai.eliza.plugins.actionjournal.deletion.DeferredDeletionCoordinator;
import android.content.Context;
import com.getcapacitor.annotation.CapacitorPlugin;
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

 @Override protected DeferredDeletionCoordinator deletions() {
  if (!AlphaImageCapability.verified(getContext()) || !AlphaDevicePlugin.shareForeground(getActivity())) {
   throw new SecurityException("Open and unlock Alpha to review pending deletions.");
  }
  return AlphaTelephonyDeletions.get(getContext());
 }
}
