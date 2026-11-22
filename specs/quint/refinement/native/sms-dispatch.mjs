// Partial source-contract regression: authenticated extracted production members execute
// with controlled ports; this is not whole-file implementation refinement.
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {captureInputs, checkTraces, qmap, qset} from '../check-traces.mjs';
import {app, directory, javaTraceCampaign, root} from './java.mjs';
import {actionJournalSources, appOwnedTelephonyReadPorts, historicalTelephonyHost, smsMembers, smsPlatform} from './sms-dispatch-platform.mjs';
import {jsonJar} from '../../../../test/fixtures/jvm-tools.mjs';
import {prepareNativeFixture} from '../../../../test/fixtures/native-source.mjs';
import {upstreamNativeSource} from '../../../../scripts/upstream-native-source.ts';
import {verifyNativePatchReceipt} from '../../../../scripts/prepare-patched-native.ts';
import {materializeHistoricalSources} from '../../legacy/core/formal-source-inventory.mjs';

const model='NativeSmsDispatch';
const modulePath='plugins/plugin-native-messages/android';
const shared=modulePath+'/src/main/java/ai/eliza/plugins/messages/';
const members=['MmsStore','SmsProviderReader'];
const historicalCompiled=['SmsTelephony','SmsTelephonyConfiguration','SmsSendJournal'];
const currentCompiled=[...historicalCompiled,'MmsPdu','SmsRoleConfiguration'];
const historicalProduct=['AlphaTelephony','AlphaSmsSendReceiver'].map(name=>app+name+'.java');
const appBase=app+'AlphaTelephonyBase.java';
const product=[...historicalProduct,app+'AlphaTelephonyPlugin.java',app+'AlphaApprovedSms.java',
  app+'SmsNoticeOpenRequest.java','android/app/src/main/java/ai/eliza/plugins/messages/AlphaTelephonyAccess.java'];
const historicalPaths=['TelephonyPlugin',...members,...historicalCompiled].map(name=>shared+name+'.java');
const currentPaths=[...members,...currentCompiled].map(name=>shared+name+'.java');
const launcherManifest='android/app/src/launcher/AndroidManifest.xml';
const patchManifest='android/upstream-native-sources.json';
const harness='SmsDispatchTraces.java';
const historicalInventory='specs/quint/refinement/native/mms-historical-sources.json';

function driverInputs(temporary, sourceRoot, resolveSource=path=>join(sourceRoot,path), historical=false) {
  const read=name=>readFileSync(resolveSource(shared+name+'.java'),'utf8');
  const plugin=historical?read('TelephonyPlugin'):readFileSync(join(root,appBase),'utf8');
  const generated={...smsPlatform,...smsMembers(plugin,read('MmsStore'),read('SmsProviderReader'),{appOwned:!historical}),
    ...(historical?historicalTelephonyHost:appOwnedTelephonyReadPorts)};
  if(!historical) {
    generated['ai/eliza/plugins/messages/SmsFixtureSupport.java']=`package ai.eliza.plugins.messages;
final class System {static long currentTimeMillis(){return SmsDispatchTraces.now;}}`;
    generated['ai/alphacompute/alphaphone/DispatchClock.java']=`package ai.alphacompute.alphaphone;
final class System {static long currentTimeMillis(){return ai.eliza.plugins.messages.SmsDispatchTraces.now;}}`;
  }
  const files=Object.entries(generated).map(([path,contents])=>{
    const file=join(temporary,'driver',path);
    mkdirSync(dirname(file),{recursive:true});
    writeFileSync(file,contents);
    return file;
  });
  return {files,productSources:historical?historicalProduct:product,
    complete:[...(historical?historicalCompiled:currentCompiled).map(name=>resolveSource(shared+name+'.java')),...actionJournalSources.map(path=>join(root,path))]};
}

function runScenarios(scenarios, {files,complete,productSources}, historical=false) {
  return javaTraceCampaign(harness,[...productSources,...complete,...files],scenarios.map(mode=>historical?[mode,'historical']:[mode]),'ai.eliza.plugins.messages.SmsDispatchTraces');
}

/** Reproduce only the historical raw-pin regression with authenticated immutable bytes. */
export function historicalSmsSourceTraces(scenarios) {
  const temporary=mkdtempSync(join(tmpdir(),'quint-sms-dispatch-'));
  try {
    const history=materializeHistoricalSources(root,historicalPaths.map(path=>'vendor/eliza/'+path),historicalInventory);
    const inputs=driverInputs(temporary,null,path=>history.resolveSource('vendor/eliza/'+path),true);
    const sources=[...history.sources,...inputs.productSources,...actionJournalSources,...inputs.files];
    const hashes=captureInputs(sources);
    try {return runScenarios(scenarios,inputs,true);}
    finally {assert.deepEqual(captureInputs(sources),hashes,'Historical SMS inputs changed during replay');}
  }
  finally {rmSync(temporary,{recursive:true,force:true});}
}

