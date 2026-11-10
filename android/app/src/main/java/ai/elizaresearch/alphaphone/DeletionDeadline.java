package ai.elizaresearch.alphaphone;

/** Persisted monotonic deadline. A reboot or unknown clock requires renewed review. */
final class DeletionDeadline {
 static final long WINDOW_MS=10000;
 final String continuity;final long createdElapsed,expiresElapsed,expiresAt;
 DeletionDeadline(String continuity,long elapsed,long wall){
  if(continuity==null||continuity.isEmpty()||continuity.length()>200||elapsed<0||elapsed>Long.MAX_VALUE-WINDOW_MS||wall<0||wall>Long.MAX_VALUE-WINDOW_MS)throw new IllegalArgumentException("Deletion clock unavailable");
  this.continuity=continuity;createdElapsed=elapsed;expiresElapsed=elapsed+WINDOW_MS;expiresAt=wall+WINDOW_MS;
 }
 enum State { OPEN,EXPIRED,CLOCK_CHANGED }
 State state(String boot,long elapsed){return state(continuity,createdElapsed,expiresElapsed,boot,elapsed);}
 /** The window of a persisted deadline. The only comparison of a stored deadline with the clock. */
 static State state(String continuity,long createdElapsed,long expiresElapsed,String boot,long elapsed){
  if(continuity==null||!continuity.equals(boot)||elapsed<createdElapsed)return State.CLOCK_CHANGED;
  return elapsed<expiresElapsed?State.OPEN:State.EXPIRED;
 }
 /** The window name stored rows and the renderer use. */
 static String window(State state){return state==State.OPEN?"open":state==State.EXPIRED?"expired":"clock-changed";}
}
