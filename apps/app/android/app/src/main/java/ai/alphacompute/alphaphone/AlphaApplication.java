// spec/agent/index.md, "Story: Run Alpha's agent on the phone"
package ai.alphacompute.alphaphone;

import ai.eliza.os.agent.AgentService;
import ai.eliza.plugins.signin.CredentialPolicy.Notice;
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
  HostedDigestDelivery digests = getPackageName().equals(getProcessName())
   ? HostedDigestDelivery.start(this, credentials.reader()) : null;
  InboxNoticeDelivery inbox = getPackageName().equals(getProcessName()) ? InboxNoticeDelivery.get(this) : null;
  if (inbox != null) inbox.resume();
  listening = credentials.reader().listen(notice -> {
   if (digests != null) digests.custodyChanged(notice);
   if (inbox != null && (notice instanceof Notice.Announce || notice instanceof Notice.SignedOutNotice || notice instanceof Notice.ExpiredNotice)) inbox.resume();
   AgentService.credentialChanged(this);
  });
  AlphaNotificationChannels.describe(this);
 }
}
