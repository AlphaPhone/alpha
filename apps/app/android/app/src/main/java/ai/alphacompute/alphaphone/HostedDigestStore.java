package ai.alphacompute.alphaphone;

import ai.eliza.plugins.securestore.nativeonly.JsonCredentialSlots;
import android.content.Context;
import java.io.File;
import java.util.Set;
import java.util.UUID;
import org.json.JSONObject;

final class HostedDigestStore {
 private static final String LEGACY = "hosted-digests:v1:";
 private static final String CURRENT = "hosted-digests:v2:";
 private static final String ACTIVATION = CURRENT + "activation";
 private static final Set<String> NOTICE_KEYS = Set.of(
  "hosted-notices:v1", "hosted-notices:pending:v1", "hosted-notices:owner:v1"
 );
 private static final int LEGACY_BYTES = 256 * 1024;
 private static final int PREPARED_BYTES = 4 * 1024 * 1024;
 private final JsonCredentialSlots slots;

 record Activation(String id, String scopeDigest) {}

 private HostedDigestStore(Context context) {
  slots = new JsonCredentialSlots(
   new File(context.getNoBackupFilesDir(), "connection-credentials"),
   "alpha.connection.aes.v1",
   slot -> slot.startsWith(CURRENT) && slot.endsWith(":prepared") ? PREPARED_BYTES : LEGACY_BYTES
  );
 }

 static HostedDigestStore of(Context context) {
  return new HostedDigestStore(context.getApplicationContext());
 }

 final class Bound {
  private final String digest;

  private Bound(String digest) { this.digest = digest; }

  String readIndex() throws HostedStorageFault { return read(LEGACY + digest); }
  void writeIndex(String contents) throws HostedStorageFault { write(LEGACY + digest, contents); }
  String readPrepared() throws HostedStorageFault { return read(CURRENT + digest + ":prepared"); }
  void writePrepared(String contents) throws HostedStorageFault { write(CURRENT + digest + ":prepared", contents); }
  String readRow(String run) throws HostedStorageFault { return read(rowKey(run)); }
  void writeRow(String run, String contents) throws HostedStorageFault { write(rowKey(run), contents); }
  void removeRow(String run) throws HostedStorageFault { write(rowKey(run), null); }

  private String rowKey(String run) { return LEGACY + digest + ":" + HostedInbox.id(run); }
  private String preference() { return CURRENT + digest + ":enabled"; }
 }

 Bound bind(ResidentDigestChannel.Scope scope) throws Exception {
  String owner = HostedInbox.id(scope.ownerId());
  String agent = HostedInbox.id(scope.agentId());
  String digest = scopeDigest(scope.digest());
  if (!digest.equals(ResidentDigestChannel.scopeDigest(owner, agent))) {
   throw new SecurityException("Hosted result owner changed");
  }
  return new Bound(digest);
 }

 boolean enabled(ResidentDigestChannel.Scope scope) throws Exception {
  String raw = read(bind(scope).preference());
  if (raw == null) return false;
  try {
   Object enabled = new JSONObject(raw).get("enabled");
   if (!(enabled instanceof Boolean value)) throw new IllegalStateException("Invalid hosted delivery preference");
   return value;
  } catch (Exception error) {
   throw new HostedStorageFault(error);
  }
 }

 void setEnabled(ResidentDigestChannel.Scope scope, boolean enabled) throws Exception {
  write(bind(scope).preference(), new JSONObject().put("enabled", enabled).toString());
 }

 Activation activation() throws HostedStorageFault {
  String raw = read(ACTIVATION);
  if (raw == null) return null;
  try {
   JSONObject saved = new JSONObject(raw);
   return new Activation(jobId(saved.getString("id")), scopeDigest(saved.getString("scopeDigest")));
  } catch (Exception error) {
   throw new HostedStorageFault(error);
  }
 }

 void setActivation(Activation next) throws Exception {
  write(ACTIVATION, next == null ? null : new JSONObject()
   .put("id", jobId(next.id())).put("scopeDigest", scopeDigest(next.scopeDigest())).toString());
 }

 String readNotice(String slot) throws HostedStorageFault { return read(noticeKey(slot)); }
 void writeNotice(String slot, String value) throws HostedStorageFault { write(noticeKey(slot), value); }

 private static String noticeKey(String slot) {
  if (!NOTICE_KEYS.contains(slot)) throw new IllegalArgumentException("Invalid hosted notice slot");
  return slot;
 }

 private static String scopeDigest(String value) {
  if (value == null || !value.matches("[a-f0-9]{64}")) throw new IllegalArgumentException("Invalid hosted scope");
  return value;
 }

 private static String jobId(String value) {
  if (!UUID.fromString(value).toString().equals(value)) throw new IllegalArgumentException("Invalid hosted job");
  return value;
 }

 private String read(String slot) throws HostedStorageFault {
  try {
   return slots.read(slot);
  } catch (Exception error) {
   throw new HostedStorageFault(error);
  }
 }

 private void write(String slot, String value) throws HostedStorageFault {
  try {
   if (value == null) slots.remove(slot);
   else slots.write(slot, value);
  } catch (Exception error) {
   throw new HostedStorageFault(error);
  }
 }
}
