package ai.alphacompute.alphaphone;

import android.content.Context;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The agent device-execution journal the renderer's DeviceExecution writes (@elizaos/agent/client
 * DeviceJournal, spec/agent/deviceActions/execution.md): one revisioned entry per proposal, replaced
 * only by a compare-and-set at the revision the page last read, in one encrypted native-only slot.
 * An entry never changes which owner, agent, installation, proposal or operation it binds.
 */
final class DeviceExecutionJournal {
 /** Native storage for DeviceExecution; the page reaches it through AlphaActionJournal. */
 static final String SLOT = "device-execution:v1";
 static final int MAX_ENTRIES = 256;
 static final int MAX_ENTRY_BYTES = 64 * 1024;
 static final int SLOT_BYTES = 4 * 1024 * 1024;
 private static final String[] BINDING = {"ownerId", "agentId", "origin", "installationId", "enrollmentId", "digest", "operationId", "operation"};
 private static final Object LOCK = new Object();

 interface Storage { String read() throws Exception; void write(String value) throws Exception; }

 private final Storage storage;
 DeviceExecutionJournal(Storage storage) { this.storage = storage; }

 static DeviceExecutionJournal of(Context context) {
  AlphaSecureSlots store = AlphaSecureSlots.of(context);
  return new DeviceExecutionJournal(new Storage() {
   public String read() throws Exception { return store.read(SLOT); }
   public void write(String value) throws Exception {
    store.write(SLOT, value);
    if (!value.equals(store.read(SLOT))) throw new IllegalStateException("Device journal write is unconfirmed");
   }
  });
 }


 static String proposalId(String value) {
  if (value == null || !value.matches("[A-Za-z0-9_-]{1,128}")) throw new IllegalArgumentException("Invalid proposal");
  return value;
 }

 private JSONArray entries() throws Exception {
  String raw = storage.read();
  return raw == null ? new JSONArray() : new JSONArray(raw);
 }

 private static int indexOf(JSONArray entries, String id) throws Exception {
  for (int i = 0; i < entries.length(); i++) if (id.equals(entries.getJSONObject(i).optString("proposalId"))) return i;
  return -1;
 }

 /** The entry for {@code id}, or null when the journal holds none. */
 JSONObject get(String id) throws Exception {
  synchronized (LOCK) {
   JSONArray all = entries();
   int at = indexOf(all, proposalId(id));
   return at < 0 ? null : all.getJSONObject(at);
  }
 }

 /** Every entry, oldest first. */
 JSONArray list() throws Exception {
  synchronized (LOCK) { return entries(); }
 }

 /** Replaces the entry at {@code expectedRevision} (0 for none) with {@code next}; false when the stored revision moved on. */
 boolean edit(String id, long expectedRevision, JSONObject next) throws Exception {
  proposalId(id);
  synchronized (LOCK) {
   JSONArray all = entries();
   int at = indexOf(all, id);
   JSONObject current = at < 0 ? null : all.getJSONObject(at);
   long stored = current == null ? 0 : current.getLong("revision");
   if (stored != expectedRevision) return false;
   check(id, expectedRevision, current, next);
   if (at >= 0) all.put(at, next);
   else {
    if (all.length() >= MAX_ENTRIES && !evictAcknowledged(all, id)) throw new IllegalStateException("Device journal full");
    all.put(next);
   }
   String value = all.toString();
   while (value.getBytes(StandardCharsets.UTF_8).length > SLOT_BYTES) {
    if (!evictAcknowledged(all, id)) throw new IllegalStateException("Device journal full");
    value = all.toString();
   }
   storage.write(value);
   return true;
  }
 }

 private static void check(String id, long expectedRevision, JSONObject current, JSONObject next) throws Exception {
  if (next == null || !id.equals(next.optString("proposalId"))) throw new IllegalArgumentException("Entry is for another proposal");
  Object revision = next.opt("revision");
  if (!(revision instanceof Number) || ((Number) revision).doubleValue() != expectedRevision + 1) throw new IllegalArgumentException("Entry revision must follow the stored one");
  for (String field : BINDING) {
   Object value = next.opt(field);
   if (!(value instanceof String) || ((String) value).isEmpty() || ((String) value).length() > 32768) throw new IllegalArgumentException("Entry binding incomplete");
   if (current != null && !value.equals(current.opt(field))) throw new IllegalArgumentException("Entry binding changed");
  }
  if (!(next.opt("acknowledged") instanceof Boolean) || next.optJSONObject("evidence") == null || !next.has("attempt")) throw new IllegalArgumentException("Entry incomplete");
  if (current != null && current.optBoolean("acknowledged", false) && !next.getBoolean("acknowledged")) throw new IllegalArgumentException("An acknowledged entry stays acknowledged");
  if (next.toString().getBytes(StandardCharsets.UTF_8).length > MAX_ENTRY_BYTES) throw new IllegalArgumentException("Entry too large");
 }

 private static boolean evictAcknowledged(JSONArray all, String writing) throws Exception {
  for (int i = 0; i < all.length(); i++) {
   JSONObject entry = all.getJSONObject(i);
   if (!writing.equals(entry.getString("proposalId")) && entry.getBoolean("acknowledged")) {
    all.remove(i);
    return true;
   }
  }
  return false;
 }

}
