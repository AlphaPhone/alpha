// spec/app/telephony/messages.md; spec/app/messages/sending.md, "The phone's journal begins from the earlier Alpha's, so a send that Alpha journaled is read back and never sent again"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.SmsTelephonyConfiguration;

final class AlphaTelephony {
 private AlphaTelephony() {}
 static final String JOURNAL_SLOT = "sms-send-ledger:v1:device";
 static final int JOURNAL_BYTES = 1024 * 1024;
 static final SmsTelephonyConfiguration CONFIGURATION = new SmsTelephonyConfiguration(
  JOURNAL_SLOT, "alpha-sms-sends.journal", "alpha-sms-operation:v1:",
  "ai.alphacompute.alphaphone.SMS_SENT", "ai.alphacompute.alphaphone.SMS_DELIVERED",
  "alphaphone-sms", "operationId", "partIndex", AlphaImageCapability.featureName(BuildConfig.APPLICATION_ID),
  AlphaSmsSendReceiver.class, AlphaImageCapability::verified,
  context -> {
   AlphaSecureSlots slots = AlphaSecureSlots.of(context);
   return new SmsTelephonyConfiguration.JournalStore() {
    @Override public String read(String slot) throws Exception { return slots.read(slot); }
    @Override public void write(String slot, String value) throws Exception { slots.write(slot, value); }
   };
  }).withMmsFiles(BuildConfig.APPLICATION_ID + ".mms");
}
