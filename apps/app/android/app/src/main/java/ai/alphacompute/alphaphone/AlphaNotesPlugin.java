package ai.alphacompute.alphaphone;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import ai.eliza.plugins.media.RecordingStore;
import ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots;
import java.io.File;
import java.io.IOException;
import java.util.Objects;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AlphaNotes", permissions = {
    @Permission(alias = "microphone", strings = {Manifest.permission.RECORD_AUDIO})
})
public final class AlphaNotesPlugin extends Plugin {
  private static final String AUDIO_PREFIX = "note-audio-metadata:v1:";
  private static final RecordingStore.Limits AUDIO_LIMITS =
      new RecordingStore.Limits(Long.MAX_VALUE, Long.MAX_VALUE, 150_000, 6L * 24 * 60 * 60 * 1000);
  private final Handler main = new Handler(Looper.getMainLooper());
  private final ExecutorService files = Executors.newSingleThreadExecutor();
  private volatile boolean front = true;
  private volatile boolean closed;
  private final AlphaNoteRecorder.Listener recorderListener = this::recordingChanged;
  private String lastRecordingState = "";
  private MediaPlayer player;
  private String playingId;
  private PluginCall playback;

  private interface Request { void run() throws Exception; }

  private void onMain(PluginCall call, Request request) {
    main.post(() -> {
      if (closed) { call.reject("Notes is closed"); return; }
      try { request.run(); } catch (Exception unavailable) { call.reject("The recording is unavailable"); }
    });
  }

  private void onDisk(PluginCall call, Request request) {
    PluginWorkers.submit(files, () -> {
      if (closed) { call.reject("Notes is closed"); return; }
      try { request.run(); } catch (Exception unavailable) { call.reject("The saved content is unavailable"); }
    }, () -> call.reject("Notes is closed"));
  }

  private AlphaNoteRecorder recorder() { return AlphaNoteRecorder.get(getContext()); }

  private static String recordingId(PluginCall call) {
    String id = call.getString("recordingId");
    if (id == null || !id.matches(AlphaNoteRecorder.ID)) throw new IllegalArgumentException();
    return id;
  }

  static boolean inCall(Context context) {
    AudioManager audio = context.getSystemService(AudioManager.class);
    if (audio == null) return false;
    int mode = audio.getMode();
    return mode == AudioManager.MODE_IN_CALL || mode == AudioManager.MODE_IN_COMMUNICATION || mode == AudioManager.MODE_RINGTONE;
  }

  private boolean inCall() { return inCall(getContext()); }

  private void recordingChanged(JSObject status) {
    String state = status.optString("state");
    if (!"recording".equals(state) && !"paused".equals(state)) {
      AlphaNoteRecordingService.recordingClosed(getContext(), status.getString("recordingId"));
    } else if (!Objects.equals(lastRecordingState, state)) {
      AlphaNoteRecordingService.refresh(getContext());
    }
    lastRecordingState = state;
    notifyListeners("recordingChanged", status);
  }

  @Override public void load() {
    super.load();
    try {
      recorder().setListener(recorderListener);
    } catch (RuntimeException unavailable) {
      lastRecordingState = "";
    }
  }

  @Override protected void handleOnResume() {
    front = true;
    super.handleOnResume();
  }

  @Override protected void handleOnPause() {
    front = false;
    main.post(() -> endedPlayback(false));
    super.handleOnPause();
  }

  @Override protected void handleOnNewIntent(Intent intent) {
    if (AlphaNoteRecordingService.offerFromIntent(getContext(), intent)) notifyListeners("openRequested", new JSObject());
    super.handleOnNewIntent(intent);
  }

  @PluginMethod public void consumeOpen(PluginCall call) {
    call.resolve(new JSObject().put("open", AlphaNoteRecordingService.consumeShowNotes()));
  }

  @PluginMethod public void permission(PluginCall call) { answeredPermission(call); }

  @PluginMethod public void requestMicrophone(PluginCall call) {
    if (getPermissionState("microphone") == PermissionState.GRANTED) { answeredPermission(call); return; }
    requestPermissionForAlias("microphone", call, "microphoneAnswered");
  }

  @PermissionCallback private void microphoneAnswered(PluginCall call) { answeredPermission(call); }

  private void answeredPermission(PluginCall call) {
    call.resolve(new JSObject().put("grant", getPermissionState("microphone").toString()));
  }

  @PluginMethod public void status(PluginCall call) {
    onMain(call, () -> call.resolve(recorder().status()));
  }

