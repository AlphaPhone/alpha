// spec/agent/index.md, "Story: Run Alpha's agent on the phone"
package ai.alphacompute.alphaphone;

import ai.eliza.os.agent.AgentCredentials;
import ai.eliza.plugins.signin.CredentialReader;
import ai.eliza.plugins.signin.DeviceCustody;
import android.content.Context;

final class AlphaAgentCredentials implements AgentCredentials {
 private final CredentialReader reader;

 AlphaAgentCredentials(Context context) { reader = DeviceCustody.reader(context.getApplicationContext(), BuildConfig.CLOUD_API_ORIGIN); }

 CredentialReader reader() { return reader; }

 @Override public Active current() {
  CredentialReader.Credential credential = reader.current();
  if (credential == null || credential.account() == null || !credential.account().complete()) return null;
  return new Active(credential.version(), credential.value(), credential.keyExpiresAt(), new Account(credential.account().userId(), credential.account().organizationId()));
 }

 /** None: the agent service launches under DeviceCustody.agentCredentials, which releases the task storage key; this reader view is never registered with it. */
 @Override public StorageKey storageKey(Account account, long epoch) { return null; }
}
