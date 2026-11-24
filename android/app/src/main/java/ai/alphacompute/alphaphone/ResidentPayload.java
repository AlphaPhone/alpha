package ai.alphacompute.alphaphone;

import ai.eliza.os.agent.PayloadCheck;
import java.io.File;
import java.io.InputStream;

/**
 * Whether this APK carries the resident agent's runtime payload, by the names upstream @elizaos/os writes
 * (stageRuntimePayload, run by `pnpm agent:stage-android`) and upstream PayloadCheck reads: the payload inventory
 * assets/agent/inventory.json and the Android Node runtime lib/&lt;abi&gt;/libeliza_node.so. PayloadCheck still checks
 * every inventory digest before the agent service launches; this only decides whether the on-device agent is offered.
 */
final class ResidentPayload {
 private ResidentPayload() {}

 static boolean packaged(PayloadCheck.Assets assets, File nativeLibraryDir) {
  try {
   try (InputStream ignored = assets.open(PayloadCheck.INVENTORY)) {}
   return nativeLibraryDir != null && new File(nativeLibraryDir, PayloadCheck.NODE).isFile();
  } catch (Exception unavailable) { return false; }
 }
}
