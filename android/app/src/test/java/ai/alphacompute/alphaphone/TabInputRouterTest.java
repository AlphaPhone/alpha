package ai.alphacompute.alphaphone;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import ai.alphacompute.alphaphone.browser.HostRect;
import ai.alphacompute.alphaphone.browser.TabFrame;
import ai.alphacompute.alphaphone.browser.TabInputRouter;
import ai.alphacompute.alphaphone.browser.TabLayer;
import android.app.Activity;
import android.view.MotionEvent;
import android.view.View;
import android.widget.FrameLayout;
import java.util.Collections;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

/**
 * Verifies {@link TabInputRouter} hands Android View focus back from a focused below-host
 * {@link TabFrame} (e.g. webpage WebView / CredentialWebView) to Alpha's {@code hostBelow()}
 * when a touch falls through to Alpha's chrome or outside the page.
 */
@RunWith(RobolectricTestRunner.class)
@Config(manifest = Config.NONE, sdk = 35)
public final class TabInputRouterTest {
  private FrameLayout host;
  private FrameLayout hostBranch;
  private View hostWebView;
  private TabFrame page;
  private View webpageView;

  @Before public void setUp() {
    Activity activity = Robolectric.buildActivity(Activity.class).setup().get();
    host = new FrameLayout(activity);
    hostBranch = new FrameLayout(activity);
    hostWebView = new View(activity);
    hostWebView.setFocusable(true);
    hostWebView.setFocusableInTouchMode(true);
    hostBranch.addView(hostWebView, new FrameLayout.LayoutParams(300, 300));
    host.addView(hostBranch, new FrameLayout.LayoutParams(300, 300));

    page = new TabFrame(activity, TabLayer.BELOW_HOST);
    webpageView = new View(activity);
    webpageView.setFocusable(true);
    webpageView.setFocusableInTouchMode(true);
    page.addView(webpageView, new FrameLayout.LayoutParams(100, 100));
    FrameLayout.LayoutParams placed = new FrameLayout.LayoutParams(100, 100);
    placed.leftMargin = 50;
    placed.topMargin = 50;
    host.addView(page, host.indexOfChild(hostBranch), placed);

    TabInputRouter router = new TabInputRouter(activity, () -> Collections.singletonList(page));
    TabInputRouter.placeRouter(host, hostBranch, router);

    // Page rect (50,50)-(150,150) in host pixels; Alpha's chrome owns (110,50)-(150,90).
    page.setOcclusions(Collections.singletonList(new HostRect(60f, 0f, 100f, 40f, 0f)));
    page.setHostRectsReceived(true);

    activity.setContentView(host);
    int exact = View.MeasureSpec.makeMeasureSpec(300, View.MeasureSpec.EXACTLY);
    host.measure(exact, exact);
    host.layout(0, 0, 300, 300);
  }

  private void touchDown(float x, float y, long downTime) {
    MotionEvent event = MotionEvent.obtain(downTime, downTime + 1, MotionEvent.ACTION_DOWN, x, y, 0);
    try {
      host.dispatchTouchEvent(event);
    } finally {
      event.recycle();
    }
  }

  @Test public void touchOnAlphaChromeClearsTabFocusAndFocusesHostBelow() {
    assertTrue(webpageView.requestFocus());
    assertTrue(page.hasFocus());
    assertFalse(hostBranch.hasFocus());

    touchDown(130f, 60f, 10L);

    assertFalse("Below-host TabFrame must lose Android View focus when Alpha owns the touch", page.hasFocus());
    assertFalse(webpageView.hasFocus());
    assertTrue("Alpha's host branch/WebView must receive Android View focus", hostBranch.hasFocus());
    assertTrue(hostWebView.hasFocus());
  }

  @Test public void touchOutsidePageClearsTabFocusAndFocusesHostBelow() {
    assertTrue(webpageView.requestFocus());
    assertTrue(page.hasFocus());
    assertFalse(hostBranch.hasFocus());

    touchDown(10f, 10f, 20L);

    assertFalse(page.hasFocus());
    assertTrue(hostBranch.hasFocus());
    assertTrue(hostWebView.hasFocus());
  }

  @Test public void touchOwnedByPageKeepsPageFocus() {
    assertTrue(webpageView.requestFocus());
    assertTrue(page.hasFocus());
    assertFalse(hostBranch.hasFocus());

    touchDown(70f, 70f, 30L);

    assertTrue(page.hasFocus());
    assertFalse(hostBranch.hasFocus());
  }
}
