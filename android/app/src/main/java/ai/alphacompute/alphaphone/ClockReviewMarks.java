package ai.alphacompute.alphaphone;

import android.content.Context;
import java.util.Iterator;
import org.json.JSONObject;

/**
 * Clock's native review of an agent Clock request, kept beside the device-execution journal entry it
 * belongs to (never inside it: the page owns that entry's revisions). One mark per scope and
 * proposal: reviewing, approved (with a one-use token), dispatching, finished or cancelled, bound to
 * the entry's attempt and operation hash.
 */
final class ClockReviewMarks {
 /** Native-only slot (RendererCredentialSlots). */
 static final String SLOT = "clock-agent-review:v1";
 static final int MAX_MARKS = 64;
 /** An approval must be confirmed this soon after the owner gave it. */
 static final long APPROVAL_WINDOW_MS = 5 * 60 * 1000L;
 private static final Object LOCK = new Object();

 interface Storage { String read() throws Exception; void write(String value) throws Exception; }

 private final Storage storage;
 ClockReviewMarks(Storage storage) { this.storage = storage; }

 static ClockReviewMarks of(Context context) {
  AlphaCredentialStore store = new AlphaCredentialStore(context.getApplicationContext());
  return new ClockReviewMarks(new Storage() {
   public String read() throws Exception { return store.readCredentialSlot(SLOT); }
   public void write(String value) throws Exception { store.writeCredentialSlot(SLOT, value); }
  });
 }

 static Object lock() { return LOCK; }

 private JSONObject all() throws Exception {
  String raw = storage.read();
  return raw == null ? new JSONObject() : new JSONObject(raw);
 }

 JSONObject get(String key) throws Exception {
  JSONObject mark = all().optJSONObject(key);
  return mark == null ? null : new JSONObject(mark.toString());
 }

 void put(String key, JSONObject mark) throws Exception {
  JSONObject marks = all();
  marks.put(key, mark);
  while (marks.length() > MAX_MARKS) {
   String oldest = null; long at = Long.MAX_VALUE;
   for (Iterator<String> names = marks.keys(); names.hasNext(); ) {
    String name = names.next();
    JSONObject held = marks.getJSONObject(name);
    boolean settled = "finished".equals(held.optString("phase")) || "cancelled".equals(held.optString("phase"));
    if (!name.equals(key) && settled && held.optLong("issuedAt", 0) < at) { oldest = name; at = held.optLong("issuedAt", 0); }
   }
   if (oldest == null) break;
   marks.remove(oldest);
  }
  storage.write(marks.toString());
 }

 /** A fresh mark in {@code phase} for {@code entry}'s current attempt and operation. */
 static JSONObject mark(JSONObject entry, String phase) throws Exception {
  return new JSONObject().put("phase", phase).put("attemptId", String.valueOf(DeviceExecutionJournal.attemptOf(entry).attemptId))
   .put("operationHash", DeviceExecutionJournal.operationHash(entry)).put("issuedAt", System.currentTimeMillis());
 }

 /** Whether {@code mark} was made for {@code entry}'s current attempt and operation. */
 static boolean binds(JSONObject mark, JSONObject entry) throws Exception {
  return String.valueOf(DeviceExecutionJournal.attemptOf(entry).attemptId).equals(mark.optString("attemptId"))
   && DeviceExecutionJournal.operationHash(entry).equals(mark.optString("operationHash"));
 }
}
