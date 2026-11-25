// spec/app/messages/composer.md, "Only the owner's Send sends: a draft or a picture, with send access, a SIM where there is a choice, and never during a call that may be an emergency call"
package ai.alphacompute.alphaphone;

import ai.eliza.plugins.messages.SmsSendJournal;
import android.net.Uri;
import android.webkit.WebView;
import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.Bridge;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginHandle;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;
import org.json.JSONException;

final class AlphaMessagesComposerPort {
 private static final String ORIGIN = "https://localhost";
 private static final int MAX_REQUEST_CHARS = 2 * SmsSendJournal.MAX_MMS_BYTES;
 private static final Pattern REQUEST = Pattern.compile("[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}");

 private final MainActivity activity;
 private final WebView view;
 private ComposerCall active;

 private AlphaMessagesComposerPort(MainActivity activity, WebView view) {
  this.activity = activity;
  this.view = view;
 }

 static void install(MainActivity activity, WebView view) {
  if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return;
  AlphaMessagesComposerPort port = new AlphaMessagesComposerPort(activity, view);
  try {
   WebViewCompat.addWebMessageListener(view, "alphaMessagesComposer", Set.of(ORIGIN), (page, message, source, mainFrame, reply) -> {
    if (page == view && mainFrame && packagedOrigin(source) && !activity.isAssistantSurface()) port.receive(message, reply);
   });
  } catch (RuntimeException unavailable) {
   android.util.Log.w("AlphaMessages", "The packaged composer port is unavailable");
  }
 }

 private static boolean packagedOrigin(Uri source) {
  return source != null && "https".equals(source.getScheme())
    && ("localhost".equals(source.getEncodedAuthority()) || "localhost:443".equals(source.getEncodedAuthority()));
 }

 private void receive(WebMessageCompat message, JavaScriptReplyProxy reply) {
  if (message.getType() != WebMessageCompat.TYPE_STRING) return;
  Bridge bridge = activity.getBridge();
  if (bridge == null || bridge.getWebView() != view || bridge.getServerUrl() != null) return;
  String text = message.getData();
  if (text == null || text.length() > MAX_REQUEST_CHARS) return;
  JSObject request;
  try { request = new JSObject(text); }
  catch (JSONException invalid) { return; }
  String id = request.getString("requestId", ""), kind = request.getString("kind", "");
  if (id == null || !REQUEST.matcher(id).matches()) return;
  if ("cancel".equals(kind) && request.length() == 2) {
   if (active != null && id.equals(active.getCallbackId())) active.cancelled.set(true);
   return;
  }
  if (active != null && id.equals(active.getCallbackId())) return;
  boolean mms = "mms".equals(kind);
  JSObject draft = request.getJSObject("draft");
  ComposerCall call = new ComposerCall(reply, id, mms, draft == null ? new JSObject() : draft);
  if (request.length() != 3 || !draftShape(draft, mms) || !(mms || "sms".equals(kind))) {
   call.reject("Invalid Messages draft.", "composer-not-started");
   return;
  }
  PluginHandle handle = bridge.getPlugin("ElizaTelephony");
  if (active != null || handle == null || !(handle.getInstance() instanceof AlphaTelephonyPlugin plugin)) {
   call.reject("The Messages composer is unavailable.", "composer-not-started");
   return;
  }
  active = call;
  try {
   plugin.sendComposed(activity, view, call, mms, () -> !call.cancelled.get(), bridge::execute);
  } catch (RuntimeException stopped) {
   call.reject("The Messages send could not be confirmed.");
  }
 }

 private static boolean draftShape(JSObject draft, boolean mms) {
  return draft != null && draft.length() == (mms ? 5 : 4) && draft.has("operationId")
    && draft.has("recipients") && draft.has("body") && draft.has("subscriptionId") && draft.has("attachments") == mms;
 }

 private final class ComposerCall extends PluginCall {
  private final JavaScriptReplyProxy reply;
  private final AtomicBoolean cancelled = new AtomicBoolean();
  private final AtomicBoolean completed = new AtomicBoolean();

  ComposerCall(JavaScriptReplyProxy reply, String id, boolean mms, JSObject draft) {
   super(null, "ElizaTelephony", id, mms ? "sendComposedMms" : "sendComposedSms", draft);
   this.reply = reply;
  }

  private void respond(String field, JSObject value) {
   if (!completed.compareAndSet(false, true)) return;
   JSObject response = new JSObject().put("requestId", getCallbackId()).put(field, value);
   view.post(() -> {
    if (active == this) active = null;
    try { reply.postMessage(response.toString()); }
    catch (RuntimeException detached) { return; }
   });
  }

  @Override public void resolve() { resolve(new JSObject()); }
  @Override public void resolve(JSObject value) { respond("result", value); }
  @Override public void reject(String message, String code, Exception cause, JSObject data) {
   respond("error", new JSObject().put("message", message).put("code", code == null ? "" : code));
  }
 }
}
