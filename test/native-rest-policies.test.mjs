// Native launcher policies that were moved off the main thread or made single-sourced. The host-JVM
// run covers the Capacitor-free classes; the source checks cover the Android-bound call sites that
// cannot run on a plain JVM. Neither is emulator or device evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {nativeSource,fixture,javaBinary} from './fixtures/jvm-tools.mjs';

const java=name=>readFileSync(nativeSource(name+'.java'),'utf8');
const body=(source,start,end)=>{const from=source.indexOf(start);assert.ok(from>=0,'missing '+start);const to=end?source.indexOf(end,from+start.length):-1;return source.slice(from,to<0?undefined:to);};

test('JVM: one renderer death counts once, one deletion-window comparison, per-bridge SMS listeners, coalesced reconcile, split SMS journal storage',()=>{
 const dir=mkdtempSync(join(tmpdir(),'alpha-native-rest-'));
 try{
  // javac alone can take minutes on a loaded builder; the fixture itself runs in seconds.
  execFileSync(javaBinary('javac'),['--release','11','-d',dir,...['RendererRecoveryBudget','DeletionDeadline','SmsSendJournal','SmsSendListeners','SmsReconcileBatch'].map(name=>nativeSource(name+'.java')),fixture('NativeRestPoliciesTest.java')],{timeout:300000});
  assert.match(execFileSync(javaBinary('java'),['-cp',dir,'ai.elizaresearch.alphaphone.NativeRestPoliciesTest'],{encoding:'utf8',timeout:300000}),/^PASS native rest policies/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('each activity reports a renderer loss with the death count its WebView was created under',()=>{
 const main=java('MainActivity');
 assert.match(main,/recoveryBudget\.onLoss\(SystemClock\.elapsedRealtime\(\), showsHome\(\), rendererDeathsAtCreate\)/);
 assert.doesNotMatch(main,/recoveryBudget\.onLoss\(SystemClock\.elapsedRealtime\(\), showsHome\(\)\)/,'no loss is counted without the creation count');
 const create=body(main,'@Override public void onCreate(Bundle state) {','getBridge().addWebViewListener(rendererRecovery);');
 const read=create.indexOf('rendererDeathsAtCreate = recoveryBudget.deaths();'),bridge=create.lastIndexOf('super.onCreate(state);');
 assert.ok(read>0&&read<bridge,'the count is read before BridgeActivity creates the WebView');
 assert.match(main,/private static final RendererRecoveryBudget recoveryBudget/,'the budget stays process-wide');
});

test('deletion windows are compared in DeletionDeadline only',()=>{
 const journal=java('DeferredDeletionJournal'),coordinator=java('NativeDeletionCoordinator');
 const window=body(journal,' private static String window(',' // Acknowledgement hides');
 assert.match(window,/return DeletionDeadline\.window\(DeletionDeadline\.state\(d\.getString\("continuity"\),d\.getLong\("createdElapsed"\),d\.getLong\("expiresElapsed"\),continuity,elapsed\)\);/);
 assert.doesNotMatch(window,/elapsed<|\?"open"/,'no second comparison in the journal');
 assert.doesNotMatch(coordinator,/\?"open":"expired"|\?"clock-changed"/,'no third comparison in the coordinator');
 assert.equal((coordinator.match(/DeletionDeadline\.state\(row\.getString\("continuity"\),row\.getLong\("createdElapsed"\),row\.getLong\("expiresElapsed"\),/g)||[]).length,2,'pending and reconcile both ask DeletionDeadline');
 assert.doesNotMatch(body(coordinator,' boolean reconcile()',' void start()'),/elapsed<row\.getLong\("(createdElapsed|expiresElapsed)"\)/);
});

test('reminder deletion staging runs on the plugin worker, never in the dialog click on the UI thread',()=>{
 const plugin=java('AlphaDeletionsPlugin');
 const click=body(plugin,'.setPositiveButton("Delete reminder",(d,w)->{','}).create();');
 assert.match(click,/if\(retired\|\|review!=own\[0\]\|\|[^\n]*isDeviceLocked\(\)\|\|![^\n]*Lifecycle\.State\.RESUMED\)\)return;/,'the owner decision is still checked on the UI thread');
 assert.match(click,/try\{worker\.execute\(\(\)->resolveOutcome\(call,stageReviewed\(id,target,agentOwner,binding,identity\)\)\);\}/);
 assert.match(click,/catch\(java\.util\.concurrent\.RejectedExecutionException stopped\)\{resolveStatus\(call,"not-staged"\);\}/,'a retired worker stages nothing and says so');
 assert.doesNotMatch(click,/manualOwner\(|stageAdmissible\(|stageReminder\(|NativeDeletionClaim\.|AlphaReminders\.engine|AlphaActionJournal\./,'no slot, journal or coordinator-lock work in the click handler');
 assert.ok(click.indexOf('staging[0]=true;')>0&&click.indexOf('staging[0]=true;')<click.indexOf('worker.execute('));
 assert.match(plugin,/setOnDismissListener\(d->\{if\(review==own\[0\]\)review=null;if\(!staging\[0\]\)resolveStatus\(call,"cancelled"\);\}\)/,'the call is answered once: by the dismissal or by the worker');
 const staged=body(plugin,' private JSONObject stageReviewed(',' private static void resolveOutcome(');
 assert.match(staged,/if\(retired\)return new JSONObject\(\)\.put\("status","not-staged"\);/);
 assert.equal((plugin.match(/stageReviewed\(/g)||[]).length,2,'staging is reached only from the worker task');
});

test('a reset whose marker landed continues as recorded; pending revocation runs only with an automatic attempt',()=>{
 const plugin=java('AlphaResetPlugin'),authenticated=body(plugin,'@ActivityCallback private void authenticated(',' /** Keep the confirmed reset visible');
 assert.match(authenticated,/catch\(Exception failure\)\{[\s\S]*?if\(!AlphaDataReset\.pending\(getContext\(\)\)\)\{result\(call,"unavailable","Reset could not be prepared\.[^"]*"\);return;\}\s*\}/);
 assert.doesNotMatch(authenticated,/result\(call,"unavailable"[^\n]*dispatchAndExit/,'a recorded reset is never reported as not prepared');
 assert.ok(authenticated.indexOf('showRevocationNotice();')>authenticated.indexOf('catch(Exception failure)'),'the recorded reset reaches the notice and bounded revocation');
 const application=java('AlphaApplication'),attach=body(application,'protected void attachBaseContext(',' private boolean resetRecoveryProcess()');
 assert.match(attach,/if\(AlphaDataReset\.automaticAttemptAllowed\(AlphaDataReset\.failureState\(this\),System\.currentTimeMillis\(\)\)\)ResetCloudRevocation\.revoke\(base,ResetCloudRevocation\.PENDING_DEADLINE_MS\);\s*AlphaDataReset\.admitAndExit\(this\);/);
 assert.equal((attach.match(/ResetCloudRevocation\.revoke\(/g)||[]).length,1);
});

test('SMS send listeners are per bridge and the journal keeps retired state in its own slot',()=>{
 const sms=java('AlphaSms'),store=java('AlphaCredentialStore');
 assert.match(sms,/private static final SmsSendListeners LISTENERS = new SmsSendListeners\(\);/);
 assert.match(sms,/static void listen\(Listener value\) \{ LISTENERS\.add\(value\); \}/);
 assert.match(sms,/static void stopListening\(Listener value\) \{ LISTENERS\.remove\(value\); \}/);
 assert.doesNotMatch(sms,/static volatile Listener listener/,'no single listener slot');
 assert.match(sms,/retiredSlot = "sms-send-retired:v1:device"/);
 assert.match(sms,/store\.writeCredentialSlot\(retiredSlot, new JSONObject\(\)\.put\("retired", value\)\.toString\(\)\);/);
 assert.match(store,/"sms-send-ledger:v1:device"\.equals\(name\)\|\|"sms-send-retired:v1:device"\.equals\(name\)\)return 1024\*1024;/,'the filter and 1000 tombstones do not fit the default slot cap');
});

test('sent and delivery callbacks record evidence and share one queued reconcile',()=>{
 const receiver=java('AlphaSmsSendReceiver'),sms=java('AlphaSms');
 assert.doesNotMatch(receiver,/AlphaSms\.reconcile\(/,'no provider reconcile per broadcast');
 assert.match(receiver,/held = AlphaSms\.reconcileSoon\(app, pending::finish\);/);
 assert.match(receiver,/finally \{\s*if \(!held\) pending\.finish\(\);\s*\}/,'every broadcast is finished exactly once');
 const soon=body(sms,' static boolean reconcileSoon(',' /**\n  * Matches each sent recipient');
 assert.match(soon,/if \(!RECONCILES\.request\(\)\) return false;/);
 assert.ok(soon.indexOf('RECONCILES.begin();')<soon.indexOf('reconcile(app)'),'the batch reopens before the provider is read, so later evidence queues another');
 assert.match(soon,/finally \{ done\.run\(\); \}/);
});

test('the SMS journal and the platform send calls stay off the main thread',()=>{
 const plugin=java('AlphaTelephonyPlugin');
 const send=body(plugin,'@PluginMethod public void sendSms(PluginCall call) {',' /** Runs journal reads, writes');
 assert.match(send,/journalWork\(call, \(\) -> \{[\s\S]*journal = AlphaSms\.journal\(getContext\(\)\);[\s\S]*main\.post\(\(\) -> reviewSmsOnMain\(call, journal, operationId, recipients, body, subscriptionId\)\);/);
 assert.match(plugin,/private void journalWork\(PluginCall call, Runnable task\) \{\s*try \{ AlphaSms\.WORK\.execute\(task\); \}\s*catch \(java\.util\.concurrent\.RejectedExecutionException stopped\) \{ call\.reject\(LateLaunch\.CLOSED\); \}/);
 const review=body(plugin,' private void reviewSmsOnMain(',' /** Main thread: queues one journal write');
 assert.doesNotMatch(review,/AlphaSms\.journal\(|journal\.existing\(|journal\.decide\(|decideNow\(call, journal, operationId, recipients/,'the main thread never loads or writes the journal');
 const click=body(review,'.setPositiveButton("Send", (dialog, which) -> {','.create();');
 assert.ok(click.indexOf('record(call, operationId, () -> {')>0&&click.indexOf('record(call, operationId, () -> {')<click.indexOf('AlphaSms.dispatch('),'dispatch is queued through record(), not run in the click');
 assert.match(review,/if \(review != null \|\| recording\.contains\(operationId\)\) \{ call\.reject\("Another message is waiting for review", "busy"\); return; \}/,'an ID being journaled cannot be reviewed twice');
 const record=body(plugin,' private void record(PluginCall call, String operationId, Runnable write) {',' /** Main thread: journals an outcome');
 assert.match(record,/recording\.add\(operationId\);\s*journalWork\(call, \(\) -> \{ try \{ write\.run\(\); \} finally \{ main\.post\(\(\) -> recording\.remove\(operationId\)\); \} \}\);/);
 assert.match(plugin,/private void decide\([^\n]*\{\s*record\(call, operationId, \(\) -> decideNow\(/,'cancelled and denied outcomes are journaled on the worker');
 assert.equal((plugin.match(/journal\.decide\(/g)||[]).length,1,'one journal.decide site, in the worker-side helper');
});

test('the Downloads list draws a snapshot; provider reads run on the io worker',()=>{
 const downloads=java('BrowserDownloads');
 const render=body(downloads,' private void render(LinearLayout rows){',' // Dismiss only UI;');
 assert.doesNotMatch(render,/\.query\(|getContentResolver\(\)/,'drawing never reads a provider');
 assert.match(render,/Status read=statuses\.get\(id\);/);
 assert.doesNotMatch(body(downloads,' private String localLabel(',' /** Main thread: draws the list'),/\.query\(|getContentResolver\(\)/);
 const show=body(downloads,' void show(){',' /** What the io worker needs');
 assert.match(show,/work\(io,\(\)->\{Map<Long,Status> snapshot=statuses\(probes\);handler\.post\(\(\)->\{/);
 assert.match(show,/if\(listing!=list\|\|turn!=pollTurn\)return;\s*statuses=snapshot;render\(rows\);handler\.removeCallbacks\(next\);handler\.postDelayed\(next,1000\);/,'the next poll is scheduled only after a snapshot was drawn, and a closed list schedules none');
 assert.equal((show.match(/postDelayed\(/g)||[]).length,1);
 const reads=body(downloads,' private Map<Long,Status> statuses(List<Probe> probes){',' private static final String CHECKING');
 assert.match(reads,/manager\.query\(new DownloadManager\.Query\(\)\.setFilterById\(probe\.id\)\)/);
 assert.match(reads,/context\.getContentResolver\(\)\.query\(Uri\.parse\(probe\.uri\)/);
 assert.equal((downloads.match(/manager\.query\(/g)||[]).length,1,'one DownloadManager read site, on the worker');
});
