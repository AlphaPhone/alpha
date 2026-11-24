package ai.alphacompute.alphaphone.browser;

/**
 * What a tapped mail, phone, text, map or app link does in Alpha's Browser (AlphaBrowserPlugin's
 * handoff), and whether the owner's answer for a private tab may still open the app. Pure JVM, so
 * the rules are tested on the host; the Activity, dialog and Intent stay in the plugin.
 */
public final class LinkHandoff {
  private LinkHandoff() {}

  public enum Action {
    /** The tab is not the shown one: nothing happens. */
    IGNORE,
    /** A fresh pop-up whose tab and opener are both hidden: the pop-up closes, nothing opens. */
    CLOSE_POPUP,
    /** A link that opened without a tap: the page is told it was blocked. */
    BLOCKED,
    /** No app link this Browser hands off: the page is told the link type is not supported. */
    UNSUPPORTED,
    /** A private tab: ask "Leave private browsing?" before opening the app. */
    ASK,
    /** A normal tab: open the app now. */
    LAUNCH
  }

  /**
   * @param fresh a still-empty pop-up from a tapped target=_blank link, handing off once
   * @param shownSelf the link's own tab is the shown tab
   * @param shownOpener the pop-up's opener is the shown tab
   * @param gesture the navigation came from a tap
   * @param supported the link resolves to an app link this Browser may hand off
   * @param priv the link's tab, or the opener it reports to, is private
   */
  public static Action decide(boolean fresh, boolean shownSelf, boolean shownOpener, boolean gesture,
      boolean supported, boolean priv) {
    if (fresh) {
      if (!shownSelf && !shownOpener) return Action.CLOSE_POPUP;
    } else {
      if (!shownSelf) return Action.IGNORE;
      if (!gesture) return Action.BLOCKED;
    }
    if (!supported) return Action.UNSUPPORTED;
    return priv ? Action.ASK : Action.LAUNCH;
  }

  /**
   * Whether "Open app" may still open the app: Browser is running, the tab that asked is still
   * open at the page it asked about, nothing else was shown since, and a fresh pop-up is still
   * open. A fresh pop-up may itself be the shown tab, so the check is that the presentation did not
   * change rather than which tab is shown.
   */
  public static boolean answerStillValid(boolean running, boolean reportOpen, long askedNavigation, long navigation,
      long askedPresentation, long presentation, boolean fresh, boolean popupOpen) {
    return running && reportOpen && askedNavigation == navigation && askedPresentation == presentation
        && (!fresh || popupOpen);
  }
}
