package ai.alphacompute.alphaphone;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;

import ai.alphacompute.alphaphone.browser.HostRect;
import ai.alphacompute.alphaphone.browser.TabFrame;
import ai.alphacompute.alphaphone.browser.TabInputRouter;
import ai.alphacompute.alphaphone.browser.TabLayer;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Alpha's Browser tab frame and input router with real Android views: a below-host tab sits under
 * Alpha's WebView, is drawn whole, and receives exactly the gestures that start on it; an
 * above-host tab is drawn with holes where Alpha's chrome shows. Ported from the shared
 * plugin-native-browser-surface BelowHostLayerInstrumentedTest (the tab host never sets an outer
 * clip, so its rounded-corner cases are not carried over). No WebView, website or renderer.
 */
@RunWith(AndroidJUnit4.class)
public final class BrowserTabLayerInstrumentedTest {
 /** Consumes every event, like a WebView, and records it with its newest finger. */
 private static final class Recorder extends View {
  final List<String> events=new ArrayList<>();
  Recorder(Context context){super(context);}
  private boolean record(MotionEvent event){
   int last=event.getPointerCount()-1;
   events.add(MotionEvent.actionToString(event.getAction())+"@"+(int)event.getX(last)+","+(int)event.getY(last));
   return true;
  }
  @Override public boolean dispatchTouchEvent(MotionEvent event){return record(event);}
  @Override public boolean dispatchGenericMotionEvent(MotionEvent event){return record(event);}
 }

 private final Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
 private final FrameLayout host=new FrameLayout(context);
 private final Recorder hostWebView=new Recorder(context);
 private final Recorder website=new Recorder(context);
 private final TabFrame page=new TabFrame(context,TabLayer.BELOW_HOST);
 private final List<TabFrame> live=new ArrayList<>(Collections.singletonList(page));
 private final TabInputRouter router=new TabInputRouter(context,()->new ArrayList<>(live));

 public BrowserTabLayerInstrumentedTest(){
  host.addView(hostWebView,new FrameLayout.LayoutParams(300,300));
  page.addView(website,new FrameLayout.LayoutParams(100,100));
  FrameLayout.LayoutParams placed=new FrameLayout.LayoutParams(100,100);placed.leftMargin=50;placed.topMargin=50;
  // As AlphaBrowserPlugin presents a below-host tab: at Alpha's WebView's own index, so drawn below it.
  host.addView(page,host.indexOfChild(hostWebView),placed);
  TabInputRouter.placeRouter(host,hostWebView,router);
  // Page rect (50,50)-(150,150) in host pixels; Alpha's chrome owns (110,50)-(150,90).
  page.setOcclusions(Collections.singletonList(new HostRect(60f,0f,100f,40f,0f)));
  page.setHostRectsReceived(true);
  int exact=View.MeasureSpec.makeMeasureSpec(300,View.MeasureSpec.EXACTLY);
  host.measure(exact,exact);host.layout(0,0,300,300);
 }

