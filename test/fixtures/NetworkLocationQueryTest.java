package ai.alphacompute.alphaphone;

/** Host-JVM check of the network location query builder. Not Android, network or BeaconDB evidence. */
public final class NetworkLocationQueryTest {
 private static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
 public static void main(String[] args){
  NetworkLocationQuery query=new NetworkLocationQuery();
  check(!query.usable(),"an empty scan is not usable");
  check(query.addWifi("A0:B1:C2:D3:E4:F5","\"Cafe\"",-61,1200),"an ordinary access point is kept");
  check(!query.addWifi("a0:b1:c2:d3:e4:f5","Cafe",-60,0),"a duplicate BSSID is dropped");
  check(!query.addWifi("10:22:33:44:55:66","Home_nomap",-50,0),"an owner's _nomap opt-out is never sent");
  check(!query.addWifi("10:22:33:44:55:67","home_NoMap",-50,0),"the opt-out is case-insensitive");
  check(!query.addWifi("10:22:33:44:55:68","",-50,0),"a hidden network is never sent");
  check(!query.addWifi("12:22:33:44:55:69","Phone hotspot",-50,0),"a randomized (locally administered) MAC is dropped");
  check(!query.addWifi("not-a-mac","Cafe",-50,0),"a malformed BSSID is dropped");
  check(!query.usable(),"one access point is not enough");
  check(query.addWifi("a0:b1:c2:d3:e4:f6","Office",-70,-5),"a second access point is kept");
  check(query.usable(),"two access points are usable");
  check(query.addCell("lte",310,260,12345,123456789L,-95),"a complete LTE cell is kept");
  check(!query.addCell("nr",310,260,1,1,-90),"5G cells are outside the service's radio types");
  check(!query.addCell("lte",310,260,0,5,-90),"an incomplete cell is dropped");
  String json=query.json();
  check(json.startsWith("{\"considerIp\":false,\"fallbacks\":{\"ipf\":false,\"lacf\":true}"),"the request never asks for an IP-based guess: "+json);
  check(json.contains("{\"macAddress\":\"a0:b1:c2:d3:e4:f5\",\"signalStrength\":-61,\"age\":1200}"),"access point record: "+json);
  check(json.contains("\"age\":0}"),"a negative age is clamped: "+json);
  check(json.contains("{\"radioType\":\"lte\",\"mobileCountryCode\":310,\"mobileNetworkCode\":260,\"locationAreaCode\":12345,\"cellId\":123456789,\"signalStrength\":-95}"),"cell record: "+json);
  check(!json.contains("Cafe")&&!json.contains("ssid"),"network names are not sent: "+json);
  NetworkLocationQuery reordered=new NetworkLocationQuery();
  reordered.addWifi("a0:b1:c2:d3:e4:f6","Office",-40,0);reordered.addWifi("a0:b1:c2:d3:e4:f5","Cafe",-80,0);reordered.addCell("lte",310,260,12345,123456789L,-80);
  check(reordered.fingerprint().equals(query.fingerprint()),"the same visible set has the same fingerprint whatever the order or signal");
  double[] fix=NetworkLocationQuery.parse("{\"location\": {\"lat\": 37.7764, \"lng\": -122.4258}, \"accuracy\": 42.5}");
  check(fix!=null&&fix[0]==37.7764&&fix[1]==-122.4258&&fix[2]==42.5,"a success answer is parsed");
  check(NetworkLocationQuery.parse("{\"error\":{\"code\":404,\"message\":\"Not found\"}}")==null,"a not-found body is not a fix");
  check(NetworkLocationQuery.parse("{\"location\":{\"lat\":91,\"lng\":0},\"accuracy\":5}")==null,"an out-of-range answer is refused");
  check(NetworkLocationQuery.parse("{\"location\":{\"lat\":1,\"lng\":2},\"accuracy\":0}")==null,"a zero accuracy is refused");
  System.out.println("PASS network location query");
 }
}
