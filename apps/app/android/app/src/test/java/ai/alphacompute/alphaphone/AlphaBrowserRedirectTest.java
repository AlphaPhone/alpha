// spec/app/browser/address.md, "A page can go on to another page by itself, through a link or a redirect"; spec/app/browser/address.md, "A page that replaces its own address at its own origin, without loading another document, is still the same load"; spec/app/browser/address.md, "Another origin, or another document, is never taken as the same load"
package ai.alphacompute.alphaphone;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;
import static org.robolectric.Shadows.shadowOf;

import ai.alphacompute.alphaphone.browser.TabFrame;
import ai.alphacompute.alphaphone.browser.TabLayer;
import android.content.Context;
import android.net.Uri;
import android.os.Looper;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebViewRenderProcess;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.getcapacitor.JSObject;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.LooperMode;

/**
 * Facebook's hops through one Browser tab, as the Android WebView reports them to the tab's
 * callbacks (AlphaBrowserPlugin.tabClient): facebook.com redirected to m.facebook.com, the mobile
 * page's own address rewrite before first paint, and a tapped link through the l.facebook.com shim.
 * Each stays in the tab it started in. The v121 release fixed the rewrite, which had left the page
 * behind the loading notice until the 30-second timeout.
 *
 * <p>The engine is a WebView whose current address, progress and renderer the test sets, so the
 * callback order is the one the test writes. This shows the tab's rules for each order; it is not
 * a run of Chromium or of facebook.com.
 */
@RunWith(RobolectricTestRunner.class)
@Config(manifest = Config.NONE, sdk = 35)
@LooperMode(LooperMode.Mode.PAUSED)
public final class AlphaBrowserRedirectTest {
 private static final String FACEBOOK = "https://facebook.com/";
 private static final String DESKTOP = "https://www.facebook.com/";
 private static final String MOBILE = "https://m.facebook.com/";
 private static final String REPLACED = "https://m.facebook.com/?_rdr";
 private static final String SHIM = "https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2F&h=AT0";
 private static final String SITE = "https://example.com/";

 /** The WebView as a test drives it: the address it shows, its progress and a live renderer. */
 static final class Engine extends WebView {
  final List<String> loaded = new ArrayList<>();
  String shown;
  int progress;
  Engine(Context context) { super(context); }
  @Override public String getUrl() { return shown; }
  @Override public int getProgress() { return progress; }
  @Override public void loadUrl(String url) { loaded.add(url); }
  @Override public WebViewRenderProcess getWebViewRenderProcess() {
   return new WebViewRenderProcess() { @Override public boolean terminate() { return false; } };
  }
 }

 /** A main-frame request as the engine reports it. */
 private static WebResourceRequest request(String url, boolean redirect, boolean gesture) {
  return new WebResourceRequest() {
   @Override public Uri getUrl() { return Uri.parse(url); }
   @Override public boolean isForMainFrame() { return true; }
   @Override public boolean isRedirect() { return redirect; }
   @Override public boolean hasGesture() { return gesture; }
   @Override public String getMethod() { return "GET"; }
   @Override public Map<String, String> getRequestHeaders() { return Collections.emptyMap(); }
  };
 }

 private final List<String> notices = new ArrayList<>();
 private final List<JSObject> states = new ArrayList<>();
 private AlphaBrowserPlugin plugin;
 private AlphaBrowserPlugin.Tab tab;
 private Engine engine;
 private WebViewClient client;

 @Before public void openOneTab() throws Exception {
  plugin = new AlphaBrowserPlugin() {
   @Override protected void notifyListeners(String event, JSObject data) {
    if ("notice".equals(event)) notices.add(data.getString("message"));
    if ("stateChanged".equals(event)) states.add(data);
   }
  };
  Context context = RuntimeEnvironment.getApplication();
  engine = new Engine(context);
  tab = new AlphaBrowserPlugin.Tab();
  tab.id = "tab-1";
  tab.web = engine;
  tab.frame = new TabFrame(context, TabLayer.ABOVE_HOST);
  tab.status = new LinearLayout(context);
  tab.message = new TextView(context);
  tab.browserRetry = new Button(context);
  tab.status.addView(tab.message);
  tab.status.addView(tab.browserRetry);
  tab.frame.addView(tab.status);
  tabs().put(tab.id, tab);
  client = plugin.tabClient(tab);
 }

