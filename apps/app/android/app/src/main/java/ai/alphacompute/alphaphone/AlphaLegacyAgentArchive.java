// spec/app/platform/adoption.md, "Story: Keep what the earlier on-device agent stored"; spec/app/platform/adoption.md, "The earlier store is never moved, changed or deleted, and what an earlier build moved aside is put back"; spec/app/platform/adoption.md, "The earlier store is brought in only for the account that signed in to the earlier Alpha"
package ai.alphacompute.alphaphone;

import ai.eliza.os.agent.AgentCredentials;
import ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots;
import android.content.Context;
import java.io.File;
import java.io.IOException;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.json.JSONObject;

/**
 * Keeps the earlier on-device agent's store where the earlier Alpha left it, puts back what a
 * build of 89bfcc1a8 moved into {@code files/agent-legacy} (atomic renames only, never copying,
 * opening, rewriting or deleting), and passes the agent the earlier workspace store and its owner
 * only when the account signing in is the one the earlier Alpha last verified with the cloud.
 */
final class AlphaLegacyAgentArchive {
  static final String LEGACY_STORE_DIR_ENV = "ALPHA_LEGACY_STORE_DIR";
  static final String LEGACY_OWNER_ENV = "ALPHA_LEGACY_OWNER";
  static final String ARCHIVE_DIR_NAME = "agent-legacy";
  static final String WORKSPACE_ARCHIVE_NAME = "eliza-workspace";
  static final String VAULT_ARCHIVE_NAME = "vault-pglite";
  static final String PAYLOAD_ARCHIVE_NAME = "payload";
  static final String LEGACY_BUNDLE_NAME = "agent-bundle.js";
  static final String PROVIDER_SLOT =
    "cloud-deployment:897efc6f09b9d4db345c61226d8301a9f1257ad98f0491e8591f63d4f4515874:local-agent-provider:v1";
  static final String SLOT_DIRECTORY = "connection-credentials";
  static final String SLOT_KEY_ALIAS = "alpha.connection.aes.v1";
  private static final int PROVIDER_SLOT_BYTES = 1024 * 1024;

  private static final Pattern CLOUD_ID =
    Pattern.compile("[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}");
  private static final Object LOCK = new Object();

  @FunctionalInterface
  interface Mover {
    void move(Path source, Path target) throws IOException;
  }

  private static final Mover ATOMIC_MOVER =
    (source, target) -> Files.move(source, target, StandardCopyOption.ATOMIC_MOVE);

  enum Move {
    NOTHING_TO_MOVE,
    MOVED_ASIDE,
    KEPT_IN_PLACE
  }

  record Outcome(Move workspace, Move vault, int payloadMoved, int payloadKept, Move bundle) {}

  /** The account the earlier Alpha last verified with the cloud, both ids canonical lowercase UUIDs. */
  record Owner(String userId, String organizationId) {}

  private static final Outcome EMPTY_OUTCOME =
    new Outcome(Move.NOTHING_TO_MOVE, Move.NOTHING_TO_MOVE, 0, 0, Move.NOTHING_TO_MOVE);

  private AlphaLegacyAgentArchive() {}

  /** Quint model transition for moving one entry into one free name. */
  static Move moveOf(boolean sourceHeld, boolean archiveHeld, boolean renamed) {
    if (!sourceHeld) return Move.NOTHING_TO_MOVE;
    if (archiveHeld || !renamed) return Move.KEPT_IN_PLACE;
    return Move.MOVED_ASIDE;
  }

  /** Quint model {@code isEarlierOwner}. */
  static boolean isEarlierOwner(String ownerUser, String ownerOrganization, String user, String organization) {
    return !ownerUser.isEmpty() && !ownerOrganization.isEmpty()
      && ownerUser.equals(user) && ownerOrganization.equals(organization);
  }

  static Outcome putBack(Context context) {
    if (context == null) return EMPTY_OUTCOME;
    try {
      var files = context.getFilesDir();
      if (files == null) return EMPTY_OUTCOME;
      return putBack(files.toPath(), ATOMIC_MOVER);
    } catch (RuntimeException ignored) {
      return EMPTY_OUTCOME;
    }
  }

