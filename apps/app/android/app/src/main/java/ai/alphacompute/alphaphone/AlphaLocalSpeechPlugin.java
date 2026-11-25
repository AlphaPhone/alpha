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
import java.util.function.BooleanSupplier;

@CapacitorPlugin(name = "AlphaVoiceCloud",
  permissions = @Permission(alias = "microphone", strings = Manifest.permission.RECORD_AUDIO))
public final class AlphaLocalSpeechPlugin extends LocalSpeechBridgePlugin {
 private static final String READ_VOICEMAIL = "com.android.voicemail.permission.READ_VOICEMAIL";
 private static final int WINDOW_SAMPLES = VoicemailPcm.SAMPLE_RATE * 60;
 private static final int TRANSCRIPT_LIMIT = 8_000;
 private final PasswordSurfaces.Listener secretSurface = visible -> {
  if (visible) {
   stopVoicemailRead();
   retireSpeechAuthority();
  }
 };
 private final Object voicemailLock = new Object();
 private VoicemailRead activeVoicemail, nextVoicemail;

 public AlphaLocalSpeechPlugin() {
  super("alpha-cloud-voice-", "alpha-cloud-tts-");
 }

 @Override public void load() {
  super.load();
  PasswordSurfaces.addListener(secretSurface);
 }

 @Override protected boolean sensitiveSurfaceActive() {
  return PasswordSurfaces.visible();
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
  synchronized (voicemailLock) {
   if (activeVoicemail != null) {
    // The SDK voice gate still owns the cancelled request until its worker settles.
    if (activeVoicemail.retired && nextVoicemail == null && !activeVoicemail.requestId.equals(requestId)) {
     nextVoicemail = read;
    } else call.reject("Another voicemail is being transcribed.");
    return;
   }
   activeVoicemail = read;
  }
  read.next();
 }

 @PluginMethod public void cancelVoicemailTranscription(PluginCall call) {
  String id = call.getString("requestId");
  VoicemailRead read = null, waiting = null;
  synchronized (voicemailLock) {
   if (activeVoicemail != null && activeVoicemail.requestId.equals(id)) {
    read = activeVoicemail;
    read.retired = true;
   } else if (nextVoicemail != null && nextVoicemail.requestId.equals(id)) {
    waiting = nextVoicemail;
    nextVoicemail = null;
    waiting.retired = true;
   }
  }
  if (read != null) {
   read.cancel.cancel();
   mainHandler().post(() -> cancelSpeech(id));
  }
  if (waiting != null) waiting.refuse();
  call.resolve();
 }

 @Override protected void handleOnPause() {
  stopVoicemailRead();
  super.handleOnPause();
 }

 @Override protected void handleOnDestroy() {
  PasswordSurfaces.removeListener(secretSurface);
  stopVoicemailRead();
  super.handleOnDestroy();
 }

 private void stopVoicemailRead() {
  VoicemailRead read, waiting;
  synchronized (voicemailLock) {
   read = activeVoicemail;
   waiting = nextVoicemail;
   nextVoicemail = null;
   if (read != null) read.retired = true;
   if (waiting != null) waiting.retired = true;
  }
  if (read != null) read.cancel.cancel();
  if (waiting != null) waiting.refuse();
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
  private volatile boolean retired;

  VoicemailRead(PluginCall owner, long id, String requestId) {
   this.owner = owner;
   this.id = id;
   this.requestId = requestId;
  }

  private boolean current() {
   synchronized (voicemailLock) {
    if (retired || activeVoicemail != this) return false;
   }
   return mayReadVoicemail();
  }

  private void next() {
   try {
    if (!current()) { finish(false); return; }
   } catch (RuntimeException unavailable) {
    finish(false);
    return;
   }
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
   VoicemailRead waiting;
   boolean publish;
   synchronized (voicemailLock) {
    if (activeVoicemail != this) return;
    publish = success && !retired;
    waiting = nextVoicemail;
    activeVoicemail = waiting;
    nextVoicemail = null;
   }
   try {
    if (publish) owner.resolve(new JSObject().put("text", text.toString()));
    else refuse();
   } finally {
    if (waiting != null) waiting.next();
   }
  }

  private void refuse() { owner.reject("Voicemail transcription unavailable."); }
 }
}
