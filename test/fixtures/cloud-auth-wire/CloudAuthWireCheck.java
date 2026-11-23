// apps/app/spec/account/session.md, "The native host signs in on the wire of the deployment it addresses"
package ai.alphacompute.alphaphone;

import ai.alphacompute.alphaphone.cloud.CloudAuthWire;
import ai.alphacompute.alphaphone.cloud.CloudSignInConfig;
import ai.alphacompute.alphaphone.cloud.CloudSignInEnvironment;
import ai.alphacompute.alphaphone.cloud.CloudSignInFlow;
import ai.alphacompute.alphaphone.cloud.CloudSignInRoutes;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Host-JVM driver for test/cloud-auth-wire.test.mjs: builds every sign-in request of both wires and reads
 * representative Cloud answers, printing one JSON line {step, value} per observation. No network.
 */
public final class CloudAuthWireCheck {
 private CloudAuthWireCheck() {}

 private static void emit(String step, Object value) throws Exception {
  System.out.println(new JSONObject().put("step", step).put("value", value == null ? JSONObject.NULL : value));
 }

 private static Object attempt(Thrower thrower) {
  try { return thrower.run(); } catch (Exception refused) { return "refused:" + refused.getClass().getSimpleName(); }
 }
 private interface Thrower { Object run() throws Exception; }

 private static CloudSignInConfig config(CloudSignInEnvironment environment) {
  return CloudSignInConfig.builder().clientId("ai.alphacompute.alphaphone").deviceName("Alpha Phone").productName("Alpha Phone")
   .googleClientId("alpha-phone").googleSignInMode("browser").environment(environment).build();
 }

