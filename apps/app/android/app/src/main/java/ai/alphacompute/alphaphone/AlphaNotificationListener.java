package ai.alphacompute.alphaphone;

import ai.eliza.plugins.notifications.NotificationMirror;
import ai.eliza.plugins.notifications.NotificationMirrorListenerService;

public final class AlphaNotificationListener extends NotificationMirrorListenerService {
 @Override protected NotificationMirror mirror(){return AlphaNotificationsPlugin.MIRROR;}
}
