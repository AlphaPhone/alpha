// Alpha-owned copy of elizaOS ai.eliza.sense.SenseConfig (packages/app/platforms/android/sense,
// commit 1803ea88c9460f2e3cb779abe31cd77cfc6f64c5, MIT). ListenerPolicy, CrashLoopBreaker,
// SpeechGate, WakePhrase and IndicatorLease stay shared and are compiled from the vendor source.
package ai.alphacompute.alphaphone.sense;

import ai.eliza.sense.BuildConfig;

import android.content.ComponentName;
import android.content.Context;

/** Product data selects identities; capture, consent and storage policy stay shared. */
final class SenseConfig {
 private SenseConfig(){}
 static ComponentName component(Context context,String name){
  return new ComponentName(context.getPackageName(),BuildConfig.SENSE_COMPONENT_PACKAGE+"."+name);
 }
}
