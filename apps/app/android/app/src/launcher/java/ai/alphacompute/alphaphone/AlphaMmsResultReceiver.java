// spec/app/telephony/messages.md
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.MmsResultReceiver;
import ai.eliza.plugins.messages.SmsRoleConfiguration;

public final class AlphaMmsResultReceiver extends MmsResultReceiver {
 @Override protected SmsRoleConfiguration configuration() { return AlphaSmsRole.CONFIGURATION; }
}
