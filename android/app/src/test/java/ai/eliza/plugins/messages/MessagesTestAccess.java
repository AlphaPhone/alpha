package ai.eliza.plugins.messages;

import android.content.Context;
import java.io.File;
import java.io.IOException;

/**
 * Test-only access to package-private state of the shared reviewed SMS core (plugin-native-messages)
 * that Alpha's ported tests arrange or inspect: a dispatch already recorded in the journal, and the
 * MMS file directory. Production code never reaches these.
 */
public final class MessagesTestAccess {
 private MessagesTestAccess() {}

 /** Records a dispatch the platform accepted for every part, as an earlier send would have. */
 public static void recordSubmittedDispatch(SmsSendJournal journal, String operationId, String[] recipients, String body, int subscriptionId,
   int[] partsPerRecipient, long now, long boot) throws IOException {
  journal.beginDispatch(operationId, recipients, body, subscriptionId, partsPerRecipient, now, boot);
  journal.endDispatch(operationId, true);
 }

 /** The private directory the platform MMS service reads and writes PDU files in. */
 public static File mmsDirectory(Context context) { return MmsStore.directory(context); }
}
