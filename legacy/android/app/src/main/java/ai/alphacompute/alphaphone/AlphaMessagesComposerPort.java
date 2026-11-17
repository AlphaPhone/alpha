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
import org.json.JSONException;

/** The manual composer port belongs to the packaged launcher main frame. */
final class AlphaMessagesComposerPort {
 private static final String ORIGIN = "https://localhost";
 private static final int MAX_REQUEST_CHARS = 2 * SmsSendJournal.MAX_MMS_BYTES;

 private AlphaMessagesComposerPort() {}

 static void install(MainActivity activity, WebView webView) {
  if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return;
  try {
   WebViewCompat.addWebMessageListener(webView, "alphaMessagesComposer", Set.of(ORIGIN),
    (view, message, source, mainFrame, reply) -> {
     if (view == webView && mainFrame && packagedOrigin(source) && !activity.isAssistantSurface())
      receive(activity, view, message, reply);
    });
  } catch (RuntimeException unavailable) {
   android.util.Log.w("AlphaMessages", "The packaged composer port is unavailable");
  }
 }

 private static boolean packagedOrigin(Uri source) {
  return "https".equals(source.getScheme())
   && ("localhost".equals(source.getEncodedAuthority()) || "localhost:443".equals(source.getEncodedAuthority()));
 }

 private static void receive(MainActivity activity, WebView view, WebMessageCompat message, JavaScriptReplyProxy reply) {
  if (message.getType() != WebMessageCompat.TYPE_STRING) return;
  String text = message.getData();
  if (text == null || text.length() > MAX_REQUEST_CHARS) return;
  JSObject request;
  try { request = new JSObject(text); }
  catch (JSONException invalid) { return; }
  String id = request.getString("requestId", ""), kind = request.getString("kind", "");
  if (id == null || !id.matches("[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}")) return;
  JSObject draft = request.getJSObject("draft");
  String method = "mms".equals(kind) ? "sendComposedMms" : "sendComposedSms";
  ComposerCall call = new ComposerCall(view, reply, id, method, draft == null ? new JSObject() : draft);
  if (request.length() != 3 || draft == null || !("sms".equals(kind) || "mms".equals(kind))) {
   call.reject("Invalid Messages draft.", "invalid");
   return;
  }
  Bridge bridge = activity.getBridge();
  PluginHandle handle = bridge == null ? null : bridge.getPlugin("AlphaTelephony");
  if (handle == null || bridge.getWebView() != view || !(handle.getInstance() instanceof AlphaTelephonyPlugin)) {
   call.reject("Open the Messages composer to send this draft.", "unavailable");
   return;
  }
  ((AlphaTelephonyPlugin) handle.getInstance()).sendComposed(call, "mms".equals(kind), bridge::execute);
 }

 private static final class ComposerCall extends PluginCall {
  private final WebView view;
  private final JavaScriptReplyProxy reply;

  ComposerCall(WebView view, JavaScriptReplyProxy reply, String id, String method, JSObject draft) {
   super(null, "AlphaTelephony", id, method, draft);
   this.view = view;
   this.reply = reply;
  }

  private void respond(String field, JSObject value) {
   JSObject response = new JSObject();
   response.put("requestId", getCallbackId());
   response.put(field, value);
   view.post(() -> {
    try { reply.postMessage(response.toString()); }
    catch (RuntimeException detached) { /* The originating WebView frame has gone away. */ }
   });
  }

  @Override public void resolve() { resolve(new JSObject()); }
  @Override public void resolve(JSObject value) { respond("result", value); }
  @Override public void reject(String message, String code, Exception cause, JSObject data) {
   JSObject error = new JSObject();
   error.put("message", message);
   error.put("code", code == null ? "" : code);
   respond("error", error);
  }
 }
}
