// spec/app/messages/composer.md, "Story: Keep my draft"; spec/app/messages/sending.md, "Story: Send a message once"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots;
import android.content.Context;
import java.io.File;
import java.io.IOException;
import java.util.regex.Pattern;
import org.json.JSONObject;

final class AlphaLegacySms {
 static final String LEDGER = "sms-send-ledger:v1:device";
 static final int LEDGER_BYTES = 1024 * 1024;
 static final int DRAFT_BYTES = 8 * 1024 * 1024;
 private static final String DRAFT_PREFIX = "sms-draft:v1:";
 private static final Pattern THREAD = Pattern.compile("thread:[1-9][0-9]{0,18}");

 private AlphaLegacySms() {}

 static String draftSlot(Object thread) {
  if (thread == JSONObject.NULL) return DRAFT_PREFIX + "new";
  if (thread instanceof String id && THREAD.matcher(id).matches()) return DRAFT_PREFIX + id;
  throw new IllegalArgumentException("Invalid Messages draft thread");
 }

 private static JsonCredentialSlots installed(Context context) {
  return new JsonCredentialSlots(new File(context.getNoBackupFilesDir(), "connection-credentials"),
    "alpha.connection.aes.v1", slot -> LEDGER.equals(slot) ? LEDGER_BYTES : DRAFT_BYTES);
 }

 static String readDraft(Context context, Object thread) throws Exception {
  return installed(context).read(draftSlot(thread));
 }

 static boolean retireDraft(Context context, Object thread, String expected) throws Exception {
  return installed(context).compareExchange(draftSlot(thread), expected, null);
 }

 static void adoptLedger(Context context, AlphaSecureSlots destination) throws Exception {
  JsonCredentialSlots prior = installed(context);
  String expected = prior.read(LEDGER);
  if (expected == null) return;
  String current = destination.read(LEDGER);
  if (current == null) {
   destination.write(LEDGER, expected);
   current = destination.read(LEDGER);
  }
  if (!expected.equals(current)) throw new IOException("The installed and current SMS journals differ");
  if (!prior.compareExchange(LEDGER, expected, null)) throw new IOException("The installed SMS journal changed");
 }
}
