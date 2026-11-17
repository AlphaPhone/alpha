package ai.alphacompute.alphaphone;

import java.util.Base64;
import java.util.regex.Pattern;
import org.json.JSONObject;

/**
 * The fixed Cloud routes the native billing authority performs with its account session
 * (AlphaBillingAuthorityPlugin), and the exact body each accepts. The renderer names an operation
 * (apps/app/src/runtime/cloud-plans.ts BillingOperation) and supplies only these fields; it never
 * chooses a path, a method or a header, and never sees the session.
 */
final class BillingAuthorityRoutes {
 private BillingAuthorityRoutes() {}
 static final class Route {
  final String method, path; final JSONObject body;
  Route(String method, String path, JSONObject body) { this.method = method; this.path = path; this.body = body; }
 }
 private static final Pattern ID = Pattern.compile("[A-Za-z0-9_-]{1,128}");
 private static final Pattern KEY = Pattern.compile("[A-Za-z0-9_-]{8,128}");
 private static String id(JSONObject input, String name, Pattern pattern) {
  Object value = input.opt(name);
  if (!(value instanceof String) || !pattern.matcher((String) value).matches()) throw new IllegalArgumentException(name);
  return (String) value;
 }
 private static long revision(JSONObject input) {
  Object value = input.opt("expectedSubscriptionRevision");
  if (!(value instanceof Number)) throw new IllegalArgumentException("expectedSubscriptionRevision");
  double number = ((Number) value).doubleValue();
  if (number < 0 || number > 9007199254740991d || number != Math.floor(number)) throw new IllegalArgumentException("expectedSubscriptionRevision");
  return (long) number;
 }
 private static String plan(JSONObject input) {
  Object value = input.opt("targetPlanKey");
  if (!"plus_monthly".equals(value) && !"pro_monthly".equals(value)) throw new IllegalArgumentException("targetPlanKey");
  return (String) value;
 }
 private static void only(JSONObject input, String... names) {
  java.util.Set<String> allowed = new java.util.HashSet<>(java.util.Arrays.asList(names));
  allowed.add("operation");
  java.util.Iterator<String> keys = input.keys();
  while (keys.hasNext()) if (!allowed.contains(keys.next())) throw new IllegalArgumentException("unexpected field");
 }

 /** The one route for an operation; anything else is refused before a request is made. */
 static Route route(JSONObject input) throws Exception {
  String operation = input.optString("operation", "");
  switch (operation) {
   case "cancel":
   case "undo-cancel": {
    only(input, "subscriptionId", "expectedSubscriptionRevision", "idempotencyKey");
    JSONObject body = new JSONObject().put("subscriptionId", id(input, "subscriptionId", ID))
     .put("expectedSubscriptionRevision", revision(input)).put("idempotencyKey", id(input, "idempotencyKey", KEY));
    return new Route("POST", "cancel".equals(operation) ? "/api/v1/subscriptions/cancel" : "/api/v1/subscriptions/cancel/undo", body);
   }
   case "upgrade-review":
   case "downgrade-review": {
    only(input, "subscriptionId", "expectedSubscriptionRevision", "targetPlanKey");
    JSONObject body = new JSONObject().put("subscriptionId", id(input, "subscriptionId", ID))
     .put("expectedSubscriptionRevision", revision(input)).put("targetPlanKey", plan(input));
    return new Route("POST", "upgrade-review".equals(operation) ? "/api/v1/subscriptions/upgrade/review" : "/api/v1/subscriptions/downgrade/review", body);
   }
   case "upgrade-confirm":
   case "downgrade-confirm": {
    only(input, "quoteId", "idempotencyKey");
    JSONObject body = new JSONObject().put("quoteId", id(input, "quoteId", ID)).put("idempotencyKey", id(input, "idempotencyKey", KEY));
    return new Route("POST", "upgrade-confirm".equals(operation) ? "/api/v1/subscriptions/upgrade/confirm" : "/api/v1/subscriptions/downgrade/confirm", body);
   }
   case "upgrade-payment": {
    only(input, "commandId");
    return new Route("POST", "/api/v1/subscriptions/upgrade/" + id(input, "commandId", ID) + "/payment", null);
   }
   default: throw new IllegalArgumentException("operation");
  }
 }

