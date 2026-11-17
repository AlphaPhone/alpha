package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.SmsSendJournal;

/**
 * What Alpha's native send review ({@link AlphaTelephonyBase#sendSms}, {@link AlphaTelephonyBase#sendMms})
 * says. The dialog shows the exact recipients, SIM, part count, pictures and text that the owner's Send
 * press dispatches; only the wording here is Alpha's, the facts are the reviewed operation's.
 */
final class AlphaTelephonyReview {
 private AlphaTelephonyReview() {}
 static final String SEND = "Send", CANCEL = "Cancel";

 static String smsTitle(int recipients) {
  return recipients > 1 ? "Send this text to " + recipients + " people?" : "Send this text?";
 }

 /** @param slot the SIM's zero-based slot index; the owner sees SIM 1, SIM 2. */
 static String smsMessage(String[] recipients, int slot, String simName, String carrier, int parts, String body) {
  StringBuilder message = sender(recipients, slot, simName, carrier);
  if (recipients.length > 1) message.append("Each person gets their own text. This isn’t a group message.\n");
  if (parts > 1) message.append("Each person gets it as ").append(parts).append(" linked texts.\n");
  return message.append("Your carrier may charge for texts.\n\n").append(body).toString();
 }

 static String mmsTitle(int recipients) {
  return recipients > 1 ? "Send a group message to " + recipients + " people?" : "Send this MMS?";
 }

 static String mmsMessage(String[] recipients, int slot, String simName, String carrier, SmsSendJournal.Attachment[] attachments, String body) {
  StringBuilder message = sender(recipients, slot, simName, carrier);
  if (recipients.length > 1) message.append("One group message: everyone sees who else it went to, and replies go to the whole group.\n");
  for (SmsSendJournal.Attachment picture : attachments)
   message.append("Picture: ").append(picture.name).append(" (").append((picture.size + 1023) / 1024).append(" KB)\n");
  message.append("Sent as MMS. Your carrier may charge for messages and data.");
  if (!body.isEmpty()) message.append("\n\n").append(body);
  return message.toString();
 }

 /** What a screen reader says for a picture's preview in the MMS review. */
 static String attachmentDescription(String name) { return "Picture " + name; }

 private static StringBuilder sender(String[] recipients, int slot, String simName, String carrier) {
  return new StringBuilder().append("To: ").append(String.join(", ", recipients)).append('\n')
   .append("From: SIM ").append(slot + 1).append(" · ").append(simName).append(" (").append(carrier).append(")\n");
 }
}