 private boolean touch(int action,float x,float y,long downTime){
  MotionEvent event=MotionEvent.obtain(downTime,downTime+1,action,x,y,0);
  try{return host.dispatchTouchEvent(event);}finally{event.recycle();}
 }
 private boolean touch(int action,float x,float y){return touch(action,x,y,0);}
 /** A two-finger event: finger 0 at (x0,y0), finger 1 at (x1,y1). */
 private void twoFingers(int action,float x0,float y0,float x1,float y1,long downTime){
  MotionEvent.PointerProperties[] properties=new MotionEvent.PointerProperties[2];
  MotionEvent.PointerCoords[] coords=new MotionEvent.PointerCoords[2];
  float[][] points={{x0,y0},{x1,y1}};
  for(int id=0;id<2;id++){
   properties[id]=new MotionEvent.PointerProperties();properties[id].id=id;properties[id].toolType=MotionEvent.TOOL_TYPE_FINGER;
   coords[id]=new MotionEvent.PointerCoords();coords[id].x=points[id][0];coords[id].y=points[id][1];
  }
  MotionEvent event=MotionEvent.obtain(downTime,downTime+2,action,2,properties,coords,0,0,1f,1f,0,0,InputDevice.SOURCE_TOUCHSCREEN,0);
  try{host.dispatchTouchEvent(event);}finally{event.recycle();}
 }
 private void mouse(int action,float x,float y){
  MotionEvent event=MotionEvent.obtain(0,0,action,x,y,0);event.setSource(InputDevice.SOURCE_MOUSE);
  try{host.dispatchGenericMotionEvent(event);}finally{event.recycle();}
 }
 private List<View> children(FrameLayout root){List<View> out=new ArrayList<>();for(int i=0;i<root.getChildCount();i++)out.add(root.getChildAt(i));return out;}
 private static final int SECOND_FINGER_DOWN=MotionEvent.ACTION_POINTER_DOWN|(1<<MotionEvent.ACTION_POINTER_INDEX_SHIFT);

 @Test public void theTabIsBelowAlphaAndTheRouterJustAboveIt(){
  assertEquals(Arrays.<View>asList(page,hostWebView,router),children(host));
  FrameLayout nested=new FrameLayout(context);LinearLayout branch=new LinearLayout(context);View webView=new View(context);
  nested.addView(branch);branch.addView(webView);
  assertSame(branch,TabInputRouter.hostBranch(nested,webView));
  assertNull(TabInputRouter.hostBranch(new FrameLayout(context),webView));
 }

 @Test public void aTapOnThePageReachesTheWebsiteInItsOwnCoordinates(){
  assertTrue(touch(MotionEvent.ACTION_DOWN,70f,70f));
  touch(MotionEvent.ACTION_UP,70f,70f);
  assertEquals(Arrays.asList("ACTION_DOWN@20,20","ACTION_UP@20,20"),website.events);
  assertEquals(Collections.emptyList(),hostWebView.events);
 }

 @Test public void tapsOnAlphaChromeAndOutsideThePageStayWithAlpha(){
  touch(MotionEvent.ACTION_DOWN,130f,60f,1);touch(MotionEvent.ACTION_UP,130f,60f,1);
  touch(MotionEvent.ACTION_DOWN,10f,10f,5);touch(MotionEvent.ACTION_UP,10f,10f,5);
  assertEquals(Collections.emptyList(),website.events);
  assertEquals(4,hostWebView.events.size());
 }

 @Test public void aGestureThatStartsOnThePageStaysThereUntilItEnds(){
  touch(MotionEvent.ACTION_DOWN,70f,120f);touch(MotionEvent.ACTION_MOVE,130f,60f);
  touch(MotionEvent.ACTION_MOVE,250f,250f);touch(MotionEvent.ACTION_CANCEL,250f,250f);
  assertEquals(Arrays.asList("ACTION_DOWN@20,70","ACTION_MOVE@80,10","ACTION_MOVE@200,200","ACTION_CANCEL@200,200"),website.events);
  assertEquals(Collections.emptyList(),hostWebView.events);
 }

 @Test public void aSecondFingerJoinsTheGestureOfTheFirst(){
  touch(MotionEvent.ACTION_DOWN,70f,120f,10);
  twoFingers(SECOND_FINGER_DOWN,70f,120f,130f,60f,10);
  touch(MotionEvent.ACTION_CANCEL,70f,120f,10);
  assertEquals(Arrays.asList("ACTION_DOWN@20,70","ACTION_POINTER_DOWN(1)@80,10","ACTION_CANCEL@20,70"),website.events);
  assertEquals(Collections.emptyList(),hostWebView.events);
  // A finger that lands on the page during an Alpha gesture stays with Alpha.
  touch(MotionEvent.ACTION_DOWN,130f,60f,20);
  twoFingers(SECOND_FINGER_DOWN,130f,60f,70f,120f,20);
  assertEquals(3,website.events.size());
  assertEquals(Arrays.asList("ACTION_DOWN@130,60","ACTION_POINTER_DOWN(1)@70,120"),hostWebView.events);
 }

