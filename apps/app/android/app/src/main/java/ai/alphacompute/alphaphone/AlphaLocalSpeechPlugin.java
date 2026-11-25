// spec/app/voice/index.md, "Story: Hold a spoken conversation"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.passwords.PasswordSurfaces;
import ai.eliza.voice.LocalSpeechBridgePlugin;
import android.Manifest;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(name = "AlphaVoiceCloud",
  permissions = @Permission(alias = "microphone", strings = Manifest.permission.RECORD_AUDIO))
public final class AlphaLocalSpeechPlugin extends LocalSpeechBridgePlugin {
 private final PasswordSurfaces.Listener secretSurface = visible -> {
  if (visible) retireSpeechAuthority();
 };

 public AlphaLocalSpeechPlugin() {
  super("alpha-cloud-voice-", "alpha-cloud-tts-");
 }

 @Override public void load() {
  super.load();
  PasswordSurfaces.addListener(secretSurface);
 }

 @Override protected void handleOnDestroy() {
  PasswordSurfaces.removeListener(secretSurface);
  super.handleOnDestroy();
 }

 @Override protected boolean sensitiveSurfaceActive() {
  return PasswordSurfaces.visible();
 }
}
