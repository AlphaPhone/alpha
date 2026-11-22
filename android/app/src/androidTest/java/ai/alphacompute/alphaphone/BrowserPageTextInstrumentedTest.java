package ai.alphacompute.alphaphone;

import ai.eliza.plugins.browsersurface.BrowserReadingWorld;

import android.app.AlertDialog;
import android.os.SystemClock;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import org.junit.Test;
import static org.junit.Assert.*;

/**
 * J05 on Android: the page text every agent turn carries while a Browser page applies, read by the
 * native WebView's isolated world through AlphaBrowser.pageText (AlphaPageText).
 *
 * The page is a synthetic article served to the real isolated child WebView from memory at
 * https://reading.invalid. No public host is involved: the first tab is opened on
 * https://reading.invalid/start, which cannot resolve (RFC 6761), and every later document comes
 * from the test's shouldInterceptRequest wrapper around the tab's own client, so the class runs on an
 * offline emulator. Covered through the real AlphaBrowser plugin and the rendered controls:
 *  - the text is read from the committed document without fetching it again and without a dialog;
 *    frame, form, hidden and navigation content is never read, and a password or one-time-code
 *    field withholds the text;
 *  - the same text is reused for the same navigation and address; a new navigation or an in-page
 *    address change (pushState) reads again; another session or a private tab is refused;
 *  - a typed turn on the page while inference is unavailable dispatches nothing: the page text
 *    reaches no native call;
 *  - a note that carries a web source keeps it in the native encrypted store across a recreation and
 *    reopens exactly that address.
 *
 * Not covered: the agent's answer, which needs a connected agent. test/readable-page.test.mjs runs
 * the same extraction rules on fixtures in jsdom. Emulator evidence for the native boundary only;
 * not a real page, agent or device.
 *
 *   bun run test:android:instrumentation -- --owned-emulator --avd NAME --serial emulator-NNNN --classes BrowserPageText
 */
public final class BrowserPageTextInstrumentedTest {
 static final String BASE = "https://reading.invalid";
 static final String ARTICLE = "Synthetic orchard report: twelve raised beds are open to visitors.";
 private static final String OMITTED = "omitted-synthetic-marker";
 private final BrowserFlowInstrumentedTest child = new BrowserFlowInstrumentedTest();

