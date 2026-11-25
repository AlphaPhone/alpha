package ai.alphacompute.alphaphone;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

final class HostedInbox {
 interface Fence { void check() throws Exception; }
 interface NoticePublisher {
  boolean publish(ResidentDigestChannel.Scope scope, JSONObject retainedRow) throws Exception;
 }

 private static final int MAX_PAGES = 2;
 private static final int MAX_PAGE = 50;
 private static final int RETAINED = 100;
 private static final int LEGACY_INDEX_LIMIT = 200;
 private static final int RESULT_CHARACTERS = 200_000;
 private static final long MAX_CURSOR = 9_007_199_254_740_991L;
 private static final List<String> IDS = List.of("runId", "workflowId", "workflowVersionId", "templateVersion");
 private static final List<String> DATES = List.of("scheduledAt", "startedAt", "completedAt");
 private static final List<String> FIELDS = List.of(
  "cursor", "runId", "workflowId", "workflowVersionId", "templateVersion", "scheduledAt",
  "source", "status", "startedAt", "completedAt", "output"
 );
 private static final List<String> IDENTITY = List.of(
  "runId", "workflowId", "workflowVersionId", "templateVersion", "scheduledAt", "source"
 );
 private final HostedDigestStore store;
 private final NoticePublisher notices;
 private final Object gate = new Object();
 private final Object syncGate = new Object();

 private record Receipt(String clientId, long cursor, String runId) {
  JSONObject json() throws Exception {
   return new JSONObject().put("clientId", clientId).put("cursor", cursor).put("runId", runId);
  }

  static Receipt read(JSONObject value, String clientId) throws Exception {
   String client = id(string(value, "clientId"));
   if (!clientId.equals(client)) throw new IllegalStateException("Saved inbox client changed");
   return new Receipt(client, cursorOf(value), id(string(value, "runId")));
  }
 }

 private record Index(String clientId, List<String> retained, List<String> removals, List<String> notices,
                      Receipt pendingAck, Receipt acknowledged) {
  static Index empty() {
   return new Index(UUID.randomUUID().toString(), List.of(), List.of(), List.of(), null, null);
  }

  static Index read(JSONObject value) throws Exception {
   String client = id(string(value, "clientId"));
   Receipt pending = receipt(value, "pendingAck", client);
   Receipt acknowledged = receipt(value, "acknowledged", client);
   if (pending != null && acknowledged != null && pending.cursor() <= acknowledged.cursor()) {
    throw new IllegalStateException("Saved receipt did not advance");
   }
   return new Index(client, list(value, "ids", true), list(value, "pendingRemoval", false),
    list(value, "pendingNotices", false), pending, acknowledged);
  }

  private static Receipt receipt(JSONObject value, String name, String client) throws Exception {
   return value.has(name) ? Receipt.read(value.getJSONObject(name), client) : null;
  }

  JSONObject json() throws Exception {
   JSONObject value = new JSONObject().put("clientId", clientId)
    .put("ids", new JSONArray(retained)).put("pendingRemoval", new JSONArray(removals))
    .put("pendingNotices", new JSONArray(notices));
   if (pendingAck != null) value.put("pendingAck", pendingAck.json());
   if (acknowledged != null) value.put("acknowledged", acknowledged.json());
   return value;
  }

  Index withoutNotice(String run) {
   List<String> pending = new ArrayList<>(notices);
   pending.remove(run);
   return new Index(clientId, retained, removals, pending, pendingAck, acknowledged);
  }
 }

 private record Prepared(Index index, Map<String, JSONObject> rows) {
  JSONObject json() throws Exception {
   return new JSONObject().put("index", index.json()).put("rows", new JSONArray(rows.values()));
  }

  static Prepared read(String raw) throws Exception {
   JSONObject value = new JSONObject(raw);
   Index index = Index.read(value.getJSONObject("index"));
   JSONArray values = value.getJSONArray("rows");
   if (values.length() > MAX_PAGE || index.pendingAck() == null || index.retained().size() > RETAINED) {
    throw new IllegalStateException("Invalid prepared result page");
   }
   Map<String, JSONObject> rows = new LinkedHashMap<>();
   for (int at = 0; at < values.length(); at++) {
    JSONObject row = parse(values.getJSONObject(at).toString());
    String run = string(row, "runId");
    if ((!index.retained().contains(run) && !index.removals().contains(run)) || rows.put(run, row) != null) {
     throw new IllegalStateException("Prepared result identity changed");
    }
   }
   return new Prepared(index, rows);
  }
 }

