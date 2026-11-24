// spec/os/agentService/config.md, "Story: Start my agent with my character, policy and model"; spec/os/agentService/lifecycle.md, "Story: Start the agent when I sign in and stop it when I sign out"; spec/os/agentService/channel.md, "Story: Ask the agent only on the routes my app allows"
package ai.alphacompute.alphaphone;

import ai.alphacompute.alphaphone.runtime.CredentialShutdownLease;
import ai.alphacompute.alphaphone.runtime.RuntimeUpdatePause;
import ai.eliza.os.agent.AgentChannel;
import ai.eliza.os.agent.AgentService;
import ai.eliza.os.agent.ChannelPolicy;
import android.content.Context;
import android.util.Base64;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Consumer;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Alpha's resident agent service: the upstream os AgentService, launched with Alpha's environment and reached by Alpha's native callers through the native channel. */
public final class ElizaAgentService extends AgentService {
 /** How long a requested launch counts as booting before the start reports it failed. */
 static final long AGENT_BOOT_GRACE_MS = 120_000L;
 private static final int DEFAULT_TIMEOUT_MS = 10_000, INFERENCE_TIMEOUT_MS = 600_000, MAX_TIMEOUT_MS = 600_000;
 private static final int MAX_BODY_BYTES = 10 * 1024 * 1024;
 private static final long OWNER_SESSION_MS = 24L * 60 * 60 * 1000;
 private static final String RUNTIME_MODE_KEY = "eliza:mobile-runtime-mode";
 private static final CredentialShutdownLease credentialShutdown = new CredentialShutdownLease();
 private static final Map<String, String> reviews = new ConcurrentHashMap<>();
 private static final Object STATE = new Object();
 private static volatile Context application;
 private static volatile ElizaAgentService alive;
 private static volatile long launchRequestedAt;
 private static long awaitedShutdown = -1;

 /** A handle that closes one native stream or event subscription; committed agent effects are not rolled back. */
 public static final class LocalStreamHandle {
  private AgentChannel.Call call;
  private boolean closed;
  /** Closes the stream; a later attach closes its call at once. */
  public void cancel() {
   AgentChannel.Call held;
   synchronized (this) { closed = true; held = call; call = null; }
   if (held != null) held.close();
  }
  synchronized boolean closed() { return closed; }
  void attach(AgentChannel.Call opened) {
   boolean close;
   synchronized (this) { close = closed; if (!close) call = opened; }
   if (close) opened.close();
  }
 }

 /** One recovery operation the host runs under its own admission. */
 @FunctionalInterface public interface RecoveryOperation { JSONObject run() throws JSONException; }
 /** The host's admission around a recovery operation. */
 @FunctionalInterface public interface RecoveryAuthority { JSONObject run(RecoveryOperation operation) throws JSONException; }

 /** Binds the process's application context and Alpha's device credential before any service or plugin starts. */
 static void install(Context context) {
  application = context.getApplicationContext();
  AgentService.useCredentials(new AlphaAgentCredentials(application));
  AgentService.observe(ElizaAgentService::acknowledgeShutdown);
  // Resident notifications resume when the agent is ready, also after a reboot or restart with Alpha closed
  // (the legacy generated service's ready hook).
  AgentService.onReady(() -> AlphaCanonicalNotifications.resumeExisting(application));
 }

 @Override public void onCreate() {
  synchronized (STATE) { alive = this; }
  super.onCreate();
 }

 @Override public void onDestroy() {
  synchronized (STATE) { if (alive == this) alive = null; }
  super.onDestroy();
  acknowledgeShutdown();
 }

 @Override protected void configureLaunch(Map<String, String> variables) throws LaunchRefused {
  synchronized (STATE) { if (awaitedShutdown >= 0) throw new LaunchRefused("A credential change is in progress"); }
  try { RuntimeUpdatePause.beforeStart(); }
  catch (IllegalStateException pending) { throw new LaunchRefused("An app update is pending"); }
  moveLegacyStateAside();
  try {
   java.io.File host = new java.io.File(getFilesDir(), "alpha-agent-host");
   if (!host.isDirectory() && !host.mkdirs()) throw new IOException("The agent host directory is unavailable");
   variables.put("AGENT_ROOT", host.getCanonicalPath());
   AlphaLocalAgentPlugin.configureLaunch(this, variables);
  } catch (IOException | RuntimeException refused) {
   throw new LaunchRefused(refused.getMessage() == null ? "The launch environment is unavailable" : refused.getMessage());
  }
 }

