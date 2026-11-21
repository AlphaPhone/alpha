import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readdirSync,readFileSync} from 'node:fs';
import {tmpdir,homedir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {javaBinary} from './fixtures/jvm-tools.mjs';
import {preparePatchedNative} from '../scripts/prepare-patched-native.ts';
// Alpha's reset screens are its own (AlphaResetPlugin review, ResetRecoveryActivity, wording in
// AlphaDataResetCopy, forked from plugin-native-system reset.DataResetPlugin, DataResetRecoveryActivity
// and DataResetCopy) around the shared coordinator and single-use review token (reset.DataReset and
// ResetAuthorization, tested upstream). Host JVM against android.jar: the real Alpha classes compile
// without the upstream screens, keep their installed names, and their wording and order are checked
// here (the copy checks are upstream DataResetTest.copy() and reset.test.mjs, ported to Alpha).
const root=resolve(import.meta.dirname,'..');
const upstream=resolve(preparePatchedNative({root}).root,'plugins/plugin-native-system/android/src/main/java/ai/eliza/plugins/system');
const alpha=name=>resolve(root,`android/app/src/main/java/ai/alphacompute/alphaphone/${name}.java`);
test('Alpha reset is its own native review and recovery around the shared coordinator, under Alpha names and copy',()=>{
 const dir=mkdtempSync(join(tmpdir(),'alpha-reset-wiring-')),files=[];
 const put=(name,text)=>{const file=join(dir,'src',name);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,text);files.push(file);};
 const sdk=join(process.env.ANDROID_HOME??join(homedir(),'Android/Sdk'),'platforms/android-36/android.jar');
 try{
  put('com/getcapacitor/Plugin.java','package com.getcapacitor; public class Plugin { protected void handleOnDestroy(){} public android.content.Context getContext(){return null;} public android.app.Activity getActivity(){return null;} public void startActivityForResult(PluginCall call,android.content.Intent intent,String callback){} }');
  put('com/getcapacitor/PluginCall.java','package com.getcapacitor; public class PluginCall { public void resolve(JSObject value){} }');
  put('com/getcapacitor/JSObject.java','package com.getcapacitor; public class JSObject extends java.util.HashMap<String,Object> { public JSObject put(String k,String v){super.put(k,v);return this;} }');
  put('com/getcapacitor/PluginMethod.java','package com.getcapacitor; @java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) public @interface PluginMethod {}');
  put('com/getcapacitor/annotation/CapacitorPlugin.java','package com.getcapacitor.annotation; @java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) public @interface CapacitorPlugin {String name();}');
  put('com/getcapacitor/annotation/ActivityCallback.java','package com.getcapacitor.annotation; @java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME) public @interface ActivityCallback {}');
  put('androidx/activity/result/ActivityResult.java','package androidx.activity.result; public class ActivityResult { public int getResultCode(){return 0;} }');
  put('ai/alphacompute/alphaphone/AlphaCloudSignInPlugin.java','package ai.alphacompute.alphaphone; final class AlphaCloudSignInPlugin {static ai.eliza.auth.cloud.CloudSignInConfig REGISTRATION;}');
  put('ai/alphacompute/alphaphone/AlphaCredentialStore.java','package ai.alphacompute.alphaphone; final class AlphaCredentialStore {static String readSlotBeforeAttach(android.content.Context c,String n)throws Exception{return null;}}');
  put('ai/alphacompute/alphaphone/AlphaCalendarPlugin.java','package ai.alphacompute.alphaphone; final class AlphaCalendarPlugin {static ai.eliza.plugins.calendar.CalendarConfiguration CONFIGURATION;}');
  put('ai/alphacompute/alphaphone/WiringCheck.java',`package ai.alphacompute.alphaphone;
import ai.eliza.plugins.system.reset.*;
public final class WiringCheck {
 static void check(boolean ok,String why){if(!ok)throw new AssertionError(why);}
 public static void main(String[] args){
  check(AlphaResetPlugin.class.getSuperclass()==com.getcapacitor.Plugin.class,"Alpha's own native review");
  check("AlphaReset".equals(AlphaResetPlugin.class.getAnnotation(com.getcapacitor.annotation.CapacitorPlugin.class).name()),"installed plugin name");
  boolean callback=false;for(java.lang.reflect.Method m:AlphaResetPlugin.class.getDeclaredMethods())callback|=m.getName().equals("authenticated")&&m.isAnnotationPresent(com.getcapacitor.annotation.ActivityCallback.class);
  check(callback,"installed activity callback name");
  try{check(AlphaResetPlugin.class.getMethod("review",com.getcapacitor.PluginCall.class).isAnnotationPresent(com.getcapacitor.PluginMethod.class),"review is the bridge method");}catch(NoSuchMethodException missing){throw new AssertionError("review");}
  check(ResetRecoveryActivity.class.getSuperclass()==android.app.Activity.class,"Alpha's own recovery screen");
  check(ResetRecoveryActivity.PROCESS_SUFFIX.equals(":reset_recovery")&&AlphaDataReset.RESET.recoveryProcessSuffix().equals(":reset_recovery"),"installed recovery process");
  AlphaDataResetCopy copy=AlphaDataResetCopy.ALPHA;
  check(copy.reviewTitle.equals("Reset Alpha data?")&&copy.continueLabel.equals("Continue to unlock")&&copy.cancelLabel.equals("Cancel"),"review text");
  check(copy.disclosure.contains("There is no backup or undo")&&copy.disclosure.contains("not deleted or cancelled")&&copy.disclosure.contains("Other apps are not reset"),"disclosure scope");
  check(copy.disclosure.contains("asks Cloud to revoke this phone's sign-in"),"disclosure names the Cloud revocation");
  check(copy.disclosure.contains("\\"On this phone\\" calendar and events are deleted"),"disclosure names Alpha's calendar");
  check(!copy.disclosure.contains("unlock"),"the button and credential prompt explain the unlock");
  check(copy.credentialTitle.equals("Reset Alpha data")&&copy.credentialDescription.equals("Unlock to permanently erase Alpha's local data."),"credential prompt");
  check(copy.progressTitle.equals("Resetting Alpha")&&copy.progressMessage.contains("Alpha closes")&&!copy.progressMessage.contains("Cloud"),"progress makes no Cloud claim without a sign-in");
  check(copy.noScreenLock.equals("Set a device screen lock in Android before resetting Alpha data."),"lock");
  check(copy.listenerOff.contains("nothing was reset"),"listener refusal says nothing was reset");
  for(String refusal:new String[]{copy.reviewClosed,copy.nothingReset,copy.reviewExpired,copy.authenticationUnavailable,copy.authenticationCancelled})check(refusal.endsWith("Nothing reset."),"refusals say nothing was reset: "+refusal);
  check(!copy.prepareFailed.toLowerCase().contains("nothing"),"prepareFailed may still dispatch the recorded reset and never says nothing was reset");
  for(DataReset.Outcome last:new DataReset.Outcome[]{null,DataReset.Outcome.ANDROID_REFUSED,DataReset.Outcome.LISTENER_UNACKNOWLEDGED})for(boolean listener:new boolean[]{false,true})for(boolean phone:new boolean[]{false,true}){
   String body=copy.recoveryBody(last,listener,phone);
   check(body.contains("Alpha's local data has not been deleted yet. (Alpha may already have asked Cloud to revoke this phone's sign-in.)"),"recovery never claims deletion");
   check(!body.matches("(?is).*(reset (is )?complete|data (was|has been) deleted\\\\.).*"),"no completion claim");
   check(body.endsWith(phone?"Phone and Android Settings remain available.":"Android Settings remains available."),"Phone is offered only with a dialer outside Alpha");
  }
  // Without a recorded failure the cause is unknown, never inferred from the listener.
  for(boolean controllable:new boolean[]{false,true}){String unknown=copy.recoveryBody(null,controllable,true);check(unknown.contains("was not recorded")&&!unknown.contains("listener")&&!unknown.contains("Android has not accepted"),"unknown cause");}
  String refused=copy.recoveryBody(DataReset.Outcome.ANDROID_REFUSED,true,true);
  check(refused.contains("Android has not accepted")&&!refused.contains("listener"),"the recorded Android refusal names Android");
  String pending=copy.recoveryBody(DataReset.Outcome.LISTENER_UNACKNOWLEDGED,true,true);
  check(pending.contains("confirmation has not arrived")&&pending.contains("open the listener's settings"),"recorded listener reason");
  String unreachable=copy.recoveryBody(DataReset.Outcome.LISTENER_UNACKNOWLEDGED,false,true);
  check(unreachable.contains("cannot reach the listener's controls")&&!unreachable.contains("open the listener's settings"),"recorded, now unreachable");
  check(copy.retryResult(DataReset.Outcome.ANDROID_REFUSED,true).startsWith("Android did not accept"),"refused");
  check(copy.retryResult(DataReset.Outcome.LISTENER_UNACKNOWLEDGED,true).startsWith("The listener still has not confirmed"),"pending");
  check(copy.retryResult(DataReset.Outcome.LISTENER_UNACKNOWLEDGED,false).startsWith("The listener could not be reached"),"unreachable");
  check(copy.retryResult(DataReset.Outcome.DEFERRED,true).startsWith("Reset preparation is unavailable"),"deferred");
  check(copy.retryResult(DataReset.Outcome.DISPATCHED,false).equals("Android is deleting Alpha's data. Alpha will close."),"dispatched");
  check(copy.recoveryTitle.equals("Reset could not finish")&&copy.retryLabel.equals("Try reset again")&&copy.phoneLabel.equals("Phone")&&copy.androidSettingsLabel.equals("Android Settings"),"recovery labels");
  System.out.println("PASS Alpha reset wiring");
 }
}`);
  // Only the shared coordinator, review token and listener client: Alpha's screens need none of the
  // upstream reset UI (DataResetPlugin, DataResetRecoveryActivity, DataResetCopy).
  const shared=['reset/DataReset','reset/ResetAuthorization','SenseListenerClient','SenseInvocation'].map(name=>join(upstream,`${name}.java`));
  // The real shared Cloud reset step: Alpha's binding must compile against its exact signature.
  const authDir=resolve(root,'vendor/eliza/packages/auth/android/src/main/java/ai/eliza/auth/cloud');
  const auth=readdirSync(authDir).filter(name=>name.endsWith('.java')&&!['CloudSignInPlugin.java','NativeGoogleCredential.java'].includes(name)).map(name=>join(authDir,name));
  const calendar=resolve(root,'vendor/eliza/plugins/plugin-native-calendar/android/src/main/java/ai/eliza/plugins/calendar/CalendarConfiguration.java');
  execFileSync(javaBinary('javac'),['--release','17','-proc:none','-cp',sdk,'-d',join(dir,'classes'),...files,...shared,...auth,calendar,...['AlphaDataReset','AlphaDataResetCopy','ResetBeforeDispatch','CloudDeployment','AlphaResetPlugin','ResetRecoveryActivity'].map(alpha)],{timeout:scaledTimeout(120000)});
  assert.match(execFileSync(javaBinary('java'),['-cp',`${join(dir,'classes')}:${sdk}`,'ai.alphacompute.alphaphone.WiringCheck'],{encoding:'utf8',timeout:scaledTimeout(30000)}),/PASS Alpha reset wiring/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('Alpha\'s reset screens keep the upstream order: no renderer authority, fresh credential, record before dispatch, fixed destinations',()=>{
 const read=name=>readFileSync(alpha(name),'utf8');
 const plugin=read('AlphaResetPlugin');
 // Renderer input carries no authority: review() reads no call options.
 assert.doesNotMatch(plugin,/call\.(get|has)[A-Z]/);
 assert.doesNotMatch(plugin,/ai\.eliza\.plugins\.system\.reset\.(DataResetPlugin|DataResetCopy|DataResetRecoveryActivity)/);
 const review=plugin.slice(plugin.indexOf('public void review('),plugin.indexOf('@ActivityCallback'));
 const order=['authorization.begin()','new AlertDialog.Builder','authorization.confirm(owner)','createConfirmDeviceCredentialIntent(text.credentialTitle, text.credentialDescription)','startActivityForResult(call, unlock, "authenticated")'];
 order.reduce((at,step)=>{const next=review.indexOf(step,at);assert.ok(next>at,`review: ${step} in order`);return next;},-1);
 const authenticated=plugin.slice(plugin.indexOf('private void authenticated'));
 assert.ok(authenticated.indexOf('authorization.authenticate(authenticationToken, response.getResultCode() == Activity.RESULT_OK)')>0,'one fresh credential result consumes the review');
 assert.ok(authenticated.indexOf('reset.recordIfListenerReachable(')>0&&authenticated.indexOf('dispatchAfterBeforeDispatch(')>authenticated.indexOf('reset.recordIfListenerReachable('),
  'the request is durable before any pre-dispatch work');
 assert.match(plugin,/setCancelable\(false\)/,'the progress dialog cannot be dismissed');
 assert.deepEqual([...new Set([...plugin.matchAll(/result\(call, "([a-z]+)"/g)].map(match=>match[1]))].sort(),['cancelled','unavailable']);
 const recovery=read('ResetRecoveryActivity');
 assert.match(recovery,/settingsIntent\(\)/,'listener destination is the validated same-signer activity');
 assert.match(recovery,/DataReset\.recoveryDialer\(getPackageName\(\), system, packages\)/,'Phone opens a dialer outside Alpha');
 // Code only (comments may name what the process avoids): no component guess, provider or WorkManager.
 assert.doesNotMatch(recovery.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm,''),/new ComponentName|getContentResolver|WorkManager|ContentProvider/);
 assert.doesNotMatch(recovery,/ai\.eliza\.plugins\.system\.reset\.(DataResetRecoveryActivity|DataResetCopy)/);
});
