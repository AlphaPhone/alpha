package ai.alphacompute.alphaphone;

/** Host-JVM check of Alpha's words on its native media screens (AlphaMediaCopy). No Android. */
public final class AlphaMediaCopyTest {
  private static int checks;

  private static void equal(String expected, String actual, String label) {
    checks++;
    if (!expected.equals(actual))
      throw new AssertionError(label + ": expected <" + expected + "> but was <" + actual + ">");
  }

  private static void check(boolean value, String label) {
    checks++;
    if (!value) throw new AssertionError(label);
  }

  public static void main(String[] args) {
    // Device photo review: one title per change, in Alpha's words, singular and plural.
    equal("Favorite 1 item?", AlphaMediaCopy.reviewTitle(false, true, true, 1), "favorite one");
    equal("Favorite 3 items?", AlphaMediaCopy.reviewTitle(false, true, true, 3), "favorite many");
    equal("Remove 2 items from favorites?", AlphaMediaCopy.reviewTitle(false, true, false, 2),
        "unfavorite");
    equal("Move 1 item to trash?", AlphaMediaCopy.reviewTitle(false, false, true, 1), "trash");
    equal("Restore 500 items?", AlphaMediaCopy.reviewTitle(false, false, false, 500), "restore");
    // Permanent removal wins over every other flag, as in the shared review.
    for (boolean favorite : new boolean[] {false, true})
      for (boolean desired : new boolean[] {false, true})
        equal("Delete 20 items permanently?",
            AlphaMediaCopy.reviewTitle(true, favorite, desired, 20), "permanent");
    equal("Delete permanently", AlphaMediaCopy.reviewConfirm(true), "permanent confirm");
    equal("Continue", AlphaMediaCopy.reviewConfirm(false), "confirm");
    equal("Cancel", AlphaMediaCopy.REVIEW_CANCEL, "cancel");
    check(AlphaMediaCopy.reviewDetail(true).contains("Alpha can’t undo it")
            && AlphaMediaCopy.reviewDetail(true).contains("Android asks you to confirm next"),
        "permanent detail names the undo limit and Android's step");
    check(AlphaMediaCopy.reviewDetail(false).contains("Android asks you to confirm next")
            && !AlphaMediaCopy.reviewDetail(false).contains("undo"),
        "change detail names Android's step");

    // Reviewed-attachment PDF viewer.
    equal("Page 2 of 7", AlphaMediaCopy.pdfPage(2, 7), "page status");
    equal("PDF page 2 of 7", AlphaMediaCopy.pdfPageImage(2, 7), "page image label");
    equal("Loading page 3…", AlphaMediaCopy.pdfLoading(3), "loading");
    // The renderer's text is never shown: its refusal and any other reply map to Alpha's words.
    equal(AlphaMediaCopy.PDF_REQUEST_REFUSED,
        AlphaMediaCopy.pdfRendererError("PDF request unavailable"), "renderer refusal");
    equal(AlphaMediaCopy.PDF_RENDER_FAILED, AlphaMediaCopy.pdfRendererError(
        "PDF is corrupt, password protected, expired, or exceeds viewer limits."), "render failure");
    equal(AlphaMediaCopy.PDF_RENDER_FAILED, AlphaMediaCopy.pdfRendererError("anything else"),
        "unknown renderer text");
    equal(AlphaMediaCopy.PDF_UNAVAILABLE, AlphaMediaCopy.pdfRendererError(null), "no renderer text");

    equal("Close attachment", AlphaMediaCopy.PDF_CLOSE, "close");
    // Share sheet titles.
    equal("Share with", AlphaMediaCopy.SHARE_ONE, "one");
    equal("Share with", AlphaMediaCopy.shareMany(1), "one of many");
    equal("Share 4 items with", AlphaMediaCopy.shareMany(4), "many");

    // None of the shared screens' wording survives.
    String[] shown = {AlphaMediaCopy.PDF_CLOSE, AlphaMediaCopy.PDF_PREVIOUS, AlphaMediaCopy.PDF_NEXT,
        AlphaMediaCopy.PDF_REFUSED, AlphaMediaCopy.PDF_EXPIRED, AlphaMediaCopy.PDF_OPENING,
        AlphaMediaCopy.PDF_TIMED_OUT, AlphaMediaCopy.PDF_STOPPED,
        AlphaMediaCopy.PDF_VIEWER_UNAVAILABLE, AlphaMediaCopy.PDF_TOO_LARGE,
        AlphaMediaCopy.PDF_UNAVAILABLE, AlphaMediaCopy.PDF_REQUEST_REFUSED,
        AlphaMediaCopy.PDF_RENDER_FAILED, AlphaMediaCopy.PDF_PAGE_IMAGE,
        AlphaMediaCopy.pdfPage(1, 2), AlphaMediaCopy.pdfLoading(1),
        AlphaMediaCopy.reviewTitle(true, false, false, 1),
        AlphaMediaCopy.reviewTitle(false, true, false, 1),
        AlphaMediaCopy.reviewTitle(false, false, true, 1), AlphaMediaCopy.reviewDetail(true),
        AlphaMediaCopy.reviewDetail(false), AlphaMediaCopy.reviewConfirm(true),
        AlphaMediaCopy.shareMany(2)};
    String[] shared = {"Close PDF", "isolated viewer", "Isolated PDF renderer", "Rendering page",
        "Selected PDF page", "PDF unavailable", "Delete forever", "Unfavorite",
        "Recently deleted", "will ask for access", "selected revisions", "Share selected media",
        "Review it again."};
    for (String text : shown)
      for (String old : shared)
        check(!text.contains(old), "shared wording <" + old + "> in <" + text + ">");
    System.out.println(checks + " assertions passed");
  }
}
