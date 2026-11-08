package ai.elizaresearch.alphaphone;

/** Installed host name and storage key; provider rules are shared upstream. */
final class LocalAgentProviderAdmission extends ai.eliza.plugins.agent.runtime.NativeProviderAdmission {
 static final String PROVIDER_SLOT="local-agent-provider:v1";
 /** A Cloud identity read that may succeed on retry: any status but 401/403, a transport failure or an unreadable body. */
 static boolean transientIdentityFailure(Exception error){
  if(error instanceof CloudReadFailure){int status=((CloudReadFailure)error).status;return status!=401&&status!=403;}
  return error instanceof java.io.IOException||error instanceof org.json.JSONException;
 }
}
