package ai.alphacompute.alphaphone;

import ai.eliza.plugins.notifications.NotificationMirror;
import ai.eliza.plugins.notifications.NotificationMirrorListenerService;
import android.service.notification.StatusBarNotification;

/** Keeps the installed Android component identity and the process-wide mirror, and signals each change of Alpha's own rows or the mirrored ones. */
public final class AlphaNotificationListener extends NotificationMirrorListenerService {
 @Override protected NotificationMirror mirror() { return NotificationAccess.MIRROR; }
 @Override public void onNotificationPosted(StatusBarNotification notice) { super.onNotificationPosted(notice); signal(notice); }
 @Override public void onNotificationRemoved(StatusBarNotification notice) { super.onNotificationRemoved(notice); signal(notice); }
 @Override public void onListenerConnected() { super.onListenerConnected(); StoreChanges.changed(StoreChanges.Store.MIRROR); }
 @Override public void onListenerDisconnected() { super.onListenerDisconnected(); StoreChanges.changed(StoreChanges.Store.MIRROR); }
 private void signal(StatusBarNotification notice) {
  if (notice == null) return;
  StoreChanges.changed(getPackageName().equals(notice.getPackageName()) ? StoreChanges.Store.NOTIFICATIONS : StoreChanges.Store.MIRROR);
 }
}
