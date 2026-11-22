package ai.alphacompute.alphaphone;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.wifi.ScanResult;
import android.net.wifi.WifiManager;
import android.os.SystemClock;
import android.telephony.CellIdentityGsm;
import android.telephony.CellIdentityLte;
import android.telephony.CellIdentityWcdma;
import android.telephony.CellInfo;
import android.telephony.CellInfoGsm;
import android.telephony.CellInfoLte;
import android.telephony.CellInfoWcdma;
import android.telephony.TelephonyManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import javax.net.ssl.HttpsURLConnection;

/**
 * One network location lookup on request: the Wi-Fi access points and cell towers the phone can
 * see are resolved to a position by BeaconDB. It runs only when the renderer asks (a Maps action
 * or a locate card without a GPS fix, never every chat turn) and only while the launcher already
 * holds the location permission and device location is on. It never requests a permission.
 */
@CapacitorPlugin(name="AlphaNetworkLocation")
public final class AlphaNetworkLocationPlugin extends Plugin {
 private static final long FRESH_SCAN_MS=120_000;
 private final ExecutorService worker=Executors.newSingleThreadExecutor();

 @PluginMethod public void locate(PluginCall call){
  PluginWorkers.submit(worker,()->run(call),()->call.reject("Network location is unavailable","unavailable"));
 }

 private void run(PluginCall call){
  Context context=getContext();
  if(context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED){call.reject("Location permission is not granted","permission-denied");return;}
  LocationManager location=context.getSystemService(LocationManager.class);
  if(location==null||!location.isLocationEnabled()){call.reject("Device location is off","location-off");return;}
  NetworkLocationQuery query=new NetworkLocationQuery();
  try{addWifi(context,query);}catch(RuntimeException unavailable){/* Wi-Fi off or refused: cells may still answer. */}
  try{addCells(context,query);}catch(RuntimeException unavailable){/* No telephony or refused. */}
  if(!query.usable()){call.reject("No Wi-Fi or cell signals to locate from","no-signals");return;}
  String fingerprint=Integer.toHexString(query.fingerprint().hashCode());
  // The same visible networks as the caller's last answer: nothing is sent.
  if(fingerprint.equals(call.getString("unchangedFrom",""))){JSObject same=new JSObject();same.put("unchanged",true);same.put("fingerprint",fingerprint);call.resolve(same);return;}
  HttpsURLConnection connection=null;
  try{
   connection=(HttpsURLConnection)new URL(NetworkLocationQuery.ENDPOINT).openConnection();
   connection.setRequestMethod("POST");connection.setConnectTimeout(5000);connection.setReadTimeout(8000);
   connection.setUseCaches(false);connection.setInstanceFollowRedirects(false);connection.setDoOutput(true);
   connection.setRequestProperty("Content-Type","application/json");connection.setRequestProperty("User-Agent",NetworkLocationQuery.USER_AGENT);
   byte[] body=query.json().getBytes(StandardCharsets.UTF_8);
   connection.setFixedLengthStreamingMode(body.length);
   try(OutputStream out=connection.getOutputStream()){out.write(body);}
   int status=connection.getResponseCode();
   if(status==404){call.reject("No position is known for these signals","not-found");return;}
   if(status!=200){call.reject("Network location service answered "+status,"unavailable");return;}
   double[] fix;
   try(InputStream in=connection.getInputStream()){fix=NetworkLocationQuery.parse(read(in));}
   if(fix==null){call.reject("Network location answer was not usable","invalid-response");return;}
   JSObject result=new JSObject();
   result.put("latitude",fix[0]);result.put("longitude",fix[1]);result.put("accuracy",fix[2]);
   result.put("timestamp",System.currentTimeMillis());result.put("fingerprint",fingerprint);
   result.put("wifi",query.wifi.size());result.put("cells",query.cells.size());
   call.resolve(result);
  }catch(Exception failed){call.reject("Network location service is unreachable","unavailable");}
  finally{if(connection!=null)connection.disconnect();}
 }

 private static String read(InputStream in)throws java.io.IOException{
  ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[1024];int n;
  while((n=in.read(buffer))>0){out.write(buffer,0,n);if(out.size()>4096)break;}
  return out.toString("UTF-8");
 }

 private void addWifi(Context context,NetworkLocationQuery query){
  WifiManager wifi=context.getApplicationContext().getSystemService(WifiManager.class);
  if(wifi==null)return;
  List<ScanResult> results=wifi.getScanResults();
  long now=SystemClock.elapsedRealtime();
  boolean fresh=false;
  for(ScanResult result:results)if(now-result.timestamp/1000<FRESH_SCAN_MS){fresh=true;break;}
  if(!fresh&&(wifi.isWifiEnabled()||wifi.isScanAlwaysAvailable())){
   // One throttled platform scan when the cached results are old; at most a few seconds.
   CountDownLatch done=new CountDownLatch(1);
   BroadcastReceiver receiver=new BroadcastReceiver(){@Override public void onReceive(Context c,Intent i){done.countDown();}};
   context.registerReceiver(receiver,new IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION),Context.RECEIVER_NOT_EXPORTED);
   try{
    @SuppressWarnings("deprecation") boolean started=wifi.startScan();
    if(started)done.await(5,TimeUnit.SECONDS);
   }catch(InterruptedException interrupted){Thread.currentThread().interrupt();}
   finally{context.unregisterReceiver(receiver);}
   results=wifi.getScanResults();now=SystemClock.elapsedRealtime();
  }
  for(ScanResult result:results){
   long age=now-result.timestamp/1000;
   if(age>FRESH_SCAN_MS*3)continue;
   @SuppressWarnings("deprecation") String ssid=result.SSID;
   query.addWifi(result.BSSID,ssid,result.level,age);
  }
 }

 private void addCells(Context context,NetworkLocationQuery query){
  TelephonyManager telephony=context.getSystemService(TelephonyManager.class);
  if(telephony==null)return;
  List<CellInfo> cells=telephony.getAllCellInfo();
  if(cells==null)return;
  for(CellInfo info:cells){
   if(info instanceof CellInfoLte){
    CellIdentityLte id=((CellInfoLte)info).getCellIdentity();
    query.addCell("lte",number(id.getMccString()),number(id.getMncString()),id.getTac(),id.getCi(),((CellInfoLte)info).getCellSignalStrength().getDbm());
   }else if(info instanceof CellInfoWcdma){
    CellIdentityWcdma id=((CellInfoWcdma)info).getCellIdentity();
    query.addCell("wcdma",number(id.getMccString()),number(id.getMncString()),id.getLac(),id.getCid(),((CellInfoWcdma)info).getCellSignalStrength().getDbm());
   }else if(info instanceof CellInfoGsm){
    CellIdentityGsm id=((CellInfoGsm)info).getCellIdentity();
    query.addCell("gsm",number(id.getMccString()),number(id.getMncString()),id.getLac(),id.getCid(),((CellInfoGsm)info).getCellSignalStrength().getDbm());
   }
  }
 }
 private static int number(String value){try{return value==null?-1:Integer.parseInt(value);}catch(NumberFormatException invalid){return -1;}}

 @Override protected void handleOnDestroy(){worker.shutdownNow();}
}
