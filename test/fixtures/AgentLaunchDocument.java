// Runs upstream's own agent-service admission (vendor/eliza packages/os AgentConfig, which the resident's
// service runs at every start) over the agent data files Alpha ships, and prints its verdict: the line
// "admitted <needsAccount> <ownKey>" and the launch document it writes for a signed-in account, or the line
// "refused <reason>". Host JVM only: not an APK, emulator or device run.
import ai.eliza.os.agent.AgentConfig;
import ai.eliza.os.agent.AgentCredentials;
import java.nio.file.Files;
import java.nio.file.Path;

public final class AgentLaunchDocument {
  public static void main(String[] args) throws Exception {
    byte[] host = Files.readAllBytes(Path.of(args[0])), character = Files.readAllBytes(Path.of(args[1])), policy = Files.readAllBytes(Path.of(args[2]));
    AgentConfig config;
    try {
      config = AgentConfig.parse(host, character, policy);
    } catch (AgentConfig.Refused refused) {
      System.out.println("refused " + refused.getMessage());
      return;
    }
    System.out.println("admitted " + config.needsAccount() + " " + config.ownKey());
    System.out.println(config.launchDocument(new AgentCredentials.Account("owner-user", "owner-org"), null));
  }
}
