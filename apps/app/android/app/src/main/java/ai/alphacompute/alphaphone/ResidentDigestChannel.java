// spec/agent/index.md, "Android's digest inbox verifies the launch before admitting results"
package ai.alphacompute.alphaphone;

import ai.eliza.os.agent.AgentChannel;
import ai.eliza.os.agent.AgentService;
import ai.eliza.os.agent.ChannelPolicy;
import ai.eliza.plugins.signin.CredentialPolicy.Account;
import ai.eliza.plugins.signin.CredentialPolicy.Custody;
import ai.eliza.plugins.signin.CredentialReader;
import ai.eliza.plugins.signin.DeviceCredentialStore;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/** Native-only effect adapter. The process-owned inbox must hold its owner-generation fence. */
final class ResidentDigestChannel {
 static final String ORIGIN = "https://device.alpha.invalid";
 private static final String RESULTS = "/api/workflow/hosted/results";
 private static final Pattern ID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9_-]{0,127}");
 private static final int SMALL_REPLY = 65_536;
 private static final int RESULTS_REPLY = 1_048_576;

 /** A custody or lifecycle observer increments generation and retires stale manual/worker jobs. */
 interface OwnerGeneration {
  long current();
 }

 record Scope(String ownerId, String agentId, String digest) {}

 private record Lease(long epoch, long generation, Account account) {}

 final class Session {
  private final Lease lease;
  private final Scope scope;

  private Session(Lease lease, Scope scope) {
   this.lease = lease;
   this.scope = scope;
  }

  Scope scope() { return scope; }

  long epoch() { return lease.epoch(); }

  String organizationId() { return lease.account().organizationId(); }

  void check() throws IOException {
   synchronized (policy) { checkLease(lease); }
  }

  JSONObject fetch(String clientId) throws Exception {
   return request(lease, "GET", RESULTS + "?clientId=" + id(clientId), null, RESULTS_REPLY);
  }

  /** Called only by the inbox after its result rows and exact receipt are durable. */
  JSONObject acknowledge(String clientId, long cursor, String runId) throws Exception {
   if (cursor <= 0 || cursor > 9_007_199_254_740_991L) throw new IllegalArgumentException("Invalid digest cursor");
   byte[] body = new JSONObject().put("clientId", id(clientId)).put("cursor", cursor)
    .put("runId", id(runId)).toString().getBytes(StandardCharsets.UTF_8);
   JSONObject result = request(lease, "POST", RESULTS + "/ack", body, SMALL_REPLY);
   if (result.optLong("acknowledged", -1) != cursor) throw new IOException("Digest acknowledgement changed");
   return result;
  }
 }

 private final CredentialReader credentials;
 private final OwnerGeneration ownerGeneration;
 private final ChannelPolicy policy = AgentService.channel().policy();

 ResidentDigestChannel(CredentialReader credentials, OwnerGeneration ownerGeneration) {
  this.credentials = credentials;
  this.ownerGeneration = ownerGeneration;
 }

 Session open() throws Exception {
  Session session = openAccount();
  JSONObject status = request(session.lease, "GET", "/api/workflow/status", null, SMALL_REPLY);
  if (status.optInt("hostedDigestProtocol") != 1) throw new IOException("Hosted digests unavailable");
  return session;
 }

 /** Native account attestation is available independently of Workflows. */
 Session openAccount() throws Exception {
  Lease lease;
  synchronized (policy) {
   lease = new Lease(policy.servingEpoch(), ownerGeneration.current(), activeAccount());
   checkLease(lease);
  }
  JSONObject runtime = request(lease, "GET", "/api/alpha-runtime/scope", null, SMALL_REPLY);
  if (runtime.getLong("epoch") != lease.epoch()
    || !lease.account().userId().equals(runtime.getString("userId"))
    || !lease.account().organizationId().equals(runtime.getString("organizationId"))) {
   throw new SecurityException("Resident launch account changed");
  }

  String ownerId = id(runtime.getString("userId"));
  String agentId = id(runtime.getString("agentId"));
  String digest = scopeDigest(ownerId, agentId);
  return new Session(lease, new Scope(ownerId, agentId, digest));
 }

 private JSONObject request(Lease lease, String method, String path, byte[] body, int limit) throws Exception {
  CompletableFuture<AgentChannel.Response> pending;
  // AgentChannel uses the same monitor for admission and runtime socket capture.
  synchronized (policy) {
   checkLease(lease);
   pending = AgentService.request(method, path, body);
  }
  AgentChannel.Response response;
  try {
   response = pending.get(10, TimeUnit.SECONDS);
  } catch (InterruptedException interrupted) {
   Thread.currentThread().interrupt();
   throw interrupted;
  }
  synchronized (policy) { checkLease(lease); }
  if (response.status() == 401 || response.status() == 403) {
   throw new SecurityException("Resident owner unavailable");
  }
  if (response.status() < 200 || response.status() >= 300 || response.body() == null
    || response.body().length > limit) {
   throw new IOException("Resident digest request failed");
  }
  return new JSONObject(new String(response.body(), StandardCharsets.UTF_8));
 }

 private void checkLease(Lease lease) throws IOException {
  if (lease.epoch() == 0 || policy.servingEpoch() != lease.epoch()
    || ownerGeneration.current() != lease.generation()) {
   throw new IOException("Resident digest lease changed");
  }
  if (lease.account() == null || !lease.account().complete()
    || !Objects.equals(lease.account(), activeAccount())) {
   throw new SecurityException("Resident owner changed");
  }
 }

 // DeviceCustody.reader returns this public pin-specific implementation. Its state is metadata-only.
 private Account activeAccount() {
  if (!(credentials instanceof DeviceCredentialStore store)) return null;
  var state = store.state();
  if (!(state.custody() instanceof Custody.Active active) || active.keyExpiresAt() <= state.now()) return null;
  return active.account();
 }

 private static String id(String value) {
  if (!ID.matcher(value).matches()) {
   throw new IllegalArgumentException("Invalid digest identifier");
  }
  return value;
 }

 static String scopeDigest(String ownerId, String agentId) throws Exception {
  byte[] identity = new JSONArray().put(ORIGIN).put(ownerId).put(agentId).toString()
   .getBytes(StandardCharsets.UTF_8);
  StringBuilder hex = new StringBuilder(64);
  for (byte value : MessageDigest.getInstance("SHA-256").digest(identity)) {
   hex.append(Character.forDigit((value >> 4) & 15, 16)).append(Character.forDigit(value & 15, 16));
  }
  return hex.toString();
 }
}