 HostedInbox(HostedDigestStore store, NoticePublisher notices) {
  this.store = store;
  this.notices = notices;
 }

 JSONArray history(ResidentDigestChannel.Scope scope, Fence fence) throws Exception {
  HostedDigestStore.Bound bound = store.bind(scope);
  synchronized (gate) {
   fence.check();
   Index index = recover(bound, fence);
   JSONArray result = new JSONArray();
   if (index != null) for (String run : index.retained()) result.put(savedRow(bound, run));
   fence.check();
   return result;
  }
 }

 JSONObject retained(ResidentDigestChannel.Scope scope, String runId, Fence fence) throws Exception {
  String run = id(runId);
  HostedDigestStore.Bound bound = store.bind(scope);
  synchronized (gate) {
   fence.check();
   Index index = recover(bound, fence);
   JSONObject result = index == null || !index.retained().contains(run) ? null : savedRow(bound, run);
   fence.check();
   return result;
  }
 }

 JSONArray sync(ResidentDigestChannel.Session session, Fence fence) throws Exception {
  ResidentDigestChannel.Scope scope = session.scope();
  HostedDigestStore.Bound bound = store.bind(scope);
  Fence current = () -> { fence.check(); session.check(); };
  synchronized (syncGate) {
   Index index;
   synchronized (gate) {
    current.check();
    index = recover(bound, current);
    if (index == null) {
     index = Index.empty();
     writeIndex(bound, index, current);
    }
    for (String run : index.retained()) savedRow(bound, run);
   }
   ack(session, bound, current);
   for (int page = 0; page < MAX_PAGES; page++) {
    current.check();
    JSONArray values = session.fetch(index.clientId()).getJSONArray("entries");
    List<JSONObject> parsed = pageOf(values);
    if (parsed.isEmpty()) break;
    synchronized (gate) {
     current.check();
     index = recover(bound, current);
     if (index == null || index.pendingAck() != null) throw new IllegalStateException("Inbox receipt is unsettled");
     Prepared prepared = prepare(bound, index, parsed);
     String serialized = prepared.json().toString();
     current.check();
     bound.writePrepared(serialized);
     publish(bound, prepared, current);
    }
    ack(session, bound, current);
   }
   reconcileNotices(scope, current);
   return history(scope, current);
  }
 }

 void reconcileNotices(ResidentDigestChannel.Scope scope, Fence fence) throws Exception {
  if (notices == null) return;
  HostedDigestStore.Bound bound = store.bind(scope);
  synchronized (syncGate) {
   List<String> pending;
   synchronized (gate) {
    fence.check();
    Index index = recover(bound, fence);
    if (index == null) return;
    pending = index.notices();
   }
   for (String run : pending) {
    JSONObject row = retained(scope, run, fence);
    if (row != null) {
     boolean settled;
     try {
      fence.check();
      settled = notices.publish(scope, row);
     } catch (Exception failure) {
      fence.check();
      continue;
     }
     if (!settled) continue;
    }
    synchronized (gate) {
     fence.check();
     Index index = recover(bound, fence);
     if (index == null || !index.notices().contains(run)) continue;
     JSONObject latest = index.retained().contains(run) ? savedRow(bound, run) : null;
     if (equivalent(row, latest)) writeIndex(bound, index.withoutNotice(run), fence);
    }
   }
  }
 }

 private void ack(ResidentDigestChannel.Session session, HostedDigestStore.Bound bound, Fence fence) throws Exception {
  Receipt pending;
  synchronized (gate) {
   fence.check();
   Index index = recover(bound, fence);
   pending = index == null ? null : index.pendingAck();
  }
  if (pending == null) return;
  fence.check();
  session.acknowledge(pending.clientId(), pending.cursor(), pending.runId());
  synchronized (gate) {
   fence.check();
   Index index = recover(bound, fence);
   if (index == null || !pending.equals(index.pendingAck())) throw new IllegalStateException("Inbox receipt changed");
   Index settled = new Index(index.clientId(), index.retained(), index.removals(), index.notices(), null, pending);
   writeIndex(bound, settled, fence);
   removeRetired(bound, settled, fence);
  }
 }

