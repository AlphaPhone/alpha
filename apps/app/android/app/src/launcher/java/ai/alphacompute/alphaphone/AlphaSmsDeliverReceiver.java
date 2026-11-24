// spec/app/telephony/messages.md
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.SmsDeliverReceiver;
import ai.eliza.plugins.messages.SmsRoleConfiguration;

public final class AlphaSmsDeliverReceiver extends SmsDeliverReceiver {
 @Override protected SmsRoleConfiguration configuration() { return AlphaSmsRole.CONFIGURATION; }
}
