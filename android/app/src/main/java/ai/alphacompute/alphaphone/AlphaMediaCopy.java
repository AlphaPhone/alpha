package ai.alphacompute.alphaphone;

/**
 * Alpha's words on its native media screens: the reviewed-attachment PDF viewer
 * ({@link AlphaMailPdfActivity}), the device photo review dialog ({@link AlphaMediaReview}) and the
 * Android share sheet titles ({@link AlphaShareSheet}, {@link AlphaPhotosPlugin#shareMany}). These
 * screens are forked from shared plugin-native-media code; Alpha owns every word on them. Plain
 * Java, so host-JVM tests pin it (test/fixtures/media-copy-jvm).
 *
 * <p>Refusal sentences a bridge call rejects with are not here: they are the bridge contract the
 * renderer words (apps/app/src/ui/photos/photos-messages.ts and
 * apps/app/src/ui/files/selected-document-messages.ts) and stay as the shared code wrote them.
 */
final class AlphaMediaCopy {
  private AlphaMediaCopy() {}

  // --- Reviewed-attachment PDF viewer --------------------------------------------------------
  static final String PDF_CLOSE = "Close attachment", PDF_PREVIOUS = "Previous page", PDF_NEXT = "Next page";
  static final String PDF_REFUSED = "Only the reviewed attachment can be opened.";
  static final String PDF_EXPIRED =
      "The reviewed PDF expired or could not be opened. Return to Inbox and review it again.";
  static final String PDF_OPENING = "Opening PDF…";
  static final String PDF_TIMED_OUT = "This PDF took too long to load. Close it and open it again.";
  static final String PDF_STOPPED = "The PDF viewer stopped. Close it and open it again.";
  static final String PDF_VIEWER_UNAVAILABLE = "The PDF viewer isn’t available right now.";
  static final String PDF_TOO_LARGE = "This page is too large to show.";
  static final String PDF_UNAVAILABLE = "This PDF isn’t available.";
  static final String PDF_REQUEST_REFUSED =
      "This PDF couldn’t be opened. Close it and open it again.";
  static final String PDF_RENDER_FAILED =
      "This PDF is damaged, password-protected, expired or too large to show.";
  /** The page image's accessibility label before a page is shown. */
  static final String PDF_PAGE_IMAGE = "PDF page";
  /**
   * The shared renderer's (IsolatedPdfRenderService) reply to a request it refuses before
   * rendering. Its only other error reply is its render-failure sentence.
   */
  static final String RENDERER_REQUEST_REFUSED = "PDF request unavailable";

  static String pdfLoading(int page) {
    return "Loading page " + page + "…";
  }

  static String pdfPage(int page, int pages) {
    return "Page " + page + " of " + pages;
  }

  static String pdfPageImage(int page, int pages) {
    return "PDF page " + page + " of " + pages;
  }

  /** Alpha's sentence for a renderer error reply; the renderer's own text is never displayed. */
  static String pdfRendererError(String error) {
    if (error == null)
      return PDF_UNAVAILABLE;
    return RENDERER_REQUEST_REFUSED.equals(error) ? PDF_REQUEST_REFUSED : PDF_RENDER_FAILED;
  }

  // --- Device photo review dialog ------------------------------------------------------------
  static final String REVIEW_CANCEL = "Cancel", REVIEW_CONTINUE = "Continue",
                      REVIEW_DELETE = "Delete permanently";

  private static String items(int count) {
    return count == 1 ? "1 item" : count + " items";
  }

  /** The review title: permanent removal, (un)favorite or trash/restore of {@code count} items. */
  static String reviewTitle(boolean permanent, boolean favorite, boolean desired, int count) {
    String n = items(count);
    return permanent ? "Delete " + n + " permanently?"
        : favorite   ? (desired ? "Favorite " + n + "?" : "Remove " + n + " from favorites?")
                     : (desired ? "Move " + n + " to trash?" : "Restore " + n + "?");
  }

  /** The sentence under the numbered item names. */
  static String reviewDetail(boolean permanent) {
    return permanent
        ? "This removes these items from the device for every app, and Alpha can’t undo it. "
            + "Android asks you to confirm next. Items restored or changed elsewhere are skipped."
        : "Android asks you to confirm next. Only these versions change; items changed elsewhere "
            + "are skipped.";
  }

  /** The confirming button. */
  static String reviewConfirm(boolean permanent) {
    return permanent ? REVIEW_DELETE : REVIEW_CONTINUE;
  }

  // --- Android share sheet titles ------------------------------------------------------------
  static final String SHARE_ONE = "Share with";

  /** The share sheet title for {@code count} selected Photos items. */
  static String shareMany(int count) {
    return count == 1 ? SHARE_ONE : "Share " + items(count) + " with";
  }
}