 /**
  * Moves the earlier agent's store and runtime aside before the launch claims its state directory
  * (spec/platform/storage.md, "Story: Keep what the earlier on-device agent stored"). The new agent
  * reads neither, so the launch never waits on or is refused by the move; what stays is tried again
  * at the next launch.
  */
 private void moveLegacyStateAside() {
  try {
   for (LegacyAgentState.Outcome outcome : LegacyAgentState.moveAside(getFilesDir().toPath()))
    if (outcome.move != LegacyAgentState.Move.NOTHING_TO_MOVE) android.util.Log.i("AlphaLegacyAgent", outcome.toString());
  } catch (RuntimeException unexpected) {
   android.util.Log.w("AlphaLegacyAgent", "legacy state left in place: " + unexpected.getClass().getSimpleName());
  }
 }

 /** Starts the resident unless an app update or a credential change holds it. @throws IllegalStateException while either holds. */
 public static void start(Context context) {
  RuntimeUpdatePause.beforeStart();
  credentialShutdown.beforeStart();
  launchRequestedAt = System.currentTimeMillis();
  AgentService.start(context);
 }

 /** Tells a running resident that Alpha's device credential changed, so it takes the new key or restarts for another account. */
 static void credentialChanged() {
  Context context = application;
  if (context != null && alive != null) AgentService.credentialChanged(context);
 }