 @Test public void aHiddenTabTakesNoInput(){
  page.setVisibility(View.GONE);
  touch(MotionEvent.ACTION_DOWN,70f,70f);
  assertEquals(Collections.emptyList(),website.events);
  assertEquals(1,hostWebView.events.size());
 }

 @Test public void aTabTakesNoInputUntilAlphaSendsItsRects(){
  page.setHostRectsReceived(false);
  touch(MotionEvent.ACTION_DOWN,70f,70f,1);touch(MotionEvent.ACTION_UP,70f,70f,1);
  mouse(MotionEvent.ACTION_HOVER_MOVE,70f,70f);
  assertEquals(Collections.emptyList(),website.events);
  assertEquals(Arrays.asList("ACTION_DOWN@70,70","ACTION_UP@70,70","ACTION_HOVER_ENTER@70,70","ACTION_HOVER_MOVE@70,70"),hostWebView.events);
  page.setHostRectsReceived(true);
  touch(MotionEvent.ACTION_DOWN,70f,70f,2);
  assertEquals(Collections.singletonList("ACTION_DOWN@20,20"),website.events);
 }

 @Test public void aTabHiddenMidGestureIsCancelledAndGetsNoClick(){
  touch(MotionEvent.ACTION_DOWN,70f,70f,1);
  page.setVisibility(View.GONE);
  touch(MotionEvent.ACTION_MOVE,72f,72f,1);touch(MotionEvent.ACTION_UP,72f,72f,1);
  assertEquals(Arrays.asList("ACTION_DOWN@20,20","ACTION_CANCEL@22,22"),website.events);
  // The rest of the gesture is swallowed: Alpha never sees half a gesture.
  assertEquals(Collections.emptyList(),hostWebView.events);
  touch(MotionEvent.ACTION_DOWN,70f,70f,2);
  assertEquals(Collections.singletonList("ACTION_DOWN@70,70"),hostWebView.events);
 }

 @Test public void aTabNoLongerPresentedMidGestureIsCancelled(){
  touch(MotionEvent.ACTION_DOWN,70f,70f,1);
  live.clear();
  touch(MotionEvent.ACTION_UP,70f,70f,1);
  assertEquals(Arrays.asList("ACTION_DOWN@20,20","ACTION_CANCEL@20,20"),website.events);
  assertEquals(Collections.emptyList(),hostWebView.events);
 }

 @Test public void aHoveredTabThatIsHiddenGetsAnExit(){
  mouse(MotionEvent.ACTION_HOVER_MOVE,70f,70f);
  page.setVisibility(View.GONE);
  mouse(MotionEvent.ACTION_HOVER_MOVE,72f,72f);
  assertEquals(Arrays.asList("ACTION_HOVER_ENTER@20,20","ACTION_HOVER_MOVE@20,20","ACTION_HOVER_EXIT@22,22"),website.events);
 }

 @Test public void hoverAndMouseWheelFollowThePointer(){
  mouse(MotionEvent.ACTION_HOVER_ENTER,70f,70f);mouse(MotionEvent.ACTION_HOVER_MOVE,80f,80f);mouse(MotionEvent.ACTION_SCROLL,80f,80f);
  mouse(MotionEvent.ACTION_HOVER_MOVE,130f,60f);mouse(MotionEvent.ACTION_SCROLL,130f,60f);
  assertEquals(Arrays.asList("ACTION_HOVER_ENTER@20,20","ACTION_HOVER_MOVE@30,30","ACTION_SCROLL@30,30","ACTION_HOVER_EXIT@80,10"),website.events);
  assertEquals(Arrays.asList("ACTION_HOVER_ENTER@130,60","ACTION_HOVER_MOVE@130,60","ACTION_SCROLL@130,60"),hostWebView.events);
 }

