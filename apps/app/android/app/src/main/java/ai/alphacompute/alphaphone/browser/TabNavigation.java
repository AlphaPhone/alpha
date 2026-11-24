package ai.alphacompute.alphaphone.browser;

import java.net.URI;
import java.util.Locale;

/**
 * How Alpha's Browser moves a tab between addresses where Android's WebView alone would leave it
 * stuck: which plain-HTTP addresses go to HTTPS, and when a Back, Forward or address change the
 * host asked for stayed inside the page's current document. Pure JVM, so the rules are tested on the
 * host; the WebView, its callbacks and the tab state stay in AlphaBrowserPlugin.
 */
public final class TabNavigation {
  private TabNavigation() {}

  /**
   * The HTTPS form of a plain-HTTP address that this app may not load in the clear, or null when
   * the address is used as it is. Android refuses cleartext for every host Alpha does not allow it
   * for, so such an address could only fail; Chrome upgrades it the same way. An explicit port
   * names a server that may not speak TLS, and the device's own address is a developer's, so
   * both stay as written.
   */
  public static String httpsUpgrade(String url, boolean cleartextPermitted, boolean allowLoopback) {
    if (url == null || cleartextPermitted) return null;
    URI parsed;
    try {
      parsed = new URI(url);
    } catch (Exception invalid) {
      return null;
    }
    String host = parsed.getHost();
    if (!"http".equalsIgnoreCase(parsed.getScheme()) || host == null || host.isEmpty()
        || parsed.getRawUserInfo() != null || parsed.getPort() != -1) return null;
    if (allowLoopback && loopback(host)) return null;
    return "https" + url.substring(url.indexOf(':'));
  }

  /** The host of a plain-HTTP address, lower case, or null. */
  public static String httpHost(String url) {
    try {
      URI parsed = new URI(url);
      return "http".equalsIgnoreCase(parsed.getScheme()) && parsed.getHost() != null
          ? parsed.getHost().toLowerCase(Locale.ROOT) : null;
    } catch (Exception invalid) {
      return null;
    }
  }

  /**
   * Whether a history update settles a load the host started (Back, Forward, an address) inside the
   * document already shown: WebView then reports no page start and no first paint, only the new
   * address. It needs a committed page of the same origin, a load the host is waiting on, and no
   * new document started for it.
   */
  public static boolean settlesInDocument(boolean loading, boolean documentStarted, String lastCommittedUrl,
      boolean sameOrigin) {
    return loading && !documentStarted && lastCommittedUrl != null && !lastCommittedUrl.isEmpty() && sameOrigin;
  }

  private static boolean loopback(String host) {
    String name = host.toLowerCase(Locale.ROOT);
    return name.equals("localhost") || name.endsWith(".localhost") || name.startsWith("127.") || name.equals("[::1]");
  }
}
