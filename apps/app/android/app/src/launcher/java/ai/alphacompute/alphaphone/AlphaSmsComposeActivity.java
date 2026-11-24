// spec/app/telephony/messages.md
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.SmsComposeActivity;
import ai.eliza.plugins.messages.SmsRoleConfiguration;

public final class AlphaSmsComposeActivity extends SmsComposeActivity {
 @Override protected SmsRoleConfiguration configuration() { return AlphaSmsRole.CONFIGURATION; }
}
