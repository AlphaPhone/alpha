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

  private boolean inCall() {
    AudioManager audio = getContext().getSystemService(AudioManager.class);
    if (audio == null) return false;
    int mode = audio.getMode();
    return mode == AudioManager.MODE_IN_CALL || mode == AudioManager.MODE_IN_COMMUNICATION || mode == AudioManager.MODE_RINGTONE;
  }

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
      recorder().setListener(this::recordingChanged);
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
      if (!front || inCall() || player != null || getPermissionState("microphone") != PermissionState.GRANTED) {
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
          if (!front || inCall() || player != null) { call.reject("The microphone is unavailable"); return; }
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

  private static JsonCredentialSlots installedSlots(Context context) {
    return new JsonCredentialSlots(new File(context.getNoBackupFilesDir(), "connection-credentials"), "alpha.connection.aes.v1",
        AlphaNotesPlugin::slotCapacity, AlphaNotesPlugin::retainedCapacity);
  }

  private static int slotCapacity(String key) {
    if (key.startsWith(AUDIO_PREFIX)) return 512 * 1024;
    return key.equals("notes-folders:v1:device") ? 64 * 1024 : 32 * 1024 * 1024;
  }

  private static int retainedCapacity(String key) { return slotCapacity(key); }

  private RecordingStore recordings() {
    JsonCredentialSlots slots = installedSlots(getContext());
    return new RecordingStore(new File(getContext().getNoBackupFilesDir(), "note-audio"), AUDIO_PREFIX, "noteId",
        new RecordingStore.Slots() {
          @Override public String read(String key) throws Exception { return slots.read(key); }
          @Override public void write(String key, String value) throws Exception { slots.write(key, value); }
          @Override public void remove(String key) throws Exception { slots.remove(key); }
        }, AUDIO_LIMITS);
  }

  @PluginMethod public void retain(PluginCall call) {
    onDisk(call, () -> {
      String audioId = recordingId(call);
      AlphaNoteRecorder recorder = recorder();
      String noteId = call.getString("noteId");
      if (recorder.claimCanonicalSave(audioId)) {
        call.resolve(JSObject.fromJSONObject(recordings().retain(recorder.joined(audioId), audioId, noteId, recorder.totalMs(), "", true)));
      } else {
        call.reject("The recording changed");
      }
    });
  }

  @PluginMethod public void describe(PluginCall call) {
    onDisk(call, () -> call.resolve(JSObject.fromJSONObject(recordings().describe(call.getString("audioId")))));
  }

  @PluginMethod public void play(PluginCall call) {
    onMain(call, () -> {
      if (!front || inCall()) { call.reject("Playback is unavailable"); return; }
      String id = RecordingStore.id(call.getString("audioId"));
      RecordingStore store = recordings();
      String note = call.getString("noteId");
      if (!Objects.equals(note, store.describe(id).optString("noteId"))) { call.reject("The recording changed"); return; }
      File file = store.playable(id);
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
    onMain(call, () -> {
      String audioId = RecordingStore.id(call.getString("audioId"));
      String noteId = call.getString("noteId");
      String operation = call.getString("operationId");
      if (audioId.equals(playingId)) endedPlayback(false);
      onDisk(call, () -> {
        RecordingStore store = recordings();
        store.remove(audioId, noteId, operation, () -> {});
        call.resolve(JSObject.fromJSONObject(store.purge(audioId, noteId, operation, () -> {})));
      });
    });
  }

  @PluginMethod public void previousExists(PluginCall call) {
    onDisk(call, () -> {
      JsonCredentialSlots slots = installedSlots(getContext());
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
      String text = installedSlots(getContext()).read(key);
      call.resolve(new JSObject().put("text", text == null ? org.json.JSONObject.NULL : text));
    });
  }

  @Override protected void handleOnDestroy() {
    closed = true;
    try { recorder().setListener(null); } catch (RuntimeException unavailable) { lastRecordingState = ""; }
    main.post(() -> endedPlayback(false));
    files.shutdownNow();
    super.handleOnDestroy();
  }
}
