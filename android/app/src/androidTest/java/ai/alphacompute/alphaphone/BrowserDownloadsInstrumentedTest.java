package ai.alphacompute.alphaphone;

import ai.alphacompute.alphaphone.browser.AlphaBrowserDownloads;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.Instrumentation;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.Environment;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.OutputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import static org.junit.Assert.*;

/** Browser's Downloads list on a real Activity: a finished download's Open button hands the file to
 * an app that can show it, and Show in Files closes the list and runs the host's action. The file
 * is a scoped MediaStore fixture and the outgoing view intent is intercepted, so no app opens. */
public final class BrowserDownloadsInstrumentedTest {
 private static Object field(Object object,String name)throws Exception{Field field=object.getClass().getDeclaredField(name);field.setAccessible(true);return field.get(object);}
 private static Button button(View view,String text){
  if(view instanceof Button&&text.contentEquals(((Button)view).getText())&&view.getVisibility()==View.VISIBLE)return (Button)view;
  if(view instanceof ViewGroup)for(int i=0;i<((ViewGroup)view).getChildCount();i++){Button found=button(((ViewGroup)view).getChildAt(i),text);if(found!=null)return found;}
  return null;
 }
 private static Uri fixture(ContentResolver resolver,String name)throws Exception{
  ContentValues values=new ContentValues();
  values.put(MediaStore.Downloads.DISPLAY_NAME,name);values.put(MediaStore.Downloads.MIME_TYPE,"text/plain");
  values.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS);values.put(MediaStore.Downloads.IS_PENDING,1);
  Uri uri=resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);assertNotNull("Create the scoped download fixture",uri);
  try(OutputStream output=resolver.openOutputStream(uri)){assertNotNull(output);output.write("Alpha download fixture".getBytes(StandardCharsets.UTF_8));}
  ContentValues ready=new ContentValues();ready.put(MediaStore.Downloads.IS_PENDING,0);
  assertEquals(1,resolver.update(uri,ready,null,null));
  return uri;
 }

 @Test public void finishedDownloadOpensAndShowInFilesRunsTheHostAction()throws Exception{
  Instrumentation instrumentation=InstrumentationRegistry.getInstrumentation();
  Context target=instrumentation.getTargetContext();ContentResolver resolver=target.getContentResolver();
  String preferences="alpha-browser-downloads-test-"+UUID.randomUUID(),name="alpha-download-"+UUID.randomUUID()+".txt";
  Uri file=fixture(resolver,name);
  // The saved list as a normal tab's finished host-saved download leaves it (negative id).
  target.getSharedPreferences(preferences,Context.MODE_PRIVATE).edit().putString("owned",new JSONArray()
   .put(new JSONObject().put("id",-1).put("name",name).put("origin","https://files.example").put("uri",file.toString())).toString()).commit();
  AtomicReference<AlphaBrowserDownloads> downloads=new AtomicReference<>();AtomicReference<Intent> outgoing=new AtomicReference<>();AtomicBoolean showInFiles=new AtomicBoolean();
  Instrumentation.ActivityMonitor monitor=new Instrumentation.ActivityMonitor(){@Override public Instrumentation.ActivityResult onStartActivity(Intent intent){if(Intent.ACTION_VIEW.equals(intent.getAction()))outgoing.set(new Intent(intent));return new Instrumentation.ActivityResult(Activity.RESULT_CANCELED,null);}};
  try(BoundedActivityScenario<MainActivity> scenario=BoundedActivityScenario.launch(MainActivity.class)){
   AppNavigation.liveMode();
   WebViewTestDriver.withActivity(MainActivity.class,activity->downloads.set(new AlphaBrowserDownloads(activity,new AlphaBrowserDownloads.Config(preferences,false))));
   instrumentation.addMonitor(monitor);
   try{
    // Open hands exactly this file to a viewer, with read access to it only.
    Method open=AlphaBrowserDownloads.class.getDeclaredMethod("open",long.class);open.setAccessible(true);
    BoundedActivityScenario.main(()->{try{open.invoke(downloads.get(),-1L);}catch(Exception failure){throw new AssertionError(failure);}});
    instrumentation.waitForIdleSync();
    Intent view=outgoing.getAndSet(null);assertNotNull("Open asked Android to show the file",view);
    assertEquals(file,view.getData());assertEquals("text/plain",view.getType());
    assertTrue("The viewer may read this file",(view.getFlags()&Intent.FLAG_GRANT_READ_URI_PERMISSION)!=0);
    assertEquals(0,view.getFlags()&Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

    BoundedActivityScenario.main(()->downloads.get().show(()->showInFiles.set(true)));
    AtomicReference<AlertDialog> list=new AtomicReference<>();
    BoundedActivityScenario.main(()->{try{list.set((AlertDialog)field(downloads.get(),"listing"));}catch(Exception failure){throw new AssertionError(failure);}});
    assertNotNull("The Downloads list is showing",list.get());
    // The row's Open button appears once the status worker has read the saved file.
    AtomicReference<Button> row=new AtomicReference<>();
    long deadline=SystemClock.elapsedRealtime()+10000;
    while(row.get()==null&&SystemClock.elapsedRealtime()<deadline){
     BoundedActivityScenario.main(()->row.set(button(list.get().getWindow().getDecorView(),"Open")));
     if(row.get()==null)SystemClock.sleep(100);
    }
    assertNotNull("A finished download offers Open",row.get());
    assertEquals("Open "+name,String.valueOf(row.get().getContentDescription()));
    BoundedActivityScenario.main(()->row.get().performClick());
    instrumentation.waitForIdleSync();
    view=outgoing.getAndSet(null);assertNotNull("The row's Open button opens the file",view);assertEquals(file,view.getData());

    AtomicReference<Button> files=new AtomicReference<>();
    BoundedActivityScenario.main(()->files.set(list.get().getButton(DialogInterface.BUTTON_NEUTRAL)));
    assertNotNull(files.get());assertEquals(AlphaBrowserDownloads.SHOW_IN_FILES,String.valueOf(files.get().getText()));
    BoundedActivityScenario.main(()->files.get().performClick());
    instrumentation.waitForIdleSync();
    assertTrue("Show in Files runs the host's action",showInFiles.get());
    BoundedActivityScenario.main(()->assertFalse("Show in Files closes the list",list.get().isShowing()));
    assertNull("Show in Files opens no Android viewer",outgoing.get());
   }finally{
    instrumentation.removeMonitor(monitor);
    if(downloads.get()!=null)BoundedActivityScenario.main(()->downloads.get().destroy());
   }
  }finally{
   resolver.delete(file,null,null);
   target.deleteSharedPreferences(preferences);
  }
 }
}
