// spec/agent/index.md, "Story: Run Alpha's agent on the phone"
package ai.alphacompute.alphaphone;

import ai.eliza.os.agent.AgentService;
import ai.eliza.plugins.signin.CredentialPolicy.Notice;
import ai.eliza.plugins.signin.CredentialReader;
import ai.eliza.plugins.signin.DeviceCustody;
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
  boolean main = getPackageName().equals(getProcessName());
  if (main) AlphaLegacyAgentArchive.putBack(this);
  AlphaAgentCredentials credentials = new AlphaAgentCredentials(this);
  AgentService.useCredentials(DeviceCustody.agentCredentials(this, BuildConfig.CLOUD_API_ORIGIN));
  if (main) AgentService.useGoogleBroker(DeviceCustody.googleBroker(this, BuildConfig.CLOUD_API_ORIGIN));
  CredentialReader reader = credentials.reader();
  HostedDigestDelivery digests = main ? HostedDigestDelivery.start(this, reader) : null;
  InboxNoticeDelivery inbox = main ? InboxNoticeDelivery.get(this) : null;
  if (inbox != null) inbox.resume();
  listening = reader.listen(notice -> {
   if (main) AlphaNotificationOwner.observe(this, reader, notice);
   if (digests != null) digests.custodyChanged(notice);
   if (inbox != null && (notice instanceof Notice.Announce || notice instanceof Notice.SignedOutNotice || notice instanceof Notice.ExpiredNotice)) inbox.resume();
   AgentService.credentialChanged(this);
  });
  if (main) AlphaNotificationOwner.observe(this, reader, null);
  AlphaNotificationChannels.describe(this);
 }
}