 /** Whether a system broadcast may start the resident: the owner chose an on-device or hybrid agent. */
 public static boolean shouldAutoStart(Context context) {
  String mode = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE).getString(RUNTIME_MODE_KEY, null);
  return "cloud-hybrid".equals(mode) || "local".equals(mode);
 }

 /** Reserves a credential shutdown; starts are refused until it is released or its abandonment is acknowledged. */
 public static long reserveCredentialShutdown() {
  long request = credentialShutdown.acquire();
  synchronized (STATE) { awaitedShutdown = request; }
  return request;
 }

 /** Stops the resident for the exact reserved request. @throws IllegalStateException when a newer request owns the shutdown. */
 public static long retryCredentialShutdown(Context context, long request) {
  credentialShutdown.retry(request);
  if (!credentialShutdown.isConfirmed(request)) AgentService.stop(context);
  acknowledgeShutdown();
  return request;
 }

 /** Whether the resident was proven stopped for this request. */
 public static boolean isCredentialShutdownConfirmed(long request) {
  acknowledgeShutdown();
  return credentialShutdown.isConfirmed(request);
 }

 /** Releases a confirmed request after its committed credential change. */
 public static boolean releaseCredentialShutdown(long request) {
  boolean released = credentialShutdown.release(request);
  if (released) clearAwaited(request);
  return released;
 }

 /** Gives up a request that wrote nothing; the fence holds until the stop is acknowledged. */
 public static boolean abandonCredentialShutdown(long request) {
  boolean abandoned = credentialShutdown.abandon(request);
  acknowledgeShutdown();
  return abandoned;
 }

 private static void clearAwaited(long request) { synchronized (STATE) { if (awaitedShutdown == request) awaitedShutdown = -1; } }

 private static void acknowledgeShutdown() {
  long request;
  synchronized (STATE) { request = awaitedShutdown; }
  if (request < 0 || !stoppedNow()) return;
  credentialShutdown.acknowledge(request, true);
  if (credentialShutdown.isReleased(request)) clearAwaited(request);
 }

 private static boolean stoppedNow() {
  Context context = application;
  if (context == null || alive != null) return false;
  String state = AgentService.status(context).optString("state");
  return !"running".equals(state) && !"starting".equals(state);
 }

 /** The identity of the running launch, or null while nothing serves; it changes whenever the agent restarts. */
 public static String localAgentToken() {
  Context context = application;
  return context == null ? null : localAgentToken(context);
 }

 /** As {@link #localAgentToken()} for {@code context}. */
 public static String localAgentToken(Context context) {
  JSONObject status = AgentService.status(context);
  long epoch = status.optLong("epoch", 0);
  return "running".equals(status.optString("state")) && epoch > 0 ? "launch:" + epoch : null;
 }

 /** The resident's boot state in the shape Alpha's start, attach and shutdown checks read. */
 public static JSONObject getLocalAgentBootState(Context context) throws JSONException {
  JSONObject status = AgentService.status(context);
  String state = status.optString("state");
  boolean serviceActive = alive != null;
  long requested = launchRequestedAt;
  long ageMs = requested > 0 ? Math.max(0L, System.currentTimeMillis() - requested) : -1L;
  JSONObject result = new JSONObject();
  if ("running".equals(state)) {
   result.put("state", "listening").put("reason", "request socket is accepting connections");
  } else if ("starting".equals(state)) {
   result.put("state", "booting").put("reason", "starting");
  } else if ("failed".equals(state)) {
   String failure = status.optString("failure", "runtime");
   result.put("state", "dead").put("reason", "storage".equals(failure) ? "ipc-recovery-required" : failure + "-failed");
   if (status.has("error")) result.put("error", status.optString("error"));
  } else if (serviceActive && ageMs >= 0 && ageMs < AGENT_BOOT_GRACE_MS && !"unavailable".equals(state)) {
   result.put("state", "booting").put("reason", state);
  } else {
   result.put("state", "dead").put("reason", "unavailable".equals(state) ? "missing-agent-service" : "local agent service is not booting and the request socket is closed");
  }
  if (ageMs >= 0) result.put("ageMs", ageMs);
  result.put("epoch", status.optLong("epoch", 0));
  result.put("socketListening", "running".equals(state));
  result.put("serviceActive", serviceActive);
  return result;
 }

 /** One buffered request on the native channel: `{method, path, body?, timeoutMs?}` answered `{status, body}`; a `native:` bearer reads the owner session the channel already authenticates. */
 public static String requestLocalAgent(String requestJson) throws IOException, JSONException {
  JSONObject request = requestJson == null || requestJson.trim().isEmpty() ? new JSONObject() : new JSONObject(requestJson);
  String path = path(request), method = method(request);
  int timeout = timeout(request, path);
  String body = body(request, method);
  JSONObject answered = exchange(method, path, body, timeout);
  if (answered.getInt("status") == 200 && "GET".equals(method) && "/api/auth/status".equals(path)) return authStatus(answered);
  if (answered.getInt("status") == 200 && "GET".equals(method) && "/api/auth/me".equals(path)) return ownerSession(answered, bearer(request));
  return answered.toString();
 }

 private static String authStatus(JSONObject answered) throws JSONException {
  JSONObject status = new JSONObject(answered.getString("body"));
  if (!status.has("instanceId")) status.put("instanceId", status.optString("serverInstanceId", ""));
  return answer(200, status);
 }

 private static String ownerSession(JSONObject answered, String bearer) throws JSONException {
  JSONObject who = new JSONObject(answered.getString("body"));
  if (bearer != null && bearer.startsWith("native:")) who.put("session", new JSONObject().put("id", bearer).put("expiresAt", System.currentTimeMillis() + OWNER_SESSION_MS));
  return answer(200, who);
 }

 private static String answer(int status, JSONObject body) throws JSONException {
  return new JSONObject().put("status", status).put("body", body.toString()).toString();
 }

 private static JSONObject exchange(String method, String path, String body, int timeoutMs) throws IOException, JSONException {
  try {
   AgentChannel.Response response = AgentService.request(method, path, bytes(body)).get(timeoutMs, TimeUnit.MILLISECONDS);
   return new JSONObject().put("status", response.status()).put("body", response.body() == null ? "" : new String(response.body(), StandardCharsets.UTF_8));
  } catch (TimeoutException late) {
   throw new IOException("Local agent request timed out");
  } catch (InterruptedException interrupted) {
   Thread.currentThread().interrupt();
   throw new IOException("Local agent request interrupted");
  } catch (ExecutionException failed) {
   throw new IOException(failed.getCause() == null ? "Local agent unavailable" : failed.getCause().getMessage());
  }
 }

 /** One streamed request on the native channel, posting `response`, `chunk` and a final `complete` envelope to {@code onEvent}. */
 public static void requestLocalAgentStream(String requestJson, Consumer<String> onEvent, LocalStreamHandle handle) {
  try {
   JSONObject request = requestJson == null || requestJson.trim().isEmpty() ? new JSONObject() : new JSONObject(requestJson);
   String path = path(request), method = method(request);
   String body = body(request, method);
   if (handle.closed()) throw new IOException("Stream transport closed");
   handle.attach(AgentService.requestStream(method, path, bytes(body), new AgentChannel.Listener() {
    @Override public void head(String id, long index, int status, Map<String, String> headers) {
     try {
      JSONObject named = new JSONObject();
      if (headers != null) for (Map.Entry<String, String> header : headers.entrySet()) named.put(header.getKey(), header.getValue());
      onEvent.accept(new JSONObject().put("type", "response").put("status", status).put("statusText", "").put("headers", named).toString());
     } catch (JSONException impossible) { complete(onEvent, "Local agent stream failed"); }
    }
    @Override public void chunk(String id, long index, byte[] data) {
     try { onEvent.accept(new JSONObject().put("type", "chunk").put("dataBase64", Base64.encodeToString(data, Base64.NO_WRAP)).toString()); }
     catch (JSONException impossible) { complete(onEvent, "Local agent stream failed"); }
    }
    @Override public void event(String id, long index, JSONObject event) { }
    @Override public void settled(String id, ChannelPolicy.Outcome outcome, byte[] content) {
     ChannelPolicy.OutcomeKind kind = outcome.kind();
     complete(onEvent, kind == ChannelPolicy.OutcomeKind.END || kind == ChannelPolicy.OutcomeKind.RESPONSE ? null
       : kind == ChannelPolicy.OutcomeKind.FAILED ? "Local agent refused the stream: " + outcome.code().name().toLowerCase(Locale.ROOT) : "Local agent stream ended early");
    }
   }));
  } catch (Exception error) {
   complete(onEvent, error.getMessage() == null ? "Local agent stream failed" : error.getMessage());
  }
 }

 /** As {@link #requestLocalAgentStream(String, Consumer, LocalStreamHandle)} with its own handle. */
 public static void requestLocalAgentStream(String requestJson, Consumer<String> onEvent) {
  requestLocalAgentStream(requestJson, onEvent, new LocalStreamHandle());
 }

 private static void complete(Consumer<String> onEvent, String error) {
  try {
   JSONObject done = new JSONObject().put("type", "complete");
   if (error != null) done.put("error", error);
   onEvent.accept(done.toString());
  } catch (JSONException impossible) { onEvent.accept("{\"type\":\"complete\",\"error\":\"Local agent stream failed\"}"); }
 }

 /** One event subscription `{streams: [name]}` on the native channel, posting `subscribed`, `event` and a final `end` envelope to {@code onEvent}. */
 public static void subscribeLocalAgentEvents(String requestJson, Consumer<String> onEvent, LocalStreamHandle handle) {
  try {
   JSONObject request = requestJson == null || requestJson.trim().isEmpty() ? new JSONObject() : new JSONObject(requestJson);
   JSONArray streams = request.optJSONArray("streams");
   if (streams == null || streams.length() != 1) throw new IllegalArgumentException("Event subscription requires one stream name");
   ChannelPolicy.Topic topic = topic(streams.getString(0));
   if (handle.closed()) throw new IOException("Event transport closed");
   final boolean[] refused = {false};
   handle.attach(AgentService.subscribe(topic, new AgentChannel.Listener() {
    @Override public void head(String id, long index, int status, Map<String, String> headers) { }
    @Override public void chunk(String id, long index, byte[] data) { }
    @Override public void event(String id, long index, JSONObject event) {
     try { onEvent.accept(new JSONObject().put("type", "event").put("event", event).toString()); }
     catch (JSONException impossible) { end(onEvent, "Local agent event feed failed"); }
    }
    @Override public void settled(String id, ChannelPolicy.Outcome outcome, byte[] content) {
     if (outcome.kind() == ChannelPolicy.OutcomeKind.FAILED) refused[0] = true;
     end(onEvent, handle.closed() ? null : outcome.kind() == ChannelPolicy.OutcomeKind.FAILED ? "Local agent refused event feed" : "Local agent event feed ended");
    }
   }));
   if (!refused[0]) onEvent.accept(new JSONObject().put("type", "subscribed").put("streams", streams).toString());
  } catch (Exception error) {
   end(onEvent, handle.closed() ? null : error.getMessage() == null ? "Local agent event feed failed" : error.getMessage());
  }
 }

 private static ChannelPolicy.Topic topic(String stream) {
  switch (stream) {
   case "notification": case "notifications": return ChannelPolicy.Topic.NOTICES;
   case "voice": return ChannelPolicy.Topic.VOICE;
   case "view": case "view-interact": return ChannelPolicy.Topic.VIEW;
   default: throw new IllegalArgumentException("Invalid event stream name");
  }
 }

 private static void end(Consumer<String> onEvent, String error) {
  try {
   JSONObject done = new JSONObject().put("type", "end");
   if (error != null) done.put("error", error);
   onEvent.accept(done.toString());
  } catch (JSONException impossible) { onEvent.accept("{\"type\":\"end\"}"); }
 }

 /** Reviews the resident's retained recovery records under the host's admission; the one-use review token is a UUID. */
 public static JSONObject reviewIpcRecovery(RecoveryAuthority authority) throws JSONException {
  Context context = application;
  if (context == null || authority == null) return recovery("unavailable", 0, 0, "unsupported-state");
  return authority.run(() -> {
   AgentService.Review review = AgentService.reviewRecovery(context);
   if (review == null) return recovery("unavailable", 0, 0, "unsupported-state");
   String token = UUID.randomUUID().toString();
   reviews.clear();
   reviews.put(token, review.token());
   return recovery("reviewable", review.retainedCount(), 0, null).put("reviewToken", token);
  });
 }

 /** Archives the records the review with {@code reviewToken} showed, under the host's admission. */
 public static JSONObject archiveIpcRecovery(String reviewToken, RecoveryAuthority authority) throws JSONException {
  Context context = application;
  if (context == null || authority == null) return recovery("unavailable", 0, 0, "unsupported-state");
  return authority.run(() -> {
   String held = reviewToken == null ? null : reviews.remove(reviewToken);
   if (held == null) return recovery("unavailable", 0, 0, "records-changed");
   int archived = AgentService.archiveRecovery(context, held);
   return archived < 0 ? recovery("unavailable", 0, 0, "records-changed") : recovery("archived", 0, archived, null);
  });
 }

 private static JSONObject recovery(String status, int retained, int archived, String reason) throws JSONException {
  JSONObject result = new JSONObject().put("status", status).put("retainedCount", retained).put("archivedCount", archived);
  if (reason != null) result.put("reason", reason);
  return result;
 }

 private static String path(JSONObject request) {
  String path = request.optString("path", "").trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.contains("\\") || path.contains("\r") || path.contains("\n"))
   throw new IllegalArgumentException("Local agent request requires a path that starts with /");
  return path;
 }

 private static String method(JSONObject request) {
  String method = request.optString("method", "GET").trim().toUpperCase(Locale.ROOT);
  if (!method.matches("GET|POST|PUT|PATCH|DELETE")) throw new IllegalArgumentException("Unsupported HTTP method");
  return method;
 }

 private static int timeout(JSONObject request, String path) {
  int timeout = request.optInt("timeoutMs", DEFAULT_TIMEOUT_MS);
  String lower = path.toLowerCase(Locale.ROOT);
  if (lower.contains("/asr") || lower.contains("/tts") || lower.contains("/speech") || lower.contains("/local-inference") || lower.contains("/messages") || lower.contains("/voice"))
   timeout = Math.max(timeout, INFERENCE_TIMEOUT_MS);
  return Math.max(1_000, Math.min(timeout, MAX_TIMEOUT_MS));
 }

 private static String body(JSONObject request, String method) {
  Object raw = request.opt("body");
  if (raw == null || raw == JSONObject.NULL || "GET".equals(method) || "DELETE".equals(method)) return null;
  String body = raw.toString();
  if (body.getBytes(StandardCharsets.UTF_8).length > MAX_BODY_BYTES) throw new IllegalArgumentException("Request body is too large");
  return body;
 }

 private static String bearer(JSONObject request) {
  JSONObject headers = request.optJSONObject("headers");
  if (headers == null) return null;
  for (java.util.Iterator<String> keys = headers.keys(); keys.hasNext(); ) {
   String key = keys.next();
   if ("authorization".equalsIgnoreCase(key)) {
    String value = headers.optString(key, "");
    return value.startsWith("Bearer ") ? value.substring(7).trim() : null;
   }
  }
  return null;
 }

 private static byte[] bytes(String body) { return body == null ? null : body.getBytes(StandardCharsets.UTF_8); }
}
