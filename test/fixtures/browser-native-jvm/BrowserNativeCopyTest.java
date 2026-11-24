import ai.alphacompute.alphaphone.browser.AlphaBrowserCopy;
import ai.alphacompute.alphaphone.browser.HostRect;
import ai.alphacompute.alphaphone.browser.LinkHandoff;
import ai.alphacompute.alphaphone.browser.LinkHandoff.Action;
import ai.alphacompute.alphaphone.browser.TabLayer;
import ai.alphacompute.alphaphone.browser.TabNavigation;
import java.util.List;
import java.util.Map;

/**
 * Host-JVM checks for the pure parts of Alpha's Browser native windows: the site permission and
 * sign-in prompt text (ported from the shared BrowserSitePromptTest wording checks), the tab frame's
 * page-error table, and the tab layer geometry (ported from the shared RoundedOcclusionRectTest and
 * BelowHostLayerTest). Prints the page-error table as JSON for the renderer comparison.
 */
public final class BrowserNativeCopyTest {
  private static int assertions;

  private static void check(boolean condition, String message) {
    assertions++;
    if (!condition) throw new AssertionError(message);
  }

  private static void equal(Object actual, Object expected, String message) {
    check(expected == null ? actual == null : expected.equals(actual), message + ": expected " + expected + " got " + actual);
  }

  private static String json(String value) {
    StringBuilder out = new StringBuilder("\"");
    for (char c : value.toCharArray()) {
      if (c == '"' || c == '\\') out.append('\\').append(c);
      else if (c < 0x20 || c > 0x7e) out.append(String.format("\\u%04x", (int) c));
      else out.append(c);
    }
    return out.append('"').toString();
  }

