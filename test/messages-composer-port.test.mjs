import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {jvmSkip, nativeSource, runJvm} from './fixtures/jvm-tools.mjs';

test('the native Messages composer accepts only the packaged launcher main frame and has no legacy fallback',
 {skip: jvmSkip('javac', 'json')}, () => {
  const directory = mkdtempSync(join(tmpdir(), 'alpha-messages-composer-port-'));
  try {
   // Compile the product listener itself. The stand-ins expose Android's callback metadata and
   // record port registration, replies and dispatch attempts without a WebView, SIM or radio.
   const stubs = {
    'SmsSendJournal.java': 'package ai.eliza.plugins.messages; public class SmsSendJournal { public static final int MAX_MMS_BYTES = 4096; }',
    'Uri.java': `package android.net;
      public class Uri {
       private final java.net.URI uri;
       public Uri(String value) { uri = java.net.URI.create(value); }
       public String getScheme() { return uri.getScheme(); }
       public String getEncodedAuthority() { return uri.getRawAuthority(); }
      }`,
    'WebView.java': `package android.webkit;
      public class WebView {
       public int legacyInstalls;
       public void addJavascriptInterface(Object target, String name) { legacyInstalls++; }
       public boolean post(Runnable work) { work.run(); return true; }
      }`,
    'Log.java': 'package android.util; public class Log { public static int w(String tag, String message) { return 0; } }',
    'WebViewFeature.java': `package androidx.webkit;
      public class WebViewFeature {
       public static final String WEB_MESSAGE_LISTENER = "WEB_MESSAGE_LISTENER";
       public static boolean supported;
       public static boolean isFeatureSupported(String feature) { return supported && WEB_MESSAGE_LISTENER.equals(feature); }
      }`,
    'WebViewCompat.java': `package androidx.webkit;
      import android.net.Uri;
      import android.webkit.WebView;
      import java.util.Set;
      public class WebViewCompat {
       public interface WebMessageListener {
        void onPostMessage(WebView view, WebMessageCompat message, Uri source, boolean main, JavaScriptReplyProxy reply);
       }
       public static WebMessageListener listener;
       public static Set<String> origins;
       public static String channel;
       public static WebView installedOn;
       public static int registrations;
       public static boolean failRegistration;
       public static void addWebMessageListener(WebView view, String name, Set<String> rules, WebMessageListener callback) {
        registrations++;
        if (failRegistration) throw new IllegalStateException("provider refused");
        channel = name; origins = rules; installedOn = view; listener = callback;
       }
      }`,
    'WebMessageCompat.java': `package androidx.webkit;
      public class WebMessageCompat {
       public static final int TYPE_STRING = 0;
       private final String data;
       public WebMessageCompat(String data) { this.data = data; }
       public int getType() { return TYPE_STRING; }
       public String getData() { return data; }
      }`,
    'JavaScriptReplyProxy.java': `package androidx.webkit;
      public class JavaScriptReplyProxy {
       public final java.util.List<String> messages = new java.util.ArrayList<>();
       public void postMessage(String value) { messages.add(value); }
      }`,
    'JSObject.java': `package com.getcapacitor;
      public class JSObject extends org.json.JSONObject {
       public JSObject() {}
       public JSObject(String text) { super(text); }
       public String getString(String key, String fallback) { return optString(key, fallback); }
       public JSObject getJSObject(String key) {
        var value = optJSONObject(key);
        return value == null ? null : new JSObject(value.toString());
       }
      }`,
    'PluginCall.java': `package com.getcapacitor;
      public class PluginCall {
       private final String id;
       public final String method;
       public final JSObject draft;
       public PluginCall(Object handler, String plugin, String id, String method, JSObject draft) {
        this.id = id; this.method = method; this.draft = draft;
       }
       public String getCallbackId() { return id; }
       public void resolve() {}
       public void resolve(JSObject value) {}
       public void reject(String message, String code) { reject(message, code, null, null); }
       public void reject(String message, String code, Exception cause, JSObject data) {}
      }`,
    'Bridge.java': `package com.getcapacitor;
      import android.webkit.WebView;
      public class Bridge {
       public WebView web;
       public Object plugin;
       public WebView getWebView() { return web; }
       public PluginHandle getPlugin(String name) { return "AlphaTelephony".equals(name) ? new PluginHandle(plugin) : null; }
       public void execute(Runnable work) { work.run(); }
      }`,
    'PluginHandle.java': `package com.getcapacitor;
      public class PluginHandle {
       private final Object plugin;
       public PluginHandle(Object plugin) { this.plugin = plugin; }
       public Object getInstance() { return plugin; }
      }`,
    'ComposerPortHarness.java': `package ai.alphacompute.alphaphone;
      import android.net.Uri;
      import android.webkit.WebView;
      import androidx.webkit.*;
      import com.getcapacitor.*;
      import java.util.Set;
      import java.util.function.Consumer;
      import org.json.JSONObject;

      class MainActivity {
       final Bridge bridge = new Bridge();
       boolean assistant;
       boolean isAssistantSurface() { return assistant; }
       Bridge getBridge() { return bridge; }
      }
      class AlphaTelephonyPlugin {
       int attempts;
       void sendComposed(PluginCall call, boolean mms, Consumer<Runnable> queue) {
        String method = mms ? "sendComposedMms" : "sendComposedSms";
        if (!method.equals(call.method) || !"operation".equals(call.draft.getString("operationId")))
         throw new AssertionError("draft and transport identity must reach the port");
        queue.accept(() -> {
         attempts++;
         if (mms) call.reject("Refused", "denied");
         else call.resolve(new JSObject());
        });
       }
      }
      public class ComposerPortHarness {
       private static final String ID = "11223344-5566-7788-9900-aabbccddeeff";
       private static final String ORIGIN = "https://localhost";
       private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
       }
       private static void send(WebView view, String origin, boolean main, JavaScriptReplyProxy reply, String kind) {
        String request = "{\\"requestId\\":\\"" + ID + "\\",\\"kind\\":\\"" + kind + "\\",\\"draft\\":{\\"operationId\\":\\"operation\\"}}";
        WebViewCompat.listener.onPostMessage(view, new WebMessageCompat(request), new Uri(origin), main, reply);
       }
       public static void main(String[] args) {
        var activity = new MainActivity();
        var web = new WebView();
        var otherWeb = new WebView();
        var replies = new JavaScriptReplyProxy();
        var plugin = new AlphaTelephonyPlugin();
        activity.bridge.web = web;
        activity.bridge.plugin = plugin;

        AlphaMessagesComposerPort.install(activity, web);
        require(WebViewCompat.registrations == 0 && web.legacyInstalls == 0, "unsupported WebView must have no port");
        WebViewFeature.supported = true;
        WebViewCompat.failRegistration = true;
        AlphaMessagesComposerPort.install(activity, web);
        require(WebViewCompat.registrations == 1 && WebViewCompat.listener == null && web.legacyInstalls == 0,
         "failed registration must have no legacy port");
        WebViewCompat.failRegistration = false;
        AlphaMessagesComposerPort.install(activity, web);
        require(WebViewCompat.registrations == 2 && WebViewCompat.installedOn == web
         && "alphaMessagesComposer".equals(WebViewCompat.channel) && Set.of(ORIGIN).equals(WebViewCompat.origins),
         "registration restricts the channel to the packaged WebView and its exact origin");

        send(web, ORIGIN, false, replies, "sms");
        send(web, "http://localhost", true, replies, "sms");
        send(web, "https://localhost:444", true, replies, "sms");
        send(web, "https://localhost.example", true, replies, "sms");
        send(web, "https://other.example", true, replies, "sms");
        send(otherWeb, ORIGIN, true, replies, "sms");
        activity.assistant = true;
        send(web, ORIGIN, true, replies, "sms");
        activity.assistant = false;
        require(plugin.attempts == 0 && replies.messages.isEmpty(), "the origin, frame and surface gates prevent dispatch");

        activity.bridge.web = otherWeb;
        send(web, ORIGIN, true, replies, "sms");
        var unavailable = new JSONObject(replies.messages.remove(0));
        require(plugin.attempts == 0 && "unavailable".equals(unavailable.getJSONObject("error").getString("code")),
         "the request cannot reach a replacement bridge");
        activity.bridge.web = web;

        send(web, ORIGIN, true, replies, "sms");
        send(web, "https://localhost:443", true, replies, "mms");
        var sms = new JSONObject(replies.messages.get(0));
        var mms = new JSONObject(replies.messages.get(1));
        require(plugin.attempts == 2 && ID.equals(sms.getString("requestId")) && sms.has("result")
         && ID.equals(mms.getString("requestId")) && "denied".equals(mms.getJSONObject("error").getString("code")),
         "the same authenticated frame receives bounded results for SMS and MMS");
       }
      }`,
   };
   const files = Object.entries(stubs).map(([name, source]) => {
    const file = join(directory, name);
    writeFileSync(file, source);
    return file;
   });
   assert.doesNotThrow(() => runJvm([...files, nativeSource('AlphaMessagesComposerPort.java')],
    'ai.alphacompute.alphaphone.ComposerPortHarness', {json: true}));
  } finally {
   rmSync(directory, {recursive: true, force: true});
  }
});
