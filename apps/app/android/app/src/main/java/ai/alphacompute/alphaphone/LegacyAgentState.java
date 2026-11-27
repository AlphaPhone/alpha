// spec/platform/storage.md, "Story: Keep what the earlier on-device agent stored"; spec/platform/storage.md, "The earlier agent's store and runtime are moved aside by rename, and never opened, changed or deleted"
package ai.alphacompute.alphaphone;

import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Moves the earlier on-device agent's store and runtime out of the new agent's way before each
 * launch. The earlier agent kept its PGlite store in {@code files/.eliza/workspace/.elizadb} and its
 * runtime in {@code files/agent}, which upstream {@code AgentDirectories} now uses as the parent of
 * the per-account state directories. The new agent never opens an older store (upstream
 * spec/agent/storage/database.md), so the earlier workspace goes to
 * {@code files/agent-legacy/eliza-workspace} and the earlier runtime's entries to
 * {@code files/agent-legacy/payload}, where a later importer reads them. Every move is one rename on
 * the app's own filesystem: nothing is copied, opened, rewritten or deleted, and an entry the archive
 * already holds is never written over. Whatever cannot be moved stays where it is for the next launch.
 * Plain java.nio, so the host JVM test compiles this file unchanged.
 */
final class LegacyAgentState {
 /** Under the app's files directory; a sibling of upstream's agent, agent-runtime and agent-recovery. */
 static final String ARCHIVE = "agent-legacy";
 /** The earlier agent's workspace, which holds its PGlite store {@code .elizadb}. */
 static final String WORKSPACE = "eliza-workspace";
 /** The earlier runtime's entries from {@code files/agent}. */
 static final String PAYLOAD = "payload";
 /** The earlier runtime's bundle: its presence in {@code files/agent} is what marks that runtime, so it moves last. */
 static final String RUNTIME_MARKER = "agent-bundle.js";
 /** An upstream account state directory: the hex SHA-256 of the account (AgentDirectories.accountDigest). */
 private static final Pattern ACCOUNT_STATE = Pattern.compile("[0-9a-f]{64}");

 /** What happened to one source: the spec's LegacyMove. */
 enum Move { NOTHING_TO_MOVE, MOVED_ASIDE, KEPT_IN_PLACE }

 /** One source's outcome, with the reason it stayed when it did. */
 static final class Outcome {
  final String source;
  final Move move;
  final String reason;
  Outcome(String source, Move move, String reason) { this.source = source; this.move = move; this.reason = reason; }
  @Override public String toString() { return source + " " + move + (reason == null ? "" : " (" + reason + ")"); }
 }

 private LegacyAgentState() {}

 /** The spec's legacyMoveOf: a source moves only into a free archive name and only by a rename that completed. */
 static Move moveOf(boolean sourceHeld, boolean archiveHeld, boolean renamed) {
  if (!sourceHeld) return Move.NOTHING_TO_MOVE;
  if (archiveHeld || !renamed) return Move.KEPT_IN_PLACE;
  return Move.MOVED_ASIDE;
 }

 /** Moves what the earlier agent left under {@code filesDir} aside; never throws for a move it could not make. */
 static List<Outcome> moveAside(Path filesDir) {
  Path files = filesDir.toAbsolutePath();
  List<Outcome> outcomes = new ArrayList<>();
  Path eliza = files.resolve(".eliza");
  Path workspace = eliza.resolve("workspace");
  Path agent = files.resolve("agent");
  boolean workspaceHeld = present(workspace);
  List<Path> runtime = runtimeEntries(agent);
  if (runtime == null) {
   // The runtime's entries could not be listed: none is moved, so the marker stays for the next launch.
   outcomes.add(new Outcome("agent", Move.KEPT_IN_PLACE, "unreadable"));
   runtime = Collections.emptyList();
  }
  if (!workspaceHeld && runtime.isEmpty()) return outcomes;
  Path archive;
  try { archive = privateDirectory(files.resolve(ARCHIVE)); }
  catch (IOException unusable) {
   if (workspaceHeld) outcomes.add(new Outcome(".eliza/workspace", Move.KEPT_IN_PLACE, "archive unusable"));
   for (Path entry : runtime) outcomes.add(new Outcome("agent/" + entry.getFileName(), Move.KEPT_IN_PLACE, "archive unusable"));
   return outcomes;
  }
  if (workspaceHeld) outcomes.add(realDirectory(eliza)
   ? move(".eliza/workspace", workspace, archive.resolve(WORKSPACE))
   : new Outcome(".eliza/workspace", Move.KEPT_IN_PLACE, "linked"));
  if (!runtime.isEmpty()) {
   Path payload;
   try { payload = privateDirectory(archive.resolve(PAYLOAD)); }
   catch (IOException unusable) {
    for (Path entry : runtime) outcomes.add(new Outcome("agent/" + entry.getFileName(), Move.KEPT_IN_PLACE, "archive unusable"));
    return outcomes;
   }
   boolean othersKept = false;
   for (Path entry : runtime) {
    String name = entry.getFileName().toString();
    if (RUNTIME_MARKER.equals(name)) continue;
    Outcome outcome = move("agent/" + name, entry, payload.resolve(name));
    othersKept |= outcome.move == Move.KEPT_IN_PLACE;
    outcomes.add(outcome);
   }
   // The marker is what makes the next launch look again, so it leaves only after every other entry did.
   outcomes.add(othersKept
    ? new Outcome("agent/" + RUNTIME_MARKER, Move.KEPT_IN_PLACE, "runtime entries left")
    : move("agent/" + RUNTIME_MARKER, agent.resolve(RUNTIME_MARKER), payload.resolve(RUNTIME_MARKER)));
  }
  return outcomes;
 }

 /** The earlier runtime's entries in {@code files/agent}, its marker among them; none once the marker is gone; null when unreadable. */
 private static List<Path> runtimeEntries(Path agent) {
  if (!realDirectory(agent) || !present(agent.resolve(RUNTIME_MARKER))) return Collections.emptyList();
  List<Path> entries = new ArrayList<>();
  try (DirectoryStream<Path> listed = Files.newDirectoryStream(agent)) {
   for (Path entry : listed) if (!ACCOUNT_STATE.matcher(entry.getFileName().toString()).matches()) entries.add(entry);
  } catch (IOException | RuntimeException unreadable) {
   return null;
  }
  Collections.sort(entries);
  return entries;
 }

 private static Outcome move(String label, Path source, Path target) {
  if (!present(source)) return new Outcome(label, moveOf(false, false, false), null);
  if (present(target)) return new Outcome(label, moveOf(true, true, false), "archive holds one");
  boolean renamed;
  String reason = null;
  try {
   // A rename on the same filesystem: a link is moved as the link, never followed.
   Files.move(source, target, StandardCopyOption.ATOMIC_MOVE);
   renamed = true;
  } catch (IOException | RuntimeException failed) {
   renamed = false;
   reason = "rename failed: " + failed.getClass().getSimpleName();
  }
  return new Outcome(label, moveOf(true, false, renamed), reason);
 }

 private static boolean present(Path path) { return Files.exists(path, LinkOption.NOFOLLOW_LINKS); }

 private static boolean realDirectory(Path path) { return Files.isDirectory(path, LinkOption.NOFOLLOW_LINKS); }

 private static Path privateDirectory(Path directory) throws IOException {
  if (!present(directory)) Files.createDirectory(directory, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rwx------")));
  if (!realDirectory(directory)) throw new IOException(directory + " is not a real directory");
  return directory;
 }
}
