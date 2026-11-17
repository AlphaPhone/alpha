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
 * In-app billing is available on every Cloud this build uses (the current Cloud, or Alpha Cloud with
 * CloudDeployment.ALPHA_CLOUD_CUTOVER); the cutover flag chooses the Cloud, not whether billing exists.
 *
 * Every request goes to this build's production Cloud API (CloudDeployment) on one of the fixed
 * routes in {@link BillingAuthorityRoutes}.
 */
@CapacitorPlugin(name = "AlphaBillingAuthority")
public final class AlphaBillingAuthorityPlugin extends Plugin {
 private static final int RESPONSE_LIMIT = 256 * 1024;
 private final ExecutorService worker = Executors.newSingleThreadExecutor();
 private final BillingAuthorityRoutes.Authority authority = new BillingAuthorityRoutes.Authority(new BillingAuthorityRoutes.Ports() {
  @Override public boolean enabled() { return true; }
  @Override public String savedCredential() throws Exception { return new AlphaCredentialStore(getContext()).readCredentialSlot("cloud:production"); }
  @Override public JSONObject identity(String deviceToken) throws Exception { return AlphaConnectionPlugin.readCloudIdentity(deviceToken); }
  @Override public BillingAuthorityRoutes.Reply sendCode(String email, String verifier) throws Exception {
   return post(CloudEmailCode.SEND_PATH, CloudEmailCode.sendBody(AlphaCloudSignInPlugin.REGISTRATION, environment(), email, verifier), null);
  }
  @Override public long codeExpiresAt(Object reported, long now) { return CloudEmailCode.expiresAt(reported, now); }
  @Override public BillingAuthorityRoutes.Reply verifyCode(String email, String code, String verifier) throws Exception {
   return post(CloudEmailCode.VERIFY_PATH, CloudEmailCode.verifyBody(AlphaCloudSignInPlugin.REGISTRATION, environment(), email, code, verifier), null);
  }
  @Override public BillingAuthorityRoutes.Reply request(String method, String path, JSONObject body, String bearer) throws Exception {
   return AlphaBillingAuthorityPlugin.this.request(method, path, body, bearer);
  }
  @Override public long now() { return System.currentTimeMillis(); }
 });

 private static CloudSignInEnvironment environment() { return AlphaCloudSignInPlugin.REGISTRATION.environment("production"); }

 private void run(PluginCall call, Task task) {
  try {
   worker.submit(() -> {
    try { task.run(); }
    catch (UnsupportedOperationException off) { call.reject("Not available", "unavailable"); }
    catch (IllegalArgumentException invalid) { call.reject("Not accepted", "invalid"); }
    catch (SecurityException refused) { call.reject(refused.getMessage(), "refused"); }
    catch (Exception unavailable) { call.reject("Cloud unavailable", "unavailable"); }
   });
  } catch (Exception closed) { call.reject("Billing closed", "unavailable"); }
 }
 private interface Task { void run() throws Exception; }

 @PluginMethod public void status(PluginCall call) { run(call, () -> call.resolve(new JSObject(authority.status().toString()))); }

 @PluginMethod public void clear(PluginCall call) {
  authority.clear();
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
   call.resolve(new JSObject().put("expiresAt", authority.start(email, verifier)));
  });
 }

 /**
  * Redeems the code; the session must belong to the account Cloud names for the phone's stored key.
  * A user id the renderer passes must name that same account; it is never trusted alone.
  */
 @PluginMethod public void verify(PluginCall call) {
  String code = call.getString("code"), claimedUserId = call.getString("userId");
  if (code == null || !code.matches("[0-9A-Za-z]{4,12}")) { call.reject("Not accepted", "invalid"); return; }
  run(call, () -> call.resolve(new JSObject(authority.verify(code, claimedUserId).toString())));
 }

 /** One billing operation with the in-memory session; answers Cloud's status and JSON body. */
 @PluginMethod public void perform(PluginCall call) {
  final BillingAuthorityRoutes.Route route;
  try { route = BillingAuthorityRoutes.route(new JSONObject(call.getData().toString())); }
  catch (Exception invalid) { call.reject("Not accepted", "invalid"); return; }
  run(call, () -> {
   BillingAuthorityRoutes.Reply answer = authority.perform(route);
   call.resolve(new JSObject().put("status", answer.status).put("body", answer.body));
  });
 }

 private BillingAuthorityRoutes.Reply post(String path, JSONObject body, String bearer) throws Exception { return request("POST", path, body, bearer); }
 private BillingAuthorityRoutes.Reply request(String method, String path, JSONObject body, String bearer) throws Exception {
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
   return new BillingAuthorityRoutes.Reply(status, parsed);
  } finally { connection.disconnect(); }
 }

 @Override protected void handleOnDestroy() {
  authority.clear();
  worker.shutdownNow();
  super.handleOnDestroy();
 }
}