 private Index recover(HostedDigestStore.Bound bound, Fence fence) throws Exception {
  Index index = readIndex(bound);
  String raw = bound.readPrepared();
  if (raw != null) {
   Prepared prepared;
   try {
    prepared = Prepared.read(raw);
    if (index == null || !index.clientId().equals(prepared.index().clientId())
        || !Objects.equals(index.acknowledged(), prepared.index().acknowledged())
        || (index.pendingAck() != null && !index.pendingAck().equals(prepared.index().pendingAck()))) {
     throw new IllegalStateException("Prepared inbox identity changed");
    }
   } catch (Exception failure) {
    throw new HostedStorageFault(failure);
   }
   index = publish(bound, prepared, fence);
  }
  return index == null ? null : removeRetired(bound, index, fence);
 }

 private static Index publish(HostedDigestStore.Bound bound, Prepared prepared, Fence fence) throws Exception {
  for (Map.Entry<String, JSONObject> row : prepared.rows().entrySet()) {
   fence.check();
   bound.writeRow(row.getKey(), row.getValue().toString());
  }
  writeIndex(bound, prepared.index(), fence);
  fence.check();
  bound.writePrepared(null);
  return prepared.index();
 }

 private static Index removeRetired(HostedDigestStore.Bound bound, Index index, Fence fence) throws Exception {
  if (index.removals().isEmpty()) return index;
  List<String> waiting = new ArrayList<>();
  for (String run : index.removals()) {
   if (index.retained().contains(run)) continue;
   if (index.pendingAck() != null && index.pendingAck().runId().equals(run)) {
    waiting.add(run);
   } else {
    fence.check();
    bound.removeRow(run);
   }
  }
  if (waiting.equals(index.removals())) return index;
  Index cleaned = new Index(index.clientId(), index.retained(), waiting, index.notices(), index.pendingAck(), index.acknowledged());
  writeIndex(bound, cleaned, fence);
  return cleaned;
 }

 private static Prepared prepare(HostedDigestStore.Bound bound, Index index, List<JSONObject> page) throws Exception {
  if (index.acknowledged() != null && cursorOf(page.get(0)) <= index.acknowledged().cursor()) {
   throw new IllegalStateException("Hosted result cursor regressed");
  }
  List<String> retained = new ArrayList<>(index.retained());
  List<String> pending = new ArrayList<>(index.notices());
  List<String> removed = new ArrayList<>(index.removals());
  Map<String, JSONObject> writes = new LinkedHashMap<>();
  for (JSONObject row : page) {
   String run = string(row, "runId");
   JSONObject previous = writes.get(run);
   if (previous == null) previous = previousRow(bound, run);
   boolean added = !retained.contains(run);
   boolean replace = previous == null || acceptsReplacement(previous, row);
   if (previous != null && !replace && !equivalent(previous, row) && !acceptsReplacement(row, previous)) {
    throw new IllegalStateException("Stored result changed");
   }
   if (replace) writes.put(run, row);
   if (added) retained.add(run);
   if ((added || replace) && !pending.contains(run)) pending.add(run);
  }
  while (retained.size() > RETAINED) {
   String run = retained.remove(0);
   if (!removed.contains(run)) removed.add(run);
  }
  pending.retainAll(retained);
  JSONObject last = page.get(page.size() - 1);
  Receipt receipt = new Receipt(index.clientId(), cursorOf(last), string(last, "runId"));
  return new Prepared(new Index(index.clientId(), retained, removed, pending, receipt, index.acknowledged()), writes);
 }

 private static List<JSONObject> pageOf(JSONArray values) throws Exception {
  if (values.length() > MAX_PAGE) throw new IllegalArgumentException("Hosted result page exceeds its limit");
  List<JSONObject> page = new ArrayList<>();
  long previous = 0;
  for (int at = 0; at < values.length(); at++) {
   JSONObject row = parse(values.getJSONObject(at).toString());
   long cursor = cursorOf(row);
   if (cursor <= previous) throw new IllegalArgumentException("Hosted results are unordered");
   previous = cursor;
   page.add(row);
  }
  return page;
 }

 private static JSONObject savedRow(HostedDigestStore.Bound bound, String run) throws HostedStorageFault {
  JSONObject row = previousRow(bound, run);
  if (row == null) throw new HostedStorageFault(new IllegalStateException("Saved result is missing"));
  return row;
 }

