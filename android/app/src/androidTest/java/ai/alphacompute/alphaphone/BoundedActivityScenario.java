package ai.alphacompute.alphaphone;

import android.app.Activity;
import android.content.Intent;
import android.os.SystemClock;
import androidx.lifecycle.Lifecycle;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.runner.lifecycle.ActivityLifecycleCallback;
import androidx.test.runner.lifecycle.ActivityLifecycleMonitorRegistry;
import androidx.test.runner.lifecycle.Stage;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

/** Real Android lifecycle operations with bounded waits, never waitForIdleSync.
 * Animated WebViews need not make Android's main MessageQueue globally idle. */
final class BoundedActivityScenario<T extends Activity> implements AutoCloseable {
 private final Class<T> type;
 private volatile T activity;
 private volatile Stage stage;
 private volatile Activity recreating;
 private volatile boolean closed;
 private final ActivityLifecycleCallback observer;
 private BoundedActivityScenario(Class<T> type){
  this.type=type;
  observer=(candidate,event)->{
  if(candidate.getClass()!=type)return;
  // The launcher flavor keeps one MainActivity: a start that arrives while one is live is handed to
  // it, and the instance Android created for that start finishes without a page (MainActivity
  // "One live MainActivity"). The launch then is the live instance, in whatever stage it is in.
  if(candidate instanceof MainActivity&&((MainActivity)candidate).wasHandedOff()){
   MainActivity live=MainActivity.liveInstance();
   if(activity==null&&event==Stage.CREATED&&live!=null&&live.getClass()==type){
    activity=type.cast(live);
    try{stage=ActivityLifecycleMonitorRegistry.getInstance().getLifecycleStageOf(live);}catch(RuntimeException unknown){stage=null;}
   }
   return;
  }
  // CLEAR_TASK may report the previous instance's teardown before the new creation.
  // Only a created instance or an actually resumed singleTask reuse can be adopted.
  if((activity==null&&(event==Stage.CREATED||event==Stage.RESUMED)) || (recreating!=null&&candidate!=recreating&&event==Stage.CREATED))activity=type.cast(candidate);
  if(candidate==activity)stage=event;
  };
 }
 static void main(Runnable action)throws Exception{
  CountDownLatch done=new CountDownLatch(1);AtomicReference<Throwable> error=new AtomicReference<>();
  TestUiDispatch dispatch=TestUiDispatch.post(()->{try{action.run();}catch(Throwable failure){error.set(failure);}finally{done.countDown();}});
  dispatch.await(done,"Main lifecycle command");
  if(error.get()!=null)throw new AssertionError("Lifecycle command failed",error.get());
 }
 /** Browser tabs are restored after a cold start by product decision. A test
  * launch starts from no saved tabs or history so earlier tests cannot change
  * which page opens; restart tests opt out with launchRetainingBrowserSession. */
 static <T extends Activity> BoundedActivityScenario<T> launch(Class<T> type)throws Exception{
  if(type==MainActivity.class)AlphaBrowserStores.session(InstrumentationRegistry.getInstrumentation().getTargetContext()).clear();
  return launchRetainingBrowserSession(type);
 }
 static <T extends Activity> BoundedActivityScenario<T> launchRetainingBrowserSession(Class<T> type)throws Exception{
  return launch(new Intent(InstrumentationRegistry.getInstrumentation().getTargetContext(),type));
 }
 @SuppressWarnings("unchecked")
 static <T extends Activity> BoundedActivityScenario<T> launch(Intent intent)throws Exception{
  assertNotNull("Explicit test activity required",intent.getComponent());
  Class<T> type=(Class<T>)Class.forName(intent.getComponent().getClassName());
  BoundedActivityScenario<T> scenario=new BoundedActivityScenario<>(type);
  main(()->ActivityLifecycleMonitorRegistry.getInstance().addLifecycleCallback(scenario.observer));
  try{
   main(()->InstrumentationRegistry.getInstrumentation().getTargetContext().startActivity(new Intent(intent).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)));
   scenario.awaitResumed(null);return scenario;
  }catch(Exception|AssertionError failure){try{scenario.close();}catch(Exception|AssertionError cleanup){failure.addSuppressed(cleanup);}throw failure;}
 }
 private void awaitResumed(Activity previous)throws Exception{
  long deadline=SystemClock.elapsedRealtime()+20000;
  while(SystemClock.elapsedRealtime()<deadline){if(activity!=null&&activity!=previous&&stage==Stage.RESUMED)return;SystemClock.sleep(50);}
  fail("Activity did not reach RESUMED: "+type.getName()+" stage="+stage+" replaced="+(activity!=previous));
 }
 BoundedActivityScenario<T> recreate()throws Exception{
  T previous=activity;assertNotNull(previous);assertFalse("Scenario closed",closed);recreating=previous;
  main(()->{assertFalse(previous.isFinishing());assertFalse(previous.isDestroyed());previous.recreate();});
  awaitResumed(previous);recreating=null;return this;
 }
 Lifecycle.State getState(){
  if(stage==null)return Lifecycle.State.INITIALIZED;
  switch(stage){case RESUMED:return Lifecycle.State.RESUMED;case STARTED:case PAUSED:return Lifecycle.State.STARTED;case CREATED:case STOPPED:return Lifecycle.State.CREATED;case DESTROYED:return Lifecycle.State.DESTROYED;default:return Lifecycle.State.INITIALIZED;}
 }
 @Override public void close()throws Exception{
  if(closed)return;closed=true;
  try{
   T target=activity;
   if(target!=null&&stage!=Stage.DESTROYED){
    main(()->{if(!target.isDestroyed())target.finish();});
    long deadline=SystemClock.elapsedRealtime()+15000;
    while(stage!=Stage.DESTROYED&&SystemClock.elapsedRealtime()<deadline){
     SystemClock.sleep(50);
    }
    assertEquals("Finished activity must emit DESTROYED: "+type.getName(),Stage.DESTROYED,stage);
   }
  }finally{main(()->ActivityLifecycleMonitorRegistry.getInstance().removeLifecycleCallback(observer));}
 }
}
