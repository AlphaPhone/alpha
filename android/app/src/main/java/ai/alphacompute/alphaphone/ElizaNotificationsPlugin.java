package ai.alphacompute.alphaphone;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Workflow notice taps under the upstream plugin name (@elizaos/os bridges/notices
 * {@code ElizaNotifications}): {@code pendingWorkflowTap}, {@code consumeWorkflowTap} and the
 * {@code pendingWorkflowTap} event, served by the one live {@link AlphaNotificationsPlugin} so a tap
 * is captured by one inbox only. Without a live bridge every call refuses.
 */
@CapacitorPlugin(name="ElizaNotifications")
public final class ElizaNotificationsPlugin extends Plugin {
 private static java.lang.ref.WeakReference<ElizaNotificationsPlugin> live=new java.lang.ref.WeakReference<>(null);
 static void forward(String event,JSObject data){ElizaNotificationsPlugin plugin=live.get();if(plugin!=null)plugin.notifyListeners(event,data,true);}
 @Override public void load(){super.load();live=new java.lang.ref.WeakReference<>(this);}
 @Override protected void handleOnDestroy(){if(live.get()==this)live.clear();super.handleOnDestroy();}
 private AlphaNotificationsPlugin host(PluginCall call){
  AlphaNotificationsPlugin host=AlphaNotificationsPlugin.live();
  if(host==null)call.reject("Workflow notification link unavailable; retry after unlocking.");
  return host;
 }
 @PluginMethod public void pendingWorkflowTap(PluginCall call){AlphaNotificationsPlugin host=host(call);if(host!=null)host.pendingWorkflowTap(call);}
 @PluginMethod public void consumeWorkflowTap(PluginCall call){AlphaNotificationsPlugin host=host(call);if(host!=null)host.consumeWorkflowTap(call);}
}
