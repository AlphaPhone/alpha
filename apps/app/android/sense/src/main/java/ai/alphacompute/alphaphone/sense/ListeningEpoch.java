// Alpha-owned copy of elizaOS ai.eliza.sense.ListeningEpoch (packages/app/platforms/android/sense,
// commit 1803ea88c9460f2e3cb779abe31cd77cfc6f64c5, MIT). ListenerPolicy, CrashLoopBreaker,
// SpeechGate, WakePhrase and IndicatorLease stay shared and are compiled from the vendor source.
package ai.alphacompute.alphaphone.sense;


/** In-memory authority for one uninterrupted listening session. Stop/pause cannot be undone by
 * a later resume: queued recognition and main-thread callbacks retain their original ticket. */
final class ListeningEpoch {
 private long generation;
 private boolean active;
 synchronized void invalidate(){active=false;generation++;}
 synchronized void renew(boolean enabled){generation++;active=enabled;}
 synchronized long ticket(){return active?generation:-1;}
 synchronized boolean current(long ticket){return active&&ticket>=0&&ticket==generation;}
}