 private Bitmap drawn(TabLayer layer){
  TabFrame frame=new TabFrame(context,layer);
  View red=new View(context);red.setBackgroundColor(Color.RED);frame.addView(red,new FrameLayout.LayoutParams(100,100));
  frame.setOcclusions(Collections.singletonList(new HostRect(20f,20f,80f,80f,20f)));
  int exact=View.MeasureSpec.makeMeasureSpec(100,View.MeasureSpec.EXACTLY);frame.measure(exact,exact);frame.layout(0,0,100,100);
  Bitmap bitmap=Bitmap.createBitmap(100,100,Bitmap.Config.ARGB_8888);frame.draw(new Canvas(bitmap));return bitmap;
 }

 @Test public void aBelowHostTabIsDrawnWholeAndAnAboveHostTabHasHoles(){
  Bitmap below=drawn(TabLayer.BELOW_HOST);
  assertEquals(Color.RED,below.getPixel(0,0));
  assertEquals(Color.RED,below.getPixel(50,50));
  Bitmap above=drawn(TabLayer.ABOVE_HOST);
  assertEquals(Color.RED,above.getPixel(5,5));
  assertEquals(Color.TRANSPARENT,above.getPixel(50,50));
 }

 private TabFrame drawnFrame(TabLayer layer){
  TabFrame frame=new TabFrame(context,layer);
  frame.addView(new View(context),new FrameLayout.LayoutParams(100,100));
  frame.setHostRectsReceived(true);
  int exact=View.MeasureSpec.makeMeasureSpec(100,View.MeasureSpec.EXACTLY);frame.measure(exact,exact);frame.layout(0,0,100,100);
  frame.draw(new Canvas(Bitmap.createBitmap(100,100,Bitmap.Config.ARGB_8888)));
  return frame;
 }

 @Test public void newChromeRectsMoveBelowHostInputWithoutARedraw(){
  List<HostRect> moved=Collections.singletonList(new HostRect(0f,0f,40f,40f,0f));
  // Above Alpha the rects are holes in the drawing, so new ones redraw the page.
  TabFrame above=drawnFrame(TabLayer.ABOVE_HOST);
  assertFalse(above.isDirty());above.setOcclusions(moved);assertTrue(above.isDirty());
  // Below Alpha they only route input, so nothing is redrawn.
  TabFrame below=drawnFrame(TabLayer.BELOW_HOST);
  assertTrue(below.pageOwns(20f,20f));
  below.setOcclusions(moved);
  assertFalse(below.isDirty());
  assertFalse(below.pageOwns(20f,20f));
  assertTrue(below.pageOwns(60f,60f));
 }

 @Test public void theRouterStaysDirectlyAboveAlphaAndIsPutBackWhenItDrifts(){
  FrameLayout root=new FrameLayout(context);View branch=new View(context);
  TabInputRouter other=new TabInputRouter(context,Collections::emptyList);
  root.addView(branch);
  TabFrame a=new TabFrame(context,TabLayer.BELOW_HOST);root.addView(a,root.indexOfChild(branch));
  TabInputRouter.placeRouter(root,branch,other);
  assertEquals(Arrays.<View>asList(a,branch,other),children(root));
  TabFrame b=new TabFrame(context,TabLayer.ABOVE_HOST);root.addView(b);
  assertEquals(Arrays.<View>asList(a,branch,other,b),children(root));
  TabInputRouter.placeRouter(root,branch,other);
  assertEquals("Already in place: nothing moves",Arrays.<View>asList(a,branch,other,b),children(root));
  View stray=new View(context);root.addView(stray,root.indexOfChild(branch)+1);
  TabInputRouter.placeRouter(root,branch,other);
  assertEquals(Arrays.<View>asList(a,branch,other,stray,b),children(root));
 }
}
