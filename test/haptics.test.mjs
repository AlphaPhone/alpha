// Touch feedback (app review #855, NOTIF-12): the renderer asks AlphaDevice.haptic for a kind, and
// AlphaHaptics maps it to Android's own feedback constant. Which controls earn which kind, as seen
// rendering, is checked in test/browser/haptics-predictive-back.spec.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {nativeSource,runJvm,jvmSkip} from './fixtures/jvm-tools.mjs';
import {haptic,installHaptics,hapticForClick} from '../apps/app/src/runtime/haptics.ts';

test('feedback plays only through an installed native device, once per gesture',async()=>{
  const sent=[];
  installHaptics(null);haptic('toggle-on',1000);assert.deepEqual(sent,[],'nothing plays outside Android');
  const remove=installHaptics({haptic:input=>{sent.push(input.kind);return Promise.reject(Error('older app'));}},{addEventListener(){},removeEventListener(){}});
  haptic('long-press',1000);haptic('long-press',1100);haptic('toggle-on',1150);haptic('long-press',1400);
  assert.deepEqual(sent,['long-press','toggle-on','long-press'],'a held press and its context menu play one long press');
  await new Promise(resolve=>setTimeout(resolve));
  remove();haptic('confirm',5000);assert.deepEqual(sent,['long-press','toggle-on','long-press'],'removed with its owner');
  assert.equal(hapticForClick(null),null);
});

test('the plugin method plays the mapped constant on the WebView',()=>{
  const plugin=readFileSync(nativeSource('AlphaDevicePlugin.java'),'utf8');
  assert.match(plugin,/@PluginMethod public void haptic\(PluginCall call\)\{\s*int feedback=AlphaHaptics\.constant\(call\.getString\("kind"\),Build\.VERSION\.SDK_INT\);if\(feedback<0\)\{call\.reject/);
  assert.match(plugin,/view\.performHapticFeedback\(feedback\)/,'View feedback honours the owner\'s touch-feedback setting');
  assert.doesNotMatch(plugin,/FLAG_IGNORE_GLOBAL_SETTING|Vibrator/,'never overrides the owner\'s setting');
});

test('each kind maps to Android feedback for its API level',{skip:jvmSkip('javac')},()=>{
  const dir=mkdtempSync(join(tmpdir(),'alpha-haptics-')),files=[nativeSource('AlphaHaptics.java')];
  const put=(name,source)=>{const file=join(dir,name);mkdirSync(join(file,'..'),{recursive:true});writeFileSync(file,source);files.push(file);};
  try{
    // Android's published HapticFeedbackConstants values.
    put('android/view/HapticFeedbackConstants.java',`package android.view;
public final class HapticFeedbackConstants {public static final int LONG_PRESS=0,VIRTUAL_KEY=1,CLOCK_TICK=4,CONFIRM=16,REJECT=17,TOGGLE_ON=21,TOGGLE_OFF=22;}`);
    put('HapticsTest.java',`package ai.alphacompute.alphaphone;
public final class HapticsTest {
 static void check(boolean value,String message){if(!value)throw new AssertionError(message);}
 public static void main(String[] args){
  check(AlphaHaptics.constant("toggle-on",34)==21&&AlphaHaptics.constant("toggle-off",34)==22,"toggle constants from Android 14");
  check(AlphaHaptics.constant("toggle-on",33)==4&&AlphaHaptics.constant("toggle-off",26)==4,"a tick before Android 14");
  check(AlphaHaptics.constant("confirm",30)==16&&AlphaHaptics.constant("confirm",29)==1,"confirm from Android 11");
  check(AlphaHaptics.constant("long-press",26)==0,"long press");
  for(String unknown:new String[]{null,"","reject","buzz","TOGGLE-ON"})check(AlphaHaptics.constant(unknown,36)==-1,"unknown kind "+unknown);
  System.out.println("PASS haptic constants");
 }
}`);
    assert.match(runJvm(files,'ai.alphacompute.alphaphone.HapticsTest'),/^PASS haptic constants/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
