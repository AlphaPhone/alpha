// spec/agent/index.md, "Story: Run Alpha's agent on the phone"; spec/app/settings/preferences.md, "The agent is launched allowed to change Gmail and Calendar exactly as the phone last read or saved, allowed neither once it could not read them, and Alpha says nothing of it before the first answer"; spec/app/platform/adoption.md, "Story: Keep what the earlier on-device agent stored"
package ai.alphacompute.alphaphone;

import ai.eliza.os.agent.AgentConfig;
import ai.eliza.os.agent.AgentService;
import ai.eliza.os.agent.inference.InferenceHost;
import ai.eliza.voice.LocalInferenceHost;
import ai.eliza.voice.VoiceAssets;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

public final class AlphaAgentService extends AgentService {
  private static final String STORE = "alpha-agent";
  private static final String GMAIL = "google-gmail-changes";
  private static final String CALENDAR = "google-calendar-edits";

  private static final String SPEECH_SOCKET = "ALPHA_LOCAL_SPEECH_SOCKET";
  private static final AtomicReference<AlphaAgentService> speechService = new AtomicReference<>();
  private final Object speechLock = new Object();
  private SpeechHost speech;
  private boolean retiring;

  private record SpeechHost(String name, InferenceHost host) {}

  @Override protected void configureLaunch(Map<String, String> variables) {
    moveLegacyStateAside();
    synchronized (speechLock) {
      if (retiring) return;
      if (speech != null) {
        variables.put(SPEECH_SOCKET, speech.name());
        return;
      }
    }
    SpeechHost started;
    try {
      String name = "alpha-talk-" + UUID.randomUUID();
      File models = new File(getNoBackupFilesDir(), "resident-speech-models");
      if (!models.isDirectory() && !models.mkdirs()) return;
      started = new SpeechHost(name, LocalInferenceHost.start(this, name, VoiceAssets.install(this), models));
    } catch (IOException | IllegalStateException | LinkageError unavailable) {
      return;
    }
    synchronized (speechLock) {
      if (!retiring) {
        speech = started;
        speechService.set(this);
        variables.put(SPEECH_SOCKET, started.name());
        return;
      }
    }
    started.host().stop();
  }

  private void moveLegacyStateAside() {
    try {
      for (LegacyAgentState.Outcome outcome : LegacyAgentState.moveAside(getFilesDir().toPath()))
        if (outcome.move != LegacyAgentState.Move.NOTHING_TO_MOVE) Log.i("AlphaLegacyAgent", outcome.toString());
    } catch (RuntimeException unexpected) {
      Log.w("AlphaLegacyAgent", "legacy state left in place: " + unexpected.getClass().getSimpleName());
    }
  }

  static boolean localSpeechHostReady() {
    return speechService.get() != null;
  }

  @Override public void onDestroy() {
    SpeechHost stopped;
    synchronized (speechLock) {
      retiring = true;
      stopped = speech;
      speech = null;
      speechService.compareAndSet(this, null);
    }
    super.onDestroy();
    if (stopped != null) {
      Thread worker = new Thread(stopped.host()::stop, "AlphaResidentSpeechStop");
      worker.setDaemon(true);
      worker.start();
    }
  }

  /** The consent the owner's Settings last gave, in place of the host file's; none until Settings first read the owner's choice. */
  @Override protected AgentConfig.GoogleConsent googleConsent() { return kept(this); }

  /**
   * Keeps {@code consent} for every launch from now on, restarting an agent that runs or is starting with another. Whether it is kept:
   * where it cannot be saved, or a running agent cannot be restarted with it, what was kept before stays, so the agent and Settings agree.
   */
  static boolean keep(Context context, AgentConfig.GoogleConsent consent) {
    AgentConfig.GoogleConsent before = kept(context);
    if (consent.equals(before)) return true;
    if (!save(context, consent)) return false;
    String state = AgentService.status(context).optString("state");
    if (!state.equals("running") && !state.equals("starting")) return true;
    try { AgentService.restart(context); return true; }
    catch (IllegalStateException refused) { save(context, before); return false; }
  }

  /** Saves {@code consent}, or forgets the one saved where it is null. */
  private static boolean save(Context context, AgentConfig.GoogleConsent consent) {
    SharedPreferences.Editor edit = context.getSharedPreferences(STORE, Context.MODE_PRIVATE).edit();
    if (consent == null) edit.remove(GMAIL).remove(CALENDAR);
    else edit.putBoolean(GMAIL, consent.gmailChanges()).putBoolean(CALENDAR, consent.calendarEdits());
    return edit.commit();
  }

  private static AgentConfig.GoogleConsent kept(Context context) {
    SharedPreferences store = context.getSharedPreferences(STORE, Context.MODE_PRIVATE);
    if (!store.contains(GMAIL) || !store.contains(CALENDAR)) return null;
    return new AgentConfig.GoogleConsent(store.getBoolean(GMAIL, false), store.getBoolean(CALENDAR, false));
  }
}
