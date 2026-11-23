package ai.alphacompute.alphaphone;

import ai.alphacompute.alphaphone.cloud.CloudAuthWire;
import ai.alphacompute.alphaphone.cloud.CloudCredentialSlots;
import ai.alphacompute.alphaphone.cloud.CloudSignInConfig;
import ai.alphacompute.alphaphone.cloud.CloudSignInEnvironment;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Alpha's registration of its native Cloud sign-in client ({@link AlphaCloudSignInClient}, Alpha's
 * fork of elizaOS/eliza packages/auth/android CloudSignInPlugin, so the authorization dialog and
 * browser launch are Alpha's own). The client owns email/SMS codes, native Google, MFA, the mobile
 * App Auth tail, acknowledgement resume, replaced-key revocation and readiness. This class supplies
 * the registration: the `ai.alphacompute.alphaphone` App Auth client and its
 * `/alphaphone/auth/callback` return, the production deployment and the sign-in wire it serves (Steward on Eliza Cloud,
 * the Vibestack Cloud's own routes on Alpha Cloud: CloudAuthWire), its product name, the installed storage names below and its
 * Keystore credential store. The minted key follows the resident's credential-intent rule.
 *
 * The `cloud:<environment>` slot stays renderer-readable, as the Cloud sign-in hand-off's key always
 * was; the pending and receipt slots are native-only (RendererCredentialSlots).
 */
@CapacitorPlugin(name = "AlphaCloudSignIn")
public final class AlphaCloudSignInPlugin extends AlphaCloudSignInClient {
 /** Installed names: compatibility identifiers of existing sign-ins on this phone. */
 static final String PENDING_SLOT = "cloud-signin:v1:pending";
 static final String CALLBACK_PATH = "/alphaphone/auth/callback";
 static final CloudSignInConfig REGISTRATION = CloudSignInConfig.builder()
  .clientId("ai.alphacompute.alphaphone").deviceName("Alpha Phone").productName("Alpha Phone").googleClientId("alpha-phone")
  .googleSignInMode("browser")
  .logTag("AlphaCloudSignIn").readinessPreferences("alpha-cloud-signin-readiness-" + CloudDeployment.STORAGE_NAMESPACE)
  .pendingSlot(PENDING_SLOT).receiptSlotPrefix("cloud-signin:v1:ack:").credentialSlotPrefix("cloud:")
  .environment(new CloudSignInEnvironment("production", CloudDeployment.PRODUCTION_API_HOST, CloudDeployment.PRODUCTION_WEB_HOST,
   CloudDeployment.PRODUCTION_TENANT, CloudDeployment.PRODUCTION_NAME, CALLBACK_PATH, CloudAuthWire.of(CloudDeployment.ALPHA_CLOUD_CUTOVER)))
  .build();
 static String receiptSlot(CloudSignInEnvironment environment) { return REGISTRATION.receiptSlot(environment); }

 @Override protected CloudSignInConfig registration() { return REGISTRATION; }
 @Override protected CloudCredentialSlots credentials(Runnable guard) {
  AlphaCredentialStore store = new AlphaCredentialStore(getContext(), guard);
  return new CloudCredentialSlots() {
   @Override public String read(String slot) throws Exception { return store.readCredentialSlot(slot); }
   @Override public void write(String slot, String value) throws Exception { store.writeCredentialSlot(slot, value); }
   @Override public void remove(String slot) throws Exception { store.removeCredentialSlot(slot); }
   @Override public boolean compareExchange(String slot, String expected, String value) throws Exception { return store.compareExchangeCredentialSlot(slot, expected, value); }
  };
 }
 @Override protected <T> T withCredentialRead(java.util.concurrent.Callable<T> read) throws Exception {
  return AlphaLocalAgentPlugin.withCredentialRead(read);
 }
 @Override protected Runnable reserveCredentialCommit() {
  long intent = AlphaLocalAgentPlugin.reserveCredentialIntent();
  return () -> AlphaLocalAgentPlugin.requireCredentialIntent(intent);
 }
}
