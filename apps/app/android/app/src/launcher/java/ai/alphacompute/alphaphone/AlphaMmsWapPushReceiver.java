// spec/app/telephony/messages.md
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.MmsWapPushReceiver;
import ai.eliza.plugins.messages.SmsRoleConfiguration;

public final class AlphaMmsWapPushReceiver extends MmsWapPushReceiver {
 @Override protected SmsRoleConfiguration configuration() { return AlphaSmsRole.CONFIGURATION; }
}
