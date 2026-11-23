package ai.alphacompute.alphaphone;

import android.content.Context;
import android.content.pm.PackageManager;
import android.net.LocalServerSocket;
import android.net.LocalSocket;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The phone side of the resident's workflow bridges (scripts/resident/entry.vibe: the
 * {@code workflow-device} and {@code workflow-native-digests} runtime services), served from the app
 * process over an abstract local socket to the app's own uid only: one length-prefixed UTF-8 JSON
 * frame in, one out. It answers the enrolled phone this installation is, reads an exact reviewed
 * Calendar range for a device step addressed to that enrollment, and describes or reads a reviewed
 * native digest source through {@link NativeDigestHost}. Every other device operation is refused,
 * so nothing is performed that the phone cannot read back.
 */
final class WorkflowBridgeHost {
 static final String SOCKET_ENV = "ALPHA_WORKFLOW_SOCKET";
 /** The workflow device protocol this bridge serves: absolute, reviewed Calendar ranges. */
 static final int PROTOCOL = 1;
 private static final int MAX_FRAME = 256 * 1024;
 private static final Set<String> REQUEST_OPS = Set.of("enrollment", "perform", "grant", "read");
 private static final Object LOCK = new Object();
 private static String started;

 private WorkflowBridgeHost() {}

 /** The abstract socket of this package's workflow bridge. */
 static String socketName(Context context) { return context.getPackageName() + ".workflow.v1"; }

 /** Starts the bridge once in this process and names its socket in the agent's environment. */
 static void configure(Context context, java.util.Map<String, String> env) throws IOException {
  Context app = context.getApplicationContext();
  String socket = socketName(app);
  synchronized (LOCK) {
   if (!socket.equals(started)) {
    LocalServerSocket server = new LocalServerSocket(socket);
    ExecutorService connections = Executors.newCachedThreadPool(r -> { Thread t = new Thread(r, "alpha-workflow-bridge"); t.setDaemon(true); return t; });
    Thread accept = new Thread(() -> acceptLoop(app, server, connections), "alpha-workflow-accept");
    accept.setDaemon(true);
    accept.start();
    started = socket;
   }
  }
  env.put(SOCKET_ENV, socket);
 }

 private static void acceptLoop(Context context, LocalServerSocket server, ExecutorService connections) {
  while (true) {
   final LocalSocket client;
   try { client = server.accept(); } catch (IOException closed) { return; }
   connections.execute(() -> serve(context, client));
  }
 }

 private static void serve(Context context, LocalSocket socket) {
  try (LocalSocket client = socket) {
   if (client.getPeerCredentials().getUid() != android.os.Process.myUid()) return;
   DataInputStream in = new DataInputStream(client.getInputStream());
   int length = in.readInt();
   if (length <= 0 || length > MAX_FRAME) return;
   byte[] body = new byte[length];
   in.readFully(body);
   JSONObject answer;
   try { answer = new JSONObject().put("ok", true).put("value", answer(context, new JSONObject(new String(body, StandardCharsets.UTF_8)))); }
   catch (Refused refused) { answer = new JSONObject().put("ok", false).put("code", refused.code); }
   catch (Exception failed) { answer = new JSONObject().put("ok", false).put("code", "UNAVAILABLE"); }
   byte[] out = answer.toString().getBytes(StandardCharsets.UTF_8);
   DataOutputStream writer = new DataOutputStream(client.getOutputStream());
   writer.writeInt(out.length);
   writer.write(out);
   writer.flush();
  } catch (Exception lost) { /* The resident reads a closed connection as unreachable. */ }
 }

 static final class Refused extends Exception {
  final String code;
  Refused(String code) { super(code); this.code = code; }
 }

 static Object answer(Context context, JSONObject request) throws Exception {
  String op = request.optString("op");
  if (!REQUEST_OPS.contains(op)) throw new Refused("UNSUPPORTED");
  switch (op) {
   case "enrollment": return enrollment(context);
   case "perform": return perform(context, request.getJSONObject("binding"), request.getJSONObject("target"), request.getJSONObject("operation"));
   case "grant": return grant(context, request.getJSONObject("selection"), request.getLong("expiresAt"));
   default: return read(context, request.getJSONObject("selection"), request.getLong("at"));
  }
 }

