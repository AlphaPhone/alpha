package ai.alphacompute.alphaphone;

import ai.eliza.plugins.signin.CloudRequests;
import ai.eliza.plugins.signin.CredentialPolicy;
import ai.eliza.plugins.signin.CredentialReader;
import ai.eliza.plugins.signin.DeviceCredentialStore;
import ai.eliza.plugins.signin.DeviceCustody;
import ai.eliza.plugins.signin.ElizaCloudPlugin;
import ai.eliza.plugins.signin.SignInRegistration;
import android.content.Context;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.json.JSONObject;

/**
 * Bridges Alpha's signed-in Cloud credential (`AlphaCredentialStore` `cloud:<environment>`) into
 * upstream `DeviceCustody` so `ElizaCloud` authenticates requests with Alpha's saved device key
 * and clears or mirrors sign-outs and key renewals without keeping a stale second copy.
 */
@CapacitorPlugin(name = "ElizaCloud")
public final class AlphaElizaCloudPlugin extends ElizaCloudPlugin {
 private static final Object SYNC_LOCK = new Object();
 private static final Map<String, String> LAST_SYNCED = new ConcurrentHashMap<>();

 @Override protected CloudRequests.Custody custody(Context context, SignInRegistration.Environment environment) {
  CloudRequests.Custody base = DeviceCustody.cloud(context, environment.apiOrigin);
  syncCustody(context, environment, base);
  return base;
 }

 static void clearMirroredCustody(Context context) {
  synchronized (SYNC_LOCK) {
   LAST_SYNCED.clear();
   for (var env : AlphaCloudSignInPlugin.REGISTRATION.environments()) {
    CloudRequests.Custody base = DeviceCustody.cloud(context, env.api());
    base.session().drop();
    base.credentials().reset();
   }
  }
 }

 private static void syncCustody(Context context, SignInRegistration.Environment environment, CloudRequests.Custody base) {
  synchronized (SYNC_LOCK) {
   DeviceCredentialStore store = base.credentials();
   try {
    String raw = new AlphaCredentialStore(context).readCredentialSlot("cloud:" + environment.name);
    if (raw == null || raw.isBlank()) {
     LAST_SYNCED.remove(environment.apiOrigin);
     if (store.current() != null || !(store.state().custody() instanceof CredentialPolicy.Custody.SignedOut)) {
      base.session().drop();
      store.signOut();
     }
     return;
    }
    JSONObject saved = new JSONObject(raw);
    String credentialId = saved.optString("credentialId", "").trim();
    String token = saved.optString("token", "").trim();
    long expiresAt = saved.optLong("expiresAt", 0L);
    long now = System.currentTimeMillis();
    if (credentialId.isEmpty() || token.length() < 8 || expiresAt <= now) {
     LAST_SYNCED.remove(environment.apiOrigin);
     if (store.current() != null) {
      base.session().drop();
      store.signOut();
     }
     return;
    }
    String fingerprint = credentialId + ":" + expiresAt + ":" + token.hashCode();
    CredentialReader.Credential existing = store.current();
    if (existing == null && fingerprint.equals(LAST_SYNCED.get(environment.apiOrigin))
      && store.state().custody() instanceof CredentialPolicy.Custody.Expired) {
     return;
    }
    if (existing != null && credentialId.equals(existing.credentialId())
      && token.equals(existing.value()) && existing.keyExpiresAt() == expiresAt) {
     return;
    }
    String userId = nonBlank(saved.optString("userId", ""), "alpha-cloud");
    String orgId = nonBlank(saved.optString("organizationId", ""), "alpha-cloud");
    int attempt = store.beginSignIn();
    DeviceCredentialStore.Kept kept = store.tokenAnswered(attempt,
      new DeviceCredentialStore.Token(credentialId, token, new CredentialPolicy.Account(userId, orgId), expiresAt));
    if (kept == DeviceCredentialStore.Kept.KEPT
      && store.acknowledged(attempt, credentialId, expiresAt) == DeviceCredentialStore.Outcome.ACCEPTED) {
     LAST_SYNCED.put(environment.apiOrigin, fingerprint);
    } else {
     store.signInEnded(attempt);
    }
   } catch (Exception ignored) {
    // Never block an unauthenticated request (e.g. GET /api/public/service) on an absent or malformed slot.
   }
  }
 }

 private static String nonBlank(String value, String fallback) {
  String trimmed = value == null ? "" : value.trim();
  return trimmed.isEmpty() ? fallback : trimmed;
 }
}
