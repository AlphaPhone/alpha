// spec/os/agentService/lifecycle.md, "Story: Start the agent when I sign in and stop it when I sign out"; spec/os/agentService/lifecycle.md, "Story: Hand a new device key of the same account to the running agent"
package ai.alphacompute.alphaphone;

import ai.alphacompute.alphaphone.runtime.NativeProviderAdmission;
import ai.eliza.os.agent.AgentCredentials;
import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;

/** The account the resident runs for: the signed-in Cloud account of the stored provider selection, or Alpha's local account, under which the resident runs with no usable Cloud key. */
final class AlphaAgentCredentials implements AgentCredentials {
 /** The account of a resident with no admitted Cloud account (P-43: the resident always runs). */
 static final Account LOCAL = new Account("alpha-local", "alpha-local");
 /**
  * The key a cloud launch is framed with when no Cloud account is admitted (android/agent/host.json launches on
  * Alpha Cloud). It is no Cloud key, so Alpha Cloud refuses each model call and the agent reports the account as
  * needing sign-in; it is a printable key of at least 8 characters because the agent refuses a shorter frame
  * credential at launch (upstream launch.schema.vibe BearerKey), which would stop the resident (A2-005, E2-004).
  */
 static final String UNBOUND = "alpha-local-no-cloud-key";
 private final Context context;

 AlphaAgentCredentials(Context context) { this.context = context.getApplicationContext(); }

 @Override public Active current() {
  try {
   Active cloud = cloudAccount(new AlphaCredentialStore(context), System.currentTimeMillis());
   if (cloud != null) return cloud;
  } catch (Exception unusable) {
   android.util.Log.w("AlphaAgentCredentials", "cloud-account-unusable " + unusable.getClass().getSimpleName());
  }
  return new Active(1, UNBOUND, 0, LOCAL);
 }

 @Override public String storageKey(Account account) { return null; }

 private static Active cloudAccount(AlphaCredentialStore store, long now) throws Exception {
  String saved = store.readCredentialSlot(LocalAgentProviderAdmission.PROVIDER_SLOT);
  if (saved == null) return null;
  JSONObject selected = new JSONObject(saved);
  JSONObject cloud = "elizacloud".equals(selected.optString("provider")) ? selected : selected.optJSONObject("cloudServices");
  if (cloud == null || !"elizacloud".equals(cloud.optString("provider"))) return null;
  String credential = store.readCredentialSlot("cloud:production");
  String token = NativeProviderAdmission.cloudProviderToken(credential, cloud.getString("credentialId"), now);
  JSONArray account = new JSONArray(NativeProviderAdmission.cloudAccountRef(cloud));
  if (account.length() != 4 || account.isNull(2) || account.isNull(3) || account.getString(2).isEmpty() || account.getString(3).isEmpty()) return null;
  long expiresAt = new JSONObject(credential).optLong("expiresAt", 0);
  return new Active(Math.max(1, expiresAt), token, expiresAt, new Account(account.getString(2), account.getString(3)));
 }
}
