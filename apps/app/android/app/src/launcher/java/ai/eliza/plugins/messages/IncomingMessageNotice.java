// spec/app/telephony/messages.md
package ai.eliza.plugins.messages;

import android.content.Context;
import android.net.Uri;

public final class IncomingMessageNotice {
 private IncomingMessageNotice() {}

 public static void notifyIncoming(Context context, SmsRoleConfiguration config, Uri message, String sender, String preview) {
  MmsStore.notifyIncoming(context, config, message, sender, preview);
 }
}
