package ai.alphacompute.alphaphone;

import android.app.Activity;
import android.app.role.RoleManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;
import android.telephony.TelephonyManager;
import android.telephony.euicc.EuiccManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Explicit, foreground-only carrier activation reads. No observer, cache, log or agent port.
 * This is registered in the launcher so ordinary installs retain Android Settings recovery.
 * The launcher manifest's optional signature permission is never evidence of an actual grant. */
@CapacitorPlugin(name="AlphaCarrierSetup")
public final class AlphaCarrierSetupPlugin extends Plugin {
 private volatile long epoch;
 private volatile boolean destroyed;
 private final java.util.concurrent.ExecutorService reads=java.util.concurrent.Executors.newSingleThreadExecutor();
 private final java.util.concurrent.ExecutorService eidReads=java.util.concurrent.Executors.newSingleThreadExecutor();
 private final java.util.concurrent.atomic.AtomicBoolean eidInFlight=new java.util.concurrent.atomic.AtomicBoolean();
 interface Read { Object get(); }
 static JSObject field(Read read) {
  JSObject out=new JSObject();
  try {
   Object value=read.get();
   String text=value==null?"":String.valueOf(value).trim();
   if(text.isEmpty()||Build.UNKNOWN.equalsIgnoreCase(text)){out.put("status","unavailable");return out;}
   out.put("status","available");out.put("value",text);
  } catch(SecurityException denied){out.put("status","permission-denied");}
  catch(UnsupportedOperationException unsupported){out.put("status","unsupported");}
  catch(RuntimeException unavailable){out.put("status","unavailable");}
  return out;
 }
 private static JSObject unavailable(){return field(()->null);}
 private static String simState(int state){return switch(state){
  case TelephonyManager.SIM_STATE_ABSENT -> "No SIM";
  case TelephonyManager.SIM_STATE_PIN_REQUIRED -> "SIM PIN required";
  case TelephonyManager.SIM_STATE_PUK_REQUIRED -> "SIM PUK required";
  case TelephonyManager.SIM_STATE_NETWORK_LOCKED -> "Network locked";
  case TelephonyManager.SIM_STATE_READY -> "Ready";
  case TelephonyManager.SIM_STATE_NOT_READY -> "Not ready";
  case TelephonyManager.SIM_STATE_PERM_DISABLED -> "Permanently disabled";
  case TelephonyManager.SIM_STATE_CARD_IO_ERROR -> "SIM read error";
  case TelephonyManager.SIM_STATE_CARD_RESTRICTED -> "SIM restricted";
  default -> null;
 };}
 private static String dataState(int state){return switch(state){
  case TelephonyManager.DATA_DISCONNECTED -> "Disconnected";
  case TelephonyManager.DATA_CONNECTING -> "Connecting";
  case TelephonyManager.DATA_CONNECTED -> "Connected";
  case TelephonyManager.DATA_SUSPENDED -> "Suspended";
  default -> null;
 };}
 private static String networkType(int type){return switch(type){
  case TelephonyManager.NETWORK_TYPE_NR -> "5G NR";
  case TelephonyManager.NETWORK_TYPE_LTE -> "LTE";
  case TelephonyManager.NETWORK_TYPE_HSPAP -> "HSPA+";
  case TelephonyManager.NETWORK_TYPE_HSPA -> "HSPA";
  case TelephonyManager.NETWORK_TYPE_HSDPA -> "HSDPA";
  case TelephonyManager.NETWORK_TYPE_HSUPA -> "HSUPA";
  case TelephonyManager.NETWORK_TYPE_UMTS -> "UMTS";
  case TelephonyManager.NETWORK_TYPE_EDGE -> "EDGE";
  case TelephonyManager.NETWORK_TYPE_GPRS -> "GPRS";
  case TelephonyManager.NETWORK_TYPE_GSM -> "GSM";
  case TelephonyManager.NETWORK_TYPE_CDMA -> "CDMA";
  case TelephonyManager.NETWORK_TYPE_IWLAN -> "IWLAN";
  case TelephonyManager.NETWORK_TYPE_UNKNOWN -> null;
  default -> "Android network type "+type;
 };}
 private void assertCurrent(long token){if(destroyed||token!=epoch||Thread.currentThread().isInterrupted()||!AlphaDevicePlugin.shareForeground(getActivity()))throw new IllegalStateException("Carrier read closed");}
 private JSObject readField(long token,Read read){assertCurrent(token);return field(read);}
 // Android and carrier roles decide each grant. The field read reports a denied grant explicitly.
 @android.annotation.SuppressLint("MissingPermission")
 private JSObject readNow(long token){
  assertCurrent(token);
  JSObject out=new JSObject();out.put("status","ready");
  out.put("aospImage",AlphaImageCapability.verified(getContext()));
  RoleManager roles=getContext().getSystemService(RoleManager.class);
  out.put("smsRole",readField(token,()->roles==null||!roles.isRoleAvailable(RoleManager.ROLE_SMS)?null:roles.isRoleHeld(RoleManager.ROLE_SMS)?"Alpha Phone is the default SMS app":"Alpha Phone is not the default SMS app"));
  out.put("dialerRole",readField(token,()->roles==null||!roles.isRoleAvailable(RoleManager.ROLE_DIALER)?null:roles.isRoleHeld(RoleManager.ROLE_DIALER)?"Alpha Phone is the default phone app":"Alpha Phone is not the default phone app"));
  boolean canChooseSms=false;try{canChooseSms=AlphaImageCapability.verified(getContext())&&roles!=null&&roles.isRoleAvailable(RoleManager.ROLE_SMS)&&!roles.isRoleHeld(RoleManager.ROLE_SMS);}catch(RuntimeException unavailable){}
  out.put("canChooseSms",canChooseSms);
  JSObject hardware=new JSObject();
  hardware.put("manufacturer",readField(token,()->Build.MANUFACTURER));hardware.put("model",readField(token,()->Build.MODEL));
  hardware.put("device",readField(token,()->Build.DEVICE));hardware.put("android",readField(token,()->Build.VERSION.RELEASE));
  hardware.put("baseband",readField(token,Build::getRadioVersion));out.put("hardware",hardware);
  TelephonyManager phone=getContext().getSystemService(TelephonyManager.class);
  JSArray slots=new JSArray();
  // Supported logical modem slots, independent of SIM/subscription presence. Android may still
  // withhold the inactive slot's IMEI; do not invent an identifier or map it to physical/eSIM.
  int count=0;
  try{if(phone!=null)count=Build.VERSION.SDK_INT>=30?phone.getSupportedModemCount():phone.getPhoneCount();}catch(RuntimeException ignored){}
  out.put("modemCount",readField(token,()->phone==null?null:Build.VERSION.SDK_INT>=30?phone.getSupportedModemCount():phone.getPhoneCount()));
  for(int i=0;i<Math.min(Math.max(count,0),8);i++){
   final int slot=i;JSObject row=new JSObject();row.put("slotIndex",slot);
   row.put("imei",readField(token,()->phone.getImei(slot)));row.put("simState",readField(token,()->simState(phone.getSimState(slot))));slots.put(row);
  }
  out.put("slots",slots);
  // eUICC hardware identity is optional for physical-SIM activation and may require a different
  // grant than IMEI. No eSIM is downloaded, provisioned or enabled by this read.
  boolean euicc=getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_TELEPHONY_EUICC);
  JSObject eid=new JSObject();eid.put("status",euicc?"not-read":"unsupported");out.put("eid",eid);
  JSObject subscriptions=new JSObject();JSArray items=new JSArray();
  SubscriptionManager manager=getContext().getSystemService(SubscriptionManager.class);
  try{
   if(manager==null)subscriptions.put("status","unavailable");
   else{
    assertCurrent(token);
    java.util.List<SubscriptionInfo> active=manager.getActiveSubscriptionInfoList();
    subscriptions.put("status",active==null?"unavailable":"available");
    if(active!=null)for(SubscriptionInfo sub:active){
     JSObject row=new JSObject();int id=sub.getSubscriptionId();row.put("subscriptionId",id);row.put("slotIndex",sub.getSimSlotIndex());row.put("embedded",sub.isEmbedded());
     row.put("carrier",readField(token,sub::getCarrierName));row.put("name",readField(token,sub::getDisplayName));row.put("iccid",readField(token,sub::getIccId));
     TelephonyManager line=phone==null?null:phone.createForSubscriptionId(id);
     row.put("operator",line==null?unavailable():readField(token,line::getNetworkOperatorName));
     JSObject operatorCode=line==null?unavailable():readField(token,line::getNetworkOperator);
     row.put("operatorCode",operatorCode);
     row.put("dataState",line==null?unavailable():readField(token,()->dataState(line.getDataState())));
     row.put("networkType",line==null?unavailable():readField(token,()->networkType(line.getDataNetworkType())));
     row.put("dataEnabled",line==null?unavailable():readField(token,()->line.isDataEnabled()?"On":"Off"));
     row.put("roaming",line==null||!"available".equals(operatorCode.optString("status"))?unavailable():readField(token,()->line.isNetworkRoaming()?"Roaming":"Not roaming"));
     row.put("defaultData",id==SubscriptionManager.getDefaultDataSubscriptionId());items.put(row);
    }
   }
  }catch(SecurityException denied){subscriptions.put("status","permission-denied");}
  catch(RuntimeException unavailable){subscriptions.put("status","unavailable");}
  subscriptions.put("items",items);out.put("subscriptions",subscriptions);return out;
 }
 @PluginMethod public void read(PluginCall call){
  Activity activity=getActivity();if(activity==null){call.reject("Open and unlock Carrier & SIM setup before reading.");return;}
  activity.runOnUiThread(()->{
   if(!AlphaDevicePlugin.shareForeground(activity)){call.reject("Open and unlock Carrier & SIM setup before reading.");return;}
   final long token=epoch;
   PluginWorkers.submit(reads,()->{
    final JSObject result;try{assertCurrent(token);result=readNow(token);}catch(RuntimeException unavailable){call.reject("Carrier setup is unavailable.");return;}
    activity.runOnUiThread(()->{
     if(destroyed||token!=epoch||!AlphaDevicePlugin.shareForeground(activity)){call.reject("Carrier setup left the foreground.");return;}
     call.resolve(result);
    });
   },()->call.reject("Carrier setup is unavailable."));
  });
 }
 /** EID has its own worker and explicit action: a stalled LPA never blocks physical-SIM IMEI. */
 @android.annotation.SuppressLint("MissingPermission")
 @PluginMethod public void readEid(PluginCall call){
  Activity activity=getActivity();if(activity==null){call.reject("Open and unlock Carrier & SIM setup first.");return;}
  activity.runOnUiThread(()->{
   if(!AlphaDevicePlugin.shareForeground(activity)){call.reject("Open and unlock Carrier & SIM setup first.");return;}
   if(!eidInFlight.compareAndSet(false,true)){call.reject("EID read is already in progress.");return;}
   final long token=epoch;
   PluginWorkers.submit(eidReads,()->{
    try{
     assertCurrent(token);EuiccManager esim=getContext().getSystemService(EuiccManager.class);
     final JSObject result=esim==null?field(()->{throw new UnsupportedOperationException();}):readField(token,esim::getEid);
     activity.runOnUiThread(()->{
      if(destroyed||token!=epoch||!AlphaDevicePlugin.shareForeground(activity)){call.reject("Carrier setup left the foreground.");return;}
      call.resolve(result);
     });
    }catch(RuntimeException unavailable){call.reject("EID is unavailable.");}
    finally{eidInFlight.set(false);}
   },()->{eidInFlight.set(false);call.reject("EID is unavailable.");});
  });
 }
 @Override protected void handleOnPause(){epoch++;notifyListeners("foregroundEnded",new JSObject());super.handleOnPause();}
 @Override protected void handleOnDestroy(){destroyed=true;epoch++;reads.shutdownNow();eidReads.shutdownNow();super.handleOnDestroy();}
 private static Intent handOff(Intent intent){return intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);}
 /** Fixed Android destinations only; no component, subscription ID or URL comes from the caller. */
 @PluginMethod public void openSettings(PluginCall call){
  String page=call.getString("page","");
  String action=switch(page){case "identifiers" -> Settings.ACTION_DEVICE_INFO_SETTINGS;case "sim" -> Build.VERSION.SDK_INT>=31?Settings.ACTION_MANAGE_ALL_SIM_PROFILES_SETTINGS:Settings.ACTION_WIRELESS_SETTINGS;case "mobile" -> Settings.ACTION_DATA_ROAMING_SETTINGS;case "apn" -> Settings.ACTION_APN_SETTINGS;case "default-sms" -> Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS;default -> null;};
  if(action==null){call.reject("Unsupported carrier settings page.");return;}
  Activity activity=getActivity();if(activity==null){call.reject("Open and unlock Alpha first.");return;}
  activity.runOnUiThread(()->{
   if(!AlphaDevicePlugin.shareForeground(activity)){call.reject("Open and unlock Alpha first.");return;}
   boolean specific=!("sim".equals(page)&&Build.VERSION.SDK_INT<31);
   try{
    try{activity.startActivity(handOff(new Intent(action)));}
    catch(android.content.ActivityNotFoundException missing){specific=false;activity.startActivity(handOff(new Intent(Settings.ACTION_SETTINGS)));}
    JSObject result=new JSObject();result.put("status","opened");result.put("specific",specific);call.resolve(result);
   }catch(RuntimeException unavailable){call.reject("Android carrier settings are unavailable.");}
  });
 }
}
