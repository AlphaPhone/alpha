package ai.alphacompute.alphaphone;

import ai.eliza.auth.cloud.CloudEmailCode;
import ai.eliza.auth.cloud.CloudSignInEnvironment;
import ai.eliza.plugins.agent.connection.ConnectionTransport;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

/**
 * Billing authority for in-app plan changes and cancellation (apps/app/src/runtime/cloud-plans.ts).
 *
 * Cloud accepts those operations only with a fresh account session, never with the phone's own
 * sign-in key. Like upstream's native host ("billing authority", packages/auth/README.md), this
 * repeats a one-time email code for the signed-in account and keeps the resulting Steward session
 * in memory only: it is never written to storage, never returned to the renderer and never logged.
 * It is bound to the account in the phone's stored Cloud credential (not to anything the renderer
 * names) and ends after its JWT expiry (at most one hour), on {@link #clear}, when the app process
 * ends, or as soon as that credential changes: sign-out, a new key or another account.
 *
 * Alpha Cloud cutover only: MainActivity registers this plugin only when
 * CloudDeployment.ALPHA_CLOUD_CUTOVER is on, and every call refuses otherwise.
 *
 * Every request goes to this build's production Cloud API (CloudDeployment) on one of the fixed
 * routes in {@link BillingAuthorityRoutes}.
 */
@CapacitorPlugin(name = "AlphaBillingAuthority")
public final class AlphaBillingAuthorityPlugin extends Plugin {
 private static final int RESPONSE_LIMIT = 256 * 1024;
 private final ExecutorService worker = Executors.newSingleThreadExecutor();
 private final BillingAuthorityRoutes.Session session = new BillingAuthorityRoutes.Session();

 private static CloudSignInEnvironment environment() { return AlphaCloudSignInPlugin.REGISTRATION.environment("production"); }

 /** The phone's stored Cloud key now, read from native storage on every call. */
 private String savedCredential() throws Exception { return new AlphaCredentialStore(getContext()).readCredentialSlot("cloud:production"); }
 private BillingAuthorityRoutes.Account signedIn() throws Exception { return BillingAuthorityRoutes.Account.of(savedCredential()); }
 /** The stored key with Cloud's own answer for who it belongs to (the slot carries no identity). */
 private BillingAuthorityRoutes.Account signedInWithIdentity() throws Exception {
  String saved = savedCredential();
  BillingAuthorityRoutes.Account account = BillingAuthorityRoutes.Account.of(saved);
  if (account == null) return null;
  return account.withIdentity(AlphaConnectionPlugin.readCloudIdentity(BillingAuthorityRoutes.Account.token(saved)));
 }

 private JSObject status(BillingAuthorityRoutes.Account account) {
  if (session.current(account, System.currentTimeMillis()) != null) return new JSObject().put("status", "authorized").put("expiresAt", session.expiresAt());
  return new JSObject().put("status", "required");
 }

 private void run(PluginCall call, Task task) {
  if (!CloudDeployment.ALPHA_CLOUD_CUTOVER) { call.reject("Not available", "unavailable"); return; }
  try {
   worker.submit(() -> {
    try { task.run(); }
    catch (IllegalArgumentException invalid) { call.reject("Not accepted", "invalid"); }
    catch (SecurityException refused) { call.reject(refused.getMessage(), "refused"); }
    catch (Exception unavailable) { call.reject("Cloud unavailable", "unavailable"); }
   });
  } catch (Exception closed) { call.reject("Billing closed", "unavailable"); }
 }
 private interface Task { void run() throws Exception; }

 @PluginMethod public void status(PluginCall call) { run(call, () -> call.resolve(status(signedIn()))); }

 @PluginMethod public void clear(PluginCall call) {
  session.clear();
  call.resolve();
 }

 /** Sends a one-time code to the signed-in account's email address. */
 @PluginMethod public void start(PluginCall call) {
  String email = call.getString("email");
  if (email == null || email.length() > 254 || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) { call.reject("Not accepted", "invalid"); return; }
  run(call, () -> {
   BillingAuthorityRoutes.Account account = signedInWithIdentity();
   if (account == null) throw new SecurityException("Sign in first");
   byte[] random = new byte[48];
   new SecureRandom().nextBytes(random);
   String verifier = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
   Answer sent = post(CloudEmailCode.SEND_PATH, CloudEmailCode.sendBody(AlphaCloudSignInPlugin.REGISTRATION, environment(), email, verifier), null);
   if (sent.status == 429) throw new SecurityException("Try again later");
   if (sent.status < 200 || sent.status >= 300) throw new SecurityException("Code not sent");
   long expiresAt = CloudEmailCode.expiresAt(sent.body.opt("expiresAt"), System.currentTimeMillis());
   session.pending(account, email, verifier, expiresAt);
   call.resolve(new JSObject().put("expiresAt", expiresAt));
  });
 }

