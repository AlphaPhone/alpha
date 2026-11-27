// spec/app/platform/index.md, "Story: Reach the phone's native capabilities"
package ai.alphacompute.alphaphone;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class NetworkLocationQuery {
 static final String ENDPOINT="https://api.beacondb.net/v1/geolocate";
 static final String USER_AGENT="AlphaPhone-NetworkLocation/1";
 static final int MAX_WIFI=40,MAX_CELLS=8;
 private static final Pattern MAC=Pattern.compile("^[0-9a-f]{2}(:[0-9a-f]{2}){5}$");

 static final class Wifi {
  final String bssid,ssid;final int rssi;final long ageMs;
  Wifi(String bssid,String ssid,int rssi,long ageMs){this.bssid=bssid;this.ssid=ssid;this.rssi=rssi;this.ageMs=ageMs;}
 }
 static final class Cell {
  final String radio;final int mcc,mnc;final long area,cellId;final int signal;
  Cell(String radio,int mcc,int mnc,long area,long cellId,int signal){this.radio=radio;this.mcc=mcc;this.mnc=mnc;this.area=area;this.cellId=cellId;this.signal=signal;}
 }
 final List<Wifi> wifi=new ArrayList<>();
 final List<Cell> cells=new ArrayList<>();

 boolean addWifi(String bssid,String ssid,int rssi,long ageMs){
  if(bssid==null||wifi.size()>=MAX_WIFI)return false;
  String mac=bssid.toLowerCase(Locale.ROOT);
  if(!MAC.matcher(mac).matches()||mac.equals("00:00:00:00:00:00"))return false;
  if((Integer.parseInt(mac.substring(0,2),16)&0x02)!=0)return false;
  String name=ssid==null?"":ssid.replace("\"","");
  if(name.isEmpty()||name.toLowerCase(Locale.ROOT).endsWith("_nomap"))return false;
  for(Wifi seen:wifi)if(seen.bssid.equals(mac))return false;
  wifi.add(new Wifi(mac,name,rssi,Math.max(0,ageMs)));return true;
 }
 boolean addCell(String radio,int mcc,int mnc,long area,long cellId,int signal){
  if(cells.size()>=MAX_CELLS||!("gsm".equals(radio)||"wcdma".equals(radio)||"lte".equals(radio)))return false;
  if(mcc<1||mcc>999||mnc<0||mnc>999||area<=0||area>=0xFFFFFFFL||cellId<=0||cellId>=0xFFFFFFFL)return false;
  cells.add(new Cell(radio,mcc,mnc,area,cellId,signal));return true;
 }
 boolean usable(){return wifi.size()>=2||!cells.isEmpty();}
 String fingerprint(){
  List<String> ids=new ArrayList<>();
  for(Wifi entry:wifi)ids.add(entry.bssid);
  for(Cell cell:cells)ids.add(cell.radio+cell.mcc+"-"+cell.mnc+"-"+cell.area+"-"+cell.cellId);
  java.util.Collections.sort(ids);return String.join(",",ids);
 }
 String json(){
  StringBuilder out=new StringBuilder("{\"considerIp\":true,\"fallbacks\":{\"ipf\":true,\"lacf\":true}");
  if(!wifi.isEmpty()){
   out.append(",\"wifiAccessPoints\":[");
   for(int i=0;i<wifi.size();i++){Wifi w=wifi.get(i);if(i>0)out.append(',');
    out.append("{\"macAddress\":\"").append(w.bssid).append("\",\"signalStrength\":").append(w.rssi).append(",\"age\":").append(w.ageMs).append('}');}
   out.append(']');
  }
  if(!cells.isEmpty()){
   out.append(",\"cellTowers\":[");
   for(int i=0;i<cells.size();i++){Cell c=cells.get(i);if(i>0)out.append(',');
    out.append("{\"radioType\":\"").append(c.radio).append("\",\"mobileCountryCode\":").append(c.mcc).append(",\"mobileNetworkCode\":").append(c.mnc)
     .append(",\"locationAreaCode\":").append(c.area).append(",\"cellId\":").append(c.cellId).append(",\"signalStrength\":").append(c.signal).append('}');}
   out.append(']');
  }
  return out.append('}').toString();
 }

 static double[] parse(String body){
  if(body==null||body.length()>4096)return null;
  Matcher lat=Pattern.compile("\"lat\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?(?:[eE]-?\\d+)?)").matcher(body);
  Matcher lng=Pattern.compile("\"lng\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?(?:[eE]-?\\d+)?)").matcher(body);
  Matcher acc=Pattern.compile("\"accuracy\"\\s*:\\s*(\\d+(?:\\.\\d+)?(?:[eE]\\d+)?)").matcher(body);
  if(!lat.find()||!lng.find()||!acc.find())return null;
  double latitude=Double.parseDouble(lat.group(1)),longitude=Double.parseDouble(lng.group(1)),accuracy=Double.parseDouble(acc.group(1));
  if(!(latitude>=-90&&latitude<=90&&longitude>=-180&&longitude<=180&&accuracy>0&&accuracy<=100_000))return null;
  return new double[]{latitude,longitude,accuracy};
 }
}
