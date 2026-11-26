// spec/app/platform/adoption.md, "Story: Keep what the earlier on-device agent stored"; spec/app/platform/adoption.md, "The earlier agent's store and runtime are moved aside by rename, and never opened, changed or deleted"
package ai.alphacompute.alphaphone;

import android.content.Context;
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
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Moves the earlier on-device agent's store and runtime aside into {@code files/agent-legacy}
 * using atomic renames only (never copying, opening, rewriting, or deleting), and supplies the
 * read-only {@code ALPHA_LEGACY_STORE_DIR} hint for one-shot import on fresh launches.
 */
final class AlphaLegacyAgentArchive {
  static final String LEGACY_STORE_DIR_ENV = "ALPHA_LEGACY_STORE_DIR";
  static final String ARCHIVE_DIR_NAME = "agent-legacy";
  static final String WORKSPACE_ARCHIVE_NAME = "eliza-workspace";
  static final String VAULT_ARCHIVE_NAME = "vault-pglite";
  static final String PAYLOAD_ARCHIVE_NAME = "payload";
  static final String LEGACY_BUNDLE_NAME = "agent-bundle.js";

  private static final Pattern ACCOUNT_STATE_DIR = Pattern.compile("[0-9a-f]{64}");
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

  record Outcome(
    Move workspace,
    Move vault,
    int payloadMoved,
    int payloadKept,
    Move bundle,
    Path legacyStoreDir
  ) {}

  private static final Outcome EMPTY_OUTCOME =
    new Outcome(Move.NOTHING_TO_MOVE, Move.NOTHING_TO_MOVE, 0, 0, Move.NOTHING_TO_MOVE, null);

  private AlphaLegacyAgentArchive() {}

  /** Quint model transition for moving one source into one archive slot. */
  static Move moveOf(boolean sourceHeld, boolean archiveHeld, boolean renamed) {
    if (!sourceHeld) return Move.NOTHING_TO_MOVE;
    if (archiveHeld || !renamed) return Move.KEPT_IN_PLACE;
    return Move.MOVED_ASIDE;
  }

  static Outcome moveAside(Context context) {
    if (context == null) return EMPTY_OUTCOME;
    try {
      var files = context.getFilesDir();
      if (files == null) return EMPTY_OUTCOME;
      return moveAside(files.toPath(), ATOMIC_MOVER);
    } catch (RuntimeException ignored) {
      return EMPTY_OUTCOME;
    }
  }

  static Outcome moveAside(Path filesDir) {
    return moveAside(filesDir, ATOMIC_MOVER);
  }

  static Outcome moveAside(Path filesDir, Mover mover) {
    if (filesDir == null || mover == null) return EMPTY_OUTCOME;
    synchronized (LOCK) {
      try {
        Path root = filesDir.toAbsolutePath();
        Path archiveRoot = root.resolve(ARCHIVE_DIR_NAME);
        Path elizaDir = root.resolve(".eliza");

        Move workspace = renameIntoFree(
          elizaDir.resolve("workspace"),
          archiveRoot.resolve(WORKSPACE_ARCHIVE_NAME),
          mover
        );
        Move vault = renameIntoFree(
          elizaDir.resolve(".vault-pglite"),
          archiveRoot.resolve(VAULT_ARCHIVE_NAME),
          mover
        );

        int payloadMoved = 0;
        int payloadKept = 0;
        Move bundle = Move.NOTHING_TO_MOVE;

        Path agentDir = root.resolve("agent");
        Path bundleSource = agentDir.resolve(LEGACY_BUNDLE_NAME);
        if (Files.isDirectory(agentDir, LinkOption.NOFOLLOW_LINKS) && existsNoFollow(bundleSource)) {
          Path payloadDir = archiveRoot.resolve(PAYLOAD_ARCHIVE_NAME);
          List<Path> entries = listSortedDirectEntries(agentDir);
          if (entries == null) {
            bundle = Move.KEPT_IN_PLACE;
          } else {
            for (Path entry : entries) {
              String name = entry.getFileName().toString();
              if (LEGACY_BUNDLE_NAME.equals(name) || isAccountStateDirectory(entry, name)) continue;
              Move step = renameIntoFree(entry, payloadDir.resolve(name), mover);
              if (step == Move.MOVED_ASIDE) payloadMoved++;
              else if (step == Move.KEPT_IN_PLACE) payloadKept++;
            }
            if (payloadKept == 0) {
              bundle = renameIntoFree(bundleSource, payloadDir.resolve(LEGACY_BUNDLE_NAME), mover);
            } else {
              bundle = Move.KEPT_IN_PLACE;
            }
          }
        }

        return new Outcome(workspace, vault, payloadMoved, payloadKept, bundle, archivedStoreDir(archiveRoot));
      } catch (RuntimeException ignored) {
        return EMPTY_OUTCOME;
      }
    }
  }

  static void prepareLaunch(Context context, Map<String, String> variables) {
    if (context == null || variables == null) return;
    try {
      var files = context.getFilesDir();
      if (files == null) return;
      prepareLaunch(files.toPath(), variables, ATOMIC_MOVER);
    } catch (RuntimeException ignored) {
      // Never block or refuse agent launch on archive inspection.
    }
  }

  static void prepareLaunch(Path filesDir, Map<String, String> variables) {
    prepareLaunch(filesDir, variables, ATOMIC_MOVER);
  }

  static void prepareLaunch(Path filesDir, Map<String, String> variables, Mover mover) {
    if (filesDir == null || variables == null) return;
    try {
      Outcome outcome = moveAside(filesDir, mover);
      Path storeDir = outcome.legacyStoreDir();
      if (storeDir == null || variables.containsKey(LEGACY_STORE_DIR_ENV)) return;
      String value = storeDir.toString();
      if (value.isEmpty() || value.indexOf('\n') >= 0 || value.indexOf('\r') >= 0 || value.indexOf('\0') >= 0) return;
      variables.put(LEGACY_STORE_DIR_ENV, value);
    } catch (RuntimeException ignored) {
      // Never block or refuse agent launch on archive hint wiring.
    }
  }

  static Path archivedStoreDir(Path archiveRoot) {
    if (archiveRoot == null || !Files.isDirectory(archiveRoot, LinkOption.NOFOLLOW_LINKS)) return null;
    Path workspace = archiveRoot.resolve(WORKSPACE_ARCHIVE_NAME);
    Path elizaDb = workspace.resolve(".elizadb");
    if (Files.isDirectory(workspace, LinkOption.NOFOLLOW_LINKS)
        && Files.isDirectory(elizaDb, LinkOption.NOFOLLOW_LINKS)) {
      return elizaDb.toAbsolutePath();
    }
    Path vaultDb = archiveRoot.resolve(VAULT_ARCHIVE_NAME);
    if (Files.isDirectory(vaultDb, LinkOption.NOFOLLOW_LINKS)) {
      return vaultDb.toAbsolutePath();
    }
    return null;
  }

  private static boolean isAccountStateDirectory(Path entry, String name) {
    return ACCOUNT_STATE_DIR.matcher(name).matches()
      && Files.isDirectory(entry, LinkOption.NOFOLLOW_LINKS);
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
