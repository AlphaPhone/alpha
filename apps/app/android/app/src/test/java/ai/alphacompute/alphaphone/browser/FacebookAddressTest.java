// spec/app/browser/address.md, "A page that replaces its own address at its own origin, without loading another document, is still the same load"
package ai.alphacompute.alphaphone.browser;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import ai.eliza.plugins.browsersurface.BrowserWebOrigin;
import org.junit.Test;

/**
 * The address rules Facebook's hops meet, on the host JVM: facebook.com and www.facebook.com send a
 * phone to m.facebook.com, a tapped link goes through the l.facebook.com shim, and the mobile page
 * rewrites its own address before it first paints. AlphaBrowserRedirectTest drives the same hops
 * through the tab's WebView callbacks.
 */
public final class FacebookAddressTest {
 private static final String DESKTOP = "https://www.facebook.com/";
 private static final String MOBILE = "https://m.facebook.com/";
 private static final String REPLACED = "https://m.facebook.com/?_rdr";
 private static final String SHIM = "https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2F&h=AT0";

 @Test public void eachFacebookHostIsItsOwnOrigin() {
  assertFalse("facebook.com to m.facebook.com is another origin", BrowserWebOrigin.sameOrigin("https://facebook.com/", MOBILE));
  assertFalse("www to m is another origin", BrowserWebOrigin.sameOrigin(DESKTOP, MOBILE));
  assertFalse("the link shim is another origin", BrowserWebOrigin.sameOrigin(MOBILE, SHIM));
  assertFalse("the shim's destination is another origin", BrowserWebOrigin.sameOrigin(SHIM, "https://example.com/"));
  assertTrue("the mobile page's own rewrite stays at its origin", BrowserWebOrigin.sameOrigin(MOBILE, REPLACED));
  assertTrue(BrowserWebOrigin.sameOrigin(REPLACED, "https://m.facebook.com/login/?next=%2F#signup"));
 }

 @Test public void aHostBackWithinTheMobilePageSettlesInItsDocumentButNotAcrossAHop() {
  assertTrue(TabNavigation.settlesInDocument(true, false, REPLACED, BrowserWebOrigin.sameOrigin(MOBILE, REPLACED)));
  assertFalse("a hop to another origin is another load", TabNavigation.settlesInDocument(true, false, MOBILE, BrowserWebOrigin.sameOrigin(SHIM, MOBILE)));
  assertFalse("www to m is another load", TabNavigation.settlesInDocument(true, false, DESKTOP, BrowserWebOrigin.sameOrigin(MOBILE, DESKTOP)));
  assertFalse("a new document is another load", TabNavigation.settlesInDocument(true, true, REPLACED, true));
  assertFalse("nothing was waiting", TabNavigation.settlesInDocument(false, false, REPLACED, true));
 }

 @Test public void aPlainHttpFacebookAddressOrRedirectGoesToHttps() {
  assertEquals("https://facebook.com/", TabNavigation.httpsUpgrade("http://facebook.com/", false, false));
  assertEquals("https://m.facebook.com/home.php?ref=wizard", TabNavigation.httpsUpgrade("http://m.facebook.com/home.php?ref=wizard", false, false));
  assertEquals("m.facebook.com", TabNavigation.httpHost("http://M.Facebook.com/"));
  assertNull("an HTTPS hop is used as it is", TabNavigation.httpsUpgrade(MOBILE, false, false));
  assertNull(TabNavigation.httpHost(MOBILE));
 }
}
