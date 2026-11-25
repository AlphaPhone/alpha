// spec/app/browser/share.md, "A page that could not load or timed out at an HTTPS address may open in another browser; any other failure may not"
package ai.alphacompute.alphaphone.browser;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.webkit.WebViewClient;
import org.junit.Test;

public final class BrowserFailedPageTest {
  @Test public void recognizesOnlyNetworkFailuresForHandoff() {
    assertTrue(TabNavigation.isUnreachableError(WebViewClient.ERROR_HOST_LOOKUP));
    assertTrue(TabNavigation.isUnreachableError(WebViewClient.ERROR_CONNECT));
    assertTrue(TabNavigation.isUnreachableError(WebViewClient.ERROR_IO));
    assertTrue(TabNavigation.isUnreachableError(WebViewClient.ERROR_TIMEOUT));
  }

  @Test public void keepsTlsAuthenticationAndPolicyRefusalsInTheTab() {
    assertFalse(TabNavigation.isUnreachableError(WebViewClient.ERROR_FAILED_SSL_HANDSHAKE));
    assertFalse(TabNavigation.isUnreachableError(WebViewClient.ERROR_AUTHENTICATION));
    assertFalse(TabNavigation.isUnreachableError(WebViewClient.ERROR_PROXY_AUTHENTICATION));
    assertFalse(TabNavigation.isUnreachableError(WebViewClient.ERROR_UNSAFE_RESOURCE));
    assertFalse(TabNavigation.isUnreachableError(WebViewClient.ERROR_UNSUPPORTED_SCHEME));
    assertFalse(TabNavigation.isUnreachableError(WebViewClient.ERROR_UNKNOWN));
  }
}
