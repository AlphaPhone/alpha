package ai.alphacompute.alphaphone.browser;

import android.content.Context;
import android.view.MotionEvent;
import android.widget.FrameLayout;
import java.util.Collections;
import java.util.List;

/**
 * The native frame of one Browser tab: its WebView, its attested login-field anchor and the
 * full-size message Alpha shows while the page loads or after it fails. Below Alpha the page is
 * drawn whole under Alpha's transparent WebView, and Alpha's chrome rects only decide input: a
 * touch that starts on one is Alpha's, through {@link TabInputRouter}.
 */
public final class TabFrame extends FrameLayout {
  private final TabLayer layer;
  private List<HostRect> occlusions = Collections.emptyList();
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
    occlusions = rects;
  }

  /** Whether a point in this frame's pixels is the website's, not Alpha's chrome. */
  public boolean pageOwns(float x, float y) {
    return hostRectsReceived && HostRect.pageOwnsPoint(x, y, getWidth(), getHeight(), occlusions);
  }

  @Override
  public boolean dispatchTouchEvent(MotionEvent event) {
    if (event.getActionMasked() == MotionEvent.ACTION_DOWN)
      for (HostRect rect : occlusions) if (rect.contains(event.getX(), event.getY())) return false;
    return super.dispatchTouchEvent(event);
  }
}