  static Outcome putBack(Path filesDir) {
    return putBack(filesDir, ATOMIC_MOVER);
  }

  static Outcome putBack(Path filesDir, Mover mover) {
    if (filesDir == null || mover == null) return EMPTY_OUTCOME;
    synchronized (LOCK) {
      try {
        Path root = filesDir.toAbsolutePath();
        Path archiveRoot = root.resolve(ARCHIVE_DIR_NAME);
        if (!Files.isDirectory(archiveRoot, LinkOption.NOFOLLOW_LINKS)) return EMPTY_OUTCOME;
        Path elizaDir = root.resolve(".eliza");

        Move workspace = renameIntoFree(archiveRoot.resolve(WORKSPACE_ARCHIVE_NAME), elizaDir.resolve("workspace"), mover);
        Move vault = renameIntoFree(archiveRoot.resolve(VAULT_ARCHIVE_NAME), elizaDir.resolve(".vault-pglite"), mover);

        int payloadMoved = 0;
        int payloadKept = 0;
        Move bundle = Move.NOTHING_TO_MOVE;
        Path payloadDir = archiveRoot.resolve(PAYLOAD_ARCHIVE_NAME);
        if (Files.isDirectory(payloadDir, LinkOption.NOFOLLOW_LINKS)) {
          Path agentDir = root.resolve("agent");
          List<Path> entries = listSortedDirectEntries(payloadDir);
          if (entries == null) {
            bundle = Move.KEPT_IN_PLACE;
          } else {
            Path bundleSource = null;
            for (Path entry : entries) {
              String name = entry.getFileName().toString();
              if (LEGACY_BUNDLE_NAME.equals(name)) {
                bundleSource = entry;
                continue;
              }
              Move step = renameIntoFree(entry, agentDir.resolve(name), mover);
              if (step == Move.MOVED_ASIDE) payloadMoved++;
              else if (step == Move.KEPT_IN_PLACE) payloadKept++;
            }
            if (bundleSource != null) {
              bundle = payloadKept == 0
                ? renameIntoFree(bundleSource, agentDir.resolve(LEGACY_BUNDLE_NAME), mover)
                : Move.KEPT_IN_PLACE;
            }
          }
        }
        return new Outcome(workspace, vault, payloadMoved, payloadKept, bundle);
      } catch (RuntimeException ignored) {
        return EMPTY_OUTCOME;
      }
    }
  }

  static void prepareLaunch(Context context, AgentCredentials.Account account, Map<String, String> variables) {
    if (variables == null) return;
    variables.remove(LEGACY_STORE_DIR_ENV);
    variables.remove(LEGACY_OWNER_ENV);
    if (context == null || account == null) return;
    try {
      var files = context.getFilesDir();
      var noBackup = context.getNoBackupFilesDir();
      if (files == null || noBackup == null) return;
      putBack(files.toPath(), ATOMIC_MOVER);
      prepareLaunch(files.toPath(), earlierOwner(noBackup), account, variables);
    } catch (RuntimeException launchGoesOn) {
      return;
    }
  }

  static void prepareLaunch(Path filesDir, Owner owner, AgentCredentials.Account account, Map<String, String> variables) {
    if (variables == null) return;
    variables.remove(LEGACY_STORE_DIR_ENV);
    variables.remove(LEGACY_OWNER_ENV);
    if (filesDir == null || owner == null || account == null) return;
    String user = account.userId().toLowerCase(Locale.ROOT);
    String organization = account.organizationId().toLowerCase(Locale.ROOT);
    if (!isEarlierOwner(owner.userId(), owner.organizationId(), user, organization)) return;
    Path store = earlierStoreDir(filesDir);
    if (store == null) return;
    String value = store.toString();
    if (value.isEmpty() || value.indexOf('\n') >= 0 || value.indexOf('\r') >= 0 || value.indexOf('\0') >= 0) return;
    variables.put(LEGACY_STORE_DIR_ENV, value);
    variables.put(LEGACY_OWNER_ENV, "{\"userId\":\"" + owner.userId() + "\",\"organizationId\":\"" + owner.organizationId() + "\"}");
  }

