package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.SmsRoleConfiguration;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/** Private target for the SMS role's immutable notification PendingIntent. */
public final class AlphaSmsNoticeActivity extends Activity {
 @Override protected void onCreate(Bundle state) {
  super.onCreate(state);
  try {
   Intent tap = getIntent();
   if (state != null || !Intent.ACTION_MAIN.equals(tap.getAction()) || !AlphaImageCapability.verified(this)) return;
   String thread = tap.getStringExtra(SmsRoleConfiguration.EXTRA_THREAD_ID);
   if (!validThread(thread) || !Uri.fromParts("eliza-sms-notice", thread, null).equals(tap.getData())) return;
   SmsNoticeOpenRequest.offer(thread);
   startActivity(new Intent(this, MainActivity.class).setAction(SmsNoticeOpenRequest.ACTION)
    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
  } finally {
   finish();
  }
 }

 private static boolean validThread(String thread) {
  if (thread == null || !thread.matches("thread:[1-9][0-9]{0,18}")) return false;
  try { return Long.parseLong(thread.substring(7)) > 0; }
  catch (NumberFormatException ignored) { return false; }
 }
}
