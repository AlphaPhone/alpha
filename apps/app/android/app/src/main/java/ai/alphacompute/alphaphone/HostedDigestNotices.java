// spec/app/digests/index.md, "Opening a result notice opens the panel on that result, for the owner it was for"
package ai.alphacompute.alphaphone;

import android.Manifest;
import android.app.KeyguardManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationChannelGroup;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.UserManager;
import android.service.notification.StatusBarNotification;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.json.JSONObject;

/** Durable, owner-qualified digest notice receipts. The native inbox owns result delivery. */
final class HostedDigestNotices {
 static final String CHANNEL = "alpha-hosted-results";
 private static final String ACTION = "ai.alphacompute.alphaphone.OPEN_HOSTED_RESULT";
 private static final String PREFIX = "alpha-hosted-result:";
 private static final String ASK_ACTION = "ai.alphacompute.alphaphone.ASK_HOSTED_RESULT";
 private static final String ASK_PREFIX = "alpha-hosted-question:";
 private static final String OPEN = "open";
 private static final String ASK = "ask";
 private static final String PROOF = "ai.alphacompute.alphaphone.DIGEST_NOTICE_FINGERPRINT";
 private static final String LEDGER = "hosted-notices:v1";
 private static final String PENDING = "hosted-notices:pending:v1";
 private static final String OWNER = "hosted-notices:owner:v1";
 private static final int MAX_LEDGER = 200;
 private static final long LIFETIME_MS = 24L * 60 * 60 * 1000;
 private static final Pattern TOKEN = Pattern.compile("[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}");
 private static final Pattern KEY = Pattern.compile("[0-9a-f]{64}");
 private static final Pattern ID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9_-]{0,127}");
 private static final Set<String> LIVE = Set.of("dispatching", "posted", "uncertain");

 private final Context context;
 private final HostedDigestStore store;
 private ResidentDigestChannel.Scope authorised;

 HostedDigestNotices(Context context, HostedDigestStore store) {
  this.context = context.getApplicationContext();
  this.store = store;
 }

 /** Matching the shape permits attempting encrypted capture. It grants no route. */
 static boolean accepts(Intent intent) {
  return accepts(intent, ACTION, PREFIX, MainActivity.class);
 }

 static boolean acceptsQuestion(Intent intent) {
  return accepts(intent, ASK_ACTION, ASK_PREFIX, HostedDigestQuestionActivity.class);
 }

 private static boolean accepts(Intent intent, String action, String prefix, Class<?> target) {
  if (intent == null || !action.equals(intent.getAction()) || intent.getComponent() == null
      || !target.getName().equals(intent.getComponent().getClassName())) return false;
  String data = intent.getDataString();
  return data != null && data.length() == prefix.length() + 36 && data.startsWith(prefix)
    && TOKEN.matcher(data.substring(prefix.length())).matches();
 }

 private static boolean questionSupported(Context context) {
  if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return false;
  KeyguardManager lock = context.getSystemService(KeyguardManager.class);
  return lock != null && lock.isDeviceSecure();
 }

 static boolean questionUnlocked(Context context) {
  if (!questionSupported(context)) return false;
  KeyguardManager lock = context.getSystemService(KeyguardManager.class);
  UserManager users = context.getSystemService(UserManager.class);
  return users != null && users.isUserUnlocked() && lock != null && !lock.isDeviceLocked() && !lock.isKeyguardLocked();
 }

 /** Clearing authority fences the journal before removing any visible notification. */
 synchronized void authorise(ResidentDigestChannel.Scope scope) throws Exception {
  if (scope != null && Objects.equals(authorised, scope)) return;
  authorised = null;
  JSONObject owner = scope == null ? null : owner(scope);
  JSONObject ownerRecord = new JSONObject();
  if (owner == null) ownerRecord.put("owner", JSONObject.NULL);
  else {
   JSONObject legacyOwner = new JSONObject().put("origin", owner.getString("origin"))
     .put("ownerId", owner.getString("ownerId")).put("agentId", owner.getString("agentId"));
   ownerRecord.put("owner", legacyOwner).put("scope", scope.digest());
  }
  write(OWNER, ownerRecord);
  JSONObject ledger = ledger();
  JSONObject pending = read(PENDING);
  String pendingKey = pending.optString("key");
  JSONObject pendingRow = ledger.optJSONObject(pendingKey);
  if (!matches(owner, pendingRow) || pending.optBoolean("question")) write(PENDING, new JSONObject());

  List<JSONObject> withdrawn = new ArrayList<>();
  for (String key : keys(ledger)) {
   JSONObject record = ledger.getJSONObject(key);
   if (!matches(owner, record)) {
    if (LIVE.contains(record.optString("phase"))) record.put("phase", "owner-withdrawn");
    withdrawn.add(record);
   } else if (record.optInt("opaqueVersion") != 2 && LIVE.contains(record.optString("phase"))) {
    record.put("phase", "legacy-withdrawn");
    withdrawn.add(record);
   }
  }
  if (!withdrawn.isEmpty()) write(LEDGER, ledger);
  for (JSONObject record : withdrawn) cancel(record);
  authorised = scope;
 }

 /** True means this notice was durably handled, including permission denial or a prior attempt. */
 synchronized boolean publish(ResidentDigestChannel.Scope scope, JSONObject retainedRow) throws Exception {
  if (!current(scope)) return false;
  JSONObject row = retainedRow;
  String run = id(row.getString("runId"));
  JSONObject currentOwner = owner(scope);
  String tag = hash(scope.digest() + ":" + run);
  String digest = hash(row.toString());
  JSONObject ledger = ledger();
  JSONObject previous = ledger.optJSONObject(tag);
  if (previous != null && digest.equals(previous.optString("digest"))) {
   if ("dispatching".equals(previous.optString("phase"))) {
    previous.put("phase", active(previous) ? "posted" : "uncertain");
    write(LEDGER, ledger);
   }
   return true;
  }

  long now = System.currentTimeMillis();
  String dispatch = UUID.randomUUID().toString();
  boolean allowed = allowed();
  JSONObject record = new JSONObject(currentOwner.toString()).put("key", tag).put("runId", run)
    .put("workflowId", id(row.getString("workflowId"))).put("workflowVersionId", id(row.getString("workflowVersionId")))
    .put("digest", digest).put("dispatchId", dispatch).put("opaqueVersion", 2).put("createdAt", now)
    .put("phase", allowed ? "dispatching" : "denied");
  if (allowed && "finished".equals(row.optString("status")) && questionSupported(context)) {
   record.put("askDispatchId", UUID.randomUUID().toString());
  }
  JSONObject pending = read(PENDING);
  String pendingKey = pending.optString("key");
  List<JSONObject> withdrawn = new ArrayList<>();
  if (previous != null) {
   withdrawn.add(previous);
   if (tag.equals(pendingKey)) {
    write(PENDING, new JSONObject());
    pendingKey = "";
   }
  }
  ledger.put(tag, record);

  List<String> ordered = keys(ledger);
  ordered.sort(Comparator.comparingLong(key -> ledger.optJSONObject(key).optLong("createdAt")));
  for (String key : ordered) {
   if (key.equals(tag) || key.equals(pendingKey)) continue;
   JSONObject other = ledger.getJSONObject(key);
   if (ledger.length() > MAX_LEDGER) {
    ledger.remove(key);
    withdrawn.add(other);
   } else if (LIVE.contains(other.optString("phase")) && matches(currentOwner, other)
     && record.getString("workflowId").equals(other.optString("workflowId"))) {
    other.put("phase", "superseded");
    withdrawn.add(other);
   }
  }

  write(LEDGER, ledger);
  for (JSONObject old : withdrawn) cancel(old);
  if (!allowed) return true;
  try {
   post(record, row.optString("status"));
   record.put("phase", "posted");
  } catch (SecurityException denied) {
   record.put("phase", "denied");
  }
  write(LEDGER, ledger);
  return true;
 }

 /** Cold capture persists only an exact dispatch receipt. Whole results remain behind current custody. */
 synchronized boolean capture(Intent intent) throws Exception {
  return accepts(intent) && capture(OPEN, intent.getDataString().substring(PREFIX.length()));
 }

 synchronized boolean captureQuestion(Intent intent) throws Exception {
  return acceptsQuestion(intent) && questionUnlocked(context)
    && capture(ASK, intent.getDataString().substring(ASK_PREFIX.length()));
 }

 private boolean capture(String mode, String dispatch) throws Exception {
  JSONObject owner = storedOwner();
  JSONObject ledger = ledger();
  for (String key : keys(ledger)) {
   JSONObject row = ledger.getJSONObject(key);
   if (row.optInt("opaqueVersion") != 2 || !dispatch.equals(row.optString(dispatchKey(mode)))
     || !matches(owner, row) || !LIVE.contains(row.optString("phase")) || expired(row)) continue;
   JSONObject pending = read(PENDING);
   if (key.equals(pending.optString("key")) && dispatch.equals(pending.optString("dispatchId"))
       && mode.equals(pending.optString("mode", OPEN))) return true;
   write(PENDING, new JSONObject().put("key", key).put("mode", mode)
     .put("dispatchId", dispatch).put("token", UUID.randomUUID().toString()));
   return true;
  }
  return false;
 }

 synchronized JSONObject peek(ResidentDigestChannel.Scope scope, HostedInbox inbox, HostedInbox.Fence fence) throws Exception {
  fence.check();
  if (!current(scope)) return null;
  JSONObject pending = read(PENDING);
  JSONObject record = pendingRecord(scope, pending, ledger());
  if (record == null) return null;
  JSONObject retained = exactRetained(scope, record, inbox, fence);
  if (retained == null) return null;
  fence.check();
  return new JSONObject().put("token", pending.getString("token")).put("runId", record.getString("runId"))
    .put("workflowId", record.getString("workflowId")).put("workflowVersionId", record.getString("workflowVersionId"))
    .put("cursor", retained.getLong("cursor")).put("mode", pending.optString("mode", OPEN));
 }

 synchronized boolean consume(ResidentDigestChannel.Scope scope, String token, boolean ask, HostedInbox inbox, HostedInbox.Fence fence) throws Exception {
  fence.check();
  if (token == null || !TOKEN.matcher(token).matches() || !current(scope)) return false;
  JSONObject pending = read(PENDING);
  if (!token.equals(pending.optString("token")) || !(ask ? ASK : OPEN).equals(pending.optString("mode", OPEN))) return false;
  JSONObject ledger = ledger();
  JSONObject record = pendingRecord(scope, pending, ledger);
  if (record == null || exactRetained(scope, record, inbox, fence) == null) return false;
  fence.check();
  record.put("phase", "opened");
  write(LEDGER, ledger);
  write(PENDING, new JSONObject());
  cancel(record);
  return true;
 }

 private static JSONObject exactRetained(ResidentDigestChannel.Scope scope, JSONObject record, HostedInbox inbox,
   HostedInbox.Fence fence) throws Exception {
  JSONObject row = inbox.retained(scope, id(record.getString("runId")), fence);
  return row != null && record.getString("digest").equals(hash(row.toString())) ? row : null;
 }

 private JSONObject pendingRecord(ResidentDigestChannel.Scope scope, JSONObject pending, JSONObject ledger) throws Exception {
  String key = pending.optString("key");
  if (!KEY.matcher(key).matches() || !TOKEN.matcher(pending.optString("token")).matches() || pending.optBoolean("question")) return null;
  JSONObject record = ledger.optJSONObject(key);
  if (!matches(owner(scope), record) || expired(record)) return null;
  String mode = pending.optString("mode", OPEN);
  if (!OPEN.equals(mode) && (!ASK.equals(mode) || !questionUnlocked(context))) return null;
  if (record.optInt("opaqueVersion") == 2) {
   String dispatch = pending.optString("dispatchId");
   if (!TOKEN.matcher(dispatch).matches() || !LIVE.contains(record.optString("phase"))
       || !record.optString(dispatchKey(mode)).equals(dispatch)) return null;
  } else if (!OPEN.equals(mode) || !Set.of("legacy-withdrawn", "posted").contains(record.optString("phase"))) return null;
  return record;
 }

 private static String dispatchKey(String mode) { return ASK.equals(mode) ? "askDispatchId" : "dispatchId"; }

 private boolean current(ResidentDigestChannel.Scope scope) throws Exception {
  return scope != null && scope.equals(authorised) && matches(storedOwner(), owner(scope));
 }

 private JSONObject storedOwner() throws Exception {
  JSONObject record = read(OWNER);
  JSONObject owner = record.optJSONObject("owner");
  if (owner != null && record.has("scope")) owner.put("scope", record.getString("scope"));
  return owner;
 }

 private static JSONObject owner(ResidentDigestChannel.Scope scope) throws Exception {
  if (scope == null || !KEY.matcher(scope.digest()).matches()
    || !scope.digest().equals(ResidentDigestChannel.scopeDigest(scope.ownerId(), scope.agentId()))) {
   throw new IllegalArgumentException("Invalid digest scope");
  }
  return new JSONObject().put("origin", ResidentDigestChannel.ORIGIN).put("ownerId", id(scope.ownerId()))
    .put("agentId", id(scope.agentId())).put("scope", scope.digest());
 }

 private static boolean matches(JSONObject owner, JSONObject record) {
  if (owner == null || record == null || !ResidentDigestChannel.ORIGIN.equals(owner.optString("origin"))
    || !ID.matcher(owner.optString("ownerId")).matches() || !ID.matcher(owner.optString("agentId")).matches()) return false;
  for (String name : List.of("origin", "ownerId", "agentId")) if (!owner.optString(name).equals(record.optString(name))) return false;
  // Develop's persisted authority used only origin, owner and agent.
  String scope = owner.optString("scope");
  return scope.isEmpty() || scope.equals(record.optString("scope"));
 }

 private JSONObject ledger() throws Exception {
  JSONObject ledger = read(LEDGER);
  if (ledger.length() > MAX_LEDGER) throw new IllegalStateException("Digest notice journal exceeds its limit");
  for (String key : keys(ledger)) {
   JSONObject record = ledger.getJSONObject(key);
   if (!KEY.matcher(key).matches() || !key.equals(record.optString("key"))) {
    throw new IllegalStateException("Invalid digest notice receipt");
   }
  }
  return ledger;
 }

 private JSONObject read(String slot) throws Exception {
  String value = store.readNotice(slot);
  return value == null ? new JSONObject() : new JSONObject(value);
 }

 private void write(String slot, JSONObject value) throws Exception {
  store.writeNotice(slot, value.toString());
 }

 private static List<String> keys(JSONObject object) {
  List<String> keys = new ArrayList<>();
  object.keys().forEachRemaining(keys::add);
  return keys;
 }

 private static boolean expired(JSONObject record) {
  long now = System.currentTimeMillis();
  long created = record.optLong("createdAt", -1);
  return created < 0 || created > now || now - created >= LIFETIME_MS;
 }

 private static String id(String value) {
  if (!ID.matcher(value).matches()) throw new IllegalArgumentException("Invalid digest notice identity");
  return value;
 }

 private static String hash(String value) throws Exception {
  byte[] bytes = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
  StringBuilder digest = new StringBuilder(64);
  for (byte b : bytes) digest.append(Character.forDigit((b >> 4) & 15, 16)).append(Character.forDigit(b & 15, 16));
  return digest.toString();
 }

 private boolean active(JSONObject record) throws Exception {
  NotificationManager manager = context.getSystemService(NotificationManager.class);
  if (manager == null || record.optInt("opaqueVersion") != 2) return false;
  String expected = hash(record.getString("dispatchId"));
  String key = record.getString("key");
  for (StatusBarNotification item : manager.getActiveNotifications()) {
   Bundle extras = item.getNotification().extras;
   if (item.getId() == 0 && key.equals(item.getTag()) && extras != null && expected.equals(extras.getString(PROOF))) return true;
  }
  return false;
 }

 boolean allowed() {
  NotificationManager manager = context.getSystemService(NotificationManager.class);
  if (manager == null) return false;
  NotificationChannel channel = manager.getNotificationChannel(CHANNEL);
  if (channel == null) {
   String group = AlphaNotificationChannels.MAIL_AND_BRIEFS;
   manager.createNotificationChannelGroup(new NotificationChannelGroup(group, context.getString(R.string.alpha_channel_group_mail_briefs)));
   channel = new NotificationChannel(CHANNEL, context.getString(R.string.alpha_brief_channel_name), NotificationManager.IMPORTANCE_DEFAULT);
   channel.setDescription(context.getString(R.string.alpha_brief_channel_description));
   channel.setGroup(group);
   channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
   manager.createNotificationChannel(channel);
   channel = manager.getNotificationChannel(CHANNEL);
  }
  if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
  if (!manager.areNotificationsEnabled() || channel == null || channel.getImportance() == NotificationManager.IMPORTANCE_NONE) return false;
  NotificationChannelGroup group = channel.getGroup() == null ? null : manager.getNotificationChannelGroup(channel.getGroup());
  return group == null || !group.isBlocked();
 }

 private void post(JSONObject record, String status) throws Exception {
  NotificationManager manager = context.getSystemService(NotificationManager.class);
  if (manager == null) throw new IllegalStateException("Digest notifications unavailable");
  String dispatch = record.getString("dispatchId");
  PendingIntent tap = PendingIntent.getActivity(context, 0, open(ACTION, dispatch),
    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
  Notification redacted = base(R.string.alpha_notice_public_title).build();
  Bundle extras = new Bundle();
  extras.putString(PROOF, hash(dispatch));
  Notification.Builder notice = base(title(status)).setVisibility(Notification.VISIBILITY_PRIVATE).setPublicVersion(redacted)
    .setContentIntent(tap).setOnlyAlertOnce(true).setAutoCancel(true).setTimeoutAfter(LIFETIME_MS)
    .setCategory(Notification.CATEGORY_STATUS).addExtras(extras);
  String askDispatch = record.optString("askDispatchId");
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && questionSupported(context) && TOKEN.matcher(askDispatch).matches()) {
   PendingIntent question = PendingIntent.getActivity(context, 0, questionIntent(askDispatch),
     PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
   notice.addAction(new Notification.Action.Builder(null, context.getString(R.string.alpha_digest_notice_ask), question)
     .setAuthenticationRequired(true).build());
  }
  manager.notify(record.getString("key"), 0, notice.build());
 }

 private Notification.Builder base(int title) {
  return new Notification.Builder(context, CHANNEL).setSmallIcon(R.drawable.notification_icon)
    .setContentTitle(context.getString(title)).setContentText(context.getString(R.string.alpha_notice_tap_to_open));
 }

 private static int title(String status) {
  return switch (status) {
   case "finished" -> R.string.alpha_digest_notice_finished;
   case "failed" -> R.string.alpha_digest_notice_failed;
   case "missed" -> R.string.alpha_digest_notice_missed;
   case "overlap", "skipped" -> R.string.alpha_digest_notice_skipped;
   case "unavailable" -> R.string.alpha_digest_notice_unavailable;
   case "cancelled" -> R.string.alpha_digest_notice_cancelled;
   default -> R.string.alpha_digest_notice_update;
  };
 }

 private Intent open(String action, String opaque) {
  return new Intent(context, MainActivity.class).setAction(action).setData(Uri.parse(PREFIX + opaque))
    .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
 }

 private Intent questionIntent(String dispatch) {
  return new Intent(context, HostedDigestQuestionActivity.class).setAction(ASK_ACTION)
    .setData(Uri.parse(ASK_PREFIX + dispatch));
 }

 private void cancel(JSONObject record) {
  String key = record.optString("key");
  if (!KEY.matcher(key).matches()) return;
  NotificationManager manager = context.getSystemService(NotificationManager.class);
  if (manager != null) manager.cancel(key, 0);
  if (record.optInt("opaqueVersion") == 2) {
   String token = record.optString("dispatchId");
   if (TOKEN.matcher(token).matches()) cancelIntent(ACTION, token);
   String ask = record.optString("askDispatchId");
   if (TOKEN.matcher(ask).matches()) {
    PendingIntent pending = PendingIntent.getActivity(context, 0, questionIntent(ask),
      PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_NO_CREATE);
    if (pending != null) pending.cancel();
   }
  } else {
   cancelIntent(ACTION, key);
   cancelIntent(ASK_ACTION, key);
  }
 }

 private void cancelIntent(String action, String data) {
  PendingIntent tap = PendingIntent.getActivity(context, 0, open(action, data),
    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_NO_CREATE);
  if (tap != null) tap.cancel();
 }
}
