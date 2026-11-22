package ai.alphacompute.alphaphone;

import android.net.ConnectivityManager;
import android.net.LinkProperties;
import android.net.Network;
import android.net.NetworkCapabilities;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** ElizaNetworkPolicy: whether the active path is metered and which transports it uses; hints only, never addresses. */
@CapacitorPlugin(name = "ElizaNetworkPolicy")
public final class ElizaNetworkPolicyPlugin extends Plugin {
 private ConnectivityManager connectivity() { return getContext().getSystemService(ConnectivityManager.class); }

 @PluginMethod public void getMeteredHint(PluginCall call) {
  ConnectivityManager manager = connectivity();
  JSObject out = new JSObject();
  Network active = manager == null ? null : manager.getActiveNetwork();
  NetworkCapabilities capabilities = active == null ? null : manager.getNetworkCapabilities(active);
  out.put("connected", capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET));
  out.put("metered", manager != null && manager.isActiveNetworkMetered());
  out.put("restricted", manager != null && manager.getRestrictBackgroundStatus() == ConnectivityManager.RESTRICT_BACKGROUND_STATUS_ENABLED);
  call.resolve(out);
 }

 @PluginMethod public void getPathHints(PluginCall call) {
  ConnectivityManager manager = connectivity();
  JSObject out = new JSObject();
  JSArray transports = new JSArray();
  Network active = manager == null ? null : manager.getActiveNetwork();
  NetworkCapabilities capabilities = active == null ? null : manager.getNetworkCapabilities(active);
  if (capabilities != null) {
   if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) transports.put("wifi");
   if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) transports.put("cellular");
   if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) transports.put("ethernet");
   if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) transports.put("vpn");
  }
  LinkProperties link = active == null ? null : manager.getLinkProperties(active);
  out.put("transports", transports);
  out.put("validated", capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED));
  out.put("notMetered", capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED));
  out.put("privateDns", link != null && link.isPrivateDnsActive());
  call.resolve(out);
 }
}
