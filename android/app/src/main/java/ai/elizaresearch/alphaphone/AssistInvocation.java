package ai.elizaresearch.alphaphone;

/**
 * How Alpha's assistant surface was opened. Only identity Android reports (the launching package,
 * shared deliberately by the caller) and a same-signer check are used; caller extras never are.
 * "listener" means the AOSP image's always-on listener heard the wake phrase; every other start
 * (press-and-hold power through the assistant role, the system assist gesture, a launcher or
 * another app) is "assist". Pure Java so the rule runs on the JVM in repository tests.
 *
 * <p>Android reports the sender of an intent delivered to the surface while it is already open only
 * from Android 15 (API 35). On Android 14 such a wake has no caller and is "assist"; only a launch
 * that creates the surface can be "listener" there.
 */
final class AssistInvocation {
 private AssistInvocation(){}
 static final String LISTENER="listener",ASSIST="assist";
 static final String LISTENER_PACKAGE="ai.elizaresearch.alphaphone.sense";

 static String origin(String launchedFromPackage,boolean sameSigner){
  return LISTENER_PACKAGE.equals(launchedFromPackage)&&sameSigner?LISTENER:ASSIST;
 }
 /** A listener invocation starts a voice turn only this soon after it arrived (monotonic clock). */
 static final long LISTENER_WINDOW_MS=5000;
 /** Longest a launch may take to load its page and still have its window start at that load. */
 static final long COLD_START_LIMIT_MS=20000;
 /**
  * Where the freshness window of an invocation starts. A launch that has to create the surface
  * cannot be read before its page has loaded, so its window starts at that first load instead of at
  * arrival; a load slower than {@link #COLD_START_LIMIT_MS}, or a clock that went backwards, keeps
  * the arrival time, so the invocation has expired.
  */
 static long windowStart(long arrivedAt,long pageLoadedAt){
  return pageLoadedAt>=arrivedAt&&pageLoadedAt-arrivedAt<=COLD_START_LIMIT_MS?pageLoadedAt:arrivedAt;
 }
 /**
  * The origin a read reports. A listener invocation counts only while fresh and only if the keyguard
  * was not showing when it arrived, so one that waited (hidden page, locked phone) can never open the
  * microphone later.
  */
 static String take(String origin,long arrivedAt,long now,boolean lockedAtArrival){
  return LISTENER.equals(origin)&&!lockedAtArrival&&now>=arrivedAt&&now-arrivedAt<=LISTENER_WINDOW_MS?LISTENER:ASSIST;
 }
}
