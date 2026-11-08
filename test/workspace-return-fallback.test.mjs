// Connect Google's optional native identity pre-check (lens-failure-injection-F04). Host-JVM run of
// the Capacitor-free failure classifier with synthetic failures, plus the plugin wiring it relies on.
// Not Android, network or real-account evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {root,nativeSource,runJvm,jsonJarSkip} from './fixtures/jvm-tools.mjs';

const admission=join(root,'vendor/eliza/plugins/plugin-native-agent/android/src/main/java/ai/eliza/plugins/agent/runtime/NativeProviderAdmission.java');

test('a transient identity failure falls back to the manual return; a refusal or mismatch still stops',{skip:jsonJarSkip},()=>{
 const dir=mkdtempSync(join(tmpdir(),'alpha-workspace-fallback-'));
 try{
  const source=join(dir,'WorkspaceFallbackTest.java');
  writeFileSync(source,`package ai.elizaresearch.alphaphone;
public class WorkspaceFallbackTest {
 static int checks;
 static void check(boolean ok,String name){if(!ok)throw new AssertionError(name);checks++;}
 static boolean fallback(Exception error){return LocalAgentProviderAdmission.transientIdentityFailure(error);}
 public static void main(String[]args){
  for(int status:new int[]{429,500,502,503,504,404,0})check(fallback(new LocalAgentProviderAdmission.CloudReadFailure(status)),"status "+status+" falls back");
  check(fallback(new java.net.SocketTimeoutException()),"timeout falls back");
  check(fallback(new java.net.UnknownHostException()),"DNS failure falls back");
  check(fallback(new java.io.IOException()),"transport failure falls back");
  check(fallback(new org.json.JSONException("bad")),"unreadable identity body falls back");
  for(int status:new int[]{401,403})check(!fallback(new LocalAgentProviderAdmission.CloudReadFailure(status)),"status "+status+" rejects");
  check(!fallback(new SecurityException()),"identity mismatch rejects");
  check(!fallback(new SecurityException("Cloud identity unavailable")),"refused identity rejects");
  check(!fallback(new IllegalArgumentException()),"expired key rejects");
  System.out.println("PASS workspace return fallback "+checks);
 }
}`);
  assert.match(runJvm([admission,nativeSource('LocalAgentProviderAdmission.java'),source],'ai.elizaresearch.alphaphone.WorkspaceFallbackTest',{json:true}),/^PASS workspace return fallback 16/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

// The JVM run above cannot reach the Capacitor plugin: only the identity read is classified, with a shorter timeout.
test('prepareGoogleWorkspaceReturn classifies only the identity read and resolves unsupported on a transient failure',()=>{
 const source=readFileSync(nativeSource('AlphaConnectionPlugin.java'),'utf8');
 const method=source.slice(source.indexOf('@PluginMethod public void prepareGoogleWorkspaceReturn('),source.indexOf('private void captureWorkspaceCallback('));
 assert.ok(method.includes('try{identity=readCloudIdentity(saved.getString("token"),WORKSPACE_IDENTITY_TIMEOUT_MS);}catch(Exception failure){if(!LocalAgentProviderAdmission.transientIdentityFailure(failure))throw failure;call.resolve(new JSObject().put("supported",false));return;}'));
 assert.ok(method.indexOf('readCloudIdentity(')<method.indexOf('throw new SecurityException()'),'the mismatch check stays outside the fallback');
 assert.match(method,/catch\(Exception unavailable\)\{call\.reject\("Google return preparation could not be verified","workspace-binding"\);\}/);
 assert.match(source,/WORKSPACE_IDENTITY_TIMEOUT_MS=10000;/);
});
