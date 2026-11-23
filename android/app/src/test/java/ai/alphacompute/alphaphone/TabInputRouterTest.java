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
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(manifest = Config.NONE, sdk = 35)
public class TabInputRouterTest {
  private static final int WIDTH = 400;
  private static final int HEIGHT = 800;

  private static View focusableView(Activity activity) {
    View view = new View(activity);
    view.setFocusable(true);
    view.setFocusableInTouchMode(true);
    return view;
  }

  private static void layoutMatchParent(View view) {
    view.measure(
        View.MeasureSpec.makeMeasureSpec(WIDTH, View.MeasureSpec.EXACTLY),
        View.MeasureSpec.makeMeasureSpec(HEIGHT, View.MeasureSpec.EXACTLY));
    view.layout(0, 0, WIDTH, HEIGHT);
  }

  @Test
  public void tapOnHostChromeTransfersFocusFromBelowHostPageToHostBelowOnFirstDown() {
    Activity activity = Robolectric.buildActivity(Activity.class).setup().get();
    FrameLayout root = new FrameLayout(activity);
    activity.setContentView(root);

    List<TabFrame> live = new ArrayList<>();
    TabFrame page = new TabFrame(activity, TabLayer.BELOW_HOST);
    View pageWebView = focusableView(activity);
    page.addView(pageWebView, new FrameLayout.LayoutParams(WIDTH, HEIGHT));
    page.setHostRectsReceived(true);
    page.setOcclusions(Collections.singletonList(new HostRect(0f, 650f, WIDTH, HEIGHT, 0f)));
    live.add(page);

    FrameLayout hostBranch = new FrameLayout(activity);
    View hostWebView = focusableView(activity);
    hostBranch.addView(hostWebView, new FrameLayout.LayoutParams(WIDTH, HEIGHT));

    root.addView(page, new FrameLayout.LayoutParams(WIDTH, HEIGHT));
    root.addView(hostBranch, new FrameLayout.LayoutParams(WIDTH, HEIGHT));

    TabInputRouter router = new TabInputRouter(activity, () -> live);
    TabInputRouter.placeRouter(root, hostBranch, router);

    layoutMatchParent(root);

    assertTrue(pageWebView.requestFocus());
    assertTrue(page.hasFocus());
    assertFalse(hostBranch.hasFocus());

    MotionEvent down = MotionEvent.obtain(100L, 100L, MotionEvent.ACTION_DOWN, 200f, 700f, 0);
    try {
      assertFalse(router.dispatchTouchEvent(down));
    } finally {
      down.recycle();
    }

    assertFalse(page.hasFocus());
    assertFalse(pageWebView.isFocused());
    assertTrue(hostBranch.hasFocus());
    assertTrue(hostWebView.isFocused());

    MotionEvent up = MotionEvent.obtain(100L, 120L, MotionEvent.ACTION_UP, 200f, 700f, 0);
    try {
      assertFalse(router.dispatchTouchEvent(up));
    } finally {
      up.recycle();
    }
    assertTrue(hostBranch.hasFocus());
  }

  @Test
  public void tapOnBelowHostPageKeepsFocusOnPage() {
    Activity activity = Robolectric.buildActivity(Activity.class).setup().get();
    FrameLayout root = new FrameLayout(activity);
    activity.setContentView(root);

    List<TabFrame> live = new ArrayList<>();
    TabFrame page = new TabFrame(activity, TabLayer.BELOW_HOST);
    View pageWebView = focusableView(activity);
    page.addView(pageWebView, new FrameLayout.LayoutParams(WIDTH, HEIGHT));
    page.setHostRectsReceived(true);
    page.setOcclusions(Collections.singletonList(new HostRect(0f, 650f, WIDTH, HEIGHT, 0f)));
    live.add(page);

    FrameLayout hostBranch = new FrameLayout(activity);
    View hostWebView = focusableView(activity);
    hostBranch.addView(hostWebView, new FrameLayout.LayoutParams(WIDTH, HEIGHT));

    root.addView(page, new FrameLayout.LayoutParams(WIDTH, HEIGHT));
    root.addView(hostBranch, new FrameLayout.LayoutParams(WIDTH, HEIGHT));

    TabInputRouter router = new TabInputRouter(activity, () -> live);
    TabInputRouter.placeRouter(root, hostBranch, router);

    layoutMatchParent(root);

    assertTrue(pageWebView.requestFocus());
    MotionEvent down = MotionEvent.obtain(200L, 200L, MotionEvent.ACTION_DOWN, 200f, 200f, 0);
    try {
      assertTrue(router.dispatchTouchEvent(down));
    } finally {
      down.recycle();
    }

    assertTrue(page.hasFocus());
    assertFalse(hostBranch.hasFocus());
  }

  @Test
  public void tapOutsidePageBoundsTransfersFocusToHostBelow() {
    Activity activity = Robolectric.buildActivity(Activity.class).setup().get();
    FrameLayout root = new FrameLayout(activity);
    activity.setContentView(root);

    List<TabFrame> live = new ArrayList<>();
    TabFrame page = new TabFrame(activity, TabLayer.BELOW_HOST);
    View pageWebView = focusableView(activity);
    page.addView(pageWebView, new FrameLayout.LayoutParams(WIDTH, 500));
    page.setHostRectsReceived(true);
    page.setOcclusions(Collections.emptyList());
    live.add(page);

    FrameLayout hostBranch = new FrameLayout(activity);
    View hostWebView = focusableView(activity);
    hostBranch.addView(hostWebView, new FrameLayout.LayoutParams(WIDTH, HEIGHT));

    root.addView(page, new FrameLayout.LayoutParams(WIDTH, 500));
    root.addView(hostBranch, new FrameLayout.LayoutParams(WIDTH, HEIGHT));

    TabInputRouter router = new TabInputRouter(activity, () -> live);
    TabInputRouter.placeRouter(root, hostBranch, router);

    layoutMatchParent(root);
    page.measure(
        View.MeasureSpec.makeMeasureSpec(WIDTH, View.MeasureSpec.EXACTLY),
        View.MeasureSpec.makeMeasureSpec(500, View.MeasureSpec.EXACTLY));
    page.layout(0, 0, WIDTH, 500);

    assertTrue(pageWebView.requestFocus());
    assertTrue(page.hasFocus());
    assertFalse(hostBranch.hasFocus());

    MotionEvent down = MotionEvent.obtain(300L, 300L, MotionEvent.ACTION_DOWN, 200f, 700f, 0);
    try {
      assertFalse(router.dispatchTouchEvent(down));
    } finally {
      down.recycle();
    }

    assertFalse(page.hasFocus());
    assertTrue(hostBranch.hasFocus());
    assertTrue(hostWebView.isFocused());
  }
}
