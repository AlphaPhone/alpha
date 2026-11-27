package ai.alphacompute.alphaphone;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public final class LegacyAgentStateTest {
 @Rule public final TemporaryFolder temp = new TemporaryFolder();

 @Test public void movesWorkspaceAndLegacyRuntimeAsideUnread() throws IOException {
  Path files = temp.newFolder("files").toPath();
  Path db = files.resolve(".eliza/workspace/.elizadb");
  Files.createDirectories(db);
  Files.writeString(db.resolve("pgdata"), "legacy-pglite-bytes");

  Path agent = files.resolve("agent");
  Files.createDirectories(agent);
  Files.writeString(agent.resolve("agent-bundle.js"), "legacy-bundle");
  Files.writeString(agent.resolve("state.json"), "{\"v\":1}");
  String accountHex = "a".repeat(64);
  Path accountDir = agent.resolve(accountHex);
  Files.createDirectories(accountDir);
  Files.writeString(accountDir.resolve("db.sqlite"), "current-account");

  List<LegacyAgentState.Outcome> outcomes = LegacyAgentState.moveAside(files);
  assertFalse(outcomes.isEmpty());
  assertFalse(Files.exists(files.resolve(".eliza/workspace")));
  assertEquals("legacy-pglite-bytes", Files.readString(files.resolve("agent-legacy/eliza-workspace/.elizadb/pgdata")));
  assertFalse(Files.exists(agent.resolve("agent-bundle.js")));
  assertEquals("legacy-bundle", Files.readString(files.resolve("agent-legacy/payload/agent-bundle.js")));
  assertEquals("{\"v\":1}", Files.readString(files.resolve("agent-legacy/payload/state.json")));
  assertTrue("Current upstream 64-hex account state directory stays untouched", Files.exists(accountDir.resolve("db.sqlite")));
 }

 @Test public void neverOverwritesExistingArchive() throws IOException {
  Path files = temp.newFolder("files").toPath();
  Path workspace = files.resolve(".eliza/workspace");
  Files.createDirectories(workspace);
  Files.writeString(workspace.resolve("marker"), "new");
  Path existing = files.resolve("agent-legacy/eliza-workspace");
  Files.createDirectories(existing);
  Files.writeString(existing.resolve("marker"), "kept");

  List<LegacyAgentState.Outcome> outcomes = LegacyAgentState.moveAside(files);
  assertEquals(1, outcomes.size());
  assertEquals(LegacyAgentState.Move.KEPT_IN_PLACE, outcomes.get(0).move);
  assertEquals("kept", Files.readString(existing.resolve("marker")));
  assertEquals("new", Files.readString(workspace.resolve("marker")));
 }
}
