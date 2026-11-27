// spec/app/messages/index.md, "Story: Start a new message"
package ai.alphacompute.alphaphone;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

public final class AlphaSmsComposeActivity extends Activity {
 @Override protected void onCreate(Bundle state) {
  super.onCreate(state);
  try {
   if (state != null || !AlphaImageCapability.verified(this) || !AlphaAssistActivity.unlocked(this)) return;
   SmsDraftOpenRequest.Draft draft = SmsDraftOpenRequest.parse(getIntent(), Intent.ACTION_SENDTO);
   if (draft == null) return;
   SmsDraftOpenRequest.Offer offer = SmsDraftOpenRequest.offer(draft);
   try {
    startActivity(new Intent(this, MainActivity.class).setAction(SmsDraftOpenRequest.ACTION)
     .putExtra(SmsDraftOpenRequest.TOKEN, offer.token()).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
   } catch (RuntimeException unavailable) { SmsDraftOpenRequest.retireUnbound(offer.token()); }
  } finally { finish(); }
 }
}
