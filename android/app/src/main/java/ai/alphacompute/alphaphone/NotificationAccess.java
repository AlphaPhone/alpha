package ai.alphacompute.alphaphone;

import android.content.Context;
import com.getcapacitor.JSObject;
import ai.eliza.plugins.notifications.NotificationMirror;
import ai.eliza.plugins.notifications.NotificationMirrorConfig;

/** Product storage identities and Capacitor values around the shared mirror. */
final class NotificationAccess {
 static final NotificationMirror MIRROR = new NotificationMirror(new NotificationMirrorConfig(
   "alpha-notification-access", "alpha.notification.history.v1", "notification-history.enc", AlphaNotificationListener.class));
 private NotificationAccess() {}
 static android.content.SharedPreferences prefs(Context c) { return MIRROR.prefs(c); }
 static boolean granted(Context c) { return MIRROR.granted(c); }
 static AlphaNotificationListener listener() { return (AlphaNotificationListener) MIRROR.listener(); }
 static long eventGeneration() { return MIRROR.eventGeneration(); }
 static String signature(Context c, String name) throws Exception { return NotificationMirror.signature(c, name); }
 static JSObject status(Context c) throws Exception { return new JSObject(MIRROR.status(c).toString()); }
 static JSObject update(Context c, JSObject input) throws Exception { return new JSObject(MIRROR.update(c, input).toString()); }
 static void pause(Context c, boolean paused) throws Exception { MIRROR.pause(c, paused); }
}
