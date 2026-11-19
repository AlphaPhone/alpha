package ai.alphacompute.alphaphone;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.regex.Pattern;
import org.json.JSONObject;

/** Safe hints for failed navigation requests. Never includes the path or request body. */
final class ViewRequestDiagnostic {
 private static final Pattern PREPARE = Pattern.compile("/api/views/[A-Za-z0-9_-]+/navigate");
 private static final Pattern GENERATED_ID = Pattern.compile("[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}");

 static String failedPostSuffix(String method, String path, String body) {
  if (!"POST".equals(method)) return "";
  String phase;
  String idKey = "requestId";
  if ("/api/views/interact-claim".equals(path)) phase = "claim";
  else if ("/api/views/interact-result".equals(path)) phase = "result";
  else if (PREPARE.matcher(path).matches()) {
   phase = "prepare";
   idKey = "completedActionHandoffId";
  } else return "";
  String suffix = " navigation=" + phase;
  if (body == null || body.length() > 4096) return suffix;
  try {
   Object id = new JSONObject(body).opt(idKey);
   if (!(id instanceof String) || !GENERATED_ID.matcher((String) id).matches()) return suffix;
   byte[] hash = MessageDigest.getInstance("SHA-256").digest(((String) id).getBytes(StandardCharsets.US_ASCII));
   StringBuilder fingerprint = new StringBuilder(16);
   for (int i = 0; i < 8; i++) fingerprint.append(Character.forDigit((hash[i] & 255) >>> 4, 16)).append(Character.forDigit(hash[i] & 15, 16));
   return suffix + " navigation_ref=" + fingerprint;
  } catch (Exception invalid) { return suffix; }
 }
}
