package ai.eliza.plugins.passwords;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import android.content.Context;
import android.os.CancellationSignal;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.RemoteViews;
import android.widget.TextView;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;

/**
 * Alpha's copy of the Autofill provider (android/shared-ui/eliza-passwords): the offer row other apps
 * show is one platform text row with exactly the words given, and a cancelled request returns no
 * dataset before the vault is touched. The unlocked fill and save flows run on a device
 * (PasswordAutofillOfferInstrumentedTest).
 */
@RunWith(RobolectricTestRunner.class)
@Config(sdk = 33, manifest = Config.NONE)
public class AutofillOfferCopyTest {
  @Test public void theOfferRowIsOnePlatformTextRowWithTheGivenWords() {
    Context context = RuntimeEnvironment.getApplication();
    RemoteViews row = ElizaPasswordAutofillService.presentation(context, "Fill a saved password");
    assertEquals(context.getPackageName(), row.getPackage());
    assertEquals(android.R.layout.simple_list_item_1, row.getLayoutId());
    View shown = row.apply(context, new FrameLayout(context));
    assertEquals("Fill a saved password", ((TextView) shown.findViewById(android.R.id.text1)).getText().toString());
  }

  @Test public void aCancelledFillRequestOffersNothing() throws Exception {
    CancellationSignal cancelled = new CancellationSignal();
    cancelled.cancel();
    assertNull(ElizaPasswordAutofillService.fillResponse(RuntimeEnvironment.getApplication(), null, cancelled));
    assertNull(ElizaPasswordAutofillService.fillResponse(RuntimeEnvironment.getApplication(), null, null));
  }
}
