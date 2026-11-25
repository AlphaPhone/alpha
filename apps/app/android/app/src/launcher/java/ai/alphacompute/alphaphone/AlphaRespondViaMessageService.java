// spec/app/telephony/messages.md
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.RespondViaMessageService;
import ai.eliza.plugins.messages.SmsRoleConfiguration;

public final class AlphaRespondViaMessageService extends RespondViaMessageService {
 @Override protected SmsRoleConfiguration configuration() { return AlphaSmsRole.CONFIGURATION; }
}
