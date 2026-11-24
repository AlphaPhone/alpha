package ai.alphacompute.alphaphone.browser;

/**
 * Where a Browser tab is drawn relative to Alpha's own WebView. {@code above-host} (the default)
 * draws the page over Alpha, with holes where Alpha's chrome shows. {@code below-host} draws it
 * under a transparent Alpha WebView, which paints its chrome over the page, and {@link
 * TabInputRouter} sends each gesture that starts on the page to the website. Pure JVM.
 */
public enum TabLayer {
  ABOVE_HOST("above-host"),
  BELOW_HOST("below-host");

  public final String wire;

  TabLayer(String wire) {
    this.wire = wire;
  }

  /**
   * The renderer's {@code layer} option: absent or null is {@code above-host}; any other value that
   * is not a known name (a typo, a number, a boolean) is null and must be rejected.
   */
  public static TabLayer parse(Object value) {
    if (value == null) return ABOVE_HOST;
    for (TabLayer layer : values()) if (layer.wire.equals(value)) return layer;
    return null;
  }
}