 /** This installation's enrollment with the resident, or null while it has none. */
 static Object enrollment(Context context) throws Exception {
  JSONObject owner;
  try { owner = new NativeOwnerReminderHost(context).read(); } catch (Exception unenrolled) { return JSONObject.NULL; }
  return new JSONObject().put("installationId", owner.getString("installationId")).put("enrollmentId", owner.getString("enrollmentId")).put("protocol", PROTOCOL);
 }

 private static void sameEnrollment(Context context, JSONObject target) throws Exception {
  Object current = enrollment(context);
  if (!(current instanceof JSONObject)) throw new Refused("NOT_ENROLLED");
  JSONObject enrolled = (JSONObject) current;
  if (!enrolled.getString("installationId").equals(target.getString("installationId")) || !enrolled.getString("enrollmentId").equals(target.getString("enrollmentId"))) throw new Refused("ENROLLMENT_CHANGED");
 }

 private static void requireBinding(JSONObject binding) throws Exception {
  for (String field : new String[]{"workflowId", "versionId", "runId", "stepId"}) if (!binding.getString(field).matches("[A-Za-z0-9][A-Za-z0-9_-]{0,127}")) throw new Refused("INVALID_BINDING");
  if (!binding.getString("specDigest").matches("[a-f0-9]{64}")) throw new Refused("INVALID_BINDING");
 }

 /** One bound device step for this enrollment: only an exact reviewed Calendar range is read here. */
 static Object perform(Context context, JSONObject binding, JSONObject target, JSONObject operation) throws Exception {
  requireBinding(binding);
  sameEnrollment(context, target);
  if (!"read_calendar_range".equals(operation.optString("type"))) throw new Refused("DEVICE_STEP_UNSUPPORTED");
  if (context.checkSelfPermission(android.Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) throw new Refused("PERMISSION_REQUIRED");
  JSONArray events = ai.eliza.plugins.calendar.read.SelectedCalendarReader.readWorkflowRange(context.getContentResolver(), operation.getJSONArray("calendarIds"),
   operation.getString("start"), operation.getString("end"), operation.getInt("maximumEvents"), operation.getString("timeZone"));
  if (context.checkSelfPermission(android.Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) throw new Refused("PERMISSION_REQUIRED");
  return new JSONObject().put("kind", "calendar").put("events", events);
 }

 private static JSONObject sourceRequest(JSONObject selection, String action) throws Exception {
  JSONObject request = new JSONObject().put("action", action);
  for (String field : new String[]{"provider", "ownerId", "agentId", "installationId", "enrollmentId", "sourceId", "revision"}) request.put(field, selection.getString(field));
  return request;
 }

 /** The reviewed native source the owner granted on the phone, current until {@code expiresAt}: its time zone. */
 static Object grant(Context context, JSONObject selection, long expiresAt) throws Exception {
  JSONObject granted;
  try { granted = new NativeDigestHost(context).read(sourceRequest(selection, "describe")); }
  catch (NativeDigestSources.SourceChanged changed) { throw new Refused("SOURCE_CHANGED"); }
  if (java.time.Instant.parse(granted.getString("expiresAt")).toEpochMilli() < expiresAt) throw new Refused("SOURCE_EXPIRES_EARLIER");
  return new JSONObject().put("timeZone", granted.getJSONObject("scope").getString("timeZone"));
 }

 /** One reviewed native digest read for the occurrence at {@code at}, as the digest text the resident summarizes. */
 static Object read(Context context, JSONObject selection, long at) throws Exception {
  JSONObject request = sourceRequest(selection, "read").put("occurrence", java.time.Instant.ofEpochMilli(at).toString());
  try { return new NativeDigestHost(context).read(request).toString(); }
  catch (NativeDigestSources.SourceChanged changed) { throw new Refused("SOURCE_CHANGED"); }
 }
}
