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
}
