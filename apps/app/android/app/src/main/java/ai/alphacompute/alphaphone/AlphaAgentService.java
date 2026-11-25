// spec/agent/index.md, "Story: Run Alpha's agent on the phone"; spec/app/settings/preferences.md, "The agent is launched allowed to change Gmail and Calendar exactly as the phone last read or saved, allowed neither once it could not read them, and Alpha says nothing of it before the first answer"
package ai.alphacompute.alphaphone;

import ai.eliza.os.agent.AgentConfig;
import ai.eliza.os.agent.AgentService;
import android.content.Context;
import android.content.SharedPreferences;

public final class AlphaAgentService extends AgentService {
  private static final String STORE = "alpha-agent";
  private static final String GMAIL = "google-gmail-changes";
  private static final String CALENDAR = "google-calendar-edits";

  /** The consent the owner's Settings last gave, in place of the host file's; none until Settings first read the owner's choice. */
  @Override protected AgentConfig.GoogleConsent googleConsent() { return kept(this); }

  /** Keeps {@code consent} for every launch from now on, restarting an agent that runs or is starting with another. Whether it is kept. */
  static boolean keep(Context context, AgentConfig.GoogleConsent consent) {
    if (consent.equals(kept(context))) return true;
    if (!context.getSharedPreferences(STORE, Context.MODE_PRIVATE).edit()
      .putBoolean(GMAIL, consent.gmailChanges()).putBoolean(CALENDAR, consent.calendarEdits()).commit()) return false;
    String state = AgentService.status(context).optString("state");
    if (state.equals("running") || state.equals("starting")) AgentService.restart(context);
    return true;
  }

  private static AgentConfig.GoogleConsent kept(Context context) {
    SharedPreferences store = context.getSharedPreferences(STORE, Context.MODE_PRIVATE);
    if (!store.contains(GMAIL) || !store.contains(CALENDAR)) return null;
    return new AgentConfig.GoogleConsent(store.getBoolean(GMAIL, false), store.getBoolean(CALENDAR, false));
  }
}
