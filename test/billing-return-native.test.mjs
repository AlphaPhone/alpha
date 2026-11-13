import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {nativeSource,javaBinary,root as repo} from './fixtures/jvm-tools.mjs';

// Plain-JVM compile and run of the pure billing-return admission. Not an APK build, an Android
// run, App Link verification on a device, Eliza Cloud or a payment.
test('native billing return admits only the exact App Link with a success session or a bare cancel',()=>{
 const root=mkdtempSync(join(tmpdir(),'alpha-billing-return-'));
 try {
  const source=join(root,'BillingReturnTest.java');
  writeFileSync(source,`package ai.alphacompute.alphaphone;
public class BillingReturnTest {
 static int checks;
 static void check(boolean ok,String what){checks++;if(!ok)throw new AssertionError(what);}
 public static void main(String[] args){
  String host="eliza.app",base="https://eliza.app/alphaphone/billing/return",session="cs_test_a1B2c3D4";
  BillingReturn.Result ok=BillingReturn.parse(host,base+"?session_id="+session+"&result=success");
  check(ok!=null&&"success".equals(ok.result)&&session.equals(ok.sessionId),"success");
  BillingReturn.Result swapped=BillingReturn.parse(host,base+"?result=success&session_id=cs_live_Zz9");
  check(swapped!=null&&"cs_live_Zz9".equals(swapped.sessionId),"field order");
  BillingReturn.Result cancel=BillingReturn.parse(host,base+"?result=cancel");
  check(cancel!=null&&"cancel".equals(cancel.result)&&cancel.sessionId==null,"cancel");
  check(BillingReturn.parse("links.example.com","https://links.example.com/alphaphone/billing/return?result=cancel")!=null,"the build's host");
  for(String url:new String[]{base,base+"?",base+"?result=success",base+"?session_id="+session,base+"?result=paid&session_id="+session,
   base+"?session_id={CHECKOUT_SESSION_ID}&result=success",base+"?session_id="+session+"&result=success&x=1",base+"?session_id="+session+"&session_id="+session+"&result=success",
   base+"?result=success&result=cancel",base+"?result=cancel&session_id="+session,base+"?result=cancel#x",base+"?session_id=cs_test_"+"a".repeat(201)+"&result=success",
   base+"?session_id=cs_other_1&result=success",base+"?session_id="+session+"%20&result=success",base+"?result==cancel",
   base.replace("https:","http:")+"?result=cancel",base.replace("eliza.app","evil.example")+"?result=cancel",base.replace("eliza.app","eliza.app:443")+"?result=cancel",
   base.replace("eliza.app","user@eliza.app")+"?result=cancel",base.replace("eliza.app","staging.eliza.app")+"?result=cancel",base.replace("eliza.app","ELIZA.app")+"?result=cancel",
   base+"/?result=cancel","https://eliza.app/alphaphone/auth/callback?result=cancel","https://eliza.app/alphaphone/gmail/callback?result=cancel","https://eliza.app/alphaphone//billing/return?result=cancel",
   "https://eliza.app/alphaphone/billing/%72eturn?result=cancel","alphaphone://cloud-delegation?result=cancel","not a url",base+"?result=cancel&"+"x".repeat(520),"",null})
   check(BillingReturn.parse(host,url)==null,"refused "+url);
  check(BillingReturn.parse(null,base+"?result=cancel")==null&&BillingReturn.parse("",base+"?result=cancel")==null,"no App Link host, no return");
  System.out.println("PASS billing return "+checks);
 }
}`);
  execFileSync(javaBinary('javac'),['--release','11','-d',root,nativeSource('BillingReturn.java'),source],{timeout:60000,stdio:'pipe'});
  assert.match(execFileSync(javaBinary('java'),['-cp',root,'ai.alphacompute.alphaphone.BillingReturnTest'],{timeout:30000,encoding:'utf8'}),/^PASS billing return 36/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('the billing return is a verified App Link on the build host, captured cold and warm and handed over once',()=>{
 const read=file=>readFileSync(join(repo,file),'utf8');
 const manifest=read('android/app/src/main/AndroidManifest.xml').replace(/<!--[\s\S]*?-->/g,''),connection=readFileSync(nativeSource('AlphaConnectionPlugin.java'),'utf8');
 const main=manifest.slice(manifest.indexOf('<activity android:name=".MainActivity"'),manifest.indexOf('</activity>',manifest.indexOf('<activity android:name=".MainActivity"')));
 assert.ok(main.includes('<intent-filter android:autoVerify="true"><action android:name="android.intent.action.VIEW"/><category android:name="android.intent.category.DEFAULT"/><category android:name="android.intent.category.BROWSABLE"/><data android:scheme="https" android:host="${appLinkHost}" android:path="/alphaphone/billing/return"/></intent-filter>'),'MainActivity declares the exact billing return');
 assert.equal(manifest.match(/\/alphaphone\/billing\/return/g).length,1,'one billing return filter, exact path');
 assert.match(readFileSync(nativeSource('BillingReturn.java'),'utf8'),/static final String PATH="\/alphaphone\/billing\/return";/);
 // Cold start (load) and a running activity (onNewIntent) both capture it, only through the pure admission on the build's host.
 assert.match(connection,/public void load\(\) \{[^\n]*captureBillingReturn\(getActivity\(\)\.getIntent\(\)\); \}/);
 assert.match(connection,/handleOnNewIntent\(Intent intent\) \{[^\n]*captureBillingReturn\(intent\); \}/);
 assert.equal(connection.match(/BillingReturn\.parse\(BuildConfig\.ELIZAOS_APP_LINK_HOST,url\)/g).length,2);
 const consume=connection.slice(connection.indexOf('@PluginMethod public void consumeBillingReturn('),connection.indexOf('@PluginMethod public void consumeGoogleWorkspaceReturn('));
 assert.match(consume,/billingReturn=null;/,'a return is handed over once');
 assert.match(consume,/current\.setData\(null\)/,'the launch intent does not replay it');
 assert.doesNotMatch(consume,/storage\(|CredentialSlot|openConnection|request\(/,'the return carries no authority: no credential or network use');
 // The renderer and the native admission agree on the path.
 assert.match(read('apps/app/src/runtime/subscription-checkout.ts'),/export const BILLING_RETURN_PATH = '\/alphaphone\/billing\/return';/);
 assert.match(read('scripts/verify-apks.ts'),/\/alphaphone\/billing\/return`,/,'APK verification allows the filter');
});
