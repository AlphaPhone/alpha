package ai.alphacompute.alphaphone;

import java.util.ArrayList;
import java.util.List;
import org.json.JSONObject;

/** The billing authority's decisions (BillingAuthorityRoutes.Authority) with synthetic ports; no network. */
public final class BillingAuthorityTest {
 static int checks;
 static void check(boolean ok, String what) { if (!ok) throw new AssertionError(what); checks++; }
 interface Step { void run() throws Exception; }
 static void refused(Class<? extends Exception> kind, String message, Step step, String what) {
  try { step.run(); } catch (Exception thrown) {
   if (!kind.isInstance(thrown) || (message != null && !message.equals(thrown.getMessage()))) throw new AssertionError(what + ": " + thrown);
   checks++; return;
  }
  throw new AssertionError(what + ": not refused");
 }
 static final long NOW = 1_800_000_000_000L;
 // The native sign-in host's real slot shape: no identity.
 static String slot(String id, String token) { return "{\"credentialId\":\"" + id + "\",\"token\":\"" + token + "\",\"expiresAt\":1900000000000,\"serverCredentialId\":\"s-" + id + "\"}"; }
 static final String JWT = "e30." + java.util.Base64.getUrlEncoder().withoutPadding().encodeToString("{\"exp\":1800000600}".getBytes()) + ".sig";

 static final class Fake implements BillingAuthorityRoutes.Ports {
  boolean enabled = true; String saved = slot("c1", "eliza_mobile_key1");
  JSONObject identity = new JSONObject().put("userId", "u1").put("organizationId", "o1");
  Exception identityFailure; String switchDuringVerify;
  JSONObject cloudUser = new JSONObject().put("id", "u1").put("organization_id", "o1");
  final List<String> requests = new ArrayList<>();
  Fake() throws Exception {}
  public boolean enabled() { return enabled; }
  public String savedCredential() { return saved; }
  public JSONObject identity(String token) throws Exception { requests.add("identity " + token); if (identityFailure != null) throw identityFailure; return identity; }
  public BillingAuthorityRoutes.Reply sendCode(String email, String verifier) { requests.add("send " + email); return new BillingAuthorityRoutes.Reply(200, new JSONObject()); }
  public long codeExpiresAt(Object reported, long now) { return now + 600_000; }
  public BillingAuthorityRoutes.Reply verifyCode(String email, String code, String verifier) throws Exception {
   requests.add("verify " + code); if (switchDuringVerify != null) saved = switchDuringVerify;
   return new BillingAuthorityRoutes.Reply(200, new JSONObject().put("token", JWT));
  }
  public BillingAuthorityRoutes.Reply request(String method, String path, JSONObject body, String bearer) throws Exception {
   requests.add(method + " " + path + " " + bearer);
   if (path.equals("/api/v1/user")) return new BillingAuthorityRoutes.Reply(200, new JSONObject().put("data", cloudUser));
   return new BillingAuthorityRoutes.Reply(200, new JSONObject().put("ok", true));
  }
  public long now() { return NOW; }
 }

