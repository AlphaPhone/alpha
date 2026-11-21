package ai.alphacompute.alphaphone;

import android.Manifest;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.LauncherApps;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.os.Process;
import android.os.UserHandle;
import android.os.UserManager;
import android.provider.Settings;
import ai.eliza.plugins.system.SystemLauncherApps;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/** Product policy stays in Alpha; shared System behavior is unchanged for other hosts. */
@CapacitorPlugin(name="ElizaSystem",permissions={@Permission(alias="camera",strings={Manifest.permission.CAMERA})})
public final class AlphaSystemPlugin extends ai.eliza.plugins.system.SystemPlugin {
 private ConnectivityManager connectivity;
 private ConnectivityManager.NetworkCallback networkWatch;

 @Override public void load(){
  super.load();
  connectivity=getContext().getSystemService(ConnectivityManager.class);
  if(connectivity==null)return;
  ConnectivityManager.NetworkCallback watch=new ConnectivityManager.NetworkCallback(){
   private void changed(){if(networkWatch==this)notifyListeners("networkStatusChanged",new JSObject());}
   @Override public void onAvailable(Network network){changed();}
   @Override public void onLost(Network network){changed();}
   @Override public void onCapabilitiesChanged(Network network,NetworkCapabilities capabilities){changed();}
  };
  try{
   connectivity.registerDefaultNetworkCallback(watch,new Handler(Looper.getMainLooper()));
   networkWatch=watch;
  }catch(RuntimeException unavailable){ /* Foreground reads still work without change notifications. */ }
 }

 @Override protected void handleOnDestroy(){
  ConnectivityManager.NetworkCallback watch=networkWatch;
  networkWatch=null;
  try{
   if(watch!=null)connectivity.unregisterNetworkCallback(watch);
  }catch(RuntimeException unavailable){ /* The system may already have removed the callback. */ }
  super.handleOnDestroy();
 }

 /** The app's default network, rather than WebView's potentially stale navigator.onLine hint.
  * Missing fields mean Android could not answer; an unvalidated network is still connected. */
 @PluginMethod public void getNetworkStatus(PluginCall call){
  JSObject out=new JSObject();
  try{
   if(connectivity!=null){
    Network network=connectivity.getActiveNetwork();
    out.put("connected",network!=null);
    if(network==null)out.put("wifiActive",false);
    else{
     NetworkCapabilities capabilities=connectivity.getNetworkCapabilities(network);
     if(capabilities!=null){
      out.put("wifiActive",capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI));
      out.put("internetValidated",capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED));
     }
    }
   }
  }catch(RuntimeException unavailable){ /* Unknown connectivity must be decided by the real transport. */ }
  call.resolve(out);
 }
 @Override @PluginMethod public void requestPermissions(PluginCall call){LateLaunch.ask(call,()->super.requestPermissions(call));}
 @Override @PluginMethod public void requestRole(PluginCall call){LateLaunch.ask(call,()->super.requestRole(call));}
 @Override @PluginMethod public void setFlashlight(PluginCall call){LateLaunch.ask(call,()->super.setFlashlight(call));}
 @Override protected boolean isRoleEnabled(String role){return AlphaImageCapabilities.roleEnabled(role);}
 /** The dial hand-off exists only on an admitted image: the HOME role keeps a
  * path to the stock dialer and emergency calls (P-36). */
 @Override protected boolean isDefaultAppEnabled(String role){return AlphaImageCapabilities.defaultAppEnabled(getContext(),role);}
 @Override protected boolean isLauncherBuild(){return true;}
 @Override protected String buildVersion(){return BuildConfig.VERSION_NAME;}
 /** ACTION_ASSIST, or AlphaAssistActivity's own marker extra. */
 @Override protected boolean isAssistantLaunch(Intent intent){return super.isAssistantLaunch(intent)||(intent!=null&&intent.getBooleanExtra(AlphaAssistActivity.EXTRA_ASSISTANT,false));}
 /** The launcher drives Android's shade (#416, #417). */
 @Override protected boolean canExpandNotificationShade(){return true;}
 /** Android's App info for exactly one listed launcher entry, in its profile (the Apps drawer's
  * long-press menu). Only Settings opens; nothing about the app changes. App info needs only the
  * package in that profile: a disabled app, or one in a paused or locked work profile, still opens
  * it (that is where it is enabled again); a removed app or profile is refused. */
 @PluginMethod public void openAppInfo(PluginCall call){
  for(String key:new String[]{"packageName","activityName","user"})if(SystemLauncherApps.malformedText(call.getData(),key)){call.reject("Choose an installed app");return;}
  String name=call.getString("packageName"),activity=call.getString("activityName"),user=call.getString("user");
  if(name==null||name.isEmpty()||name.equals(getContext().getPackageName())){call.reject("Choose an installed app");return;}
  try{
   if(user==null){
    try{getContext().getPackageManager().getApplicationInfo(name,PackageManager.MATCH_DISABLED_COMPONENTS);}
    catch(PackageManager.NameNotFoundException gone){call.reject("This app is no longer installed.",SystemLauncherApps.NOT_INSTALLED);return;}
    getContext().startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.fromParts("package",name,null)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    call.resolve();return;
   }
   long serial;try{serial=Long.parseLong(user);}catch(NumberFormatException invalid){call.reject("Choose an installed app");return;}
   LauncherApps launcher=getContext().getSystemService(LauncherApps.class);UserManager users=getContext().getSystemService(UserManager.class);
   UserHandle handle=users==null?null:users.getUserForSerialNumber(serial);
   if(launcher==null||handle==null||handle.equals(Process.myUserHandle())||!launcher.getProfiles().contains(handle)){call.reject("This profile is no longer on the phone.",SystemLauncherApps.PROFILE_UNAVAILABLE);return;}
   try{launcher.getApplicationInfo(name,PackageManager.MATCH_DISABLED_COMPONENTS,handle);}
   catch(PackageManager.NameNotFoundException gone){call.reject("This app is no longer available in that profile.",SystemLauncherApps.NOT_INSTALLED);return;}
   launcher.startAppDetailsActivity(new ComponentName(name,activity==null||activity.isEmpty()?name:activity),handle,null,null);
   call.resolve();
  }
  catch(IllegalArgumentException invalid){call.reject("Choose an installed app");}
  catch(RuntimeException error){call.reject("App info could not be opened",SystemLauncherApps.FAILED,error);}
 }
}
