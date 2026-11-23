package ai.alphacompute.alphaphone;

import ai.alphacompute.alphaphone.cloud.CloudSignInFlow;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.SystemClock;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.List;
import org.junit.Test;
import static org.junit.Assert.*;

/**
 * In-app Eliza Cloud sign-in return through the actual MainActivity and Capacitor bridge, with
 * owned synthetic links only. No Steward exchange, Cloud request, Google consent or account is
 * involved; an unexpired matching return is never delivered here, so no sign-in request is sent. This does
 * not show that Android verified the App Link: that is `adb shell pm get-app-links
 * ai.alphacompute.alphaphone` on a device whose App Link host assetlinks lists the installed signer.
 */
public final class CloudSignInCallbackInstrumentedTest {
 private static Context context() { return InstrumentationRegistry.getInstrumentation().getTargetContext(); }
 private static Intent intent(String uri) { return new Intent(Intent.ACTION_VIEW, Uri.parse(uri), context(), MainActivity.class); }
 private static final String HOST = BuildConfig.ELIZAOS_APP_LINK_HOST;
 private static String callback(String state) { return "https://" + HOST + "/alphaphone/auth/callback#code=synthetic-unused-code&state=" + state; }
 private static void gate() { org.junit.Assume.assumeTrue("Explicit synthetic Cloud sign-in campaign", "1".equals(InstrumentationRegistry.getArguments().getString("cloudSignInNative"))); }
 private static AlphaCredentialStore store() { return new AlphaCredentialStore(context()); }

 /** The return resolves to MainActivity only, at one exact path, on the build's App Link host (production.web). */
 @Test public void returnLinkResolvesOnlyToMainActivity() {
  PackageManager packages = context().getPackageManager();
  Intent link = new Intent(Intent.ACTION_VIEW, Uri.parse(callback(CloudSignInFlow.newState()))).addCategory(Intent.CATEGORY_BROWSABLE).setPackage(context().getPackageName());
  List<ResolveInfo> matches = packages.queryIntentActivities(link, 0);
  assertEquals("eliza.app", HOST);
  assertEquals(1, matches.size());
  assertEquals(MainActivity.class.getName(), matches.get(0).activityInfo.name);
  for (String other : new String[]{"https://" + HOST + "/", "https://" + HOST + "/alphaphone/auth/callback/extra", "https://" + HOST + "/auth/callback", "https://api." + HOST + "/alphaphone/auth/callback", "http://" + HOST + "/alphaphone/auth/callback"})
   assertTrue(other, packages.queryIntentActivities(new Intent(Intent.ACTION_VIEW, Uri.parse(other)).addCategory(Intent.CATEGORY_BROWSABLE).setPackage(context().getPackageName()), 0).isEmpty());
  boolean staging = !packages.queryIntentActivities(new Intent(Intent.ACTION_VIEW, Uri.parse("https://staging.eliza.app/alphaphone/auth/callback")).addCategory(Intent.CATEGORY_BROWSABLE).setPackage(context().getPackageName()), 0).isEmpty();
  assertFalse("Alpha registers no staging return", staging);
 }

 /** Launches MainActivity with uri over a fresh pending record and asserts the record and the Cloud credential are unchanged. */
 private static void assertPendingRecordKept(String uri) throws Exception {
  String cloudBefore = store().readCredentialSlot(Slots.CLOUD_PRODUCTION);
  CloudSignInFlow.Pending pending = CloudSignInFlow.Pending.create(AlphaCloudSignInPlugin.REGISTRATION.defaultEnvironment(), System.currentTimeMillis());
  store().writeCredentialSlot(AlphaCloudSignInPlugin.PENDING_SLOT, pending.serialize());
  try (BoundedActivityScenario<MainActivity> scenario = BoundedActivityScenario.launch(intent(uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK))) {
   SystemClock.sleep(3000);
   assertEquals("The return cannot cancel a sign-in", pending.serialize(), store().readCredentialSlot(AlphaCloudSignInPlugin.PENDING_SLOT));
   assertEquals("No key is written for the return", cloudBefore, store().readCredentialSlot(Slots.CLOUD_PRODUCTION));
  } finally { store().removeCredentialSlot(AlphaCloudSignInPlugin.PENDING_SLOT); }
 }

 /** A return whose state does not match is ignored: the pending record stays and nothing is stored (shared callback contract). */
 @Test public void mismatchingReturnLeavesPendingRecordAndStoresNothing() throws Exception {
  gate();
  assertPendingRecordKept(callback(CloudSignInFlow.newState()));
 }

 /** The fallback page's parameterless hand-off carries no result: the pending record stays until expiry or a retry. */
 @Test public void parameterlessReturnKeepsPendingRecord() throws Exception {
  gate();
  assertPendingRecordKept("https://" + HOST + "/alphaphone/auth/callback");
 }

 /**
  * An expired record with the matching state is never used. A return that starts Alpha has no live
  * sign-in attempt, so the shared client consumes nothing and writes no credential; the record stays
  * for the next sign-in to replace (AlphaCloudSignInClient.captureCallback).
  */
 @Test public void expiredPendingRecordIsNeverUsed() throws Exception {
  gate();
  String cloudBefore = store().readCredentialSlot(Slots.CLOUD_PRODUCTION);
  CloudSignInFlow.Pending expired = new CloudSignInFlow.Pending(AlphaCloudSignInPlugin.REGISTRATION.defaultEnvironment(), CloudSignInFlow.newState(), CloudSignInFlow.newVerifier(), System.currentTimeMillis() - 1);
  store().writeCredentialSlot(AlphaCloudSignInPlugin.PENDING_SLOT, expired.serialize());
  try (BoundedActivityScenario<MainActivity> scenario = BoundedActivityScenario.launch(intent(callback(expired.state)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK))) {
   SystemClock.sleep(5000);
   assertEquals("An expired return writes no credential", cloudBefore, store().readCredentialSlot(Slots.CLOUD_PRODUCTION));
   scenario.recreate();
   SystemClock.sleep(2000);
   assertEquals("A recreated activity does not replay the return", cloudBefore, store().readCredentialSlot(Slots.CLOUD_PRODUCTION));
  } finally { store().removeCredentialSlot(AlphaCloudSignInPlugin.PENDING_SLOT); }
 }
}