  /** The earlier workspace store, never the vault, while every directory on its path is a real one. */
  static Path earlierStoreDir(Path filesDir) {
    if (filesDir == null) return null;
    Path root = filesDir.toAbsolutePath();
    Path eliza = root.resolve(".eliza");
    Path workspace = eliza.resolve("workspace");
    Path elizaDb = workspace.resolve(".elizadb");
    for (Path step : new Path[] { eliza, workspace, elizaDb }) {
      if (!Files.isDirectory(step, LinkOption.NOFOLLOW_LINKS)) return null;
    }
    return elizaDb;
  }

  /** The owner the earlier Alpha's provider slot names, or null unless it names a user and an organization. */
  static Owner ownerOf(String providerSlot) {
    if (providerSlot == null) return null;
    try {
      JSONObject provider = new JSONObject(providerSlot);
      JSONObject identity = provider.optJSONObject("verifiedCloudIdentity");
      if (identity == null) {
        JSONObject services = provider.optJSONObject("cloudServices");
        identity = services == null ? null : services.optJSONObject("verifiedCloudIdentity");
      }
      if (identity == null) return null;
      String user = cloudId(identity.opt("userId"));
      String organization = cloudId(identity.opt("organizationId"));
      return user == null || organization == null ? null : new Owner(user, organization);
    } catch (Exception unreadable) {
      return null;
    }
  }

  private static Owner earlierOwner(File noBackupDir) {
    File slots = new File(noBackupDir, SLOT_DIRECTORY);
    if (!slots.isDirectory()) return null;
    try {
      return ownerOf(new JsonCredentialSlots(slots, SLOT_KEY_ALIAS, slot -> PROVIDER_SLOT_BYTES).read(PROVIDER_SLOT));
    } catch (Exception unreadable) {
      return null;
    }
  }

  private static String cloudId(Object value) {
    if (!(value instanceof String id)) return null;
    String canonical = id.toLowerCase(Locale.ROOT);
    return CLOUD_ID.matcher(canonical).matches() ? canonical : null;
  }

  private static List<Path> listSortedDirectEntries(Path directory) {
    try (Stream<Path> stream = Files.list(directory)) {
      List<Path> entries = new ArrayList<>();
      stream.forEach(entries::add);
      entries.sort(Comparator.comparing(path -> path.getFileName().toString()));
      return entries;
    } catch (IOException | RuntimeException failed) {
      return null;
    }
  }

  private static Move renameIntoFree(Path source, Path target, Mover mover) {
    boolean sourceHeld = existsNoFollow(source);
    if (!sourceHeld) return moveOf(false, false, false);
    if (!isFreeTarget(target)) return moveOf(true, true, false);
    Path parent = target.getParent();
    if (parent == null || !ensureRealDirectory(parent)) return moveOf(true, false, false);
    if (!isFreeTarget(target)) return moveOf(true, true, false);
    boolean renamed = false;
    try {
      mover.move(source, target);
      renamed = true;
    } catch (IOException | RuntimeException ignored) {
      renamed = false;
    }
    return moveOf(true, false, renamed);
  }

  private static boolean existsNoFollow(Path path) {
    try {
      Files.readAttributes(path, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
      return true;
    } catch (NoSuchFileException absent) {
      return false;
    } catch (IOException | RuntimeException unreadable) {
      return false;
    }
  }

  private static boolean isFreeTarget(Path target) {
    return Files.notExists(target, LinkOption.NOFOLLOW_LINKS);
  }

  private static boolean ensureRealDirectory(Path directory) {
    if (Files.isDirectory(directory, LinkOption.NOFOLLOW_LINKS)) return true;
    if (!Files.notExists(directory, LinkOption.NOFOLLOW_LINKS)) return false;
    Path parent = directory.getParent();
    if (parent != null && !ensureRealDirectory(parent)) return false;
    try {
      Files.createDirectory(directory);
      return Files.isDirectory(directory, LinkOption.NOFOLLOW_LINKS);
    } catch (FileAlreadyExistsException raced) {
      return Files.isDirectory(directory, LinkOption.NOFOLLOW_LINKS);
    } catch (IOException | RuntimeException failed) {
      return false;
    }
  }
}
