// spec/app/platform/adoption.md, "Story: Keep what the earlier on-device agent stored"; spec/app/platform/adoption.md, "The earlier store is never moved, changed or deleted, and what an earlier build moved aside is put back"; spec/app/platform/adoption.md, "The earlier store is brought in only for the account that signed in to the earlier Alpha"
package ai.alphacompute.alphaphone;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import ai.alphacompute.alphaphone.AlphaLegacyAgentArchive.Move;
import ai.alphacompute.alphaphone.AlphaLegacyAgentArchive.Outcome;
import ai.alphacompute.alphaphone.AlphaLegacyAgentArchive.Owner;
import ai.eliza.os.agent.AgentCredentials;
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
import java.util.TreeMap;
import java.util.stream.Stream;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public final class AlphaLegacyAgentArchiveTest {
  private static final String ACCOUNT_HASH_A =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  private static final String OWNER_USER = "0b7e6f8a-1c2d-4e3f-8a9b-0c1d2e3f4a5b";
  private static final String OWNER_ORG = "1c2d3e4f-5a6b-4c7d-9e8f-a0b1c2d3e4f5";
  private static final String OTHER_USER = "2d3e4f5a-6b7c-4d8e-8f90-b1c2d3e4f5a6";
  private static final String OTHER_ORG = "3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7";
  private static final Owner OWNER = new Owner(OWNER_USER, OWNER_ORG);

  @Rule public final TemporaryFolder temp = new TemporaryFolder();

  private static Path writeUtf8(Path file, String text) throws IOException {
    return Files.write(file, text.getBytes(StandardCharsets.UTF_8));
  }

  private static String readUtf8(Path file) throws IOException {
    return new String(Files.readAllBytes(file), StandardCharsets.UTF_8);
  }

  private static Map<String, String> snapshot(Path root) throws IOException {
    Map<String, String> entries = new TreeMap<>();
    try (Stream<Path> walk = Files.walk(root)) {
      for (Path path : (Iterable<Path>) walk::iterator) {
        String rel = root.relativize(path).toString();
        BasicFileAttributes attrs = Files.readAttributes(path, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
        entries.put(rel, attrs.isDirectory() ? "dir" : attrs.size() + ":" + attrs.lastModifiedTime() + ":" + readUtf8(path));
      }
    }
    return entries;
  }

  private static Path earlierWorkspace(Path files) throws IOException {
    Path elizaDb = Files.createDirectories(files.resolve(".eliza/workspace/.elizadb"));
    writeUtf8(elizaDb.resolve("PG_VERSION"), "17\n");
    Path vault = Files.createDirectories(files.resolve(".eliza/.vault-pglite"));
    writeUtf8(vault.resolve("marker"), "vault-bytes");
    return elizaDb;
  }

  private static Map<String, String> launch(Path files, Owner owner, String user, String organization) {
    Map<String, String> variables = new LinkedHashMap<>();
    variables.put(AlphaLegacyAgentArchive.LEGACY_STORE_DIR_ENV, "/set/elsewhere");
    variables.put(AlphaLegacyAgentArchive.LEGACY_OWNER_ENV, "{}");
    AlphaLegacyAgentArchive.prepareLaunch(files, owner, user == null ? null : new AgentCredentials.Account(user, organization), variables);
    return variables;
  }

  @Test public void quintMoveAndOwnerLawsHoldForEveryCombination() {
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
    String[] ids = { "", OWNER_USER, OWNER_ORG, OTHER_USER };
    for (String ownerUser : ids) {
      for (String ownerOrg : ids) {
        for (String user : ids) {
          for (String org : ids) {
            boolean owner = AlphaLegacyAgentArchive.isEarlierOwner(ownerUser, ownerOrg, user, org);
            if (!user.equals(ownerUser) || !org.equals(ownerOrg)) assertFalse("lawAnotherAccountIsNeverTheOwner", owner);
          }
        }
      }
    }
    for (String user : ids) {
      assertFalse("lawAnUnknownOwnerOwnsNothing", AlphaLegacyAgentArchive.isEarlierOwner("", "", user, ""));
      assertFalse("lawAnUnknownOwnerOwnsNothing", AlphaLegacyAgentArchive.isEarlierOwner(user, "", user, ""));
    }
  }

  @Test public void onlyTheEarlierOwnerIsPassedTheWorkspaceStoreAndTheStoreIsLeftAsItWas() throws Exception {
    Path files = temp.newFolder("files").toPath();
    Path elizaDb = earlierWorkspace(files);
    Map<String, String> before = snapshot(files);

    Map<String, String> owner = launch(files, OWNER, OWNER_USER.toUpperCase(), OWNER_ORG);
    assertEquals(elizaDb.toAbsolutePath().toString(), owner.get(AlphaLegacyAgentArchive.LEGACY_STORE_DIR_ENV));
    assertEquals(
      "{\"userId\":\"" + OWNER_USER + "\",\"organizationId\":\"" + OWNER_ORG + "\"}",
      owner.get(AlphaLegacyAgentArchive.LEGACY_OWNER_ENV)
    );

    Map<String, Map<String, String>> refused = new LinkedHashMap<>();
    refused.put("another user", launch(files, OWNER, OTHER_USER, OWNER_ORG));
    refused.put("the owner in another organization", launch(files, OWNER, OWNER_USER, OTHER_ORG));
    refused.put("an unknown owner", launch(files, null, OWNER_USER, OWNER_ORG));
    refused.put("no account", launch(files, OWNER, null, null));
    for (Map.Entry<String, Map<String, String>> entry : refused.entrySet()) {
      assertTrue(entry.getKey(), entry.getValue().isEmpty());
    }

    assertEquals(before, snapshot(files));
    assertFalse(Files.exists(files.resolve("agent-legacy"), LinkOption.NOFOLLOW_LINKS));
  }

  @Test public void theVaultAndALinkedWorkspaceAreNeverASource() throws Exception {
    Path vaultOnly = temp.newFolder("vault-only").toPath();
    Files.createDirectories(vaultOnly.resolve(".eliza/.vault-pglite"));
    assertTrue(launch(vaultOnly, OWNER, OWNER_USER, OWNER_ORG).isEmpty());
    assertNull(AlphaLegacyAgentArchive.earlierStoreDir(vaultOnly));

    Path linked = temp.newFolder("linked").toPath();
    Path outside = Files.createDirectories(temp.newFolder("outside").toPath().resolve(".elizadb"));
    Files.createDirectories(linked.resolve(".eliza"));
    Files.createSymbolicLink(linked.resolve(".eliza/workspace"), outside.getParent());
    assertTrue(launch(linked, OWNER, OWNER_USER, OWNER_ORG).isEmpty());
  }

  @Test public void readsTheOwnerTheEarlierAlphaVerifiedAndNothingElse() {
    String identity = "{\"userId\":\"" + OWNER_USER.toUpperCase() + "\",\"organizationId\":\"" + OWNER_ORG + "\"}";
    assertEquals(OWNER, AlphaLegacyAgentArchive.ownerOf("{\"provider\":\"elizacloud\",\"verifiedCloudIdentity\":" + identity + "}"));
    assertEquals(OWNER, AlphaLegacyAgentArchive.ownerOf("{\"provider\":\"cerebras\",\"cloudServices\":{\"verifiedCloudIdentity\":" + identity + "}}"));
    assertNull(AlphaLegacyAgentArchive.ownerOf("{\"verifiedCloudIdentity\":{\"userId\":\"" + OWNER_USER + "\"}}"));
    assertNull(AlphaLegacyAgentArchive.ownerOf("{\"verifiedCloudIdentity\":{\"userId\":\"owner\",\"organizationId\":\"" + OWNER_ORG + "\"}}"));
    assertNull(AlphaLegacyAgentArchive.ownerOf("{\"provider\":\"elizacloud\"}"));
    assertNull(AlphaLegacyAgentArchive.ownerOf("not json"));
    assertNull(AlphaLegacyAgentArchive.ownerOf(null));
  }

  @Test public void putsBackWhatAnEarlierBuildMovedAsideByAtomicRenameBundleLast() throws Exception {
    Path files = temp.newFolder("files").toPath();
    Path archivedDb = Files.createDirectories(files.resolve("agent-legacy/eliza-workspace/.elizadb"));
    Path pgVersion = writeUtf8(archivedDb.resolve("PG_VERSION"), "17\n");
    Object dbKey = Files.readAttributes(archivedDb, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS).fileKey();
    Object fileKey = Files.readAttributes(pgVersion, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS).fileKey();
    writeUtf8(Files.createDirectories(files.resolve("agent-legacy/vault-pglite")).resolve("marker"), "vault-bytes");
    Path payload = Files.createDirectories(files.resolve("agent-legacy/payload"));
    writeUtf8(payload.resolve("runtime.manifest.json"), "{\"v\":121}");
    writeUtf8(Files.createDirectories(payload.resolve("assets")).resolve("pglite.wasm"), "wasm");
    writeUtf8(payload.resolve("agent-bundle.js"), "legacy-bundle");
    Files.createSymbolicLink(payload.resolve("dangling-link"), files.resolve("missing-target"));
    Path account = Files.createDirectories(files.resolve("agent").resolve(ACCOUNT_HASH_A));
    writeUtf8(account.resolve("agent-id"), "11111111-1111-4111-8111-111111111111\n");

    List<String> moved = new ArrayList<>();
    Outcome outcome = AlphaLegacyAgentArchive.putBack(files, (src, dst) -> {
      moved.add(src.getFileName().toString());
      Files.move(src, dst, StandardCopyOption.ATOMIC_MOVE);
    });

    assertEquals(new Outcome(Move.MOVED_ASIDE, Move.MOVED_ASIDE, 3, 0, Move.MOVED_ASIDE), outcome);
    Path elizaDb = files.resolve(".eliza/workspace/.elizadb");
    assertEquals("17\n", readUtf8(elizaDb.resolve("PG_VERSION")));
    if (dbKey != null) assertEquals(dbKey, Files.readAttributes(elizaDb, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS).fileKey());
    if (fileKey != null) assertEquals(fileKey, Files.readAttributes(elizaDb.resolve("PG_VERSION"), BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS).fileKey());
    assertEquals("vault-bytes", readUtf8(files.resolve(".eliza/.vault-pglite/marker")));
    assertEquals("legacy-bundle", readUtf8(files.resolve("agent/agent-bundle.js")));
    assertEquals("{\"v\":121}", readUtf8(files.resolve("agent/runtime.manifest.json")));
    assertEquals("wasm", readUtf8(files.resolve("agent/assets/pglite.wasm")));
    assertEquals(files.resolve("missing-target"), Files.readSymbolicLink(files.resolve("agent/dangling-link")));
    assertEquals("11111111-1111-4111-8111-111111111111\n", readUtf8(account.resolve("agent-id")));
    assertEquals("agent-bundle.js must move last", "agent-bundle.js", moved.get(moved.size() - 1));

    assertEquals(new Outcome(Move.NOTHING_TO_MOVE, Move.NOTHING_TO_MOVE, 0, 0, Move.NOTHING_TO_MOVE), AlphaLegacyAgentArchive.putBack(files));
  }

  @Test public void aFailedRenameKeepsTheBundleAsideAndIsTriedAgainNextLaunch() throws Exception {
    Path files = temp.newFolder("files").toPath();
    Path payload = Files.createDirectories(files.resolve("agent-legacy/payload"));
    writeUtf8(payload.resolve("a-first.bin"), "first");
    writeUtf8(payload.resolve("b-flaky.bin"), "flaky");
    writeUtf8(payload.resolve("agent-bundle.js"), "bundle");

    Outcome first = AlphaLegacyAgentArchive.putBack(files, (src, dst) -> {
      if ("b-flaky.bin".equals(src.getFileName().toString())) throw new IOException("simulated rename error");
      Files.move(src, dst, StandardCopyOption.ATOMIC_MOVE);
    });
    assertEquals(new Outcome(Move.NOTHING_TO_MOVE, Move.NOTHING_TO_MOVE, 1, 1, Move.KEPT_IN_PLACE), first);
    assertEquals("bundle", readUtf8(payload.resolve("agent-bundle.js")));

    Outcome second = AlphaLegacyAgentArchive.putBack(files);
    assertEquals(new Outcome(Move.NOTHING_TO_MOVE, Move.NOTHING_TO_MOVE, 1, 0, Move.MOVED_ASIDE), second);
    assertEquals("flaky", readUtf8(files.resolve("agent/b-flaky.bin")));
    assertEquals("bundle", readUtf8(files.resolve("agent/agent-bundle.js")));
  }

  @Test public void neverWritesOverWhatHoldsTheEarlierNameAndRefusesALinkedArchive() throws Exception {
    Path files = temp.newFolder("files").toPath();
    writeUtf8(Files.createDirectories(files.resolve(".eliza/workspace/.elizadb")).resolve("PG_VERSION"), "in-place");
    writeUtf8(Files.createDirectories(files.resolve("agent-legacy/eliza-workspace/.elizadb")).resolve("PG_VERSION"), "aside");
    Files.createSymbolicLink(files.resolve(".eliza/.vault-pglite"), files.resolve("does-not-exist"));
    writeUtf8(Files.createDirectories(files.resolve("agent-legacy/vault-pglite")).resolve("marker"), "vault-bytes");

    Outcome outcome = AlphaLegacyAgentArchive.putBack(files);
    assertEquals(Move.KEPT_IN_PLACE, outcome.workspace());
    assertEquals(Move.KEPT_IN_PLACE, outcome.vault());
    assertEquals("in-place", readUtf8(files.resolve(".eliza/workspace/.elizadb/PG_VERSION")));
    assertEquals("aside", readUtf8(files.resolve("agent-legacy/eliza-workspace/.elizadb/PG_VERSION")));
    assertTrue(Files.isSymbolicLink(files.resolve(".eliza/.vault-pglite")));

    Path linkedRoot = temp.newFolder("linked").toPath();
    Path elsewhere = Files.createDirectories(temp.newFolder("elsewhere").toPath().resolve("eliza-workspace"));
    Files.createSymbolicLink(linkedRoot.resolve("agent-legacy"), elsewhere.getParent());
    assertEquals(new Outcome(Move.NOTHING_TO_MOVE, Move.NOTHING_TO_MOVE, 0, 0, Move.NOTHING_TO_MOVE), AlphaLegacyAgentArchive.putBack(linkedRoot));
    assertTrue(Files.isDirectory(elsewhere, LinkOption.NOFOLLOW_LINKS));
    assertFalse(Files.exists(linkedRoot.resolve(".eliza"), LinkOption.NOFOLLOW_LINKS));
  }

  @Test public void aFreshInstallIsLeftAsItIs() throws Exception {
    Path files = temp.newFolder("files").toPath();
    Path account = Files.createDirectories(files.resolve("agent").resolve(ACCOUNT_HASH_A));
    writeUtf8(account.resolve("agent-id"), "33333333-3333-4333-8333-333333333333\n");
    Map<String, String> before = snapshot(files);

    AlphaLegacyAgentArchive.putBack(files);
    assertTrue(launch(files, OWNER, OWNER_USER, OWNER_ORG).isEmpty());
    assertEquals(before, snapshot(files));
  }
}
