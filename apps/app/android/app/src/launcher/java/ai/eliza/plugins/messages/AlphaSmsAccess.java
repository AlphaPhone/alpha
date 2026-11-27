// spec/app/telephony/messages.md
package ai.eliza.plugins.messages;

import android.content.Context;
import android.net.Uri;

/**
 * Alpha's access to the package-private conversation notice of eliza's SMS core, for the SMS_DELIVER receiver
 * Alpha owns since elizaOS/eliza#40576 ({@code AlphaSmsDeliverReceiver}). It forwards to the shared notice, so
 * an incoming text gets the same notice as before. Nothing here has UI.
 */
public final class AlphaSmsAccess {
 private AlphaSmsAccess() {}

 /** The shared conversation notice for a stored incoming text ({@link MmsStore#notifyIncoming}). */
 public static void notifyIncoming(Context context, SmsRoleConfiguration config, Uri message, String sender, String preview) {
  MmsStore.notifyIncoming(context, config, message, sender, preview);
 }
}
