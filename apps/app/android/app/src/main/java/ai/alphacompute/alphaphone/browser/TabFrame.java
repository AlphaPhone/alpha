package ai.alphacompute.alphaphone.browser;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Path;
import android.graphics.RectF;
import android.view.MotionEvent;
import android.widget.FrameLayout;
import java.util.Collections;
import java.util.List;

/**
 * The native frame of one Browser tab: its WebView, its attested login-field anchor and the
 * full-size message Alpha shows while the page loads or after it fails. Alpha's chrome rects are
 * removed from the page while the page stays full-size and live; a touch that starts on one falls
 * through to Alpha's WebView.
 *
 * <p>Above Alpha the rects are holes in the drawing. Below Alpha the page is drawn whole (a
 * WebView's draw functor would cut the holes aliased) and the rects only decide input, through
 * {@link TabInputRouter}.
 */
public final class TabFrame extends FrameLayout {
  private final TabLayer layer;
  private List<HostRect> occlusions = Collections.emptyList();
  private final Path clipPath = new Path();
  /**
   * Set once Alpha has sent its chrome rects. Until then a below-host page takes no input, so chrome
   * Alpha draws first cannot pass a tap to the website.
   */
  private boolean hostRectsReceived;

  public TabFrame(Context context, TabLayer layer) {
    super(context);
    this.layer = layer;
  }

  public TabLayer getLayer() {
    return layer;
  }

  public void setHostRectsReceived(boolean received) {
    hostRectsReceived = received;
  }

  public void setOcclusions(List<HostRect> rects) {
    if (occlusions.equals(rects)) return;
    occlusions = rects;
    if (layer != TabLayer.BELOW_HOST) invalidate();
  }

  /** Whether a point in this frame's pixels is the website's, not Alpha's chrome. */
  public boolean pageOwns(float x, float y) {
    return hostRectsReceived && HostRect.pageOwnsPoint(x, y, getWidth(), getHeight(), occlusions);
  }

  @Override
  protected void dispatchDraw(Canvas canvas) {
    if (layer == TabLayer.BELOW_HOST || occlusions.isEmpty()) {
      super.dispatchDraw(canvas);
      return;
    }
    int saveCount = canvas.save();
    for (HostRect rect : occlusions) {
      clipPath.reset();
      clipPath.addRoundRect(new RectF(rect.left, rect.top, rect.right, rect.bottom), rect.cornerRadius,
          rect.cornerRadius, Path.Direction.CW);
      canvas.clipOutPath(clipPath);
    }
    super.dispatchDraw(canvas);
    canvas.restoreToCount(saveCount);
  }

  @Override
  public boolean dispatchTouchEvent(MotionEvent event) {
    if (event.getActionMasked() == MotionEvent.ACTION_DOWN)
      for (HostRect rect : occlusions) if (rect.contains(event.getX(), event.getY())) return false;
    return super.dispatchTouchEvent(event);
  }
}
