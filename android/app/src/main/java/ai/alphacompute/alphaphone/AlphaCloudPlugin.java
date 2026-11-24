// spec/account/session.md; spec/os/signIn/cloudRequests.md, "A request is sent only to the deployment origin, admitted by the gate, with headers its route admits"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.signin.AccountSession;
import ai.eliza.plugins.signin.CloudRequests;
import ai.eliza.plugins.signin.CredentialPolicy;
import ai.eliza.plugins.signin.CredentialReader;
import ai.eliza.plugins.signin.DeviceCredentialStore;
import ai.eliza.plugins.signin.DeviceKeyClient;
import ai.eliza.plugins.signin.ElizaCloudPlugin;
import ai.eliza.plugins.signin.SignInRegistration;
import android.content.Context;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONObject;

/**
 * Alpha's ElizaCloud registration: serves Cloud requests through upstream's route-gated
 * {@link ElizaCloudPlugin}, reading Alpha's single saved key from {@link AlphaCredentialStore}
 * ({@code cloud:<environment>}) into an in-memory {@link DeviceCredentialStore} so no second copy
 * of the key is stored on disk.
 */
@CapacitorPlugin(name = "ElizaCloud")
public final class AlphaCloudPlugin extends ElizaCloudPlugin {
  private static final CredentialPolicy.Account ALPHA_ACCOUNT = new CredentialPolicy.Account("alpha-cloud", "alpha-cloud");
  private static final long FALLBACK_TTL_MS = 30L * 86_400_000L;

  private record Mirror(DeviceCredentialStore store, AccountSession session) {}

  private static final Map<String, Mirror> MIRRORS = new HashMap<>();

  @Override protected CloudRequests.Custody custody(Context context, SignInRegistration.Environment environment) {
    Mirror mirror = mirrorFor(environment.apiOrigin);
    sync(context.getApplicationContext(), environment.name, mirror.store());
    return new CloudRequests.Custody(mirror.store(), mirror.session());
  }

  private static synchronized Mirror mirrorFor(String apiOrigin) {
    Mirror existing = MIRRORS.get(apiOrigin);
    if (existing != null) return existing;
    Map<String, String> memory = new HashMap<>();
    DeviceCredentialStore.Slots slots = new DeviceCredentialStore.Slots() {
      @Override public synchronized String read(String slot) { return memory.get(slot); }
      @Override public synchronized void write(String slot, String value) { memory.put(slot, value); }
      @Override public synchronized void remove(String slot) { memory.remove(slot); }
    };
    DeviceCredentialStore store = new DeviceCredentialStore(slots, DeviceCredentialStore.authorityDigest(apiOrigin), System::currentTimeMillis);
    DeviceKeyClient client = new DeviceKeyClient(URI.create(apiOrigin), store, Thread::sleep);
    Mirror created = new Mirror(store, new AccountSession(store, client));
    MIRRORS.put(apiOrigin, created);
    return created;
  }

  private static synchronized void sync(Context context, String environmentName, DeviceCredentialStore store) {
    String token = null;
    String credentialId = null;
    long expiresAt = 0;
    try {
      String saved = new AlphaCredentialStore(context).readCredentialSlot("cloud:" + environmentName);
      if (saved != null) {
        JSONObject record = new JSONObject(saved);
        String rawToken = record.optString("token", "");
        String rawId = record.optString("credentialId", "");
        long rawExpires = record.optLong("expiresAt", 0);
        long now = System.currentTimeMillis();
        if (!rawToken.isEmpty() && (rawExpires == 0 || rawExpires > now)) {
          token = rawToken;
          credentialId = rawId.isEmpty() ? "alpha-" + environmentName : rawId;
          expiresAt = rawExpires > now ? rawExpires : now + FALLBACK_TTL_MS;
        }
      }
    } catch (Exception unreadable) {
      token = null;
    }
    CredentialReader.Credential held = store.current();
    if (token == null) {
      if (held != null) store.signOut();
      return;
    }
    if (held != null && token.equals(held.value())) return;
    int attempt = store.beginSignIn();
    if (store.tokenAnswered(attempt, new DeviceCredentialStore.Token(credentialId, token, ALPHA_ACCOUNT, expiresAt)) == DeviceCredentialStore.Kept.KEPT) {
      store.acknowledged(attempt, credentialId, expiresAt);
    } else {
      store.signInEnded(attempt);
    }
  }
}