 /** Every method here drives the views; on a signed-out flag-off build P-43's sign-in page covers them. */
 private static void gate() throws Exception {
  org.junit.Assume.assumeTrue("Explicit native page text campaign", "1".equals(InstrumentationRegistry.getArguments().getString("browserPageText")));
  AppNavigation.assumeNoRequiredSignIn("Browser page text");
 }
 /** Page text is read only in the WebView's isolated world. A provider without
  * JS_INJECTION_IN_FRAME_AND_WORLD (the emulator's WebView 133) answers "not readable" for every
  * page; BrowserReadingNavigationInstrumentedTest's
  * providerWithoutIsolatedWorldSaysReadingIsUnavailableAndInjectsNothing covers that provider. */
 static void assumeIsolatedReading() {
  org.junit.Assume.assumeTrue("This WebView provider has no isolated-world injection (JS_INJECTION_IN_FRAME_AND_WORLD), so no page text can be read; providerWithoutIsolatedWorldSaysReadingIsUnavailableAndInjectsNothing covers this provider", BrowserReadingWorld.supported());
 }
 private String js(String code) throws Exception { return WebViewTestDriver.evaluate(code); }
 private void waitFor(String condition) throws Exception {
  for (int i = 0; i < 300; i++) { if ("true".equals(js("Boolean(" + condition + ")"))) return; SystemClock.sleep(100); }
  fail("Page text state timed out: " + condition + "; " + child.diagnostics());
 }
 private void invoke(String code) throws Exception {
  js("window.__pageResult=null;Promise.resolve().then(()=>" + code + ").then(v=>window.__pageResult=JSON.stringify(v||{}),e=>window.__pageResult=JSON.stringify({error:true,message:String(e&&e.message||'')}))");
 }
 private JSONObject result() throws Exception { waitFor("window.__pageResult!==null"); return new JSONObject((String) new JSONTokener(js("window.__pageResult")).nextValue()); }
 private JSONObject call(String code) throws Exception { invoke(code); return result(); }
 private static MainActivity resumedActivity() {
  for (android.app.Activity activity : androidx.test.runner.lifecycle.ActivityLifecycleMonitorRegistry.getInstance().getActivitiesInStage(androidx.test.runner.lifecycle.Stage.RESUMED)) if (activity instanceof MainActivity) return (MainActivity) activity;
  throw new IllegalStateException("No resumed Alpha Activity");
 }
 /** The Read aloud review dialog, or null when none is showing: page text never opens one. */
 private static AlertDialog currentDialog() throws Exception {
  AtomicReference<AlertDialog> found = new AtomicReference<>();
  BoundedActivityScenario.main(() -> {
   try {
    Object plugin = resumedActivity().getBridge().getPlugin("AlphaBrowser").getInstance();
    java.lang.reflect.Field reading = AlphaBrowserPlugin.class.getDeclaredField("reading"); reading.setAccessible(true);
    java.lang.reflect.Field dialog = ai.alphacompute.alphaphone.browser.AlphaReviewedReading.class.getDeclaredField("dialog"); dialog.setAccessible(true);
    AlertDialog value = (AlertDialog) dialog.get(reading.get(plugin));
    found.set(value != null && value.isShowing() ? value : null);
   } catch (Exception error) { throw new AssertionError(error); }
  });
  return found.get();
 }
 /** In-memory pages for the visible tab: exact synthetic routes only; nothing is forwarded to a network. */
 static final class Pages implements AutoCloseable {
  final android.webkit.WebView web; final android.webkit.WebViewClient original;
  final Map<String, String> routes = Collections.synchronizedMap(new LinkedHashMap<>());
  final AtomicInteger requests = new AtomicInteger();
  Pages(String tabId) throws Exception {
   Object plugin = resumedActivity().getBridge().getPlugin("AlphaBrowser").getInstance();
   java.lang.reflect.Field tabs = AlphaBrowserPlugin.class.getDeclaredField("tabs"); tabs.setAccessible(true);
   Object tab = ((Map<?, ?>) tabs.get(plugin)).get(tabId); assertNotNull("The visible tab exists", tab);
   java.lang.reflect.Field field = tab.getClass().getDeclaredField("web"); field.setAccessible(true);
   web = (android.webkit.WebView) field.get(tab); original = web.getWebViewClient(); assertNotNull(original);
   web.setWebViewClient(new android.webkit.WebViewClient() {
    @Override public android.webkit.WebResourceResponse shouldInterceptRequest(android.webkit.WebView view, android.webkit.WebResourceRequest request) {
     if (request.isForMainFrame()) requests.incrementAndGet();
     String body = request.isForMainFrame() ? routes.get(request.getUrl().toString()) : null;
     return new android.webkit.WebResourceResponse("text/html", "UTF-8", body == null ? 403 : 200, body == null ? "Forbidden" : "OK", Collections.emptyMap(),
      new ByteArrayInputStream((body == null ? "Fixture route refused" : body).getBytes(StandardCharsets.UTF_8)));
    }
    @Override public void onPageStarted(android.webkit.WebView v, String url, android.graphics.Bitmap icon) { original.onPageStarted(v, url, icon); }
    @Override public void onPageCommitVisible(android.webkit.WebView v, String url) { original.onPageCommitVisible(v, url); }
    @Override public void onPageFinished(android.webkit.WebView v, String url) { original.onPageFinished(v, url); }
    @Override public void onReceivedError(android.webkit.WebView v, android.webkit.WebResourceRequest r, android.webkit.WebResourceError e) { original.onReceivedError(v, r, e); }
    @Override public void onReceivedHttpError(android.webkit.WebView v, android.webkit.WebResourceRequest r, android.webkit.WebResourceResponse e) { original.onReceivedHttpError(v, r, e); }
   });
  }
  @Override public void close() { web.setWebViewClient(original); }
 }
 private static String page(String article, String extra) {
  return "<html><head><title>Orchard report</title></head><body><article><p>" + article + "</p>" + extra + "</article></body></html>";
 }

