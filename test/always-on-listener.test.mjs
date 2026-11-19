import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import '../vendor/eliza/packages/app/test/android/sense.test.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {javaBinary} from './fixtures/jvm-tools.mjs';
import {SHARED,alphaSources,androidJar,vendorSource,writeStubs} from './fixtures/sense-jvm/sources.mjs';
test('Alpha listener components compile with only the shared policy classes and preserve stored identity',()=>{
 const root=path.resolve(import.meta.dirname,'..');
 const product=JSON.parse(fs.readFileSync(path.join(root,'android/aosp/pixel10a-composition.json')));
 assert.equal(product.sense.componentPackage,'ai.alphacompute.alphaphone.sense');assert.equal(product.sense.storageName,'listener-settings');assert.deepEqual(product.sense.wakeNames,['alpha']);
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'alpha-sense-compat-'));
 try {
  // Alpha owns the listener's components, consent screen, notifications and tile; only the pure
  // policy classes come from the pinned shared source (test/sense-listener-fork.test.mjs).
  execFileSync(javaBinary('javac'),['--release','21','-cp',androidJar,'-d',path.join(temp,'out'),...writeStubs(temp),...SHARED.map(vendorSource),...alphaSources()],{timeout:scaledTimeout(60000)});
 } finally {fs.rmSync(temp,{recursive:true,force:true});}
});

test('legacy AlphaListener is a thin alias of the shared native control bridge',()=>{
 const root=path.resolve(import.meta.dirname,'..'),source=path.join(root,'vendor/eliza/plugins/plugin-native-system/android/src/main/java/ai/eliza/plugins/system');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'alpha-sense-control-'));
 try {
  const stubs={
   'Plugin.java':'package com.getcapacitor; public class Plugin { public void load(){} protected void handleOnPause(){} protected void handleOnDestroy(){} public android.content.Context getContext(){return null;} public android.app.Activity getActivity(){return null;} }',
   'PluginCall.java':'package com.getcapacitor; public class PluginCall { public void resolve(JSObject value){} public void resolve(){} public void reject(String value){} public String getString(String value){return null;} public Integer getInt(String value){return null;} }',
   'JSObject.java':'package com.getcapacitor; public class JSObject extends java.util.HashMap<String,Object> {}',
   'PluginMethod.java':'package com.getcapacitor; @java.lang.annotation.Target(java.lang.annotation.ElementType.METHOD) public @interface PluginMethod {}',
   'CapacitorPlugin.java':'package com.getcapacitor.annotation; @java.lang.annotation.Target(java.lang.annotation.ElementType.TYPE) public @interface CapacitorPlugin {String name();}',
  };
  const files=Object.entries(stubs).map(([name,text])=>{const file=path.join(temp,name);fs.writeFileSync(file,text);return file;});
  const sdk=path.join(process.env.ANDROID_HOME??path.join(os.homedir(),'Android/Sdk'),'platforms/android-36/android.jar');
  execFileSync(javaBinary('javac'),['--release','21','-cp',sdk,'-d',path.join(temp,'out'),...files,...['SenseInvocation','SenseListenerClient','SensePlugin'].map(name=>path.join(source,`${name}.java`)),path.join(root,'android/app/src/main/java/ai/alphacompute/alphaphone/AlphaListenerPlugin.java')],{timeout:scaledTimeout(60000)});
 } finally {fs.rmSync(temp,{recursive:true,force:true});}
});
