package ai.alphacompute.alphaphone.browser;

import android.content.Context;
import android.os.Parcel;
import android.view.DragEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import java.util.List;
import java.util.function.Predicate;
import java.util.function.Supplier;

/**
 * An empty, never-drawn view placed just above Alpha's WebView while a below-host Browser tab
 * shows. It claims a touch, hover, mouse or drag event that starts where a visible below-host page
 * owns the point and forwards it to that page; every other event falls through to Alpha's WebView.
 * Alpha never sees a routed gesture, and the page never sees one that started on Alpha's chrome,
 * including later fingers of the same gesture.
 */
public final class TabInputRouter extends View {
  private final Supplier<List<TabFrame>> pages;
  private TabFrame touchTarget;
  /** True from a routed DOWN to its UP or CANCEL, even after the page was hidden. */
  private boolean touchRouted;
  private TabFrame hoverTarget;
  /** Down time of the last gesture left to Alpha; its later split fingers stay there. */
  private long hostDownTime = Long.MIN_VALUE;

  public TabInputRouter(Context context, Supplier<List<TabFrame>> pages) {
    super(context);
    this.pages = pages;
    setWillNotDraw(true);
    setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
  }

  /** The direct child of {@code host} that holds {@code view}, or null when it is not inside it. */
  public static View hostBranch(ViewGroup host, View view) {
    View current = view;
    while (true) {
      ViewParent parent = current.getParent();
      if (parent == null) return null;
      if (parent == host) return current;
      if (!(parent instanceof View)) return null;
      current = (View) parent;
    }
  }