 /** When a Steward session stops being usable: its JWT `exp`, never later than one hour from now. */
 static long sessionExpiry(String token, long now) {
  String[] parts = token == null ? new String[0] : token.split("\\.");
  if (parts.length != 3) throw new IllegalArgumentException("session");
  long cap = now + 60 * 60 * 1000L;
  try {
   JSONObject claims = new JSONObject(new String(Base64.getUrlDecoder().decode(parts[1]), java.nio.charset.StandardCharsets.UTF_8));
   long exp = claims.optLong("exp", 0) * 1000L;
   if (exp <= now) throw new IllegalArgumentException("session expired");
   return Math.min(exp, cap);
  } catch (IllegalArgumentException invalid) { throw invalid; }
  catch (Exception unreadable) { throw new IllegalArgumentException("session"); }
 }

 /** The session must belong to the account this phone is signed in to, never another inbox's owner. */
 static boolean sameAccount(JSONObject user, String userId, String organizationId) {
  if (user == null || userId == null || userId.isEmpty()) return false;
  if (!userId.equals(user.optString("id", null))) return false;
  Object organization = user.opt("organization_id");
  return organizationId == null || organizationId.isEmpty() ? true : organizationId.equals(organization instanceof String ? organization : null);
 }

 /**
  * The signed-in account, from the phone's stored Cloud credential (`cloud:production`): its
  * credential id, user and organization. Null when signed out or unreadable. The renderer never
  * names it: a billing session is bound to this, and any change (sign-out, a new key, another
  * account) ends the session.
  */
 static final class Account {
  final String credentialId, userId, organizationId;
  private Account(String credentialId, String userId, String organizationId) { this.credentialId = credentialId; this.userId = userId; this.organizationId = organizationId; }
  static Account of(String savedCredential) {
   if (savedCredential == null) return null;
   try {
    JSONObject credential = new JSONObject(savedCredential);
    String credentialId = credential.optString("credentialId", ""), userId = credential.optString("userId", "");
    if (credentialId.isEmpty() || userId.isEmpty()) return null;
    Object organization = credential.opt("organizationId");
    return new Account(credentialId, userId, organization instanceof String && !((String) organization).isEmpty() ? (String) organization : null);
   } catch (Exception unreadable) { return null; }
  }
  boolean same(Account other) {
   return other != null && credentialId.equals(other.credentialId) && userId.equals(other.userId) && java.util.Objects.equals(organizationId, other.organizationId);
  }
 }

 /**
  * The in-memory billing session and pending email code, both bound to the account they were made
  * for. Reading either for another account (or none) clears both.
  */
 static final class Session {
  private String token, pendingEmail, pendingVerifier;
  private long expiresAt, pendingExpiresAt;
  private Account account, pendingAccount;

  synchronized void clear() { token = null; account = null; expiresAt = 0; pendingEmail = null; pendingVerifier = null; pendingAccount = null; pendingExpiresAt = 0; }
  private void retireFor(Account current) {
   if (token != null && (account == null || !account.same(current))) { token = null; account = null; expiresAt = 0; }
   if (pendingEmail != null && (pendingAccount == null || !pendingAccount.same(current))) { pendingEmail = null; pendingVerifier = null; pendingAccount = null; pendingExpiresAt = 0; }
  }
  /** The session for this account while it is fresh, else null (and nothing kept for another account). */
  synchronized String current(Account current, long now) {
   retireFor(current);
   if (token != null && now >= expiresAt) { token = null; account = null; expiresAt = 0; }
   return token;
  }
  synchronized long expiresAt() { return token == null ? 0 : expiresAt; }
  synchronized void pending(Account current, String email, String verifier, long until) {
   if (current == null) throw new SecurityException("Sign in first");
   retireFor(current);
   pendingEmail = email; pendingVerifier = verifier; pendingAccount = current; pendingExpiresAt = until;
  }
  /** The pending code's email and verifier for this account, or null when there is none (or it expired). */
  synchronized String[] pendingFor(Account current, long now) {
   retireFor(current);
   if (pendingEmail == null || now >= pendingExpiresAt) return null;
   return new String[] {pendingEmail, pendingVerifier};
  }
  /** Keeps a verified session only if the account is still the one the code was sent for. */
  synchronized boolean bind(Account current, Account verifiedFor, String session, long until) {
   retireFor(current);
   if (current == null || !current.same(verifiedFor)) { clear(); return false; }
   token = session; account = current; expiresAt = until;
   pendingEmail = null; pendingVerifier = null; pendingAccount = null; pendingExpiresAt = 0;
   return true;
  }
  /** A session Cloud refused is spent. */
  synchronized void spent(String session) { if (session != null && session.equals(token)) { token = null; account = null; expiresAt = 0; } }
 }
}
