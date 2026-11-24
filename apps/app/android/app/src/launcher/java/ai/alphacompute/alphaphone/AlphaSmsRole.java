// spec/app/telephony/messages.md
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.SmsRoleConfiguration;

final class AlphaSmsRole {
 private AlphaSmsRole() {}
 static final SmsRoleConfiguration CONFIGURATION = new SmsRoleConfiguration(AlphaTelephony.CONFIGURATION,
  "alpha-messages", "Messages", R.drawable.notification_icon,
  "ai.alphacompute.alphaphone.MMS_DOWNLOADED", "ai.alphacompute.alphaphone.MMS_RESPONSE_SENT", BuildConfig.APPLICATION_ID + ".mms",
  AlphaMmsResultReceiver.class, AlphaSmsComposeActivity.class, MainActivity.class);
}