 @SuppressWarnings("unchecked")
 private Map<String, AlphaBrowserPlugin.Tab> tabs() throws Exception {
  Field field = AlphaBrowserPlugin.class.getDeclaredField("tabs");
  field.setAccessible(true);
  return (Map<String, AlphaBrowserPlugin.Tab>) field.get(plugin);
 }

 private void present() throws Exception {
  Field field = AlphaBrowserPlugin.class.getDeclaredField("presentedId");
  field.setAccessible(true);
  field.set(plugin, tab.id);
 }

 /** The owner's address, as the renderer's navigate sends it. */
 private void typed(String url) throws Exception {
  Method load = AlphaBrowserPlugin.class.getDeclaredMethod("load", AlphaBrowserPlugin.Tab.class, String.class);
  load.setAccessible(true);
  load.invoke(plugin, tab, url);
 }

 /** The engine moves the main frame to {@code url}, as a link, script or server redirect does; whether the tab let it. */
 private boolean requested(String url, boolean redirect, boolean gesture) {
  WebResourceRequest request = request(url, redirect, gesture);
  boolean overridden = client.shouldOverrideUrlLoading(engine, request);
  if (!overridden) assertNull(client.shouldInterceptRequest(engine, request));
  return !overridden;
 }

 /** A new document starts at {@code url}. */
 private void started(String url) {
  engine.shown = url;
  engine.progress = 10;
  client.onPageStarted(engine, url, null);
 }

 /** The page changes its own address with history.replaceState; the update arrives as a posted task. */
 private void rewrote(String url) {
  engine.shown = url;
  client.doUpdateVisitedHistory(engine, url, false);
  shadowOf(Looper.getMainLooper()).idle();
 }

 /** The engine first paints the document it reports as {@code url}, then finishes it. */
 private void painted(String url) {
  engine.progress = 100;
  client.onPageCommitVisible(engine, url);
 }

 private void finished() {
  client.onPageFinished(engine, engine.shown);
 }

 /** facebook.com typed, sent on to m.facebook.com, shown under the address the page gave itself. */
 private void facebookShown() throws Exception {
  typed(FACEBOOK);
  assertTrue(requested(FACEBOOK, false, false));
  assertTrue(requested(DESKTOP, true, false));
  assertTrue(requested(MOBILE, true, false));
  started(MOBILE);
  rewrote(REPLACED);
  painted(MOBILE);
  finished();
 }

 private JSObject last() { return states.get(states.size() - 1); }

 private void assertShown(String url) throws Exception {
  assertEquals(url, tab.url);
  assertEquals(url, tab.lastCommittedUrl);
  assertTrue("committed", tab.committed);
  assertFalse("not loading", tab.loading);
  assertEquals("", tab.error);
  assertEquals("", tab.elsewhereUrl);
  JSObject state = last();
  assertEquals(url, state.getString("url"));
  assertTrue(state.getBool("committed"));
  assertFalse(state.getBool("loading"));
  assertEquals("", state.getString("error"));
  assertSame("the same tab", tab, tabs().get("tab-1"));
  assertEquals("no other tab", 1, tabs().size());
 }

 @Test public void facebookRedirectsToTheMobilePageAndCommitsUnderTheAddressItGaveItself() throws Exception {
  typed(FACEBOOK);
  assertEquals("the owner's address is loaded once", Collections.singletonList(FACEBOOK), engine.loaded);
  assertTrue("the redirect hops stay in the tab", requested(FACEBOOK, false, false) && requested(DESKTOP, true, false) && requested(MOBILE, true, false));
  started(MOBILE);
  long load = tab.navigation;
  rewrote(REPLACED);
  assertTrue("still loading before first paint", tab.loading && !tab.committed);
  painted(MOBILE);
  assertShown(REPLACED);
  assertEquals("the rewrite is the same load", load, tab.navigation);
  assertEquals(String.valueOf(load), last().getString("navigation"));
  finished();
  assertShown(REPLACED);
  assertEquals(load, tab.navigation);
  assertTrue(notices.isEmpty());
 }