 /**
  * Redeems the code, then requires the session's account to be the one in the phone's stored Cloud
  * credential. A user id the renderer passes must name that same account; it is never trusted alone.
  */
 @PluginMethod public void verify(PluginCall call) {
  String code = call.getString("code"), claimedUserId = call.getString("userId");
  if (code == null || !code.matches("[0-9A-Za-z]{4,12}")) { call.reject("Not accepted", "invalid"); return; }
  run(call, () -> {
   BillingAuthorityRoutes.Account key = signedIn();
   if (key == null) { session.clear(); throw new SecurityException("Sign in first"); }
   // The account the code was sent for, established from Cloud's answer to the stored key at start.
   BillingAuthorityRoutes.Account account = session.pendingAccount(key);
   if (account == null) throw new SecurityException("Code expired");
   if (claimedUserId != null && !claimedUserId.equals(account.userId)) { session.clear(); throw new SecurityException("A different account"); }
   String[] pending = session.pendingFor(key, System.currentTimeMillis());
   if (pending == null) throw new SecurityException("Code expired");
   Answer verified = post(CloudEmailCode.VERIFY_PATH, CloudEmailCode.verifyBody(AlphaCloudSignInPlugin.REGISTRATION, environment(), pending[0], code, pending[1]), null);
   if (verified.status == 400 || verified.status == 401) throw new SecurityException("Wrong code");
   if (verified.status < 200 || verified.status >= 300) throw new SecurityException("Code not accepted");
   Object token = verified.body.opt("token");
   if (!(token instanceof String) && verified.body.optJSONObject("data") != null) token = verified.body.getJSONObject("data").opt("token");
   if (!(token instanceof String)) throw new SecurityException("Code not accepted");
   long expiresAt = BillingAuthorityRoutes.sessionExpiry((String) token, System.currentTimeMillis());
   Answer user = request("GET", "/api/v1/user", null, (String) token);
   JSONObject data = user.body.optJSONObject("data");
   if (user.status != 200 || !BillingAuthorityRoutes.sameAccount(data, account.userId, account.organizationId)) {
    session.clear();
    throw new SecurityException("A different account");
   }
   // The phone may have signed out or switched accounts while the code was checked.
   if (!session.bind(signedIn(), account, (String) token, expiresAt)) throw new SecurityException("A different account");
   call.resolve(status(account));
  });
 }

 /** One billing operation with the in-memory session; answers Cloud's status and JSON body. */
 @PluginMethod public void perform(PluginCall call) {
  final BillingAuthorityRoutes.Route route;
  try { route = BillingAuthorityRoutes.route(new JSONObject(call.getData().toString())); }
  catch (Exception invalid) { call.reject("Not accepted", "invalid"); return; }
  run(call, () -> {
   String token = session.current(signedIn(), System.currentTimeMillis());
   if (token == null) throw new SecurityException("Confirm it's you");
   Answer answer = request(route.method, route.path, route.body, token);
   // A refused session is spent: the owner confirms again rather than retrying with it.
   if (answer.status == 401) session.spent(token);
   call.resolve(new JSObject().put("status", answer.status).put("body", answer.body));
  });
 }

 private static final class Answer { final int status; final JSONObject body; Answer(int status, JSONObject body) { this.status = status; this.body = body; } }
 private Answer post(String path, JSONObject body, String bearer) throws Exception { return request("POST", path, body, bearer); }
 private Answer request(String method, String path, JSONObject body, String bearer) throws Exception {
  URI uri = URI.create(environment().api() + path);
  if (!"https".equals(uri.getScheme()) || !CloudDeployment.PRODUCTION_API_HOST.equals(uri.getHost())) throw new IllegalArgumentException();
  HttpURLConnection connection = (HttpURLConnection) uri.toURL().openConnection();
  try {
   connection.setInstanceFollowRedirects(false); connection.setUseCaches(false);
   connection.setConnectTimeout(20000); connection.setReadTimeout(60000);
   connection.setRequestMethod(method);
   connection.setRequestProperty("Accept", "application/json");
   if (bearer != null) connection.setRequestProperty("Authorization", "Bearer " + bearer);
   if (body != null || "POST".equals(method)) {
    byte[] bytes = (body == null ? "{}" : body.toString()).getBytes(StandardCharsets.UTF_8);
    connection.setDoOutput(true);
    connection.setRequestProperty("Content-Type", "application/json");
    connection.setFixedLengthStreamingMode(bytes.length);
    try (OutputStream output = connection.getOutputStream()) { output.write(bytes); }
   }
   int status = connection.getResponseCode();
   InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
   JSONObject parsed = new JSONObject();
   if (stream != null) try (InputStream input = stream) {
    byte[] bytes = ConnectionTransport.readBounded(input, RESPONSE_LIMIT);
    try { parsed = new JSONObject(new String(bytes, StandardCharsets.UTF_8)); } catch (Exception notJson) { parsed = new JSONObject(); }
   }
   return new Answer(status, parsed);
  } finally { connection.disconnect(); }
 }

 @Override protected void handleOnDestroy() {
  session.clear();
  worker.shutdownNow();
  super.handleOnDestroy();
 }
}
