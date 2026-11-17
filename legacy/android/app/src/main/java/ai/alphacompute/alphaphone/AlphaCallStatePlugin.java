package ai.alphacompute.alphaphone;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * AP-16 AC-19: Telecom's call state for the renderer (AlphaCallState), and a "callState" event on each
 * Telephony change while the listener is registered. Read-only: nothing here places or ends a call.
 */
@CapacitorPlugin(name = "AlphaCallState")
public final class AlphaCallStatePlugin extends Plugin {
 private AlphaCallStateWatch watch;

 @Override public void load() {
  super.load();
  watch = new AlphaCallStateWatch(getContext(), () -> notifyListeners("callState", payload(AlphaCallState.read(getContext()), true)));
  watch.ensure();
 }

 /** The current reading; also retries the listener, so a phone-state grant after start is followed. */
 @PluginMethod public void callState(PluginCall call) {
  boolean watching = watch != null && watch.ensure();
  call.resolve(payload(AlphaCallState.read(getContext()), watching));
 }

 static JSObject payload(AlphaCallState.Reading reading, boolean watching) {
  JSObject out = new JSObject();
  out.put("inCall", reading.inCall == null ? JSObject.NULL : reading.inCall);
  out.put("emergency", reading.emergency == null ? JSObject.NULL : reading.emergency);
  out.put("emergencyLive", reading.emergencyLive());
  out.put("watching", watching);
  return out;
 }

 @Override protected void handleOnResume() { super.handleOnResume(); if (watch != null) watch.ensure(); }
 @Override protected void handleOnDestroy() { if (watch != null) watch.stop(); super.handleOnDestroy(); }
}
