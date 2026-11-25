package ai.alphacompute.alphaphone;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

public final class HostedDigestQuestionActivity extends Activity {
 @Override protected void onCreate(Bundle saved) {
  super.onCreate(saved);
  HostedDigestDelivery delivery = HostedDigestDelivery.running();
  if (delivery == null || !HostedDigestNotices.acceptsQuestion(getIntent())
      || !HostedDigestNotices.questionUnlocked(this)) {
   finish();
   return;
  }
  delivery.captureQuestion(getIntent(), (captured) -> runOnUiThread(() -> {
   if (isFinishing() || isDestroyed()) return;
   if (captured && HostedDigestNotices.questionUnlocked(this)) {
    startActivity(new Intent(this, MainActivity.class)
     .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP));
   }
   finish();
  }));
 }
}
