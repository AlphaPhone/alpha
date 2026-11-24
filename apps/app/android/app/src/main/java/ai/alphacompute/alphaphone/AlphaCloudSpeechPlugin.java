// spec/app/voice/index.md, "Story: Hold a spoken conversation"; spec/app/voice/route.md, "Story: Choose where speech is processed"; spec/app/platform/index.md, "Story: Reach the phone's native capabilities"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.passwords.PasswordSurfaces;
import ai.eliza.plugins.signin.CredentialJson;
import ai.eliza.plugins.signin.CredentialReader;
import ai.eliza.plugins.signin.DeviceCustody;
import ai.eliza.plugins.signin.SignInRegistration;
import ai.eliza.voice.SpeechStreamBridgePlugin;
import android.Manifest;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.HashMap;
import java.util.Map;

/**
 * eliza's Cloud speech relay under Alpha's identity: the reviewed origin and the signed-in key of each cloud
 * the sign-in registration names, read from the phone's own custody, and a session that ends as soon as a
 * password surface opens.
 */
@CapacitorPlugin(name = "ElizaCloudSpeech", permissions = { @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }) })
public final class AlphaCloudSpeechPlugin extends SpeechStreamBridgePlugin {
 private static final String SIGN_IN = "ElizaSignIn";
 private AlphaCloudSpeechAuthority authority;
 private final PasswordSurfaces.Listener secretSurface = visible -> { if (visible) retireSpeechAuthority(); };

 @Override public void load() {
  super.load();
  authority = new AlphaCloudSpeechAuthority(origins(), origin -> DeviceCustody.reader(getContext(), origin), PasswordSurfaces::visible);
  PasswordSurfaces.addListener(secretSurface);
 }

 @Override protected void handleOnDestroy() {
  PasswordSurfaces.removeListener(secretSurface);
  super.handleOnDestroy();
  if (authority != null) authority.close();
 }

 @Override protected String cloudOrigin(String environment) { return authority.origin(environment); }

 @Override protected Credential readCredential(String environment, String expectedId, long epoch) {
  CredentialReader.Credential key = authority.read(environment, expectedId, epoch);
  return new Credential(key.value(), key.keyExpiresAt());
 }

 @Override protected long authorityEpoch() { return authority.epoch(); }

 @Override protected boolean sensitiveSurfaceActive() { return PasswordSurfaces.visible(); }

 @Override protected void credentialRefused(String environment, String credentialId, String reason) { authority.refused(environment, credentialId, reason); }

 @Override protected String diagnosticFormat() { return "alpha-cloud-stream-timing-v1"; }

 private Map<String, String> origins() {
  Map<String, String> origins = new HashMap<>();
  try {
   String config = getBridge().getConfig().getPluginConfiguration(SIGN_IN).getConfigJSON().toString();
   for (SignInRegistration.Environment environment : SignInRegistration.parse(CredentialJson.object(CredentialJson.parse(config), SIGN_IN)).environments())
    origins.put(environment.name, environment.apiOrigin);
  } catch (IllegalArgumentException refused) {
   origins.clear();
  }
  return origins;
 }
}
