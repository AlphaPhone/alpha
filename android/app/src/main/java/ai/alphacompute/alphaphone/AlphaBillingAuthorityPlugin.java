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
 * It ends after its JWT expiry (at most one hour), on {@link #clear}, when the app process ends, or
 * when a verified session names a different account than the phone's.
 *
 * Every request goes to this build's production Cloud API (CloudDeployment) on one of the fixed
 * routes in {@link BillingAuthorityRoutes}.
 */
@CapacitorPlugin(name = "AlphaBillingAuthority")
public final class AlphaBillingAuthorityPlugin extends Plugin {
 private static final int RESPONSE_LIMIT = 256 * 1024;
 private final ExecutorService worker = Executors.newSingleThreadExecutor();
 private final Object lock = new Object();
 private String pendingEmail, pendingVerifier;
 private long pendingExpiresAt;
 private String session;
 private long sessionExpiresAt;

 private static CloudSignInEnvironment environment() { return AlphaCloudSignInPlugin.REGISTRATION.environment("production"); }

 private JSObject status() {
  synchronized (lock) {
   if (session != null && System.currentTimeMillis() < sessionExpiresAt) return new JSObject().put("status", "authorized").put("expiresAt", sessionExpiresAt);
   session = null;
   return new JSObject().put("status", "required");
  }
 }

 private void run(PluginCall call, Task task) {
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

 @PluginMethod public void status(PluginCall call) { call.resolve(status()); }

 @PluginMethod public void clear(PluginCall call) {
  synchronized (lock) { session = null; pendingEmail = null; pendingVerifier = null; }
  call.resolve();
 }

 /** Sends a one-time code to the signed-in account's email address. */
 @PluginMethod public void start(PluginCall call) {
  String email = call.getString("email");
  if (email == null || email.length() > 254 || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) { call.reject("Not accepted", "invalid"); return; }
  run(call, () -> {
   byte[] random = new byte[48];
   new SecureRandom().nextBytes(random);
   String verifier = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
   Answer sent = post(CloudEmailCode.SEND_PATH, CloudEmailCode.sendBody(AlphaCloudSignInPlugin.REGISTRATION, environment(), email, verifier), null);
   if (sent.status == 429) throw new SecurityException("Try again later");
   if (sent.status < 200 || sent.status >= 300) throw new SecurityException("Code not sent");
   long expiresAt = CloudEmailCode.expiresAt(sent.body.opt("expiresAt"), System.currentTimeMillis());
   synchronized (lock) { pendingEmail = email; pendingVerifier = verifier; pendingExpiresAt = expiresAt; }
   call.resolve(new JSObject().put("expiresAt", expiresAt));
  });
 }

 /** Redeems the code, then requires the session's account to be the phone's (userId, organizationId). */
 @PluginMethod public void verify(PluginCall call) {
  String code = call.getString("code"), userId = call.getString("userId"), organizationId = call.getString("organizationId");
  if (code == null || !code.matches("[0-9A-Za-z]{4,12}") || userId == null) { call.reject("Not accepted", "invalid"); return; }
  run(call, () -> {
   String email, verifier;
   synchronized (lock) {
    if (pendingEmail == null || System.currentTimeMillis() >= pendingExpiresAt) throw new SecurityException("Code expired");
    email = pendingEmail; verifier = pendingVerifier;
   }
   Answer verified = post(CloudEmailCode.VERIFY_PATH, CloudEmailCode.verifyBody(AlphaCloudSignInPlugin.REGISTRATION, environment(), email, code, verifier), null);
   if (verified.status == 400 || verified.status == 401) throw new SecurityException("Wrong code");
   if (verified.status < 200 || verified.status >= 300) throw new SecurityException("Code not accepted");
   Object token = verified.body.opt("token");
   if (!(token instanceof String) && verified.body.optJSONObject("data") != null) token = verified.body.getJSONObject("data").opt("token");
   if (!(token instanceof String)) throw new SecurityException("Code not accepted");
   long expiresAt = BillingAuthorityRoutes.sessionExpiry((String) token, System.currentTimeMillis());
   Answer user = request("GET", "/api/v1/user", null, (String) token);
   JSONObject data = user.body.optJSONObject("data");
   if (user.status != 200 || !BillingAuthorityRoutes.sameAccount(data, userId, organizationId)) {
    synchronized (lock) { session = null; }
    throw new SecurityException("A different account");
   }
   synchronized (lock) { session = (String) token; sessionExpiresAt = expiresAt; pendingEmail = null; pendingVerifier = null; }
   call.resolve(status());
  });
 }

 /** One billing operation with the in-memory session; answers Cloud's status and JSON body. */
 @PluginMethod public void perform(PluginCall call) {
  final BillingAuthorityRoutes.Route route;
  try { route = BillingAuthorityRoutes.route(new JSONObject(call.getData().toString())); }
  catch (Exception invalid) { call.reject("Not accepted", "invalid"); return; }
  run(call, () -> {
   String token;
   synchronized (lock) {
    if (session == null || System.currentTimeMillis() >= sessionExpiresAt) { session = null; throw new SecurityException("Confirm it's you"); }
    token = session;
   }
   Answer answer = request(route.method, route.path, route.body, token);
   // A refused session is spent: the owner confirms again rather than retrying with it.
   if (answer.status == 401) synchronized (lock) { if (token.equals(session)) session = null; }
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
  synchronized (lock) { session = null; pendingEmail = null; pendingVerifier = null; }
  worker.shutdownNow();
  super.handleOnDestroy();
 }
}