export async function checkNativeSmsDispatch(extraSources = []) {
  const temporary=mkdtempSync(join(tmpdir(),'quint-sms-dispatch-'));
  try {
    const prepared=prepareNativeFixture(root,temporary);
    const nativeReceipt=join(prepared.root,'.source.json');
    const inputs=driverInputs(temporary,prepared.root);
    const generatedSources=[...currentPaths.map(path=>join(prepared.root,path)),nativeReceipt,...inputs.files];
    const sources=[appBase,...product,...actionJournalSources,...currentPaths.map(path=>'vendor/eliza/'+path),launcherManifest,'android/consumer-host.json',
      patchManifest,app+'AlphaImageCapability.java',join(directory,harness),join(directory,'Trace.java'),
      join(directory,'java.mjs'),join(directory,'sms-dispatch-platform.mjs'),fileURLToPath(import.meta.url),
      'test/fixtures/jvm-tools.mjs','test/fixtures/native-source.mjs','upstream.lock.json','scripts/upstream-native-source.ts',
      'scripts/prepare-patched-native.ts',
      ...(jsonJar?[jsonJar]:[]),...generatedSources,...extraSources];
    const driverHashes=captureInputs(sources);
    assert.match(readFileSync(join(root,launcherManifest),'utf8'),/<receiver\s+android:name="\.AlphaSmsSendReceiver"\s+android:exported="false"/);
    const host=JSON.parse(readFileSync(join(root,'android/consumer-host.json'),'utf8'));
    assert.deepEqual(host.profile.modules.find(module=>module.name==='eliza-messages'),{
      name:'eliza-messages',source:{root:'patchedNative',path:modulePath},relocateBuild:true,
    });
    verifyNativePatchReceipt(readFileSync(nativeReceipt,'utf8'),prepared);
    const pinned=upstreamNativeSource(root).read(shared);
    for(const path of currentPaths){
      assert.equal(driverHashes[join(root,'vendor/eliza',path)],pinned.get(path).sha256);
      assert.equal(driverHashes[join(prepared.root,path)],prepared.files[path]);
    }
    // The current reviewed upstream pin includes the former local SMS repair.
    for(const path of currentPaths)assert.equal(prepared.files[path],pinned.get(path).sha256);
    const traces=runScenarios([
      'cross-card-binding','exact-card-replay','pruned-exact-card','pruned-conflicting-card',
      'approval-mismatch-and-missing','expired-card','journal-refused-claim-is-single-use','uncertain-device-claim',
      'queued-cancellation','queued-background-cancellation','screen-off-and-lock','empty-parts-retains-denied','initial-permission-denied',
      'carrier-replaced-after-card','per-recipient-sim-change','partial-radio-throw','radio-refused-before-acceptance',
      'begin-save-before-refusal','begin-commit-then-failed-report','end-write-failure-and-process-recovery',
      'end-committed-before-failure-report','callback-evidence-is-volatile-before-save','callback-evidence-durable-before-failure-report',
      'immutable-receiver-and-newest-listener','boot-retirement-of-missing-receipts','provider-readback-requires-unique-row-and-report',
      'multipart-provider-cannot-prove-delivery','expired-provider-attribution','default-role-outbox','provider-insert-refused','retired-role-outbox',
    ],inputs);
    for(const trace of traces)for(const {expect} of [trace,...trace.steps]){
      for(const field of ['foreground','closed','listeners','outbox','sentRows','failedRows'])expect['s.'+field]=qset(expect['s.'+field]);
      expect['s.cards']=qmap(expect['s.cards']);
      expect['s.events']=qmap(expect['s.events']);
      for(const view of ['memory','disk'])for(const field of ['sent','failed','reported','delivered','deliveryFailed','rows'])
        expect['s.'+view][field]=qset(expect['s.'+view][field]);
    }
    const receipt=await checkTraces({model,sources,driverHashes,generatedSources,traces,definitionBatchSize:9,scope: 'bounded-orchestration',assumptions:[
      'The exact product telephony plugin, card admission (AlphaApprovedSms) and receiver use the authenticated staged SMS dispatch/journal, the pinned shared action journal and extracted exact send and provider members.',
      'Synthetic radio, provider, Android image/permissions, encrypted-slot and approval-journal storage ports execute no device or real SMS operations. Cards are written as the chat writes an approved sms_send entry.',
      'Exact registered identities and per-bridge opaque operation-ID notifications are observed. The synthetic Handler runs posted work immediately within each macrostep; queued cancellation holds the send worker, and arbitrary held UI-queue retirement races remain separate.',
    ]});
    return {receipt,obligations:[
      {model,obligation:'Installed AOSP and carrier authority',
        reason:'The JVM controls OS admission, telephony, PendingIntent and provider effects. Installed carrier/role/delivery semantics and arbitrary Android lifecycle remain separate.'},
    ]};
  } finally {rmSync(temporary,{recursive:true,force:true});}
}
