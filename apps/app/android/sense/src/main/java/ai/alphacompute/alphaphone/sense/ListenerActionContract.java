// Alpha-owned copy of elizaOS ai.eliza.sense.ListenerActionContract (packages/app/platforms/android/sense,
// commit 1803ea88c9460f2e3cb779abe31cd77cfc6f64c5, MIT). ListenerPolicy, CrashLoopBreaker,
// SpeechGate, WakePhrase and IndicatorLease stay shared and are compiled from the vendor source.
package ai.alphacompute.alphaphone.sense;

import ai.eliza.sense.BuildConfig;

/** Versioned hint for SystemUI to locate the existing immutable Pause capability.
 * A marker alone is not authority: SystemUI must verify the image-pinned signer, notification
 * owner and PendingIntent creator/type/immutability before sending the token without fill-in data.
 */
final class ListenerActionContract {
 static final String KEY=BuildConfig.APPLICATION_ID+".SYSTEMUI_ACTION_V1";
 static final String PAUSE="pause-until-resumed";
 static String marker(String action){
  return (BuildConfig.APPLICATION_ID+".action.PAUSE").equals(action)?PAUSE:null;
 }
 private ListenerActionContract(){}
}
