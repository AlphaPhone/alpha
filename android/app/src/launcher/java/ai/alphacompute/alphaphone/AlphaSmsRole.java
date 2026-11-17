package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.SmsRoleConfiguration;

/**
 * Alpha's identity for its default-SMS-app components: the Messages notice channel, the MMS result
 * actions and the file provider authority. Alpha's own components ({@link AlphaSmsDeliverReceiver},
 * {@link AlphaMmsResultReceiver}'s download path, {@link AlphaRespondViaMessageService},
 * {@link AlphaSmsComposeActivity}, {@link AlphaMessageNotices}) and the shared ones Alpha still declares
 * (MmsWapPushReceiver and the response and mark-read paths of MmsResultReceiver, plugin-native-messages)
 * read the same values, which are installed identity. The components are declared disabled in the
 * launcher manifest and enabled by {@link AlphaTelephonyRoles} only on the verified Alpha AOSP image,
 * so the SMS role can be offered nowhere else.
 */
final class AlphaSmsRole {
 private AlphaSmsRole() {}
 static final SmsRoleConfiguration CONFIGURATION = new SmsRoleConfiguration(AlphaTelephony.CONFIGURATION,
  "alpha-messages", "Messages", R.drawable.notification_icon,
  "ai.alphacompute.alphaphone.MMS_DOWNLOADED", "ai.alphacompute.alphaphone.MMS_RESPONSE_SENT", BuildConfig.APPLICATION_ID + ".mms",
  AlphaMmsResultReceiver.class, AlphaSmsComposeActivity.class, AlphaSmsNoticeActivity.class);
}