 public static void main(String[] args) throws Exception {
  BillingAuthorityRoutes.Route cancel = BillingAuthorityRoutes.route(new JSONObject("{\"operation\":\"cancel\",\"subscriptionId\":\"sub_1\",\"expectedSubscriptionRevision\":7,\"idempotencyKey\":\"abcdefgh-1234\"}"));

  // Flag off: every operation refuses before reading anything or contacting Cloud.
  Fake off = new Fake(); off.enabled = false;
  BillingAuthorityRoutes.Authority closed = new BillingAuthorityRoutes.Authority(off);
  refused(UnsupportedOperationException.class, null, closed::status, "flag off status");
  refused(UnsupportedOperationException.class, null, () -> closed.start("e@example.invalid", "v"), "flag off start");
  refused(UnsupportedOperationException.class, null, () -> closed.verify("123456", null), "flag off verify");
  refused(UnsupportedOperationException.class, null, () -> closed.perform(cancel), "flag off perform");
  check(off.requests.isEmpty(), "flag off contacts nothing");

  // Signed in with the real slot shape: identity comes from Cloud for the stored key.
  Fake ports = new Fake();
  BillingAuthorityRoutes.Authority authority = new BillingAuthorityRoutes.Authority(ports);
  check("required".equals(authority.status().getString("status")), "no session yet");
  refused(SecurityException.class, "Confirm it's you", () -> authority.perform(cancel), "perform needs a session");
  authority.start("e@example.invalid", "v");
  check(ports.requests.get(0).equals("identity eliza_mobile_key1"), "identity read with the device key");
  JSONObject status = authority.verify("123456", "u1");
  check("authorized".equals(status.getString("status")), "verified");
  check(ports.requests.contains("GET /api/v1/user " + JWT), "session's account checked with Cloud");
  check(authority.perform(cancel).status == 200 && ports.requests.contains("POST /api/v1/subscriptions/cancel " + JWT), "operation with the session");

  // Sign-out or another key ends the session.
  ports.saved = slot("c2", "eliza_mobile_key2");
  check("required".equals(authority.status().getString("status")), "new key ends the session");
  ports.saved = null;
  refused(SecurityException.class, "Confirm it's you", () -> authority.perform(cancel), "signed out");
  refused(SecurityException.class, "Sign in first", () -> authority.start("e@example.invalid", "v"), "start signed out");

  // Identity read failure: not a refusal, nothing pending.
  Fake failing = new Fake(); failing.identityFailure = new java.io.IOException("offline");
  BillingAuthorityRoutes.Authority unreadable = new BillingAuthorityRoutes.Authority(failing);
  refused(java.io.IOException.class, null, () -> unreadable.start("e@example.invalid", "v"), "identity read failure");
  check(!failing.requests.contains("send e@example.invalid"), "no code sent without an identity");
  Fake anonymous = new Fake(); anonymous.identity = new JSONObject();
  refused(SecurityException.class, null, () -> new BillingAuthorityRoutes.Authority(anonymous).start("e@example.invalid", "v"), "identity without a user");

  // A renderer-claimed user that is not Cloud's answer for the key is refused, and the pending code is dropped.
  Fake claimed = new Fake();
  BillingAuthorityRoutes.Authority claim = new BillingAuthorityRoutes.Authority(claimed);
  claim.start("e@example.invalid", "v");
  refused(SecurityException.class, "A different account", () -> claim.verify("123456", "u2"), "claimed user mismatch");
  check(!claimed.requests.contains("verify 123456"), "code not redeemed for a mismatched claim");
  refused(SecurityException.class, "Code expired", () -> claim.verify("123456", "u1"), "pending code dropped");

  // A session for another account than the key's is refused.
  Fake otherUser = new Fake(); otherUser.cloudUser = new JSONObject().put("id", "u9").put("organization_id", "o1");
  BillingAuthorityRoutes.Authority mismatch = new BillingAuthorityRoutes.Authority(otherUser);
  mismatch.start("e@example.invalid", "v");
  refused(SecurityException.class, "A different account", () -> mismatch.verify("123456", null), "code redeemed for another inbox");
  check("required".equals(mismatch.status().getString("status")), "no session kept");

  // The phone switches accounts while the code is being checked: no session is kept.
  Fake switching = new Fake(); switching.switchDuringVerify = slot("c3", "eliza_mobile_key3");
  BillingAuthorityRoutes.Authority switched = new BillingAuthorityRoutes.Authority(switching);
  switched.start("e@example.invalid", "v");
  refused(SecurityException.class, "A different account", () -> switched.verify("123456", null), "switch during verify");
  check("required".equals(switched.status().getString("status")), "no session after a switch");

  System.out.println("PASS billing authority " + checks);
 }
}