 /** Records every native call the renderer makes, by plugin, method and serialized arguments. */
 private void recordNativeCalls() throws Exception {
  js("(()=>{if(window.__pageNative)return;window.__pageCalls=[];const note=(p,m,a)=>{let body='';try{body=JSON.stringify(a===undefined?null:a);}catch(e){body='[unserializable]';}window.__pageCalls.push({plugin:String(p),method:String(m),body});if(p==='AlphaBrowser'&&m==='present'&&a&&a.id)window.__pageTab={session:a.session,id:a.id};};"
   + "const C=window.Capacitor;window.__pageNative={nativePromise:C.nativePromise,nativeCallback:C.nativeCallback};"
   + "C.nativePromise=function(p,m,a){note(p,m,a);return window.__pageNative.nativePromise.apply(this,arguments);};"
   + "if(typeof C.nativeCallback==='function')C.nativeCallback=function(p,m,a){note(p,m,a);return window.__pageNative.nativeCallback.apply(this,arguments);};})()");
 }
 /** Native calls that carried the marker anywhere except encrypted draft storage on this device. */
 JSONArray leaks(String marker) throws Exception {
  return new JSONArray((String) new JSONTokener(js("JSON.stringify(window.__pageCalls.filter(c=>c.body.includes(" + JSONObject.quote(marker) + ")&&!(c.plugin==='AlphaConnection'&&/^secure(Read|Write|Remove|CompareExchange)$/.test(c.method))).map(c=>c.plugin+'.'+c.method))")).nextValue());
 }
 void restoreNativeCalls() throws Exception {
  js("(()=>{const C=window.Capacitor,o=window.__pageNative;if(o){C.nativePromise=o.nativePromise;if(o.nativeCallback)C.nativeCallback=o.nativeCallback;}"
   + "Promise.resolve(window.__pageListener).then(h=>h&&h.remove&&h.remove()).catch(()=>{});for(const k of ['__pageNative','__pageCalls','__pageTab','__pageState','__pageArgs','__pageResult','__pageListener'])delete window[k];})()");
 }

 static final String START = BASE + "/start";
 /** Opens the Browser view, creates its first tab on an address that cannot resolve, then serves
  * that tab from memory: the fixture's start page is committed before this returns. */
 Pages openBrowser() throws Exception {
  AppNavigation.liveMode(); js(AppNavigation.request("Browser")); waitFor(AppNavigation.selected("Browser")); waitFor("window.__alphaTestNavigation?.status==='complete'");
    // The native page is withdrawn while the modal first-run access panel is open; answer it first, as an owner does.
    AppNavigation.declineStartupAccess();
  recordNativeCalls();
  String address = "(()=>{const e=document.querySelector('input[aria-label=Address]');if(!e)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e," + JSONObject.quote(START) + ");e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return true;})()";
  if (!"true".equals(js(address))) {
   js("[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Edit address'||b.getAttribute('aria-label')==='Search or type address')?.click()");
   waitFor("document.querySelector('input[aria-label=Address]')");
   assertEquals("true", js(address));
  }
  // The tab exists once the plugin presented it; its first load fails offline (reading.invalid never resolves).
  waitFor("window.__pageTab");
  String tabId = new JSONObject((String) new JSONTokener(js("JSON.stringify(window.__pageTab)")).nextValue()).getString("id");
  AtomicReference<Pages> pages = new AtomicReference<>();
  for (int i = 0; i < 100 && pages.get() == null; i++) {
   BoundedActivityScenario.main(() -> { try { pages.set(new Pages(tabId)); } catch (AssertionError notYet) { /* The tab's WebView is attached after present resolves. */ } catch (Exception error) { throw new AssertionError(error); } });
   if (pages.get() == null) SystemClock.sleep(100);
  }
  assertNotNull("The visible tab's WebView was created", pages.get());
  js("window.__pageState=null;window.__pageListener=Capacitor.Plugins.AlphaBrowser.addListener('stateChanged',state=>{if(state&&state.id===window.__pageTab.id)window.__pageState=state;})");
  // From here on every top-level document is the fixture's: commit the start page.
  pages.get().routes.put(START, page("Synthetic start page.", ""));
  open(START);
  waitFor("document.querySelector('[role=img][aria-label=\"Secure connection\"]')");
  return pages.get();
 }
 /** Navigates the visible tab and waits for that exact document to be committed and idle. */
 private void open(String url) throws Exception {
  js("window.__pageState=null"); // Only a state reported after this navigation counts.
  JSONObject navigation = call("Capacitor.Plugins.AlphaBrowser.navigate({...window.__pageTab,url:" + JSONObject.quote(url) + "})");
  assertTrue("Native navigation returns its state: " + navigation, navigation.get("error") instanceof String);
  assertEquals("", navigation.getString("error"));
  waitFor("window.__pageState?.url===" + JSONObject.quote(url) + "&&window.__pageState.committed&&!window.__pageState.loading&&!window.__pageState.error");
  assertEquals(url, new JSONTokener(child.child("location.href")).nextValue());
  js("window.__pageArgs={session:window.__pageState.session,id:window.__pageState.id,url:window.__pageState.url,navigation:window.__pageState.navigation}");
 }
 private static final String READ = "Capacitor.Plugins.AlphaBrowser.pageText({session:window.__pageArgs.session,id:window.__pageArgs.id,maxChars:4000})";
 private JSONObject read() throws Exception { JSONObject text = call(READ); assertFalse("pageText answers: " + text, text.optBoolean("error")); return text; }

