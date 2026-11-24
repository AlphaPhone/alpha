package ai.alphacompute.alphaphone;

import android.content.*;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.view.*;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import java.util.*;
import static org.junit.Assert.*;

/** Owned synthetic photos and real touch injection shared by the Photos batch and multi-share tests. */
final class PhotosTestFixture {
 private PhotosTestFixture(){}
 private static void until(String script)throws Exception{for(int i=0;i<150;i++){if("true".equals(WebViewTestDriver.evaluate("Boolean("+script+")")))return;SystemClock.sleep(100);}fail("Photo tile missing: "+script);}
 /** Injects a real touch at the tile's centre; a positive hold makes it a long press. */
 static void touch(Uri uri,long hold)throws Exception{
  String node="document.querySelector('[data-owned-media-id=\"native-camera-"+ContentUris.parseId(uri)+"\"]')";until(node);WebViewTestDriver.evaluate(node+".scrollIntoView({block:'center',behavior:'instant'})");
  JSONObject point=new JSONObject(WebViewTestDriver.evaluate("(()=>{const e="+node+",r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,width:innerWidth}})()"));float[] xy=new float[2];
  WebViewTestDriver.withActivity(MainActivity.class,activity->{android.webkit.WebView web=activity.getBridge().getWebView();int[] offset=new int[2];web.getLocationOnScreen(offset);float scale=(float)(web.getWidth()/point.optDouble("width"));xy[0]=offset[0]+(float)point.optDouble("x")*scale;xy[1]=offset[1]+(float)point.optDouble("y")*scale;});
  long down=SystemClock.uptimeMillis();for(int action:new int[]{MotionEvent.ACTION_DOWN,MotionEvent.ACTION_UP}){if(action==MotionEvent.ACTION_UP&&hold>0)SystemClock.sleep(hold);MotionEvent event=MotionEvent.obtain(down,SystemClock.uptimeMillis(),action,xy[0],xy[1],0);event.setSource(InputDevice.SOURCE_TOUCHSCREEN);try{assertTrue(InstrumentationRegistry.getInstrumentation().getUiAutomation().injectInputEvent(event,true));}finally{event.recycle();}}
 }
 /** Inserts an owned 40x30 JPEG of one color under Pictures/AlphaPhone-tests. */
 static Uri fixture(ContentResolver resolver,String prefix,int color)throws Exception{ContentValues values=new ContentValues();values.put("_display_name",prefix+UUID.randomUUID()+".jpg");values.put("mime_type","image/jpeg");values.put("relative_path","Pictures/AlphaPhone-tests");values.put("is_pending",1);Uri uri=resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,values);assertNotNull(uri);Bitmap bitmap=Bitmap.createBitmap(40,30,Bitmap.Config.ARGB_8888);bitmap.eraseColor(color);try(java.io.OutputStream out=resolver.openOutputStream(uri)){assertNotNull(out);assertTrue(bitmap.compress(Bitmap.CompressFormat.JPEG,95,out));}finally{bitmap.recycle();}values.clear();values.put("is_pending",0);assertEquals(1,resolver.update(uri,values,null,null));return uri;}
 static byte[] bytes(ContentResolver resolver,Uri uri)throws Exception{try(java.io.InputStream input=resolver.openInputStream(uri)){assertNotNull(input);return input.readAllBytes();}}
}