 public static void main(String[] args) throws Exception {
  long now = 1_800_000_000_000L;
  CloudSignInEnvironment steward = new CloudSignInEnvironment("production", "api.eliza.app", "eliza.app", "elizacloud", "Eliza Cloud", "/alphaphone/auth/callback");
  CloudSignInEnvironment eliza = new CloudSignInEnvironment("production", "api.alphacompute.cc", "cloud.alphacompute.cc", "", "Alpha Cloud",
   "/alphaphone/auth/callback", CloudAuthWire.of(true));
  CloudSignInConfig stewardConfig = config(steward), elizaConfig = config(eliza);
  String verifier = CloudSignInFlow.newVerifier(), state = CloudSignInFlow.newState();

  emit("wire-of-shipped", CloudAuthWire.of(false).name());
  emit("wire-of-cutover", CloudAuthWire.of(true).name());
  emit("steward-default-wire", steward.wire.name());
  emit("eliza-tenant", eliza.tenant);
  emit("steward-without-tenant", attempt(() -> new CloudSignInEnvironment("production", "api.eliza.app", "eliza.app", "", "Eliza Cloud", "/alphaphone/auth/callback").wire.name()));

  emit("steward-paths", new JSONArray().put(CloudAuthWire.emailSendPath(steward)).put(CloudAuthWire.emailVerifyPath(steward))
   .put(CloudAuthWire.smsSendPath(steward)).put(CloudAuthWire.smsVerifyPath(steward)).put(CloudAuthWire.exchangePath(steward))
   .put(CloudAuthWire.factorPath(steward, "totp")).put(CloudAuthWire.logoutPath(steward)));
  emit("eliza-paths", new JSONArray().put(CloudAuthWire.emailSendPath(eliza)).put(CloudAuthWire.emailVerifyPath(eliza))
   .put(CloudAuthWire.smsSendPath(eliza)).put(CloudAuthWire.smsVerifyPath(eliza)).put(CloudAuthWire.exchangePath(eliza))
   .put(CloudAuthWire.factorPath(eliza, "totp")).put(CloudAuthWire.logoutPath(eliza)));
  emit("passkey-factor", attempt(() -> CloudAuthWire.factorPath(eliza, "passkey")));

  emit("steward-email-send", CloudAuthWire.emailSendBody(stewardConfig, steward, "owner@example.com", verifier));
  emit("eliza-email-send", CloudAuthWire.emailSendBody(elizaConfig, eliza, "owner@example.com", verifier));
  emit("eliza-email-challenge-is-s256", CloudSignInFlow.s256(verifier).equals(CloudAuthWire.emailSendBody(elizaConfig, eliza, "owner@example.com", verifier).getString("codeChallenge")));
  emit("eliza-email-verify", CloudAuthWire.emailVerifyBody(elizaConfig, eliza, "owner@example.com", "123456", verifier));
  emit("eliza-sms-send", CloudAuthWire.smsSendBody(elizaConfig, eliza, "+15551234567", verifier));
  emit("eliza-sms-verify", CloudAuthWire.smsVerifyBody(elizaConfig, eliza, "+15551234567", "123456", verifier));
  emit("steward-sms-send", CloudAuthWire.smsSendBody(stewardConfig, steward, "+15551234567", verifier));
  emit("eliza-sms-bad-phone", attempt(() -> CloudAuthWire.smsSendBody(elizaConfig, eliza, "5551234567", verifier)));
  emit("eliza-verify-bad-code", attempt(() -> CloudAuthWire.emailVerifyBody(elizaConfig, eliza, "owner@example.com", "12345", verifier)));
  emit("steward-factor", CloudAuthWire.factorBody(steward, "challenge-1", "totp", "123456"));
  emit("eliza-factor", CloudAuthWire.factorBody(eliza, "challenge-1", "sms", "123456"));
  emit("eliza-factor-code-asked", new JSONArray().put(CloudAuthWire.factorCodeAsked(eliza, "sms")).put(CloudAuthWire.factorCodeAsked(eliza, "totp"))
   .put(CloudAuthWire.factorCodeAsked(steward, "sms")));
  emit("steward-exchange", CloudAuthWire.exchangeBody(stewardConfig, steward, "code-1", verifier));
  emit("eliza-exchange", CloudAuthWire.exchangeBody(elizaConfig, eliza, "code-1", verifier));
  String challenge = CloudSignInFlow.s256(verifier);
  emit("eliza-authorize", CloudAuthWire.authorizeUrl(elizaConfig, eliza, challenge, state).replace(challenge, "<challenge>").replace(state, "<state>"));
  emit("steward-authorize", CloudAuthWire.authorizeUrl(stewardConfig, steward, challenge, state).replace(challenge, "<challenge>").replace(state, "<state>"));

  JSONObject signedIn = new JSONObject().put("status", "signed_in").put("user", new JSONObject().put("id", "user-1").put("email", "owner@example.com"))
   .put("organizationId", "org-1").put("accessToken", "eliza_session_" + "a".repeat(43)).put("accessExpiresAt", now + 15 * 60_000L)
   .put("refreshToken", "eliza_refresh_" + "b".repeat(43)).put("refreshExpiresAt", now + 30L * 86_400_000L).put("mfaAt", JSONObject.NULL).put("accountCreated", false);
  emit("eliza-signed-in", CloudAuthWire.session(eliza, signedIn, now));
  emit("eliza-signed-in-expired", CloudAuthWire.session(eliza, new JSONObject(signedIn.toString()).put("accessExpiresAt", now), now));
  emit("eliza-signed-in-no-organization", CloudAuthWire.session(eliza, new JSONObject(signedIn.toString()).put("organizationId", ""), now));
  JSONObject noRefresh = new JSONObject(signedIn.toString());
  noRefresh.remove("refreshToken");
  emit("eliza-signed-in-no-refresh", CloudAuthWire.session(eliza, noRefresh, now));
  JSONObject factor = new JSONObject().put("status", "mfa_required").put("challengeId", "challenge-1").put("expiresAt", now + 300_000L);
  emit("eliza-factor-totp-first", CloudAuthWire.session(eliza, new JSONObject(factor.toString()).put("methods", new JSONArray().put("sms").put("totp")), now));
  emit("eliza-factor-sms-only", CloudAuthWire.session(eliza, new JSONObject(factor.toString()).put("methods", new JSONArray().put("sms")), now));
  emit("eliza-factor-none", CloudAuthWire.session(eliza, new JSONObject(factor.toString()).put("methods", new JSONArray().put("passkey")), now));
  emit("eliza-factor-expired", CloudAuthWire.session(eliza, new JSONObject(factor.toString()).put("methods", new JSONArray().put("totp")).put("expiresAt", now), now));
  emit("eliza-steward-shaped-answer", CloudAuthWire.session(eliza, new JSONObject().put("token", "steward.jwt.token-aaaaaaaaaaaa"), now));
  JSONObject stewardAnswer = new JSONObject().put("token", "steward.jwt.token-aaaaaaaaaaaa").put("refreshToken", "r".repeat(30));
  emit("steward-session", CloudAuthWire.session(steward, stewardAnswer, now));
  emit("steward-session-under-data", CloudAuthWire.session(steward, new JSONObject().put("ok", true).put("data", stewardAnswer), now));
  emit("eliza-resend-at", CloudAuthWire.resendAt(eliza, new JSONObject().put("retryAt", now + 60_000L).put("resendAt", 1)));
  emit("steward-resend-at", CloudAuthWire.resendAt(steward, new JSONObject().put("retryAt", 1).put("resendAt", now + 60_000L)));

  JSONObject registration = new JSONObject().put("clientId", "ai.alphacompute.alphaphone").put("environment", "production")
   .put("redirectUri", "https://cloud.alphacompute.cc/alphaphone/auth/callback").put("codeChallengeMethod", "S256").put("credentialTtlMs", 1)
   .put("methods", new JSONObject().put("email", true).put("sms", false).put("google", true))
   .put("google", new JSONObject().put("configured", false).put("serverClientId", "").put("nativeSignIn", false));
  emit("eliza-registered", CloudAuthWire.registered(eliza, 200, registration, elizaConfig));
  emit("eliza-registered-wrong-return", CloudAuthWire.registered(eliza, 200, new JSONObject(registration.toString()).put("redirectUri", "https://eliza.app/alphaphone/auth/callback"), elizaConfig));
  emit("steward-registered-without-success", CloudAuthWire.registered(steward, 200,
   new JSONObject(registration.toString()).put("redirectUri", "https://eliza.app/alphaphone/auth/callback"), stewardConfig));
  emit("eliza-methods", CloudAuthWire.methods(registration));
  emit("eliza-methods-google-configured", CloudAuthWire.methods(new JSONObject(registration.toString()).put("google", new JSONObject().put("configured", true))));
  emit("eliza-methods-missing", CloudAuthWire.methods(new JSONObject().put("clientId", "x")));

  JSONArray posts = new JSONArray(), gets = new JSONArray();
  for (String path : new String[] {CloudAuthWire.EMAIL_SEND, CloudAuthWire.EMAIL_VERIFY, CloudAuthWire.SMS_SEND, CloudAuthWire.SMS_VERIFY,
   CloudAuthWire.GOOGLE_EXCHANGE, CloudAuthWire.FACTOR_COMPLETE, CloudAuthWire.FACTOR_SMS_SEND, CloudAuthWire.LOGOUT, "/steward/auth/email/code/send"})
   posts.put(CloudSignInRoutes.route(path, "POST", true));
  for (String path : new String[] {CloudAuthWire.GOOGLE_AUTHORIZE, "/steward/auth/providers", CloudAuthWire.EMAIL_SEND}) gets.put(CloudSignInRoutes.route(path, "GET", false));
  emit("routes-post", posts);
  emit("routes-get", gets);
  emit("callback-access-denied", CloudSignInFlow.parseCallback("https://cloud.alphacompute.cc/alphaphone/auth/callback#error=access_denied&state=" + state, eliza).kind.name());
  emit("callback-code", CloudSignInFlow.parseCallback("https://cloud.alphacompute.cc/alphaphone/auth/callback#code=abc&state=" + state, eliza).kind.name());

  emit("billing-eliza", new JSONArray(BillingAuthorityRoutes.session(signedIn, now)));
  emit("billing-eliza-capped", new JSONArray(BillingAuthorityRoutes.session(new JSONObject(signedIn.toString()).put("accessExpiresAt", now + 3 * 3_600_000L), now)));
  emit("billing-eliza-expired", attempt(() -> BillingAuthorityRoutes.session(new JSONObject(signedIn.toString()).put("accessExpiresAt", now - 1), now)));
  emit("billing-eliza-factor", attempt(() -> BillingAuthorityRoutes.session(new JSONObject(factor.toString()).put("methods", new JSONArray().put("totp")), now)));
  String claims = Base64.getUrlEncoder().withoutPadding().encodeToString(new JSONObject().put("exp", (now + 600_000L) / 1000).toString().getBytes(StandardCharsets.UTF_8));
  String jwt = "eyJhbGciOiJIUzI1NiJ9." + claims + ".signature";
  emit("billing-steward", new JSONArray(BillingAuthorityRoutes.session(new JSONObject().put("data", new JSONObject().put("token", jwt)), now)).getString(1));
  emit("billing-steward-opaque", attempt(() -> BillingAuthorityRoutes.session(new JSONObject().put("token", "eliza_session_aaaa"), now)));
 }
}