 @Test public void pageTextIsReadSilentlyFromTheCommittedDocument() throws Exception {
  gate(); assumeIsolatedReading();
  try (BoundedActivityScenario<MainActivity> scenario = BoundedActivityScenario.launch(MainActivity.class)) {
   Pages pages = null; Throwable primary = null;
   try {
    pages = openBrowser();
    String garden = BASE + "/garden";
    pages.routes.put(garden, page(ARTICLE, "<iframe srcdoc=\"<p>frame-" + OMITTED + "</p>\"></iframe><nav>nav-" + OMITTED + "</nav><form><button>button-" + OMITTED + "</button><input value='input-" + OMITTED + "'></form><p hidden>hidden-" + OMITTED + "</p><p style='opacity:0'>clear-" + OMITTED + "</p><p>Order 12345678 ships Friday.</p>"));
    open(garden);
    int before = pages.requests.get();
    JSONObject text = read();
    assertEquals(garden, text.getString("url"));
    assertEquals("Orchard report", text.getString("title"));
    assertTrue("The article is read: " + text, text.getString("text").contains(ARTICLE));
    assertTrue("Long numbers are ordinary text", text.getString("text").contains("Order 12345678 ships Friday."));
    assertFalse("Frame, navigation, form, hidden and transparent content is never read", text.toString().contains(OMITTED));
    assertEquals("Reading uses the loaded document; it never fetches the page again", before, pages.requests.get());
    assertNull("No dialog is shown", currentDialog());
    // A sign-in field anywhere withholds the text; the address and title stay.
    String signIn = BASE + "/sign-in";
    pages.routes.put(signIn, page(ARTICLE, "<input type='password'>"));
    open(signIn);
    JSONObject withheld = read();
    assertEquals("sign-in form on this page", withheld.getString("textUnavailable"));
    assertFalse(withheld.has("text"));
    assertEquals("The page text reached no native call", 0, leaks(ARTICLE).length());
   } catch (Exception | AssertionError failure) { primary = failure; throw failure; } finally { cleanup(pages, primary); }
  }
 }

 @Test public void pageTextIsReusedForTheSameDocumentAndReadAgainWhenTheAddressChanges() throws Exception {
  gate(); assumeIsolatedReading();
  try (BoundedActivityScenario<MainActivity> scenario = BoundedActivityScenario.launch(MainActivity.class)) {
   Pages pages = null; Throwable primary = null;
   try {
    pages = openBrowser();
    String garden = BASE + "/garden";
    pages.routes.put(garden, page(ARTICLE, ""));
    open(garden);
    assertTrue(read().getString("text").contains(ARTICLE));
    // The same navigation and address: the cached text, even though the document changed since.
    assertEquals("true", child.child("document.querySelector('article p').textContent='Changed in place';true"));
    assertTrue("The same document is not read again within a minute", read().getString("text").contains(ARTICLE));
    // An in-page navigation changes the address, so it is read again.
    assertEquals("true", child.child("history.pushState({},'',location.pathname+'?view=2');true"));
    JSONObject moved = read();
    assertEquals(garden + "?view=2", moved.getString("url"));
    assertTrue(moved.getString("text").contains("Changed in place"));
    // A new navigation reads its own document.
    open(garden);
    assertTrue(read().getString("text").contains(ARTICLE));
    // Another browser session is refused.
    JSONObject foreign = call("Capacitor.Plugins.AlphaBrowser.pageText({session:'another-session',id:window.__pageArgs.id,maxChars:4000})");
    assertTrue(foreign.toString(), foreign.optBoolean("error"));
   } catch (Exception | AssertionError failure) { primary = failure; throw failure; } finally { cleanup(pages, primary); }
  }
 }

