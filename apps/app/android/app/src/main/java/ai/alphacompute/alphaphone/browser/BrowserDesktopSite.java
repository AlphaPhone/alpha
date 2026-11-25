package ai.alphacompute.alphaphone.browser;

import java.util.regex.Pattern;

/** Desktop User-Agent derivation for Android WebView tabs (never touches host WebView). */
public final class BrowserDesktopSite {
 private static final Pattern ANDROID_PLATFORM = Pattern.compile("\\(Linux;\\s*Android[^)]*\\)");
 private static final Pattern MOBILE_TOKEN = Pattern.compile("\\s+Mobile\\b");
 private static final Pattern WV_TOKEN = Pattern.compile(";\\s*wv\\b");
 private static final String FALLBACK = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

 private BrowserDesktopSite() {}

 public static String userAgent(String mobileUserAgent) {
  if (mobileUserAgent == null || mobileUserAgent.isBlank()) return FALLBACK;
  String desktop = ANDROID_PLATFORM.matcher(mobileUserAgent).replaceFirst("(X11; Linux x86_64)");
  desktop = WV_TOKEN.matcher(desktop).replaceAll("");
  desktop = MOBILE_TOKEN.matcher(desktop).replaceAll("");
  String trimmed = desktop.trim();
  return trimmed.isEmpty() ? FALLBACK : trimmed;
 }
}