  public static void main(String[] args) {
    // What the site permission prompt says.
    equal(AlphaBrowserCopy.labels(List.of("camera")), "camera", "one label");
    equal(AlphaBrowserCopy.labels(List.of("camera", "microphone")), "camera and microphone", "two labels");
    equal(AlphaBrowserCopy.labels(List.of("camera", "microphone", "location")), "camera, microphone and location", "three labels");
    equal(AlphaBrowserCopy.permissionTitle(List.of("location")), "Allow location?", "title");
    check(AlphaBrowserCopy.permissionMessage("a.example", List.of("camera"), true).endsWith("Private tab: Alpha won’t remember this choice."),
        "private prompts say nothing is remembered");
    check(AlphaBrowserCopy.permissionMessage("a.example", List.of("camera"), false).startsWith("a.example wants to use your camera."),
        "the prompt names the asking host");
    check(AlphaBrowserCopy.permissionMessage("a.example", List.of("camera"), false).contains("Clear site"),
        "a remembered choice names Browser's Clear site");

    // What a private tab asks before a tapped link leaves for another app.
    equal(AlphaBrowserCopy.LEAVE_PRIVATE_TITLE, "Leave private browsing?", "the link prompt asks what the menu handoff asks");
    check(AlphaBrowserCopy.LEAVE_PRIVATE_LINK.contains("another app") && AlphaBrowserCopy.LEAVE_PRIVATE_LINK.contains("private"),
        "the link prompt says the link leaves private browsing for another app");
    equal(AlphaBrowserCopy.OPEN_APP, "Open app", "the link prompt names its action");

    // What a tapped tel:, mailto:, sms:, geo: or app link does (AlphaBrowserPlugin.handoff).
    // Arguments: fresh pop-up, own tab shown, opener shown, tapped, supported link, private.
    equal(LinkHandoff.decide(false, true, false, true, true, true), Action.ASK,
        "a tapped phone link in a private tab asks before leaving private browsing");
    equal(LinkHandoff.decide(false, true, false, true, true, false), Action.LAUNCH,
        "a tapped phone link in a normal tab opens the app at once");
    equal(LinkHandoff.decide(false, true, false, false, true, true), Action.BLOCKED,
        "a private page's link that opened without a tap is blocked, not asked about");
    equal(LinkHandoff.decide(false, true, false, false, true, false), Action.BLOCKED, "an untapped link is blocked");
    equal(LinkHandoff.decide(false, false, true, true, true, true), Action.IGNORE, "a hidden tab's link does nothing");
    equal(LinkHandoff.decide(false, true, false, true, false, true), Action.UNSUPPORTED,
        "an unsupported link is refused before any question");
    equal(LinkHandoff.decide(true, false, true, false, true, true), Action.ASK,
        "a fresh pop-up from a private page asks; its tap was checked when it opened");
    equal(LinkHandoff.decide(true, true, false, false, true, false), Action.LAUNCH, "a shown fresh pop-up from a normal page opens");
    equal(LinkHandoff.decide(true, false, false, true, true, true), Action.CLOSE_POPUP,
        "a fresh pop-up whose tab and opener are hidden closes without asking");
    // The owner's answer opens the app only for the page and presentation it was asked about.
    check(LinkHandoff.answerStillValid(true, true, 7, 7, 3, 3, false, false), "an unchanged page opens the app");
    check(!LinkHandoff.answerStillValid(true, true, 7, 8, 3, 3, false, false), "a page that moved on opens nothing");
    check(!LinkHandoff.answerStillValid(true, true, 7, 7, 3, 4, false, false), "another tab shown since opens nothing");
    check(!LinkHandoff.answerStillValid(false, true, 7, 7, 3, 3, false, false), "a paused Browser opens nothing");
    check(!LinkHandoff.answerStillValid(true, false, 7, 7, 3, 3, false, false), "a closed tab opens nothing");
    check(!LinkHandoff.answerStillValid(true, true, 7, 7, 3, 3, true, false), "a closed pop-up opens nothing");
    check(LinkHandoff.answerStillValid(true, true, 7, 7, 3, 3, true, true), "an open pop-up still shown opens the app");

    // What the website sign-in prompt says.
    String refused = AlphaBrowserCopy.signInMessage("a.example", "", AlphaBrowserCopy.Manager.REFUSED, null, false);
    check(refused.startsWith("a.example wants you to sign in."), "the prompt names the asking host");
    check(refused.contains(AlphaBrowserCopy.FILL_REFUSED) && !refused.contains("null"), "a refused fill says why, with no origin");
    check(refused.contains("Alpha’s Browser doesn’t keep this password."), "the browser keeps no password");
    String alpha = AlphaBrowserCopy.signInMessage("a.example", "Staff only", AlphaBrowserCopy.Manager.ALPHA, "https://a.example", true);
    check(alpha.contains("\nThe site says: “Staff only”"), "the realm is quoted as the site's words");
    check(alpha.contains("Alpha’s password manager can fill it") && alpha.contains("for https://a.example."), "Alpha's manager is bound to the exact origin");
    check(alpha.endsWith("\n\nThe site didn’t accept the last sign-in."), "a repeated challenge says the last answer failed");
    check(AlphaBrowserCopy.signInMessage("a.example", "", AlphaBrowserCopy.Manager.OTHER, "https://a.example", false)
        .contains("If your password manager works with Alpha’s Browser, it can fill or save it for https://a.example."), "another provider is conditional");
    check(!AlphaBrowserCopy.signInMessage("a.example", "", AlphaBrowserCopy.Manager.OFF, "https://a.example", false).contains("password manager"),
        "no manager is named when Autofill is off");

    // Which plain-HTTP addresses go to HTTPS (AlphaBrowserPlugin.load and its link and redirect check).
    equal(TabNavigation.httpsUpgrade("http://example.test/a?b=1#c", false, false), "https://example.test/a?b=1#c", "a refused HTTP address goes to HTTPS unchanged otherwise");
    equal(TabNavigation.httpsUpgrade("HTTP://Example.test/", false, false), "https://Example.test/", "the scheme is matched in any case");
    equal(TabNavigation.httpsUpgrade("http://example.test/", true, false), null, "a host Android allows in the clear stays HTTP");
    equal(TabNavigation.httpsUpgrade("https://example.test/", false, false), null, "HTTPS is left alone");
    equal(TabNavigation.httpsUpgrade("http://example.test:8080/", false, false), null, "an explicit port stays as written");
    equal(TabNavigation.httpsUpgrade("http://user@example.test/", false, false), null, "an address with credentials is never rewritten");
    equal(TabNavigation.httpsUpgrade("http://localhost/", false, true), null, "the device's own address stays HTTP when loopback is allowed");
    equal(TabNavigation.httpsUpgrade("http://127.0.0.1/", false, true), null, "the loopback IP stays HTTP when loopback is allowed");
    equal(TabNavigation.httpsUpgrade("http://localhost/", false, false), "https://localhost/", "without loopback the device's address is upgraded too");
    equal(TabNavigation.httpsUpgrade("mailto:a@example.test", false, false), null, "another scheme is not an HTTP address");
    equal(TabNavigation.httpsUpgrade("not a url", false, false), null, "an unparsable address is left alone");
    equal(TabNavigation.httpHost("http://Example.TEST/x"), "example.test", "the HTTP host, lower case");
    equal(TabNavigation.httpHost("https://example.test/"), null, "an HTTPS address has no HTTP host");

    // When a history update settles a load the host started inside the shown document.
    check(TabNavigation.settlesInDocument(true, false, "https://a.test/x", true), "Back across pushState settles in the shown document");
    check(!TabNavigation.settlesInDocument(true, true, "https://a.test/x", true), "a new document started: its first paint settles it");
    check(!TabNavigation.settlesInDocument(false, false, "https://a.test/x", true), "nothing is waiting");
    check(!TabNavigation.settlesInDocument(true, false, "", true), "nothing was committed yet");
    check(!TabNavigation.settlesInDocument(true, false, "https://a.test/x", false), "another origin is never adopted without a page start");

    // What the tab frame says.
    check(AlphaBrowserCopy.LEFT_WEB.endsWith("Enter an address to keep browsing."), "a load that went to an app asks for an address");
    check(AlphaBrowserCopy.RESUBMIT_MESSAGE.contains("again") && AlphaBrowserCopy.RESUBMIT.equals("Send again"), "reloading a form result asks before sending it again");
    equal(AlphaBrowserCopy.pageError("Browser renderer stopped. Close this tab and open a new one."),
        "This tab stopped working. Close it and open a new one.", "renderer loss");
    equal(AlphaBrowserCopy.pageError("A new upstream failure"), AlphaBrowserCopy.PAGE_ERROR_FALLBACK, "unknown reasons read as not loaded");
    equal(AlphaBrowserCopy.pageError(null), AlphaBrowserCopy.PAGE_ERROR_FALLBACK, "no reason reads as not loaded");

    // Alpha's chrome rects over a tab (rounded hit geometry).
    HostRect rounded = new HostRect(10f, 20f, 110f, 80f, 20f);
    check(rounded.contains(60f, 50f), "centre is chrome");
    check(rounded.contains(10f, 40f), "a straight edge is chrome");
    check(!rounded.contains(10f, 20f), "a rounded corner stays on the page");
    check(!rounded.contains(111f, 50f), "outside the rect is the page");
    check(new HostRect(1f, 2f, 3f, 4f, 5f).equals(new HostRect(1f, 2f, 3f, 4f, 5f)), "rects compare by value");

    // Which points the page owns.
    HostRect tab = new HostRect(150f, 0f, 200f, 40f, 10f);
    check(HostRect.pageOwnsPoint(100f, 50f, 200, 100, List.of(tab)), "the page owns its own rect");
    check(HostRect.pageOwnsPoint(0f, 50f, 200, 100, List.of(tab)), "including its left edge");
    check(!HostRect.pageOwnsPoint(170f, 20f, 200, 100, List.of(tab)), "a chrome rect is Alpha's");
    check(HostRect.pageOwnsPoint(170f, 60f, 200, 100, List.of(tab)), "below the chrome rect is the page");
    check(!HostRect.pageOwnsPoint(-1f, 50f, 200, 100, List.of(tab)), "left of the frame is Alpha's");
    check(!HostRect.pageOwnsPoint(200f, 50f, 200, 100, List.of(tab)), "the right edge is Alpha's");
    check(!HostRect.pageOwnsPoint(100f, 100f, 200, 100, List.of(tab)), "the bottom edge is Alpha's");
    List<HostRect> overlapping = List.of(new HostRect(20f, 20f, 60f, 70f, 0f), new HostRect(40f, 30f, 80f, 80f, 0f));
    check(!HostRect.pageOwnsPoint(30f, 40f, 200, 100, overlapping), "Alpha owns the union of overlapping rects (first)");
    check(!HostRect.pageOwnsPoint(70f, 40f, 200, 100, overlapping), "Alpha owns the union of overlapping rects (second)");
    check(HostRect.pageOwnsPoint(90f, 50f, 200, 100, overlapping), "outside both is the page");

    // The renderer's layer option.
    equal(TabLayer.parse(null), TabLayer.ABOVE_HOST, "absent is above-host");
    equal(TabLayer.parse("above-host"), TabLayer.ABOVE_HOST, "above-host");
    equal(TabLayer.parse("below-host"), TabLayer.BELOW_HOST, "below-host");
    equal(TabLayer.parse("below"), null, "a typo is rejected");
    equal(TabLayer.parse(true), null, "a boolean is rejected");
    equal(TabLayer.parse(1), null, "a number is rejected");
    equal(TabLayer.parse(Map.of("layer", "below-host")), null, "an object is rejected");
    equal(TabLayer.parse(""), null, "an empty name is rejected");

    StringBuilder errors = new StringBuilder("{");
    for (Map.Entry<String, String> entry : AlphaBrowserCopy.PAGE_ERRORS.entrySet())
      errors.append(errors.length() > 1 ? "," : "").append(json(entry.getKey())).append(':').append(json(entry.getValue()));
    System.out.println("{\"assertions\":" + assertions + ",\"fallback\":" + json(AlphaBrowserCopy.PAGE_ERROR_FALLBACK)
        + ",\"pageErrors\":" + errors.append('}') + "}");
  }
}
