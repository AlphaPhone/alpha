package ai.alphacompute.alphaphone;

import ai.eliza.os.agent.PayloadCheck;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileNotFoundException;
import java.nio.file.Files;
import java.util.Set;

/**
 * Host-JVM check of ResidentPayload.packaged (AlphaLocalAgentPlugin.runtimePackaged) against upstream PayloadCheck's
 * names: an APK is offered the on-device agent only when it carries assets/agent/inventory.json and the Node runtime
 * libeliza_node.so, and never for the Bun-era agent-bundle.js and libeliza_bun.so. Prints one JSON line of verdicts.
 */
public final class ResidentPayloadTest {
  static PayloadCheck.Assets assets(String... names) {
    Set<String> present = Set.of(names);
    return name -> {
      if (!present.contains(name)) throw new FileNotFoundException(name);
      return new ByteArrayInputStream(new byte[] {'{', '}'});
    };
  }

  static File libraries(String... names) throws Exception {
    File directory = Files.createTempDirectory("resident-libraries-").toFile();
    directory.deleteOnExit();
    for (String name : names) {
      File file = new File(directory, name);
      Files.write(file.toPath(), new byte[] {0x7f, 'E', 'L', 'F'});
      file.deleteOnExit();
    }
    return directory;
  }

  public static void main(String[] args) throws Exception {
    boolean vibestack = ResidentPayload.packaged(assets(PayloadCheck.INVENTORY, "agent/agent.mjs"), libraries(PayloadCheck.NODE));
    boolean bunEra = ResidentPayload.packaged(assets("agent/agent-bundle.js"), libraries("libeliza_bun.so", "libeliza_ld_musl_aarch64.so"));
    boolean noInventory = ResidentPayload.packaged(assets("agent/agent.mjs"), libraries(PayloadCheck.NODE));
    boolean noRuntime = ResidentPayload.packaged(assets(PayloadCheck.INVENTORY), libraries("libeliza_bun.so"));
    boolean noDirectory = ResidentPayload.packaged(assets(PayloadCheck.INVENTORY), null);
    System.out.println("{\"inventory\":\"" + PayloadCheck.INVENTORY + "\",\"node\":\"" + PayloadCheck.NODE + "\",\"vibestack\":" + vibestack
        + ",\"bunEra\":" + bunEra + ",\"noInventory\":" + noInventory + ",\"noRuntime\":" + noRuntime + ",\"noDirectory\":" + noDirectory + "}");
  }
}
