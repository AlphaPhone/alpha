// Alpha-owned copy of elizaOS ai.eliza.sense.AssistantInvocation (packages/app/platforms/android/sense,
// commit 1803ea88c9460f2e3cb779abe31cd77cfc6f64c5, MIT). ListenerPolicy, CrashLoopBreaker,
// SpeechGate, WakePhrase and IndicatorLease stay shared and are compiled from the vendor source.
package ai.alphacompute.alphaphone.sense;

import ai.eliza.sense.BuildConfig;

import android.app.ActivityOptions;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;

/**
 * Opens the host's existing user-facing assistant surface (its ACTION_ASSIST activity) when the user
 * addresses it. The intent carries no transcript, audio or other content: the host starts its own
 * foreground voice turn. The listener shares its identity so the host can record the invocation as
 * coming from the listener, and refuses to invoke a host package not signed like this one.
 */
final class AssistantInvocation {
 private AssistantInvocation(){}
 static final String ASSIST_ACTIVITY=BuildConfig.SENSE_ASSIST_ACTIVITY;

 static boolean start(Context context){
  PackageManager packages=context.getPackageManager();
  if(packages.checkSignatures(context.getPackageName(),Listener.HOST_PACKAGE)!=PackageManager.SIGNATURE_MATCH)return false;
  Intent intent=new Intent(Intent.ACTION_ASSIST).setComponent(new ComponentName(Listener.HOST_PACKAGE,ASSIST_ACTIVITY))
   .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
  ActivityOptions options=ActivityOptions.makeBasic().setShareIdentityEnabled(true);
  try{context.startActivity(intent,options.toBundle());return true;}
  catch(ActivityNotFoundException|SecurityException refused){return false;}
 }
}
