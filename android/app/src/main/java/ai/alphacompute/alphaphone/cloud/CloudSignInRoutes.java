// Alpha-owned port of the upstream packages/auth/android ai.eliza.auth.cloud.CloudSignInRoutes at the earlier pin fe5c02faed8 (removed upstream at the Vibestack pin).
package ai.alphacompute.alphaphone.cloud;

import java.util.Set;

/**
 * The fixed Cloud routes the native sign-in client sends, built from URLs it makes itself. A
 * renderer transport must never admit them: no Steward session, authorization code or PKCE
 * verifier crosses the bridge. Pure so it is tested without Android.
 */
public final class CloudSignInRoutes {
 private CloudSignInRoutes() {}
 /** Readiness reads: service document, App Auth registration, Steward providers, and each wire's browser Google authorize. */
 public static final Set<String> READS = union(Set.of("/api/public/service", "/api/v1/app-auth/mobile/config", "/steward/auth/providers", "/steward/auth/oauth/google/authorize", "/api/v1/app-auth/mobile/google"),
  CloudAuthWire.ELIZA_AUTH_READS);
 public static final Set<String> WRITES = union(Set.of(CloudSmsCode.SEND_PATH, CloudSmsCode.VERIFY_PATH, CloudEmailCode.SEND_PATH, CloudEmailCode.VERIFY_PATH,
  "/steward/auth/oauth/exchange", "/steward/auth/oauth/google/native/challenge", "/steward/auth/oauth/google/native/verify", "/api/v1/app-auth/mobile/google", "/api/v1/eliza/google/connect/native",
  "/steward/auth/mfa/totp/complete", "/steward/auth/mfa/sms/complete", "/steward/auth/logout",
  "/api/v1/app-auth/connect", "/api/v1/app-auth/mobile/token", "/api/v1/app-auth/mobile/ack", CloudKeyRenewal.PATH), CloudAuthWire.ELIZA_AUTH_WRITES);
 private static Set<String> union(Set<String> first, Set<String> second) {
  java.util.Set<String> all = new java.util.HashSet<>(first); all.addAll(second); return java.util.Collections.unmodifiableSet(all);
 }
 public static final String SELF_REVOCATION = "/api/v1/api-keys/current";

 /** GETs carry no body; every POST carries a JSON body. */
 public static boolean route(String path, String method, boolean hasBody) {
  if (path == null) return false;
  if ("GET".equals(method)) return !hasBody && READS.contains(path);
  return "POST".equals(method) && hasBody && WRITES.contains(path);
 }
 /** Exactly an admitted environment's Cloud API, HTTPS on the default port. */
 public static boolean origin(CloudSignInConfig config, String scheme, String host, int port) {
  if (!"https".equals(scheme) || (port != -1 && port != 443) || host == null) return false;
  for (CloudSignInEnvironment environment : config.environments()) if (environment.apiHost.equals(host)) return true;
  return false;
 }
 /** Self-revocation: the presented key revokes only itself, with no query or body. */
 public static boolean selfRevocation(CloudSignInConfig config, String scheme, String host, int port, String rawPath, String rawQuery, String method, boolean hasBody) {
  return "DELETE".equals(method) && !hasBody && rawQuery == null && SELF_REVOCATION.equals(rawPath) && origin(config, scheme, host, port);
 }
}