 @Test public void aPrivateTabIsNeverRead() throws Exception {
  gate(); assumeIsolatedReading();
  try (BoundedActivityScenario<MainActivity> scenario = BoundedActivityScenario.launch(MainActivity.class)) {
   Pages pages = null; Throwable primary = null;
   String id = "bpagetext" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
   try {
    pages = openBrowser();
    JSONObject created = call("Capacitor.Plugins.AlphaBrowser.create({session:window.__pageArgs.session,id:" + JSONObject.quote(id) + ",private:true})");
    assertFalse(created.toString(), created.optBoolean("error"));
    JSONObject refused = call("Capacitor.Plugins.AlphaBrowser.pageText({session:window.__pageArgs.session,id:" + JSONObject.quote(id) + ",maxChars:4000})");
    assertTrue(refused.toString(), refused.optBoolean("error"));
    assertEquals("Private tabs are not read", refused.getString("message"));
   } catch (Exception | AssertionError failure) { primary = failure; throw failure; } finally {
    try { js("Capacitor.Plugins.AlphaBrowser.close({session:window.__pageArgs?.session,id:" + JSONObject.quote(id) + "}).catch(()=>{})"); } catch (Exception | AssertionError ignored) { /* The tab may not exist. */ }
    cleanup(pages, primary);
   }
  }
 }

 private static String visibleButton(String label) {
  return "[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')===" + JSONObject.quote(label) + "||b.textContent.trim()===" + JSONObject.quote(label) + ")&&b.getClientRects().length&&!b.disabled)";
 }
 private void tap(String label) throws Exception { waitFor(visibleButton(label)); js("(" + visibleButton(label) + ").click()"); }
 /** A unique marker without digits, so it reads as one word. */
 private static String letters(UUID value) {
  StringBuilder out = new StringBuilder();
  for (char c : value.toString().replace("-", "").toCharArray()) out.append(Character.isDigit(c) ? (char) ('g' + (c - '0')) : c);
  return out.toString();
 }

 @Test public void aTurnOnThePageDispatchesNothingWithoutAnAgent() throws Exception {
  gate(); assumeIsolatedReading();
  try (BoundedActivityScenario<MainActivity> scenario = BoundedActivityScenario.launch(MainActivity.class)) {
   Pages pages = null; Throwable primary = null;
   try {
    pages = openBrowser();
    sendOnPageWithoutInference(pages, BASE + "/garden");
   } catch (Exception | AssertionError failure) { primary = failure; throw failure; } finally { cleanup(pages, primary); }
  }
 }

 /** A typed question on the page -> Send while inference is unavailable (decision P-43: the resident
  * is running with no network; nothing is dispatched and the draft is kept). Shared with
  * JourneyJ05InstrumentedTest. Returns the question that stayed in the composer. */
 String sendOnPageWithoutInference(Pages pages, String garden) throws Exception {
    String question = "What does this page say " + letters(UUID.randomUUID()) + "?";
    pages.routes.put(garden, page(ARTICLE, "<p hidden>hidden-" + OMITTED + "</p>"));
    open(garden);
    String composer = AppNavigation.composer();
    waitFor(composer);
    js("(()=>{const e=" + composer + ";Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e," + JSONObject.quote(question) + ");e.dispatchEvent(new Event('input',{bubbles:true}));})()");
    waitFor("document.querySelector('button[aria-label=Send]')&&!document.querySelector('button[aria-label=Send]').disabled");
    int before = Integer.parseInt(js("window.__pageCalls.length"));
    js("document.querySelector('button[aria-label=Send]').click()");
    // The send is seen settling in the composer's own saved copy: marked as sending, then unmarked.
    waitFor("(m=>m.includes(true)&&m[m.length-1]===false)(window.__pageCalls.slice(" + before + ").filter(c=>{if(c.plugin!=='AlphaConnection'||c.method!=='secureCompareExchange')return false;try{const b=JSON.parse(c.body);return String(b.slot).startsWith('assistant-draft:v1:')&&!!b.value;}catch(e){return false;}}).map(c=>JSON.parse(JSON.parse(c.body).value).sending===true))");
    assertEquals("No refusal text at the composer", "false", js("document.body.innerText.includes('Your message is back in the composer')"));
    assertEquals("No connection chooser opens", "false", js("!!document.querySelector('.alpha-connection-scrim')"));
    assertNull("No dialog is shown", currentDialog());
    assertEquals("Send while inference is unavailable dispatches nothing: " + leaks(question), 0, leaks(question).length());
    assertEquals("The page text reached no native call", 0, leaks(ARTICLE).length());
    waitFor("[...document.querySelectorAll('textarea[data-alpha-composer]')].some(e=>e.value.includes(" + JSONObject.quote(question) + "))");
    return question;
 }

