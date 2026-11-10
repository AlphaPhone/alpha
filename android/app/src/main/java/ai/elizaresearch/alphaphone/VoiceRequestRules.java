package ai.elizaresearch.alphaphone;

/**
 * Admission rules of the foreground voice plugin that need no platform state. Pure Java, no Android
 * or Capacitor types, so the rules run on the JVM in repository tests.
 */
final class VoiceRequestRules {
 private VoiceRequestRules(){}

 /**
  * A request that asked not to replace speech ({@code replace:false}) is refused while a prepared
  * clip or a streamed utterance owns the speaker. A missing {@code replace} replaces.
  */
 static boolean speakerBusy(Boolean replace,boolean clipPrepared,boolean streamOpen){
  return Boolean.FALSE.equals(replace)&&(clipPrepared||streamOpen);
 }

 /** How long a refused cancellation barrier waits before it is offered to the worker again. */
 static final long DRAIN_RETRY_MS=250;
 enum DrainStep { RETRY, ABANDON }
 /**
  * Voice stays closed after a cancellation until a barrier has passed through the serial worker
  * behind the cancelled work. A full worker refuses the barrier: it is offered again, since nothing
  * else reopens voice. A destroyed plugin never reopens, so its barrier is abandoned.
  */
 static DrainStep barrierRefused(boolean destroyed){return destroyed?DrainStep.ABANDON:DrainStep.RETRY;}
 /**
  * What the cancel callers are told once the barrier has passed, null for success. A capture that
  * could not be cancelled is reported, but it no longer keeps voice closed.
  */
 static String drainResult(boolean destroyed,String captureFailure){return destroyed?"Voice unavailable":captureFailure;}
}
