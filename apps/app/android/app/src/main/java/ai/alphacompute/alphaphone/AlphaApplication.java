// spec/agent/index.md, "Story: Run Alpha's agent on the phone"
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
  AlphaAgentCredentials credentials = new AlphaAgentCredentials(this);
  AgentService.useCredentials(credentials);
  listening = credentials.reader().listen(notice -> AgentService.credentialChanged(this));
  AlphaNotificationChannels.describe(this);
 }
}