 /** The note shape the summary save writes, stored through the real encrypted Notes bridge. */
 @Test public void noteWithAWebSourceKeepsItAcrossRecreationAndReopensThatAddress() throws Exception {
  gate();
  String id = "page-text-" + UUID.randomUUID();
  try (BoundedActivityScenario<MainActivity> scenario = BoundedActivityScenario.launch(MainActivity.class)) {
   Throwable primary = null;
   try {
    sourceNoteSurvivesRecreationAndReopens(scenario, id, BASE + "/garden");
   } catch (Exception | AssertionError failure) { primary = failure; throw failure; } finally {
    try {
     restoreNativeCalls();
     NotesSecureFixture.replaceRecords("records=>records.filter(n=>n.id!==" + JSONObject.quote(id) + ")");
    } catch (Exception | AssertionError failure) { if (primary != null) primary.addSuppressed(failure); else throw failure; }
   }
  }
 }

 /** Stores a note with this web source through the encrypted Notes bridge, recreates the Activity and
  * reopens the source from the note. Shared with JourneyJ05InstrumentedTest; the caller removes `id`. */
 void sourceNoteSurvivesRecreationAndReopens(BoundedActivityScenario<MainActivity> scenario, String id, String url) throws Exception {
    String title = "Orchard summary " + letters(UUID.randomUUID()).substring(0, 8);
    AppNavigation.liveMode(); js(AppNavigation.request("Notes")); waitFor(AppNavigation.selected("Notes")); waitFor("window.__alphaTestNavigation?.status==='complete'");
    String note = new JSONObject().put("id", id).put("kind", "text").put("title", title).put("body", "The orchard has twelve raised beds.")
     .put("webSource", new JSONObject().put("kind", "web-page").put("version", 1).put("name", "Orchard report").put("url", url))
     .put("pinned", false).put("when", "Now").put("createdAt", System.currentTimeMillis()).put("modifiedAt", System.currentTimeMillis()).toString();
    NotesSecureFixture.replaceRecords("records=>[" + note + ",...records.filter(n=>n.id!==" + JSONObject.quote(id) + ")]");
    scenario.recreate();
    AppNavigation.liveMode(); js(AppNavigation.request("Notes")); waitFor(AppNavigation.selected("Notes"));
    String open = "document.querySelector('button[aria-label=" + JSONObject.quote("Open " + title).replace("'", "\\'") + "]')";
    waitFor(open); js(open + ".click()");
    // The note still offers its source after the process rebuilt its state from encrypted storage.
    tap("Web source linked");
    String source = "document.querySelector('dialog[aria-label=\"Note web source\"]')";
    waitFor(source);
    assertEquals("The source dialog shows the exact saved address", "true", js(source + ".textContent.includes(" + JSONObject.quote(url) + ")"));
    assertEquals("true", NotesSecureFixture.evaluate("__notesEnvelope.records.find(n=>n.id===" + JSONObject.quote(id) + ")?.webSource?.url===" + JSONObject.quote(url)));
    // Open source page asks the native browser for exactly that address.
    recordNativeCalls();
    String openSource = "[..." + source + ".querySelectorAll('button')].find(b=>b.textContent.trim()==='Open source page'&&!b.disabled)";
    waitFor(openSource); js("(" + openSource + ").click()");
    waitFor(AppNavigation.selected("Browser"));AppNavigation.declineStartupAccess();
    waitFor("window.__pageCalls.some(c=>c.plugin==='AlphaBrowser'&&c.method==='navigate'&&JSON.parse(c.body).url===" + JSONObject.quote(url) + ")");
 }

 void cleanup(Pages pages, Throwable primary) throws Exception {
  try {
   js("Capacitor.Plugins.AlphaBrowser.cancelReading(window.__pageTab||{}).catch(()=>{})");
   js("(()=>{for(const e of document.querySelectorAll('textarea[data-alpha-composer]')){Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,'');e.dispatchEvent(new Event('input',{bubbles:true}));}})()");
   if (pages != null) { Pages owned = pages; BoundedActivityScenario.main(owned::close); }
   restoreNativeCalls();
   js("delete window.__pageOld;delete window.__pageMoved");
  } catch (Exception | AssertionError failure) { if (primary != null) primary.addSuppressed(failure); else throw failure; }
 }
}
