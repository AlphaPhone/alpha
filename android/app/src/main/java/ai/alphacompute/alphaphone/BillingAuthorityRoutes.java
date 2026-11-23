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

 /**
  * The session a verified code issued and when it stops being usable, never later than one hour from
  * now: the Vibestack Cloud's opaque session (`{status: "signed_in", accessToken, accessExpiresAt}`,
  * apps/app/spec/account/session.md "The native host signs in on the wire of the deployment it
  * addresses") or Steward's JWT, possibly under `data`, with its `exp`. Anything else is not accepted.
  */
 static String[] session(JSONObject body, long now) {
  if (body != null && "signed_in".equals(body.opt("status"))) {
   Object token = body.opt("accessToken"), expires = body.opt("accessExpiresAt");
   if (!(token instanceof String) || ((String) token).isEmpty() || ((String) token).length() > 16384 || !(expires instanceof Number))
    throw new SecurityException("Code not accepted");
   long expiresAt = ((Number) expires).longValue();
   if (expiresAt <= now) throw new SecurityException("Code not accepted");
   return new String[] {(String) token, Long.toString(Math.min(expiresAt, now + 60 * 60 * 1000L))};
  }
  Object token = body == null ? null : body.opt("token");
  if (!(token instanceof String) && body != null && body.optJSONObject("data") != null) token = body.optJSONObject("data").opt("token");
  if (!(token instanceof String)) throw new SecurityException("Code not accepted");
  return new String[] {(String) token, Long.toString(sessionExpiry((String) token, now))};
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
  * The signed-in account. The phone's stored Cloud credential (`cloud:production`, written by the
  * native sign-in host as {credentialId, token, expiresAt, serverCredentialId}) names the key; Cloud's
  * own answer to that key (/api/v1/user) names the user and organization. The renderer never names
  * it. A billing session is bound to the key, and any change (sign-out, a renewed or new key,
  * another account) ends the session.
  */
 static final class Account {
  final String credentialId, serverCredentialId, tokenDigest, userId, organizationId;
  private Account(String credentialId, String serverCredentialId, String tokenDigest, String userId, String organizationId) {
   this.credentialId = credentialId; this.serverCredentialId = serverCredentialId; this.tokenDigest = tokenDigest; this.userId = userId; this.organizationId = organizationId;
  }
  /** The stored key alone (no identity yet); null when signed out or unreadable. */
  static Account of(String savedCredential) {
   String token = token(savedCredential);
   if (token == null) return null;
   try {
    JSONObject credential = new JSONObject(savedCredential);
    String credentialId = credential.optString("credentialId", "");
    if (credentialId.isEmpty()) return null;
    Object server = credential.opt("serverCredentialId");
    return new Account(credentialId, server instanceof String && !((String) server).isEmpty() ? (String) server : null, digest(token), null, null);
   } catch (Exception unreadable) { return null; }
  }
  /** The stored key's bearer, for the identity read only; never kept. */
  static String token(String savedCredential) {
   if (savedCredential == null) return null;
   try { String token = new JSONObject(savedCredential).optString("token", ""); return token.isEmpty() ? null : token; }
   catch (Exception unreadable) { return null; }
  }
  /** This key with Cloud's identity for it ({userId, organizationId?}, LocalAgentProviderAdmission.verifiedCloudIdentity). */
  Account withIdentity(JSONObject identity) {
   String user = identity == null ? "" : identity.optString("userId", "");
   if (user.isEmpty()) throw new SecurityException("Cloud identity unavailable");
   Object organization = identity.opt("organizationId");
   return new Account(credentialId, serverCredentialId, tokenDigest, user, organization instanceof String && !((String) organization).isEmpty() ? (String) organization : null);
  }
  /** The same stored key: metadata such as expiry may change, the key may not. */
  boolean same(Account other) {
   return other != null && credentialId.equals(other.credentialId) && java.util.Objects.equals(serverCredentialId, other.serverCredentialId) && tokenDigest.equals(other.tokenDigest);
  }
  private static String digest(String token) throws Exception {
   byte[] hash = java.security.MessageDigest.getInstance("SHA-256").digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
   StringBuilder hex = new StringBuilder();
   for (byte b : hash) hex.append(String.format("%02x", b));
   return hex.toString();
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
  /** The account (with Cloud's identity) the pending code was sent for, if the same key is still stored. */
  synchronized Account pendingAccount(Account current) {
   retireFor(current);
   return pendingEmail == null ? null : pendingAccount;
  }
  /** Keeps a verified session only if the stored key is still the one the code was sent for. */
  synchronized boolean bind(Account current, Account verifiedFor, String session, long until) {
   retireFor(current);
   if (current == null || !current.same(verifiedFor)) { clear(); return false; }
   token = session; account = verifiedFor; expiresAt = until;
   pendingEmail = null; pendingVerifier = null; pendingAccount = null; pendingExpiresAt = 0;
   return true;
  }
  /** A session Cloud refused is spent. */
  synchronized void spent(String session) { if (session != null && session.equals(token)) { token = null; account = null; expiresAt = 0; } }
 }

 /** One Cloud answer: HTTP status and JSON body. */
 static final class Reply { final int status; final JSONObject body; Reply(int status, JSONObject body) { this.status = status; this.body = body == null ? new JSONObject() : body; } }

 /** What the billing authority needs from the phone and Cloud; the plugin supplies the real ones. */
 interface Ports {
  /** Whether in-app billing is available; every operation refuses without contacting Cloud when it is not. */
  boolean enabled();
  /** The stored `cloud:production` slot, or null when signed out. */
  String savedCredential() throws Exception;
  /** Cloud's identity for the device key ({userId, organizationId?}). */
  JSONObject identity(String deviceToken) throws Exception;
  Reply sendCode(String email, String verifier) throws Exception;
  /** When a sent code expires, from Cloud's answer (the shared CloudEmailCode rule). */
  long codeExpiresAt(Object reported, long now);
  Reply verifyCode(String email, String code, String verifier) throws Exception;
  /** One request to the production Cloud API with a bearer. */
  Reply request(String method, String path, JSONObject body, String bearer) throws Exception;
  long now();
 }

 /**
  * The billing authority's decisions, without Android: refuse unless the cutover flag is on, find the
  * signed-in account from the stored key and Cloud's identity for it, refuse a renderer-claimed user
  * that is not that account, and keep the session bound to the key (Session).
  * Throws UnsupportedOperationException (flag off), SecurityException (refused) or
  * IllegalArgumentException (invalid input); any other exception means Cloud was unavailable.
  */
 static final class Authority {
  private final Ports ports;
  final Session session = new Session();
  Authority(Ports ports) { this.ports = ports; }

  private void requireEnabled() { if (!ports.enabled()) throw new UnsupportedOperationException("Not available"); }
  private Account key() throws Exception { return Account.of(ports.savedCredential()); }

  JSONObject status() throws Exception {
   requireEnabled();
   Account key = key();
   JSONObject answer = new JSONObject();
   if (session.current(key, ports.now()) != null) return answer.put("status", "authorized").put("expiresAt", session.expiresAt());
   return answer.put("status", "required");
  }

  void clear() { session.clear(); }

  /** Sends a one-time code for the signed-in account; answers when it expires. */
  long start(String email, String verifier) throws Exception {
   requireEnabled();
   String saved = ports.savedCredential();
   Account key = Account.of(saved);
   if (key == null) throw new SecurityException("Sign in first");
   Account account = key.withIdentity(ports.identity(Account.token(saved)));
   Reply sent = ports.sendCode(email, verifier);
   if (sent.status == 429) throw new SecurityException("Try again later");
   if (sent.status < 200 || sent.status >= 300) throw new SecurityException("Code not sent");
   long expiresAt = ports.codeExpiresAt(sent.body.opt("expiresAt"), ports.now());
   session.pending(account, email, verifier, expiresAt);
   return expiresAt;
  }
  /** Redeems the code and binds the session to the account the code was sent for. */
  JSONObject verify(String code, String claimedUserId) throws Exception {
   requireEnabled();
   Account key = key();
   if (key == null) { session.clear(); throw new SecurityException("Sign in first"); }
   Account account = session.pendingAccount(key);
   if (account == null) throw new SecurityException("Code expired");
   if (claimedUserId != null && !claimedUserId.equals(account.userId)) { session.clear(); throw new SecurityException("A different account"); }
   String[] pending = session.pendingFor(key, ports.now());
   if (pending == null) throw new SecurityException("Code expired");
   Reply verified = ports.verifyCode(pending[0], code, pending[1]);
   if (verified.status == 400 || verified.status == 401) throw new SecurityException("Wrong code");
   if (verified.status < 200 || verified.status >= 300) throw new SecurityException("Code not accepted");
   String[] issued = session(verified.body, ports.now());
   String token = issued[0];
   long expiresAt = Long.parseLong(issued[1]);
   Reply user = ports.request("GET", "/api/v1/user", null, token);
   if (user.status != 200 || !sameAccount(user.body.optJSONObject("data"), account.userId, account.organizationId)) {
    session.clear();
    throw new SecurityException("A different account");
   }
   // The phone may have signed out or switched accounts while the code was checked.
   if (!session.bind(key(), account, token, expiresAt)) throw new SecurityException("A different account");
   return status();
  }

  /** One billing operation with the session; a refused session is spent. */
  Reply perform(Route route) throws Exception {
   requireEnabled();
   String token = session.current(key(), ports.now());
   if (token == null) throw new SecurityException("Confirm it's you");
   Reply answer = ports.request(route.method, route.path, route.body, token);
   if (answer.status == 401) session.spent(token);
   return answer;
  }
 }
}