  @PluginMethod public void start(PluginCall call) {
    onMain(call, () -> {
      if (!front || locked() || inCall() || player != null || getPermissionState("microphone") != PermissionState.GRANTED) {
        call.reject("The microphone is unavailable");
        return;
      }
      JSObject status = recorder().start(call.getString("ownerDigest"), call.getString("folderId"));
      AlphaNoteRecordingService.start(getContext(), status.getString("recordingId"));
      call.resolve(status);
    });
  }

  @PluginMethod public void command(PluginCall call) {
    onMain(call, () -> {
      String id = recordingId(call);
      String command = call.getString("command", "");
      switch (command) {
        case "Pause" -> call.resolve(recorder().pause(id));
        case "End" -> call.resolve(recorder().stop(id));
        case "Resume" -> {
          if (!front || locked() || inCall() || player != null || getPermissionState("microphone") != PermissionState.GRANTED) { call.reject("The microphone is unavailable"); return; }
          JSObject status = recorder().resume(id);
          AlphaNoteRecordingService.start(getContext(), id);
          call.resolve(status);
        }
        default -> call.reject("No such recording control");
      }
    });
  }

  @PluginMethod public void discard(PluginCall call) {
    onMain(call, () -> {
      if (!recorder().owns(recordingId(call))) { call.reject("The recording changed"); return; }
      recorder().discard();
      call.resolve();
    });
  }

  static RecordingStore recordings(Context context) {
    JsonCredentialSlots slots = AlphaEarlier.store(context);
    return new RecordingStore(new File(context.getNoBackupFilesDir(), "note-audio"), AUDIO_PREFIX, "noteId",
        new RecordingStore.Slots() {
          @Override public String read(String key) throws Exception { return slots.read(key); }
          @Override public void write(String key, String value) throws Exception { slots.write(key, value); }
          @Override public void remove(String key) throws Exception { slots.remove(key); }
        }, AUDIO_LIMITS);
  }

  private RecordingStore recordings() { return recordings(getContext()); }

  @PluginMethod public void retain(PluginCall call) {
    onDisk(call, () -> {
      String audioId = recordingId(call);
      AlphaNoteRecorder recorder = recorder();
      String noteId = call.getString("noteId");
      if (!recorder.beginCanonicalSave(audioId)) {
        call.reject("The recording changed");
        return;
      }
      try {
        File joined = recorder.joined(audioId);
        JSObject retained = JSObject.fromJSONObject(recordings().retain(joined, audioId, noteId, recorder.totalMs(), "", true));
        recorder.commitCanonicalSave(audioId);
        call.resolve(retained);
      } catch (Exception failure) {
        recorder.abortCanonicalSave(audioId);
        throw failure;
      }
    });
  }

  @PluginMethod public void describe(PluginCall call) {
    onDisk(call, () -> call.resolve(JSObject.fromJSONObject(recordings().describe(call.getString("audioId")))));
  }

  @PluginMethod public void play(PluginCall call) {
    onDisk(call, () -> {
      String id = RecordingStore.id(call.getString("audioId"));
      RecordingStore store = recordings();
      String note = call.getString("noteId");
      if (!Objects.equals(note, store.describe(id).optString("noteId"))) { call.reject("The recording changed"); return; }
      File file = store.playable(id);
      onMain(call, () -> {
        if (!front || locked() || inCall()) { call.reject("Playback is unavailable"); return; }
        endedPlayback(false);
        MediaPlayer next = new MediaPlayer();
        player = next;
        playingId = id;
        playback = call;
        try {
          next.setDataSource(file.getAbsolutePath());
          next.setOnPreparedListener(ready -> {
            if (player != ready) return;
            try {
              int from = Math.max(0, call.getInt("offsetMs", 0));
              if (from > 0) ready.seekTo(Math.min(ready.getDuration(), from));
              ready.start();
            } catch (RuntimeException unavailable) { endedPlayback(false); }
          });
          next.setOnCompletionListener(done -> { if (player == done) endedPlayback(true); });
          next.setOnErrorListener((failed, code, detail) -> {
            if (player == failed) endedPlayback(false);
            return true;
          });
          next.prepareAsync();
        } catch (Exception unavailable) {
          endedPlayback(false);
        }
      });
    });
  }

  private void endedPlayback(boolean ok) {
    if (player != null) {
      player.release();
      player = null;
    }
    if (playback != null) {
      playback.resolve(new JSObject().put("ok", ok));
      playback = null;
    }
    playingId = null;
  }

