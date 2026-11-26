// spec/app/platform/adoption.md, "Story: Keep what the earlier on-device agent stored"; spec/app/platform/adoption.md, "The earlier agent's store and runtime are moved aside by rename, and never opened, changed or deleted"
package ai.alphacompute.alphaphone;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import ai.alphacompute.alphaphone.AlphaLegacyAgentArchive.Move;
import ai.alphacompute.alphaphone.AlphaLegacyAgentArchive.Outcome;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public final class AlphaLegacyAgentArchiveTest {
  private static final String ACCOUNT_HASH_A =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  private static final String ACCOUNT_HASH_B =
    "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

  @Rule public final TemporaryFolder temp = new TemporaryFolder();

  private static Path writeUtf8(Path file, String text) throws IOException {
    return Files.write(file, text.getBytes(StandardCharsets.UTF_8));
  }

  private static String readUtf8(Path file) throws IOException {
    return new String(Files.readAllBytes(file), StandardCharsets.UTF_8);
  }

  @Test public void quintMoveLawsHoldForEveryCombination() {
    boolean[] flags = { false, true };
    for (boolean sourceHeld : flags) {
      for (boolean archiveHeld : flags) {
        for (boolean renamed : flags) {
          Move move = AlphaLegacyAgentArchive.moveOf(sourceHeld, archiveHeld, renamed);
          if (move == Move.MOVED_ASIDE) {
            assertTrue("lawASourceMovesOnlyIntoAFreeArchiveName", sourceHeld && !archiveHeld && renamed);
          }
          if (archiveHeld) {
            assertFalse("lawAnArchivedEntryIsNeverWrittenOver", move == Move.MOVED_ASIDE);
          }
          if (sourceHeld && !renamed) {
            assertEquals("lawAFailedRenameKeepsTheSourceInPlace", Move.KEPT_IN_PLACE, move);
          }
        }
      }
    }
  }

  @Test public void movesWorkspaceVaultAndLegacyPayloadByAtomicRenamePreservingAccountDirs() throws Exception {
    Path files = temp.newFolder("files").toPath();
    Path elizaDb = Files.createDirectories(files.resolve(".eliza/workspace/.elizadb"));
    Path pgVersion = writeUtf8(elizaDb.resolve("PG_VERSION"), "17\n");
    Object dbDirKey = Files.readAttributes(elizaDb, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS).fileKey();
    Object pgFileKey = Files.readAttributes(pgVersion, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS).fileKey();

    Path vault = Files.createDirectories(files.resolve(".eliza/.vault-pglite"));
    writeUtf8(vault.resolve("marker"), "vault-bytes");

    Path agent = Files.createDirectories(files.resolve("agent"));
    Path accountA = Files.createDirectories(agent.resolve(ACCOUNT_HASH_A));
    writeUtf8(accountA.resolve("agent-id"), "11111111-1111-4111-8111-111111111111\n");
    Path accountB = Files.createDirectories(agent.resolve(ACCOUNT_HASH_B));
    writeUtf8(accountB.resolve("agent-id"), "22222222-2222-4222-8222-222222222222\n");
    writeUtf8(agent.resolve("runtime.manifest.json"), "{\"v\":121}");
    Files.createDirectories(agent.resolve("assets"));
    writeUtf8(agent.resolve("assets/pglite.wasm"), "wasm");
    writeUtf8(agent.resolve("agent-bundle.js"), "legacy-bundle");

    List<String> movedNames = new ArrayList<>();
    Outcome outcome = AlphaLegacyAgentArchive.moveAside(files, (src, dst) -> {
      movedNames.add(src.getFileName().toString());
      Files.move(src, dst, StandardCopyOption.ATOMIC_MOVE);
    });

    assertEquals(Move.MOVED_ASIDE, outcome.workspace());
    assertEquals(Move.MOVED_ASIDE, outcome.vault());
    assertEquals(2, outcome.payloadMoved());
    assertEquals(0, outcome.payloadKept());
    assertEquals(Move.MOVED_ASIDE, outcome.bundle());

    Path archivedDb = files.resolve("agent-legacy/eliza-workspace/.elizadb");
    assertEquals(archivedDb.toAbsolutePath(), outcome.legacyStoreDir());
    assertFalse(Files.exists(files.resolve(".eliza/workspace"), LinkOption.NOFOLLOW_LINKS));
    assertEquals("17\n", readUtf8(archivedDb.resolve("PG_VERSION")));
    if (dbDirKey != null) {
      assertEquals(dbDirKey, Files.readAttributes(archivedDb, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS).fileKey());
    }
    if (pgFileKey != null) {
      assertEquals(pgFileKey, Files.readAttributes(archivedDb.resolve("PG_VERSION"), BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS).fileKey());
    }

    assertFalse(Files.exists(files.resolve(".eliza/.vault-pglite"), LinkOption.NOFOLLOW_LINKS));
    assertEquals("vault-bytes", readUtf8(files.resolve("agent-legacy/vault-pglite/marker")));

    assertEquals("legacy-bundle", readUtf8(files.resolve("agent-legacy/payload/agent-bundle.js")));
    assertEquals("{\"v\":121}", readUtf8(files.resolve("agent-legacy/payload/runtime.manifest.json")));
    assertEquals("wasm", readUtf8(files.resolve("agent-legacy/payload/assets/pglite.wasm")));
    assertFalse(Files.exists(agent.resolve("agent-bundle.js"), LinkOption.NOFOLLOW_LINKS));
    assertFalse(Files.exists(agent.resolve("runtime.manifest.json"), LinkOption.NOFOLLOW_LINKS));
    assertFalse(Files.exists(agent.resolve("assets"), LinkOption.NOFOLLOW_LINKS));

    assertTrue(Files.isDirectory(accountA, LinkOption.NOFOLLOW_LINKS));
    assertTrue(Files.isDirectory(accountB, LinkOption.NOFOLLOW_LINKS));
    assertEquals("11111111-1111-4111-8111-111111111111\n", readUtf8(accountA.resolve("agent-id")));
    assertFalse(Files.exists(files.resolve("agent-legacy/payload/" + ACCOUNT_HASH_A), LinkOption.NOFOLLOW_LINKS));

    assertEquals("agent-bundle.js must move last", "agent-bundle.js", movedNames.get(movedNames.size() - 1));
    assertTrue("assets moved before bundle", movedNames.indexOf("assets") < movedNames.indexOf("agent-bundle.js"));
    assertTrue("manifest moved before bundle", movedNames.indexOf("runtime.manifest.json") < movedNames.indexOf("agent-bundle.js"));
  }

  @Test public void partialFailureKeepsBundleInPlaceAndRetriesOnNextLaunch() throws Exception {
    Path files = temp.newFolder("files").toPath();
    Path agent = Files.createDirectories(files.resolve("agent"));
    writeUtf8(agent.resolve("a-first.bin"), "first");
    writeUtf8(agent.resolve("b-flaky.bin"), "flaky");
    writeUtf8(agent.resolve("agent-bundle.js"), "bundle");

    Outcome first = AlphaLegacyAgentArchive.moveAside(files, (src, dst) -> {
      if ("b-flaky.bin".equals(src.getFileName().toString())) {
        throw new IOException("simulated rename error");
      }
      Files.move(src, dst, StandardCopyOption.ATOMIC_MOVE);
    });

    assertEquals(1, first.payloadMoved());
    assertEquals(1, first.payloadKept());
    assertEquals(Move.KEPT_IN_PLACE, first.bundle());
    assertTrue(Files.exists(files.resolve("agent-legacy/payload/a-first.bin"), LinkOption.NOFOLLOW_LINKS));
    assertTrue(Files.exists(agent.resolve("b-flaky.bin"), LinkOption.NOFOLLOW_LINKS));
    assertTrue(Files.exists(agent.resolve("agent-bundle.js"), LinkOption.NOFOLLOW_LINKS));

    Outcome second = AlphaLegacyAgentArchive.moveAside(files);
    assertEquals(1, second.payloadMoved());
    assertEquals(0, second.payloadKept());
    assertEquals(Move.MOVED_ASIDE, second.bundle());
    assertEquals("flaky", readUtf8(files.resolve("agent-legacy/payload/b-flaky.bin")));
    assertEquals("bundle", readUtf8(files.resolve("agent-legacy/payload/agent-bundle.js")));
    assertFalse(Files.exists(agent.resolve("agent-bundle.js"), LinkOption.NOFOLLOW_LINKS));
  }

  @Test public void neverOverwritesExistingArchiveEntriesIncludingFilesDirectoriesAndDanglingSymlinks() throws Exception {
    Path files = temp.newFolder("files").toPath();
    Path workspaceSrc = Files.createDirectories(files.resolve(".eliza/workspace/.elizadb"));
    writeUtf8(workspaceSrc.resolve("PG_VERSION"), "new-source");
    Path workspaceDst = Files.createDirectories(files.resolve("agent-legacy/eliza-workspace/.elizadb"));
    writeUtf8(workspaceDst.resolve("PG_VERSION"), "already-archived");

    Path vaultSrc = Files.createDirectories(files.resolve(".eliza/.vault-pglite"));
    writeUtf8(vaultSrc.resolve("data"), "new-vault");
    Files.createSymbolicLink(files.resolve("agent-legacy/vault-pglite"), files.resolve("does-not-exist"));

    Path agent = Files.createDirectories(files.resolve("agent"));
    writeUtf8(agent.resolve("dup.txt"), "new-dup");
    writeUtf8(agent.resolve("agent-bundle.js"), "new-bundle");
    Path payload = Files.createDirectories(files.resolve("agent-legacy/payload"));
    writeUtf8(payload.resolve("dup.txt"), "existing-dup");

    Outcome outcome = AlphaLegacyAgentArchive.moveAside(files);
    assertEquals(Move.KEPT_IN_PLACE, outcome.workspace());
    assertEquals(Move.KEPT_IN_PLACE, outcome.vault());
    assertEquals(0, outcome.payloadMoved());
    assertEquals(1, outcome.payloadKept());
    assertEquals(Move.KEPT_IN_PLACE, outcome.bundle());

    assertEquals("already-archived", readUtf8(workspaceDst.resolve("PG_VERSION")));
    assertEquals("new-source", readUtf8(workspaceSrc.resolve("PG_VERSION")));
    assertTrue(Files.isSymbolicLink(files.resolve("agent-legacy/vault-pglite")));
    assertTrue(Files.exists(vaultSrc.resolve("data"), LinkOption.NOFOLLOW_LINKS));
    assertEquals("existing-dup", readUtf8(payload.resolve("dup.txt")));
    assertEquals("new-dup", readUtf8(agent.resolve("dup.txt")));
    assertEquals("new-bundle", readUtf8(agent.resolve("agent-bundle.js")));
  }

  @Test public void movesSymlinkEntriesAsLinksWithoutDereferencing() throws Exception {
    Path files = temp.newFolder("files").toPath();
    Path externalTarget = writeUtf8(temp.newFile("outside.txt").toPath(), "untouched");
    Path elizaDir = Files.createDirectories(files.resolve(".eliza"));
    Files.createSymbolicLink(elizaDir.resolve("workspace"), externalTarget);

    Path agent = Files.createDirectories(files.resolve("agent"));
    Files.createSymbolicLink(agent.resolve("dangling-link"), files.resolve("missing-target"));
    writeUtf8(agent.resolve("agent-bundle.js"), "bundle");

    Outcome outcome = AlphaLegacyAgentArchive.moveAside(files);
    assertEquals(Move.MOVED_ASIDE, outcome.workspace());
    assertEquals(1, outcome.payloadMoved());
    assertEquals(Move.MOVED_ASIDE, outcome.bundle());

    Path archivedWorkspace = files.resolve("agent-legacy/eliza-workspace");
    assertTrue(Files.isSymbolicLink(archivedWorkspace));
    assertEquals(externalTarget, Files.readSymbolicLink(archivedWorkspace));
    assertEquals("untouched", readUtf8(externalTarget));
    assertNull("symlinked workspace must not be advertised as store dir", outcome.legacyStoreDir());

    Path archivedDangling = files.resolve("agent-legacy/payload/dangling-link");
    assertTrue(Files.isSymbolicLink(archivedDangling));
    assertEquals(files.resolve("missing-target"), Files.readSymbolicLink(archivedDangling));
  }

  @Test public void freshInstallWithoutLegacyArtifactsLeavesFilesCleanAndSetsNoEnvHint() throws Exception {
    Path files = temp.newFolder("files").toPath();
    Path agent = Files.createDirectories(files.resolve("agent"));
    Path account = Files.createDirectories(agent.resolve(ACCOUNT_HASH_A));
    writeUtf8(account.resolve("agent-id"), "33333333-3333-4333-8333-333333333333\n");
    writeUtf8(agent.resolve("unrelated-without-bundle.txt"), "keep");

    Map<String, String> variables = new LinkedHashMap<>();
    AlphaLegacyAgentArchive.prepareLaunch(files, variables);

    assertFalse("must not create empty archive root on fresh install", Files.exists(files.resolve("agent-legacy"), LinkOption.NOFOLLOW_LINKS));
    assertTrue(Files.exists(agent.resolve("unrelated-without-bundle.txt"), LinkOption.NOFOLLOW_LINKS));
    assertTrue(Files.isDirectory(account, LinkOption.NOFOLLOW_LINKS));
    assertFalse(variables.containsKey(AlphaLegacyAgentArchive.LEGACY_STORE_DIR_ENV));
  }

  @Test public void prepareLaunchSetsLegacyStoreEnvHintAndFallsBackToVaultWithoutOverwritingExistingEnv() throws Exception {
    Path files = temp.newFolder("files").toPath();
    Files.createDirectories(files.resolve(".eliza/workspace/.elizadb"));
    Files.createDirectories(files.resolve(".eliza/.vault-pglite"));

    Map<String, String> variables = new LinkedHashMap<>();
    AlphaLegacyAgentArchive.prepareLaunch(files, variables);
    assertEquals(
      files.resolve("agent-legacy/eliza-workspace/.elizadb").toAbsolutePath().toString(),
      variables.get(AlphaLegacyAgentArchive.LEGACY_STORE_DIR_ENV)
    );

    Map<String, String> preset = new LinkedHashMap<>();
    preset.put(AlphaLegacyAgentArchive.LEGACY_STORE_DIR_ENV, "/custom/path");
    AlphaLegacyAgentArchive.prepareLaunch(files, preset);
    assertEquals("/custom/path", preset.get(AlphaLegacyAgentArchive.LEGACY_STORE_DIR_ENV));

    Path vaultOnly = temp.newFolder("vault-only").toPath();
    Files.createDirectories(vaultOnly.resolve(".eliza/.vault-pglite"));
    Map<String, String> vaultVars = new LinkedHashMap<>();
    AlphaLegacyAgentArchive.prepareLaunch(vaultOnly, vaultVars);
    assertEquals(
      vaultOnly.resolve("agent-legacy/vault-pglite").toAbsolutePath().toString(),
      vaultVars.get(AlphaLegacyAgentArchive.LEGACY_STORE_DIR_ENV)
    );
  }

  @Test public void refusesSymlinkedArchiveDirectoryWithoutTouchingSourceOrThrowing() throws Exception {
    Path files = temp.newFolder("files").toPath();
    Path decoy = temp.newFolder("decoy").toPath();
    Files.createSymbolicLink(files.resolve("agent-legacy"), decoy);
    Path elizaDb = Files.createDirectories(files.resolve(".eliza/workspace/.elizadb"));
    writeUtf8(elizaDb.resolve("PG_VERSION"), "17\n");

    Map<String, String> variables = new LinkedHashMap<>();
    AlphaLegacyAgentArchive.prepareLaunch(files, variables);

    assertTrue(Files.exists(elizaDb.resolve("PG_VERSION"), LinkOption.NOFOLLOW_LINKS));
    assertFalse(Files.exists(decoy.resolve("eliza-workspace"), LinkOption.NOFOLLOW_LINKS));
    assertFalse(variables.containsKey(AlphaLegacyAgentArchive.LEGACY_STORE_DIR_ENV));
  }
}