 private static JSONObject previousRow(HostedDigestStore.Bound bound, String run) throws HostedStorageFault {
  String raw = bound.readRow(run);
  if (raw == null) return null;
  try {
   JSONObject row = parse(raw);
   if (!run.equals(string(row, "runId"))) throw new IllegalStateException("Saved result identity changed");
   return row;
  } catch (Exception failure) {
   throw new HostedStorageFault(failure);
  }
 }

 private static Index readIndex(HostedDigestStore.Bound bound) throws HostedStorageFault {
  String raw = bound.readIndex();
  if (raw == null) return null;
  try {
   return Index.read(new JSONObject(raw));
  } catch (Exception failure) {
   throw new HostedStorageFault(failure);
  }
 }

 private static void writeIndex(HostedDigestStore.Bound bound, Index index, Fence fence) throws Exception {
  String saved = index.json().toString();
  fence.check();
  bound.writeIndex(saved);
 }

 static String id(String value) {
  if (value == null || !value.matches("[A-Za-z0-9][A-Za-z0-9_-]{0,127}")) {
   throw new IllegalArgumentException("Invalid hosted result identity");
  }
  return value;
 }

 private static String string(JSONObject value, String field) throws Exception {
  Object raw = value.get(field);
  if (raw instanceof String text) return text;
  throw new IllegalArgumentException("Invalid hosted result text field");
 }

 private static long cursorOf(JSONObject value) throws Exception {
  Object raw = value.get("cursor");
  if (!(raw instanceof Number number)) throw new IllegalArgumentException("Invalid hosted result cursor");
  long cursor = number.longValue();
  if (cursor < 1 || cursor > MAX_CURSOR || number.doubleValue() != cursor) {
   throw new IllegalArgumentException("Invalid hosted result cursor");
  }
  return cursor;
 }

 private static List<String> list(JSONObject value, String field, boolean required) throws Exception {
  if (!required && !value.has(field)) return List.of();
  JSONArray array = value.getJSONArray(field);
  if (array.length() > LEGACY_INDEX_LIMIT) throw new IllegalStateException("Saved inbox exceeds its limit");
  List<String> result = new ArrayList<>();
  Set<String> seen = new HashSet<>();
  for (int at = 0; at < array.length(); at++) {
   Object raw = array.get(at);
   if (!(raw instanceof String entry) || !seen.add(id(entry))) {
    throw new IllegalStateException("Invalid saved inbox identity");
   }
   result.add(entry);
  }
  return result;
 }

 private static JSONObject parse(String raw) throws Exception {
  if (raw.length() > RESULT_CHARACTERS) throw new IllegalArgumentException("Hosted result exceeds its limit");
  JSONObject value = new JSONObject(raw);
  cursorOf(value);
  for (String field : IDS) id(string(value, field));
  for (String field : DATES) Instant.parse(string(value, field));
  value.getJSONObject("source");
  string(value, "status");
  JSONObject result = new JSONObject();
  for (String field : FIELDS) result.put(field, value.get(field));
  return result.put("error", value.opt("error") instanceof String ? value.get("error") : JSONObject.NULL);
 }

 private static boolean acceptsReplacement(JSONObject saved, JSONObject next) throws Exception {
  for (String field : IDENTITY) {
   if (!equivalent(saved.get(field), next.get(field))) return false;
  }
  return string(saved, "status").equals("cancelled") && !string(next, "status").equals("cancelled")
   && cursorOf(next) > cursorOf(saved);
 }

 private static boolean equivalent(Object a, Object b) throws Exception {
  if (a instanceof JSONObject x && b instanceof JSONObject y) {
   if (x.length() != y.length()) return false;
   Iterator<String> keys = x.keys();
   while (keys.hasNext()) {
    String key = keys.next();
    if (!y.has(key) || !equivalent(x.get(key), y.get(key))) return false;
   }
   return true;
  }
  if (a instanceof JSONArray x && b instanceof JSONArray y) {
   if (x.length() != y.length()) return false;
   for (int at = 0; at < x.length(); at++) {
    if (!equivalent(x.get(at), y.get(at))) return false;
   }
   return true;
  }
  if (a instanceof Number && b instanceof Number) {
   return new BigDecimal(a.toString()).compareTo(new BigDecimal(b.toString())) == 0;
  }
  return Objects.equals(a, b);
 }
}
