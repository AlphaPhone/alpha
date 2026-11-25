// spec/app/voice/index.md, "Story: Hold a spoken conversation"
package ai.alphacompute.alphaphone;

import ai.eliza.voice.LocalSpeechBridgePlugin;
import android.Manifest;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(name = "AlphaVoiceCloud",
  permissions = @Permission(alias = "microphone", strings = Manifest.permission.RECORD_AUDIO))
public final class AlphaLocalSpeechPlugin extends LocalSpeechBridgePlugin {
 public AlphaLocalSpeechPlugin() {
  super("alpha-cloud-voice-", "alpha-cloud-tts-");
 }
}
