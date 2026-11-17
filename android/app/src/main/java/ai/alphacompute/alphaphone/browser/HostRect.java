package ai.alphacompute.alphaphone.browser;

import java.util.List;
import java.util.Objects;

/**
 * A rounded rectangle of Alpha's own chrome over a Browser tab, in the tab frame's pixels. A point
 * inside it belongs to Alpha, not the website: above the host it is a hole in the page's drawing,
 * below the host it routes input to Alpha. Pure JVM, so the geometry is tested on the host.
 */
public final class HostRect {
  public final float left, top, right, bottom, cornerRadius;

  public HostRect(float left, float top, float right, float bottom, float cornerRadius) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.cornerRadius = cornerRadius;
  }

  public boolean contains(float x, float y) {
    if (x < left || x > right || y < top || y > bottom) return false;
    float radius = Math.min(Math.min(cornerRadius, (right - left) / 2f), (bottom - top) / 2f);
    if (radius <= 0f || (x >= left + radius && x <= right - radius) || (y >= top + radius && y <= bottom - radius))
      return true;
    float centerX = x < left + radius ? left + radius : right - radius;
    float centerY = y < top + radius ? top + radius : bottom - radius;
    float dx = x - centerX, dy = y - centerY;
    return dx * dx + dy * dy <= radius * radius;
  }

  /**
   * True when a point in a tab frame's own pixels belongs to the website: inside the frame and
   * outside every rect of Alpha's chrome.
   */
  public static boolean pageOwnsPoint(float x, float y, int width, int height, List<HostRect> hostRects) {
    if (!(x >= 0f && y >= 0f && x < width && y < height)) return false;
    for (HostRect rect : hostRects) if (rect.contains(x, y)) return false;
    return true;
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) return true;
    if (!(other instanceof HostRect)) return false;
    HostRect that = (HostRect) other;
    return Float.compare(left, that.left) == 0 && Float.compare(top, that.top) == 0
        && Float.compare(right, that.right) == 0 && Float.compare(bottom, that.bottom) == 0
        && Float.compare(cornerRadius, that.cornerRadius) == 0;
  }

  @Override
  public int hashCode() {
    return Objects.hash(left, top, right, bottom, cornerRadius);
  }
}
