// apps/app/spec/account/session.md, "The native host signs in on the wire of the deployment it addresses"
package ai.alphacompute.alphaphone.cloud;

import java.time.Instant;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The sign-in wire of the Cloud a deployment runs (apps/app/spec/account/session.md, "The native host
 * signs in on the wire of the deployment it addresses").
 *
 * Eliza Cloud, the shipped deployment, signs in through Steward (`/steward/auth/*`) and answers a
 * Steward JWT session. Alpha Cloud runs the Vibestack Cloud, which serves only its own sign-in routes
 * (`/api/v1/auth/*`, elizaOS/eliza spec/cloud/client.md `signInRoutes`) with flat PKCE fields and the
 * registered client id, refuses any field it does not name, and answers an opaque session
 * (`{status: "signed_in", accessToken, accessExpiresAt, refreshToken, user, organizationId}`) or a
 * second-factor challenge (`{status: "mfa_required", challengeId, methods, expiresAt}`). The device key
 * tail (`/api/v1/app-auth/connect`, `mobile/token`, `mobile/ack`, `mobile/renew`) is the same on both.
 *
 * This class names each sign-in request for a wire and reads each answer into the one session shape
 * the native client keeps ({token, refreshToken, expiresAt} or {mfaRequired, mfa: {type, challengeId,
 * expiresAt}}). Pure: no Android classes, nothing logged, nothing stored.
 */
public final class CloudAuthWire {
 private CloudAuthWire() {}

 /** Steward on the shipped Eliza Cloud; the Vibestack Cloud's own routes on Alpha Cloud. */
 public enum Wire { STEWARD, ELIZA_AUTH }

 /** The wire of the deployment a build addresses: Alpha Cloud (the cutover) runs the Vibestack Cloud. */
 public static Wire of(boolean alphaCloud) { return alphaCloud ? Wire.ELIZA_AUTH : Wire.STEWARD; }

 public static final String EMAIL_SEND = "/api/v1/auth/email/code/send";
 public static final String EMAIL_VERIFY = "/api/v1/auth/email/code/verify";
 public static final String SMS_SEND = "/api/v1/auth/sms/code/send";
 public static final String SMS_VERIFY = "/api/v1/auth/sms/code/verify";
 public static final String GOOGLE_AUTHORIZE = "/api/v1/auth/google/authorize";
 public static final String GOOGLE_EXCHANGE = "/api/v1/auth/google/exchange";
 public static final String FACTOR_COMPLETE = "/api/v1/auth/mfa/complete";
 public static final String FACTOR_SMS_SEND = "/api/v1/auth/mfa/sms/send";
 public static final String LOGOUT = "/api/v1/auth/logout";
 public static final String STEWARD_PROVIDERS = "/steward/auth/providers";
 public static final String STEWARD_EXCHANGE = "/steward/auth/oauth/exchange";
 public static final String STEWARD_LOGOUT = "/steward/auth/logout";

 /** The Vibestack Cloud's sign-in routes this client sends: POST with a JSON body. */
 public static final Set<String> ELIZA_AUTH_WRITES = Set.of(EMAIL_SEND, EMAIL_VERIFY, SMS_SEND, SMS_VERIFY, GOOGLE_EXCHANGE, FACTOR_COMPLETE, FACTOR_SMS_SEND, LOGOUT);
 /** The Vibestack Cloud's sign-in reads this client sends: the browser Google authorize probe. */
 public static final Set<String> ELIZA_AUTH_READS = Set.of(GOOGLE_AUTHORIZE);
 /** Second factors this client completes on either wire. */
 public static final Set<String> FACTORS = Set.of("totp", "sms");

 /** Where an email code is sent. */
 public static String emailSendPath(CloudSignInEnvironment environment) { return eliza(environment) ? EMAIL_SEND : CloudEmailCode.SEND_PATH; }
 /** Where an email code is checked. */
 public static String emailVerifyPath(CloudSignInEnvironment environment) { return eliza(environment) ? EMAIL_VERIFY : CloudEmailCode.VERIFY_PATH; }
 /** Where a text-message code is sent. */
 public static String smsSendPath(CloudSignInEnvironment environment) { return eliza(environment) ? SMS_SEND : CloudSmsCode.SEND_PATH; }
 /** Where a text-message code is checked. */
 public static String smsVerifyPath(CloudSignInEnvironment environment) { return eliza(environment) ? SMS_VERIFY : CloudSmsCode.VERIFY_PATH; }
 /** Where a browser Google code is exchanged for a session. */
 public static String exchangePath(CloudSignInEnvironment environment) { return eliza(environment) ? GOOGLE_EXCHANGE : STEWARD_EXCHANGE; }
 /** Where a second factor is completed. */
 public static String factorPath(CloudSignInEnvironment environment, String type) {
  if (!FACTORS.contains(type)) throw new IllegalArgumentException("Unsupported second factor");
  return eliza(environment) ? FACTOR_COMPLETE : "/steward/auth/mfa/" + type + "/complete";
 }
 /** Where the sign-in session is ended once the device key replaced it. */
 public static String logoutPath(CloudSignInEnvironment environment) { return eliza(environment) ? LOGOUT : STEWARD_LOGOUT; }

 /** An email code request: Steward's tenant-bound nested PKCE, or the Cloud's flat PKCE for the registered client. */
 public static JSONObject emailSendBody(CloudSignInConfig config, CloudSignInEnvironment environment, String email, String verifier) throws Exception {
  if (!eliza(environment)) return CloudEmailCode.sendBody(config, environment, email, verifier);
  return challenged(config, verifier).put("email", email);
 }
 public static JSONObject emailVerifyBody(CloudSignInConfig config, CloudSignInEnvironment environment, String email, String code, String verifier) throws Exception {
  if (!eliza(environment)) return CloudEmailCode.verifyBody(config, environment, email, code, verifier);
  return proved(config, code, verifier).put("email", email);
 }
 /** A text-message code request. The Cloud binds SMS codes to a PKCE pair as it does email codes; Steward does not. */
 public static JSONObject smsSendBody(CloudSignInConfig config, CloudSignInEnvironment environment, String phone, String verifier) throws Exception {
  if (!eliza(environment)) return CloudSmsCode.sendBody(environment, phone);
  if (!CloudSmsCode.validPhone(phone)) throw new IllegalArgumentException("Invalid phone number");
  return challenged(config, verifier).put("phone", phone);
 }
 public static JSONObject smsVerifyBody(CloudSignInConfig config, CloudSignInEnvironment environment, String phone, String code, String verifier) throws Exception {
  if (!eliza(environment)) return CloudSmsCode.verifyBody(environment, phone, code);
  if (!CloudSmsCode.validPhone(phone)) throw new IllegalArgumentException("Invalid phone number");
  return proved(config, code, verifier).put("phone", phone);
 }
 /** A second-factor completion: the Cloud names the method in the body, Steward in the path. */
 public static JSONObject factorBody(CloudSignInEnvironment environment, String challengeId, String type, String code) throws Exception {
  if (!FACTORS.contains(type)) throw new IllegalArgumentException("Unsupported second factor");
  JSONObject body = new JSONObject().put("challengeId", challengeId).put("code", code);
  return eliza(environment) ? body.put("method", type) : body;
 }
 /** The Cloud sends a text-message second factor only when asked; Steward sends it with the challenge. */
 public static boolean factorCodeAsked(CloudSignInEnvironment environment, String type) { return eliza(environment) && "sms".equals(type); }
 public static JSONObject factorCodeBody(String challengeId) throws Exception { return new JSONObject().put("challengeId", challengeId); }
 /** A browser Google code exchange: Steward names the tenant, the Cloud the registered client. */
 public static JSONObject exchangeBody(CloudSignInConfig config, CloudSignInEnvironment environment, String code, String verifier) throws Exception {
  JSONObject body = new JSONObject().put("code", code).put("redirectUri", environment.callback()).put("codeVerifier", verifier);
  return eliza(environment) ? body.put("clientId", config.clientId) : body.put("tenantId", environment.tenant);
 }
 /** The exact browser authorization request for the environment's wire. */
 public static String authorizeUrl(CloudSignInConfig config, CloudSignInEnvironment environment, String challenge, String state) {
  if (!eliza(environment)) return CloudSignInFlow.authorizeUrl(environment, challenge, state);
  if (!CloudSignInFlow.validState(state) || !CloudSignInFlow.validState(challenge)) throw new IllegalArgumentException("Invalid browser proof");
  return environment.api() + GOOGLE_AUTHORIZE + "?response_type=code&client_id=" + percent(config.clientId) + "&environment=" + percent(environment.name)
   + "&redirect_uri=" + percent(environment.callback()) + "&code_challenge=" + challenge + "&code_challenge_method=S256&state=" + state;
 }

 /**
  * The session an answered sign-in step carries, in the one shape the client keeps, or null when the
  * answer is not a usable session or challenge. Steward's own answer (possibly under `data`) is kept
  * as it is; the Cloud's opaque session needs its user, organization, both tokens and a live access expiry.
  */
 public static JSONObject session(CloudSignInEnvironment environment, JSONObject answer, long now) throws Exception {
  if (answer == null) return null;
  if (!eliza(environment)) return answer.optJSONObject("data") != null && !answer.has("token") ? answer.optJSONObject("data") : answer;
  String status = answer.optString("status", "");
  if ("mfa_required".equals(status)) {
   String challengeId = answer.optString("challengeId", "");
   long expiresAt = instant(answer.opt("expiresAt"));
   String type = factor(answer.optJSONArray("methods"));
   if (challengeId.isEmpty() || challengeId.length() > 256 || expiresAt <= now || type == null) return null;
   return new JSONObject().put("mfaRequired", true).put("mfa", new JSONObject().put("type", type).put("challengeId", challengeId).put("expiresAt", expiresAt));
  }
  if (!"signed_in".equals(status)) return null;
  JSONObject user = answer.optJSONObject("user");
  String userId = user == null ? "" : user.optString("id", ""), organizationId = answer.optString("organizationId", "");
  String access = answer.optString("accessToken", ""), refresh = answer.optString("refreshToken", "");
  long accessExpiresAt = instant(answer.opt("accessExpiresAt"));
  if (userId.isEmpty() || organizationId.isEmpty() || !CloudSignInFlow.validStewardToken(access) || !CloudSignInFlow.validStewardToken(refresh) || accessExpiresAt <= now) return null;
  return new JSONObject().put("token", access).put("refreshToken", refresh).put("expiresAt", accessExpiresAt)
   .put("userId", userId).put("organizationId", organizationId);
 }

 /** A code send's answer: the Cloud names its resend time `retryAt`, Steward `resendAt`. */
 public static Object resendAt(CloudSignInEnvironment environment, JSONObject answer) {
  return answer == null ? null : answer.opt(eliza(environment) ? "retryAt" : "resendAt");
 }

 /**
  * What the Cloud's registration answer (`GET /api/v1/app-auth/mobile/config`) offers this client:
  * {email, sms, google} with Google only when it is configured. Null when the answer names no methods.
  */
 public static JSONObject methods(JSONObject registration) throws Exception {
  JSONObject methods = registration == null ? null : registration.optJSONObject("methods");
  JSONObject google = registration == null ? null : registration.optJSONObject("google");
  if (methods == null || google == null) return null;
  return new JSONObject().put("email", methods.optBoolean("email", false)).put("sms", methods.optBoolean("sms", false))
   .put("google", methods.optBoolean("google", false) && google.optBoolean("configured", false));
 }

 /** The registration answer binds this client: Steward wraps it with `success`, the Cloud answers it bare. */
 public static boolean registered(CloudSignInEnvironment environment, int status, JSONObject answer, CloudSignInConfig config) {
  if (answer == null) return false;
  Object success = eliza(environment) ? Boolean.TRUE : answer.opt("success");
  return CloudSignInReadiness.registered(status, success, answer.optString("clientId", null), answer.optString("environment", null),
   answer.optString("redirectUri", null), answer.optString("codeChallengeMethod", null), config, environment);
 }

 private static boolean eliza(CloudSignInEnvironment environment) { return environment.wire == Wire.ELIZA_AUTH; }

 private static JSONObject challenged(CloudSignInConfig config, String verifier) throws Exception {
  return new JSONObject().put("clientId", config.clientId).put("codeChallenge", CloudSignInFlow.s256(verifier)).put("codeChallengeMethod", "S256");
 }

 private static JSONObject proved(CloudSignInConfig config, String code, String verifier) throws Exception {
  if (!CloudSignInFlow.validCode(code)) throw new IllegalArgumentException("Invalid code");
  if (!CloudSignInFlow.validVerifier(verifier)) throw new IllegalArgumentException("Invalid verifier");
  return new JSONObject().put("code", code).put("clientId", config.clientId).put("codeVerifier", verifier);
 }

 /** One factor this client can complete, an authenticator app first; null when the challenge offers none. */
 private static String factor(JSONArray methods) {
  boolean sms = false;
  for (int i = 0; methods != null && i < methods.length() && i < 16; i++) {
   String method = methods.optString(i, "");
   if ("totp".equals(method)) return "totp";
   if ("sms".equals(method)) sms = true;
  }
  return sms ? "sms" : null;
 }

 private static long instant(Object value) {
  if (value instanceof Number) return ((Number) value).longValue();
  if (!(value instanceof String)) return 0;
  try { return Instant.parse((String) value).toEpochMilli(); } catch (Exception invalid) { return 0; }
 }

 private static String percent(String value) {
  StringBuilder out = new StringBuilder();
  for (byte valueByte : value.getBytes(java.nio.charset.StandardCharsets.UTF_8)) {
   int c = valueByte & 0xff;
   if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' || c == '~') out.append((char) c);
   else out.append('%').append(String.format(java.util.Locale.ROOT, "%02X", c));
  }
  return out.toString();
 }
}
