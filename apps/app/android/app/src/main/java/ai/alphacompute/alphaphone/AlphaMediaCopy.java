package ai.alphacompute.alphaphone;

/** Alpha’s labels for Android’s media review and share sheets. */
final class AlphaMediaCopy {
  private AlphaMediaCopy() {}

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

  static final String SHARE_ONE = "Share with";

  /** The share sheet title for {@code count} selected Photos items. */
  static String shareMany(int count) {
    return count == 1 ? SHARE_ONE : "Share " + items(count) + " with";
  }
}
