// spec/app/messages/sending.md, "The phone's journal begins from the earlier Alpha's, so a send that Alpha journaled is read back and never sent again"; spec/app/platform/adoption.md, "A value is moved by copying it only where the new place is still empty, and its earlier place is cleared only once the new place holds a value"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.SmsTelephonyConfiguration;
import ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots;
import android.util.Log;
import java.io.File;

final class AlphaTelephony {
 private AlphaTelephony() {}
 static final String JOURNAL_SLOT = "sms-send-ledger:v1:device";
 /** The earlier Alpha's cap on its journal, which this one keeps so the journal it takes over always fits. */
 static final int JOURNAL_BYTES = 1024 * 1024;
 static final SmsTelephonyConfiguration CONFIGURATION = new SmsTelephonyConfiguration(
  JOURNAL_SLOT, "alpha-sms-sends.journal", "alpha-sms-operation:v1:",
  "ai.alphacompute.alphaphone.SMS_SENT", "ai.alphacompute.alphaphone.SMS_DELIVERED",
  "alphaphone-sms", "operationId", "partIndex", AlphaImageCapability.featureName(BuildConfig.APPLICATION_ID),
  AlphaSmsSendReceiver.class, AlphaImageCapability::verified,
  context -> {
   AlphaSecureSlots slots = AlphaSecureSlots.of(context);
   JsonCredentialSlots earlier = new JsonCredentialSlots(new File(context.getNoBackupFilesDir(), "connection-credentials"),
    "alpha.connection.aes.v1", slot -> JOURNAL_BYTES);
   return new SmsTelephonyConfiguration.JournalStore() {
    /**
     * This Alpha's journal, or while it holds none the earlier Alpha's under the same name, copied in and cleared
     * there once the copy is written. An earlier journal that cannot be read fails the read, so nothing is sent
     * until it can be; one that cannot be copied is still the journal read, and moves on a later reading.
     */
    @Override public String read(String slot) throws Exception {
     String own = slots.read(slot);
     if (own != null) {
      clear(slot);
      return own;
     }
     String taken = earlier.read(slot);
     if (taken == null) return null;
     try { slots.write(slot, taken); }
     catch (Exception unwritten) {
      Log.w("AlphaTelephony", "The earlier journal stays where it was until it can be copied", unwritten);
      return taken;
     }
     clear(slot);
     return taken;
    }
    @Override public void write(String slot, String value) throws Exception { slots.write(slot, value); }
    private void clear(String slot) {
     try { earlier.remove(slot); }
     catch (Exception kept) { Log.w("AlphaTelephony", "The earlier journal is cleared on a later reading", kept); }
    }
   };
  }).withMmsFiles(BuildConfig.APPLICATION_ID + ".mms");
}