 @Test public void aTappedLinkThroughTheShimFollowsItsRedirectInTheSameTab() throws Exception {
  facebookShown();
  long page = tab.navigation;
  assertTrue("the tapped shim link loads in this tab", requested(SHIM, false, true));
  assertTrue("its redirect does too", requested(SITE, true, false));
  started(SITE);
  painted(SITE);
  finished();
  assertShown(SITE);
  assertEquals("one new load", page + 1, tab.navigation);
  assertTrue(notices.isEmpty());
 }

 @Test public void theShimsLeavingPageHandsOnToTheSiteInTheSameTab() throws Exception {
  facebookShown();
  assertTrue(requested(SHIM, false, true));
  started(SHIM);
  painted(SHIM);
  finished();
  assertShown(SHIM);
  long shim = tab.navigation;
  assertTrue("the page's own script moves on in this tab", requested(SITE, false, false));
  started(SITE);
  painted(SITE);
  finished();
  assertShown(SITE);
  assertEquals(shim + 1, tab.navigation);
  assertTrue(notices.isEmpty());
 }

 @Test public void aLateFirstPaintOfTheFacebookPageIsNotTakenForTheSiteThatReplacedIt() throws Exception {
  facebookShown();
  assertTrue(requested(SHIM, false, true));
  assertTrue(requested(SITE, true, false));
  started(SITE);
  painted(REPLACED);
  assertEquals(SITE, tab.url);
  assertTrue("still loading the site", tab.loading && !tab.committed);
  assertEquals(REPLACED, tab.lastCommittedUrl);
  painted(SITE);
  assertShown(SITE);
 }

 @Test public void theRewrittenAddressIsNotTakenOnceAnotherRequestOwnsTheTab() throws Exception {
  typed(FACEBOOK);
  requested(MOBILE, true, false);
  started(MOBILE);
  rewrote(REPLACED);
  assertTrue("the page's script sends the tab on before it paints", requested(SHIM, false, false));
  painted(MOBILE);
  assertFalse("the rewrite is not adopted for another request", tab.committed);
  assertTrue(tab.loading);
  assertEquals(MOBILE, tab.url);
  assertEquals("", tab.lastCommittedUrl);
 }

 @Test public void aFirstPaintShownAtAnotherOriginIsNeverTheSameLoad() throws Exception {
  typed(FACEBOOK);
  requested(DESKTOP, true, false);
  started(DESKTOP);
  engine.shown = MOBILE;
  painted(DESKTOP);
  assertFalse("www.facebook.com is not committed under m.facebook.com", tab.committed);
  assertEquals(DESKTOP, tab.url);
  long desktop = tab.navigation;
  requested(MOBILE, false, false);
  started(MOBILE);
  painted(MOBILE);
  assertShown(MOBILE);
  assertEquals("m.facebook.com is the load the page followed", desktop + 1, tab.navigation);
 }

 @Test public void anUntappedAppLinkProbeOnTheFacebookPageStaysSilent() throws Exception {
  facebookShown();
  present();
  long page = tab.navigation;
  assertFalse("an app link never loads in the tab", requested("fb://page/?id=4", false, false));
  assertTrue("no notice for a probe on a shown page", notices.isEmpty());
  assertShown(REPLACED);
  assertEquals(page, tab.navigation);
 }

 @Test public void anUntappedIntentLinkOnTheFacebookPageIsBlockedAndThePageStays() throws Exception {
  facebookShown();
  present();
  long page = tab.navigation;
  assertFalse("an intent link never loads in the tab", requested("intent://profile/#Intent;scheme=fb;package=com.facebook.katana;end", false, false));
  assertEquals(List.of("Blocked a link to another app that opened without a tap."), notices);
  assertShown(REPLACED);
  assertEquals(page, tab.navigation);
 }
}
