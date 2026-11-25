// spec/agent/index.md, "Story: Run Alpha's agent on the phone"; spec/app/platform/adoption.md, "Background work the earlier Alpha queued never runs: at every start the phone cancels each job queued for the work manager the earlier Alpha shipped, and only those"
package ai.alphacompute.alphaphone;

import ai.eliza.os.agent.AgentService;
import ai.eliza.plugins.signin.CredentialReader;
import android.app.Application;

public final class AlphaApplication extends Application {
 private CredentialReader.Subscription listening;

 @Override protected void attachBaseContext(android.content.Context base) {
  super.attachBaseContext(base);
  AlphaResetPlugin.RESET.admitBeforeStartup(base, getProcessName());
  if (!android.os.Process.isIsolated() && !AlphaResetPlugin.RESET.isRecoveryProcess(base, getProcessName())) AlphaDevicePlugin.UpdatePause.configure(base);
 }

 @Override public void onCreate() {
  super.onCreate();
  if (!android.os.Process.isIsolated() && getPackageName().equals(getProcessName())) AlphaEarlier.retireWork(this);
  AlphaAgentCredentials credentials = new AlphaAgentCredentials(this);
  AgentService.useCredentials(credentials);
  listening = credentials.reader().listen(notice -> AgentService.credentialChanged(this));
  AlphaNotificationChannels.describe(this);
 }
}
