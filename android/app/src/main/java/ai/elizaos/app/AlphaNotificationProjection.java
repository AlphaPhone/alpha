package ai.elizaos.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import java.io.IOException;
import java.nio.file.Path;
import org.json.JSONObject;

/**
 * Alpha's access to the shared resident-notification inbox, wire, route and projector of the os
 * notifications module (:eliza-notifications). Upstream keeps those classes package-private in
 * ai.elizaos.app and has no caller of its own; the legacy generated host copied them into the app.
 * This class sits in the same package, adds nothing and forwards each call unchanged, so
 * AlphaCanonicalNotifications reaches the pinned upstream code rather than a copy. The tap component
 * is the activity that receives a notification tap.
 */
public final class AlphaNotificationProjection {
    private AlphaNotificationProjection() {}

    public interface Projector { boolean post(JSONObject notification) throws Exception; }
    public interface AuthorityCheck { void current() throws Exception; }

    /** One owner's inbox under the app's no-backup directory. */
    public static final class Inbox {
        private final NativeNotificationInbox inbox;

        public Inbox(Path root, String ownerFingerprint, Projector projector, AuthorityCheck authority) throws IOException {
            inbox = new NativeNotificationInbox(root, ownerFingerprint, projector::post, NativeNotificationProjector::syncDirectory, authority::current);
        }

        public void beginBaseline() throws Exception { inbox.beginBaseline(); }
        public JSONObject pageCursor() throws Exception { return inbox.pageCursor(); }
        public void restartEpoch() throws Exception { inbox.restartEpoch(); }
        public JSONObject acceptLive(JSONObject notification) throws Exception { return inbox.acceptLive(notification); }
        public boolean acceptPage(JSONObject envelope, JSONObject requestedCursor) throws Exception { return inbox.acceptPage(envelope, requestedCursor); }
    }

    /** Names the channel groups Alpha itself assigns, so the shared routing does not read them as the owner's customisation. */
    public static void setHostAssignedGroups(java.util.Collection<String> groups) { NativeNotificationChannels.setHostAssignedGroups(groups); }

    public static boolean post(Context context, Class<? extends Activity> tapComponent, String owner, JSONObject notification) throws Exception {
        return NativeNotificationProjector.post(context, tapComponent, owner, notification);
    }

    public static boolean onOpened(Context context, Class<? extends Activity> tapComponent, Intent intent, String currentOwner) {
        return NativeNotificationProjector.onOpened(context, tapComponent, intent, currentOwner);
    }

    public static void retireOwner(Context context, String owner) throws IOException {
        NativeNotificationProjector.retireOwner(context, owner);
    }

    public static JSONObject notification(String frame) throws Exception { return NativeNotificationWire.notification(frame); }

    public static JSONObject page(JSONObject input, JSONObject cursor) throws Exception { return NativeNotificationWire.page(input, cursor); }

    public static String view(String deepLink) { return NativeNotificationRoute.view(deepLink); }
}
