package ai.alphacompute.alphaphone;

import android.app.Notification;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import org.json.JSONObject;

/** The real Maps bridge and navigation service: the arrival notice belongs to the session owner. */
public final class NavigationArrivalTest {
 static PluginCall call(String id,String title,String text){
  return new PluginCall(new JSObject().put("sessionId",id).put("title",title).put("text",text));
 }
 static boolean arrived(AlphaMapsTransportPlugin plugin,String title){
  PluginCall call=call(null,title,"Navigation ended.");
  plugin.navigationArrived(call);
  if(call.settles!=1)throw new AssertionError("Native call must settle exactly once");
  return call.result.getBoolean("shown");
 }
 public static void main(String[] args){
  AlphaMapsTransportPlugin owner=new AlphaMapsTransportPlugin(),other=new AlphaMapsTransportPlugin();
  owner.fixtureOwner=1;other.fixtureOwner=2;owner.load();other.load();
  // No session: nothing to announce.
  boolean idle=arrived(owner,"Arrived at Cafe");
  PluginCall start=call("route_A_1234","Route to Cafe","Waiting for location");
  owner.startNavigation(start);
  if(start.error!=null)throw new AssertionError(start.error);
  boolean foreign=arrived(other,"Arrived at Cafe");
  boolean shown=arrived(owner,"Arrived at Cafe");
  Notification notice=NavigationServicePorts.notifications.posted.get(AlphaNavigationService.ARRIVAL_NOTIFICATION_ID);
  PluginCall stop=call("route_A_1234","","");
  owner.stopNavigation(stop);
  System.out.println(new JSONObject().put("idle",idle).put("foreign",foreign).put("shown",shown)
   .put("posted",NavigationServicePorts.notifications.posted.size())
   .put("title",notice==null?JSONObject.NULL:notice.title).put("text",notice==null?JSONObject.NULL:notice.text)
   .put("autoCancel",notice!=null&&notice.autoCancel).put("ongoing",notice!=null&&notice.ongoing)
   .put("stopped",stop.result.getBoolean("stopped")).put("activeAfterStop",AlphaNavigationService.activeSession()!=null));
 }
}
