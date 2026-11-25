// spec/app/voice/index.md, "Story: Hold a spoken conversation"; spec/app/phone/voicemail.md, "Story: Read what was said"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.VoicemailPcm;
import ai.eliza.plugins.messages.VoicemailStore;
import ai.eliza.plugins.passwords.PasswordSurfaces;
import ai.eliza.voice.LocalSpeechBridgePlugin;
import android.Manifest;
import android.app.role.RoleManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.CancellationSignal;
import android.os.UserManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.io.IOException;
import java.util.Arrays;
import java.util.Base64;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BooleanSupplier;

@CapacitorPlugin(name = "AlphaVoiceCloud",
  permissions = @Permission(alias = "microphone", strings = Manifest.permission.RECORD_AUDIO))
public final class AlphaLocalSpeechPlugin extends LocalSpeechBridgePlugin {
 private static final String READ_VOICEMAIL = "com.android.voicemail.permission.READ_VOICEMAIL";
 private static final int WINDOW_SAMPLES = VoicemailPcm.SAMPLE_RATE * 60;
 private static final int TRANSCRIPT_LIMIT = 8_000;
 private final AtomicReference<VoicemailRead> voicemail = new AtomicReference<>();

 public AlphaLocalSpeechPlugin() {
  super("alpha-cloud-voice-", "alpha-cloud-tts-");
 }

 @PluginMethod public void transcribeVoicemail(PluginCall call) {
  final long id;
  final String requestId;
  try {
   id = VoicemailStore.row(call.getString("id"));
   requestId = required(call.getString("requestId"), 128);
   if (id <= 0 || !requestId.startsWith("voicemail-") || !mayReadVoicemail()) throw new IllegalArgumentException();
  } catch (RuntimeException refused) {
   call.reject("Voicemail transcription unavailable.");
   return;
  }
  VoicemailRead read = new VoicemailRead(call, id, requestId);
  if (!voicemail.compareAndSet(null, read)) {
   call.reject("Another voicemail is being transcribed.");
   return;
  }
  read.next();
 }

 @PluginMethod public void cancelVoicemailTranscription(PluginCall call) {
  VoicemailRead read = voicemail.get();
  if (read != null && read.requestId.equals(call.getString("requestId"))) {
   read.cancel.cancel();
   mainHandler().post(() -> cancelSpeech(read.requestId));
  }
  call.resolve();
 }

 @Override protected void handleOnPause() {
  stopVoicemailRead();
  super.handleOnPause();
 }

 @Override protected void handleOnDestroy() {
  stopVoicemailRead();
  super.handleOnDestroy();
 }

 private void stopVoicemailRead() {
  VoicemailRead read = voicemail.get();
  if (read != null) read.cancel.cancel();
 }

 private boolean mayReadVoicemail() {
  Context context = getContext();
  if (!AlphaImageCapability.verified(context) || !AlphaDevicePlugin.shareForeground(getActivity()) || PasswordSurfaces.visible()) return false;
  UserManager users = context.getSystemService(UserManager.class);
  if (users == null || (Build.VERSION.SDK_INT >= 31 && !users.isUserForeground())) return false;
  if (!Boolean.FALSE.equals(AlphaCallState.read(context).inCall)) return false;
  RoleManager roles = context.getSystemService(RoleManager.class);
  return (roles != null && roles.isRoleAvailable(RoleManager.ROLE_DIALER) && roles.isRoleHeld(RoleManager.ROLE_DIALER))
   || context.checkSelfPermission(READ_VOICEMAIL) == PackageManager.PERMISSION_GRANTED;
 }

 /** Each recognized window shares one foreground request and one bounded provider decode. */
 private final class VoicemailRead {
  private final PluginCall owner;
  private final long id;
  private final String requestId;
  private final CancellationSignal cancel = new CancellationSignal();
  private final StringBuilder text = new StringBuilder();
  private byte[] pcm;
  private int offset = VoicemailPcm.WAV_HEADER_BYTES;
  private int windowBytes;

  VoicemailRead(PluginCall owner, long id, String requestId) {
   this.owner = owner;
   this.id = id;
   this.requestId = requestId;
  }

  private boolean current() {
   return !cancel.isCanceled() && voicemail.get() == this && mayReadVoicemail();
  }

  private void next() {
   JSObject input = new JSObject().put("requestId", requestId).put("replace", false);
   PluginCall window = new PluginCall(null, owner.getPluginId(), owner.getCallbackId(), owner.getMethodName(), input) {
    @Override public void resolve(JSObject result) { heard(result.getString("text", "")); }
    @Override public void resolve() { finish(false); }
    @Override public void reject(String message, String code, Exception cause, JSObject data) { finish(false); }
   };
   transcribeSuppliedWav(window, this::wav);
  }

  private byte[] wav(BooleanSupplier cancelled) throws Exception {
   if (cancelled.getAsBoolean() || !current()) throw new IOException();
   if (pcm == null) {
    String data = VoicemailStore.pcm(getContext(), id, cancel).getString("data");
    if (data == null || data.length() > (VoicemailPcm.MAX_WAV_BYTES + 2) / 3 * 4) throw new IOException();
    pcm = Base64.getDecoder().decode(data);
    int bytes = pcm.length - offset;
    if (bytes <= 0 || (bytes & 1) != 0 || pcm.length > VoicemailPcm.MAX_WAV_BYTES) throw new IOException();
    // Balance the windows so that the last one is never shorter than the recognizer's minimum.
    int samples = bytes / 2;
    int windows = (samples + WINDOW_SAMPLES - 1) / WINDOW_SAMPLES;
    windowBytes = 2 * ((samples + windows - 1) / windows);
   }
   if (cancelled.getAsBoolean() || !current()) throw new IOException();
   int length = Math.min(windowBytes, pcm.length - offset);
   byte[] header = VoicemailPcm.wavHeader(length);
   byte[] window = Arrays.copyOf(header, header.length + length);
   System.arraycopy(pcm, offset, window, header.length, length);
   offset += length;
   return window;
  }

  private void heard(String result) {
   try {
    if (!current()) { finish(false); return; }
    String spoken = result == null ? "" : result.trim();
    if (!spoken.isEmpty() && text.length() < TRANSCRIPT_LIMIT) {
     if (!text.isEmpty()) text.append(' ');
     text.append(spoken, 0, Math.min(spoken.length(), TRANSCRIPT_LIMIT - text.length()));
    }
    if (offset == pcm.length) finish(true);
    else next();
   } catch (RuntimeException unavailable) {
    finish(false);
   }
  }

  private void finish(boolean success) {
   if (pcm != null) Arrays.fill(pcm, (byte) 0);
   if (!voicemail.compareAndSet(this, null)) return;
   if (success) owner.resolve(new JSObject().put("text", text.toString()));
   else owner.reject("Voicemail transcription unavailable.");
  }
 }
}