  @PluginMethod public void halt(PluginCall call) {
    onMain(call, () -> { endedPlayback(true); call.resolve(new JSObject().put("ok", true)); });
  }

  @PluginMethod public void purge(PluginCall call) {
    onDisk(call, () -> {
      var receipt = new ResidentDigestChannel.RecordingCleanup(
          RecordingStore.id(call.getString("audioId")), RecordingStore.id(call.getString("noteId")),
          call.getString("operationId"), call.getString("deletedAt"));
      var account = ResidentDigestChannel.openAccount(getContext());
      account.prepareRecordingCleanup(receipt);
      onMain(call, () -> {
        if (receipt.audioId().equals(playingId)) endedPlayback(false);
        onDisk(call, () -> {
          RecordingStore store = recordings();
          Runnable current = () -> {
            if (closed) throw new IllegalStateException("Notes is closed");
            try { account.check(); }
            catch (IOException changed) { throw new IllegalStateException("Resident account changed", changed); }
          };
          current.run();
          store.remove(receipt.audioId(), receipt.noteId(), receipt.operationId(), current);
          var purged = store.purge(receipt.audioId(), receipt.noteId(), receipt.operationId(), current);
          if (!RecordingStore.PURGED.equals(purged.get("status")) || !receipt.audioId().equals(purged.get("audioId"))
              || !receipt.noteId().equals(purged.get("noteId")) || !receipt.operationId().equals(purged.get("operationId"))) {
            throw new IOException("Recording purge was not confirmed");
          }
          account.confirmRecordingCleanup(receipt);
          call.resolve(JSObject.fromJSONObject(purged));
        });
      });
    });
  }

  @PluginMethod public void share(PluginCall call) {
    onMain(call, () -> {
      android.app.Activity activity = getActivity();
      if (activity == null || !front || locked()) { call.reject("Open Notes to share a draft"); return; }
      String title = call.getString("title", "");
      String text = call.getString("text", "");
      boolean mail = "Email".equals(call.getString("channel"));
      if (title.length() > 240 || text.length() > 80_000) { call.reject("This note is too long to share"); return; }
      Intent draft = new Intent(Intent.ACTION_SENDTO, android.net.Uri.parse(mail ? "mailto:" : "smsto:"));
      if (mail) draft.putExtra(Intent.EXTRA_SUBJECT, title).putExtra(Intent.EXTRA_TEXT, text);
      else draft.putExtra("sms_body", title.isBlank() ? text : title + "\n\n" + text);
      activity.startActivity(AlphaDevicePlugin.handOff(draft));
      call.resolve();
    });
  }

  private boolean locked() {
    android.app.KeyguardManager keyguard = getContext().getSystemService(android.app.KeyguardManager.class);
    return keyguard == null || keyguard.isDeviceLocked();
  }

  @PluginMethod public void settings(PluginCall call) {
    onMain(call, () -> {
      android.app.Activity activity = getActivity();
      if (activity == null) { call.reject("Settings are unavailable"); return; }
      Intent page = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
          android.net.Uri.parse("package:" + getContext().getPackageName()));
      activity.startActivity(AlphaDevicePlugin.handOff(page));
      call.resolve();
    });
  }

  @PluginMethod public void previousExists(PluginCall call) {
    onDisk(call, () -> {
      JsonCredentialSlots slots = AlphaEarlier.store(getContext());
      for (String name : new String[]{"notes-records:v1:device", "notes-trash:v1:device"}) {
        if (slots.slotFile(slots.slotHash(name)).getBaseFile().isFile()) {
          call.resolve(new JSObject().put("present", true));
          return;
        }
      }
      call.resolve(new JSObject().put("present", false));
    });
  }

  @PluginMethod public void readPrevious(PluginCall call) {
    onDisk(call, () -> {
      String key = switch (call.getString("area", "")) {
        case "records" -> "notes-records:v1:device";
        case "trash" -> "notes-trash:v1:device";
        case "folders" -> "notes-folders:v1:device";
        default -> throw new IllegalArgumentException();
      };
      String text = AlphaEarlier.read(getContext(), key);
      call.resolve(new JSObject().put("text", text == null ? org.json.JSONObject.NULL : text));
    });
  }

  @Override protected void handleOnDestroy() {
    closed = true;
    try { recorder().clearListener(recorderListener); } catch (RuntimeException unavailable) { lastRecordingState = ""; }
    main.post(() -> endedPlayback(false));
    files.shutdownNow();
    super.handleOnDestroy();
  }
}