  /** Puts {@code router} directly above {@code branch} in {@code host}; nothing when already there. */
  public static void placeRouter(ViewGroup host, View branch, View router) {
    if (router.getParent() == host && host.indexOfChild(router) == host.indexOfChild(branch) + 1) return;
    if (router.getParent() instanceof ViewGroup) ((ViewGroup) router.getParent()).removeView(router);
    host.addView(router, host.indexOfChild(branch) + 1,
        new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
  }

  /**
   * A copy of {@code event} with {@code action} at (x, y), or null when the copy cannot be made.
   * DragEvent has no public way to move its point; its parcel starts with the action and the point,
   * and the copy is checked, so a different layout gives null, never a wrong point. The copy has no
   * local state, which only a drag started in this app sets.
   */
  static DragEvent movedDragEvent(DragEvent event, int action, float x, float y) {
    Parcel parcel = Parcel.obtain();
    try {
      event.writeToParcel(parcel, 0);
      parcel.setDataPosition(0);
      parcel.writeInt(action);
      parcel.writeFloat(x);
      parcel.writeFloat(y);
      parcel.setDataPosition(0);
      DragEvent moved = DragEvent.CREATOR.createFromParcel(parcel);
      return moved.getAction() == action && moved.getX() == x && moved.getY() == y ? moved : null;
    } catch (RuntimeException unavailable) {
      return null;
    } finally {
      parcel.recycle();
    }
  }

  /** Whether {@code page} is still shown, presented and in this view's parent. */
  private boolean isLive(TabFrame page) {
    if (page.getParent() != getParent() || page.getVisibility() != VISIBLE) return false;
    for (TabFrame candidate : pages.get()) if (candidate == page) return true;
    return false;
  }

  /** The topmost visible page under a point in this view's coordinates. */
  private TabFrame pageAt(float x, float y) {
    if (!(getParent() instanceof ViewGroup)) return null;
    ViewGroup parent = (ViewGroup) getParent();
    List<TabFrame> candidates = pages.get();
    if (candidates.isEmpty()) return null;
    TabFrame best = null;
    int bestIndex = -1;
    for (TabFrame page : candidates) {
      if (page.getParent() != parent || page.getVisibility() != VISIBLE) continue;
      int index = parent.indexOfChild(page);
      if (index > bestIndex && page.pageOwns(x + getLeft() - page.getLeft() - page.getTranslationX(),
          y + getTop() - page.getTop() - page.getTranslationY())) {
        best = page;
        bestIndex = index;
      }
    }
    return best;
  }

  private boolean forward(View page, MotionEvent event, Integer action, Predicate<MotionEvent> send) {
    MotionEvent copy = MotionEvent.obtain(event);
    if (action != null) copy.setAction(action);
    copy.offsetLocation(getLeft() - page.getLeft() - page.getTranslationX(), getTop() - page.getTop() - page.getTranslationY());
    try {
      return send.test(copy);
    } finally {
      copy.recycle();
    }
  }

  @Override
  public boolean dispatchTouchEvent(MotionEvent event) {
    if (event.getActionMasked() == MotionEvent.ACTION_DOWN) {
      touchTarget = null;
      touchRouted = false;
      // A split later finger of an Alpha gesture arrives as a DOWN with that gesture's down time.
      if (event.getDownTime() == hostDownTime) return false;
      TabFrame page = pageAt(event.getX(), event.getY());
      if (page == null) {
        hostDownTime = event.getDownTime();
        for (TabFrame candidate : pages.get()) {
          if (candidate.hasFocus()) candidate.clearFocus();
        }
        View host = hostBelow();
        if (host != null && !host.hasFocus()) host.requestFocus();
        return false;
      }
      touchTarget = page;
      touchRouted = true;
    }
    if (!touchRouted) return false;
    boolean ends = event.getActionMasked() == MotionEvent.ACTION_UP || event.getActionMasked() == MotionEvent.ACTION_CANCEL;
    if (ends) touchRouted = false;
    TabFrame page = touchTarget;
    if (page == null) return true;
    if (ends) touchTarget = null;
    if (!isLive(page)) {
      // A page hidden or removed mid-gesture is cancelled once; the rest of the gesture is
      // swallowed, so a lifted finger cannot click a hidden page.
      touchTarget = null;
      if (page.getParent() == getParent()) forward(page, event, MotionEvent.ACTION_CANCEL, page::dispatchTouchEvent);
      return true;
    }
    forward(page, event, null, page::dispatchTouchEvent);
    return true;
  }

  @Override
  public boolean dispatchHoverEvent(MotionEvent event) {
    TabFrame page = event.getActionMasked() == MotionEvent.ACTION_HOVER_EXIT ? null : pageAt(event.getX(), event.getY());
    TabFrame previous = hoverTarget;
    if (page != previous) {
      if (previous != null && previous.getParent() == getParent())
        forward(previous, event, MotionEvent.ACTION_HOVER_EXIT, previous::dispatchGenericMotionEvent);
      hoverTarget = page;
      if (page != null && event.getActionMasked() != MotionEvent.ACTION_HOVER_ENTER)
        forward(page, event, MotionEvent.ACTION_HOVER_ENTER, page::dispatchGenericMotionEvent);
    }
    if (page == null) return event.getActionMasked() == MotionEvent.ACTION_HOVER_EXIT && previous != null;
    forward(page, event, null, page::dispatchGenericMotionEvent);
    return true;
  }

  /** Mouse wheel and other pointer events that are neither touch nor hover. */
  @Override
  protected boolean dispatchGenericPointerEvent(MotionEvent event) {
    TabFrame page = pageAt(event.getX(), event.getY());
    if (page == null) return false;
    forward(page, event, null, page::dispatchGenericMotionEvent);
    return true;
  }

  /**
   * Drags. The parent sends a drag's moves and drop to the frontmost child that took its start,
   * and this view lies over Alpha's WebView, so it takes every drag while a page shows and passes
   * each move or drop to the page under the point, or to Alpha's WebView just below. Views below
   * get the drag's start and end and their own enter and exit.
   */
  @Override
  public boolean dispatchDragEvent(DragEvent event) {
    switch (event.getAction()) {
      case DragEvent.ACTION_DRAG_STARTED:
        return !pages.get().isEmpty();
      case DragEvent.ACTION_DRAG_LOCATION:
      case DragEvent.ACTION_DROP: {
        View target = pageAt(event.getX(), event.getY());
        if (target == null) target = hostBelow();
        return target != null && forwardDrag(target, event);
      }
      default:
        return true;
    }
  }

  /** Alpha's WebView branch, which the Browser keeps directly below this view. */
  private View hostBelow() {
    if (!(getParent() instanceof ViewGroup)) return null;
    ViewGroup parent = (ViewGroup) getParent();
    int index = parent.indexOfChild(this);
    return index > 0 ? parent.getChildAt(index - 1) : null;
  }

  private boolean forwardDrag(View target, DragEvent event) {
    float dx = getLeft() - target.getLeft() - target.getTranslationX();
    float dy = getTop() - target.getTop() - target.getTranslationY();
    if (dx == 0f && dy == 0f) return target.dispatchDragEvent(event);
    // Without a moved copy the event is dropped, never delivered at the wrong point.
    DragEvent copy = movedDragEvent(event, event.getAction(), event.getX() + dx, event.getY() + dy);
    return copy != null && target.dispatchDragEvent(copy);
  }
}
