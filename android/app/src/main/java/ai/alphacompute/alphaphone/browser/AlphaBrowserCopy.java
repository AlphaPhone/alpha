package ai.alphacompute.alphaphone.browser;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * What Alpha's Browser says in its own native windows: the site permission prompt, the website
 * sign-in prompt and the message drawn in a tab's frame while its page loads or after it fails.
 *
 * <p>The tab host's refusals, notices and page errors still travel to Alpha's renderer as the
 * shared host's fixed sentences, which apps/app/src/ui/browser/browser-messages.ts words for the
 * screen. {@link #PAGE_ERRORS} is that file's page-error table, so the frame and the renderer say
 * the same thing; test/browser-native-copy.test.mjs keeps the two equal. Pure JVM.
 */
public final class AlphaBrowserCopy {
  private AlphaBrowserCopy() {}

  // ---- Tab frame ------------------------------------------------------------------------------

  /** Shown in the tab's frame from the start of a navigation until the page commits. */
  public static final String LOADING = "Loading page…";
  /** Shown when a download left the tab without a page. */
  public static final String DOWNLOAD_REQUESTED = "Download requested. Enter an address to keep browsing.";
  /** Shown when a load the host started went to a link for another app and left no page. */
  public static final String LEFT_WEB = "This address goes to another app. Enter an address to keep browsing.";
  /** A page error the table below does not know. */
  public static final String PAGE_ERROR_FALLBACK = "The page didn’t load. Reload to try again.";

  /** Keyed by every reason the tab host gives for a page it could not show. */
  public static final Map<String, String> PAGE_ERRORS;

  static {
    Map<String, String> errors = new LinkedHashMap<>();
    errors.put("This page is taking too long. Check your connection, then reload from the menu.",
        "The page is taking too long to load. Check your connection, then reload from the menu.");
    errors.put("This address type is not supported.", "Browser can’t open this kind of address.");
    errors.put("Isolated browser renderer is unavailable.", "Browser can’t show pages right now. Close this tab and open a new one.");
    errors.put("Secure connection failed. The certificate was not accepted.", "Secure connection failed: the site’s certificate wasn’t accepted.");
    errors.put("Page could not load. Check the address and connection, then reload.",
        "The page didn’t load. Check the address and connection, then reload.");
    errors.put("This site asks for a password over an insecure connection. It was not sent.",
        "This site asked for a password over an insecure connection. Nothing was sent.");
    errors.put("Sign-in was cancelled. Reload to try again.", "Sign-in cancelled. Reload to try again.");
    errors.put("Sign-in failed. Reload to try again.", "Sign-in didn’t work. Reload to try again.");
    errors.put("Loading stopped. Reload from the menu to try again.", "Loading stopped. Reload from the menu to try again.");
    errors.put("This site has no secure (HTTPS) connection.", "This site has no secure (HTTPS) connection, so it can’t be opened.");
    errors.put("Browser renderer stopped. Close this tab and open a new one.", "This tab stopped working. Close it and open a new one.");
    PAGE_ERRORS = java.util.Collections.unmodifiableMap(errors);
  }

  /** Alpha's sentence for a page the tab host could not show. */
  public static String pageError(String reason) {
    String text = reason == null ? null : PAGE_ERRORS.get(reason.trim());
    return text == null ? PAGE_ERROR_FALLBACK : text;
  }

  // ---- Site permission prompt ------------------------------------------------------------------

  public static final String ALLOW = "Allow";
  public static final String DONT_ALLOW = "Don’t allow";

  /** "camera", "camera and microphone", "camera, microphone and location". */
  public static String labels(Collection<String> kinds) {
    StringBuilder out = new StringBuilder();
    int i = 0, size = kinds.size();
    for (String kind : kinds) {
      if (i > 0) out.append(i == size - 1 ? " and " : ", ");
      out.append(kind);
      i++;
    }
    return out.toString();
  }

  public static String permissionTitle(Collection<String> kinds) {
    return "Allow " + labels(kinds) + "?";
  }

  /** The prompt body: who asks, for what, and whether Alpha remembers the answer. */
  public static String permissionMessage(String host, Collection<String> kinds, boolean privateTab) {
    return host + " wants to use your " + labels(kinds) + "."
        + (privateTab
            ? "\n\nPrivate tab: Alpha won’t remember this choice."
            : "\n\nAlpha remembers this choice for the site. To change it, use Clear site in the Browser menu.");
  }

  // ---- Camera for a file input -------------------------------------------------------------------

  public static final String PHOTO_TITLE = "Add a photo?";
  public static final String USE_CAMERA = "Take photo";
  public static final String CHOOSE_FILE = "Choose file";
  public static final String CANCEL = "Cancel";

  public static String photoMessage(String host) {
    return host + " wants a photo. Photos you take are also saved to Pictures.";
  }

  public static String chooseFiles(String host) {
    return "Choose files for " + host;
  }

  // ---- Website sign-in (HTTP authentication) -----------------------------------------------------

  public static final String SIGN_IN = "Sign in";
  public static final String USERNAME = "Username";
  public static final String PASSWORD = "Password";
  public static final String SIGNING_IN = "\n\nSigning in…";

  /** Why a password manager cannot fill the prompt; shown for every refusal reason. */
  public static final String FILL_REFUSED = "Your password manager can’t fill this sign-in. Type the password yourself.";

  /** How the password manager can help: Alpha's own, another enabled provider, or none. */
  public enum Manager { REFUSED, OFF, ALPHA, OTHER }

  /**
   * The sign-in prompt's text. {@code origin} is the exact origin a password manager may fill and
   * save for, or null when fill is refused.
   */
  public static String signInMessage(String asked, String realmLabel, Manager manager, String origin, boolean retry) {
    String managerLine;
    switch (manager) {
      case REFUSED: managerLine = "\n" + FILL_REFUSED; break;
      case ALPHA: managerLine = " Alpha’s password manager can fill it, and offer to save it once the site accepts it, for " + origin + "."; break;
      case OTHER: managerLine = " If your password manager works with Alpha’s Browser, it can fill or save it for " + origin + "."; break;
      default: managerLine = "";
    }
    return asked + " wants you to sign in."
        + (realmLabel.isEmpty() ? "" : "\nThe site says: “" + realmLabel + "”")
        + "\nAlpha’s Browser doesn’t keep this password." + managerLine
        + (retry ? "\n\nThe site didn’t accept the last sign-in." : "");
  }

  // ---- Page handoffs ---------------------------------------------------------------------------

  public static final String SHARE_PAGE = "Share page";
  public static final String OPEN_ELSEWHERE = "Open in another browser";

  /** A tapped mail, phone, text, map or app link in a private tab; the renderer's menu handoff asks the same. */
  public static final String LEAVE_PRIVATE_TITLE = "Leave private browsing?";
  public static final String LEAVE_PRIVATE_LINK = "This link opens another app. That app isn’t part of your private tab.";
  public static final String OPEN_APP = "Open app";

  // ---- Form resubmission ---------------------------------------------------------------------------

  public static final String RESUBMIT_TITLE = "Send the form again?";
  public static final String RESUBMIT_MESSAGE = "This page came from a form you sent. Reloading sends it again, which can repeat what the site did, such as an order or a payment.";
  public static final String RESUBMIT = "Send again";
}
