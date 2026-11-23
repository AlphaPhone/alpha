// spec/clock/notifications.md; spec/clock/mirror.md; spec/clock/reminders.md
package ai.alphacompute.alphaphone;

import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;

/** Process-wide signals that one of Alpha's native stores changed, which each plugin posts to the renderer as its change event. */
final class StoreChanges {
 private StoreChanges() {}
 /** The native stores whose changes the renderer follows. */
 enum Store { REMINDERS, NOTIFICATIONS, MIRROR }
 /** A plugin's reaction to one store change. */
 interface Listener { void changed(Store store); }
 private static final Set<Listener> listeners = new CopyOnWriteArraySet<>();
 /** Follows every store change until the returned handle closes. */
 static AutoCloseable observe(Listener listener) {
  listeners.add(listener);
  return () -> listeners.remove(listener);
 }
 /** Signals that {@code store} changed; a listener that fails never stops the others. */
 static void changed(Store store) {
  for (Listener listener : listeners) {
   try { listener.changed(store); } catch (RuntimeException ignored) { listeners.remove(listener); }
  }
 }
}
