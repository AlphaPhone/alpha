// spec/app/telephony/messages.md
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.SmsTelephonyConfiguration;

final class AlphaTelephony {
 private AlphaTelephony() {}
 static final SmsTelephonyConfiguration CONFIGURATION = new SmsTelephonyConfiguration(
  "sms-send-ledger:v1:device", "alpha-sms-sends.journal", "alpha-sms-operation:v1:",
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
