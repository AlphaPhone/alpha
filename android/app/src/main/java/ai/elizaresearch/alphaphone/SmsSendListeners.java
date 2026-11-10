package ai.elizaresearch.alphaphone;

import java.util.concurrent.CopyOnWriteArraySet;

/**
 * The plugin instances told when a reviewed SMS send changes. Every live bridge in the process
 * registers its own listener; removing one leaves the others registered. A listener that throws does
 * not stop the notice reaching the rest. Plain Java: host-tested by javac.
 */
final class SmsSendListeners {
 interface Listener { void sendUpdated(String operationId); }
 private final CopyOnWriteArraySet<Listener> listeners = new CopyOnWriteArraySet<>();
 void add(Listener listener) { if (listener != null) listeners.add(listener); }
 void remove(Listener listener) { if (listener != null) listeners.remove(listener); }
 int size() { return listeners.size(); }
 void updated(String operationId) {
  for (Listener listener : listeners) {
   try { listener.sendUpdated(operationId); } catch (RuntimeException closed) { /* That surface is going away; the others still hear it. */ }
  }
 }
}
