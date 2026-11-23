import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from './support/strip-types.mjs';
import { javaBinary, jvmSkip } from './fixtures/jvm-tools.mjs';

const source = readFileSync('apps/app/src/settings/carrier-setup.ts', 'utf8');
const session = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source, { mode: 'strip' })).toString('base64'));
const field = value => ({ status: 'available', value });
const data = {
  status: 'ready',
  aospImage: true,
  canChooseSms: false,
  smsRole: field('Alpha Phone is the default SMS app'),
  dialerRole: field('Alpha Phone is the default phone app'),
  modemCount: field('2'),
  eid: { status: 'permission-denied' },
  hardware: {},
  slots: [
    { slotIndex: 0, imei: field('123456789012345'), simState: field('No SIM') },
    { slotIndex: 1, imei: { status: 'permission-denied' }, simState: field('No SIM') },
  ],
  subscriptions: { status: 'available', items: [] },
};
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

test('carrier reads require an explicit current-page action; identifiers are not populated by construction or copy', async () => {
  let current = false, reads = 0;
  const copied = [];
  const page = session.createCarrierSetupSession({ read: async () => { reads++; return data; }, copy: async value => copied.push(value), current: () => current, changed() {} });
  assert.deepEqual(page.snapshot(), { data: undefined, busy: false, eidBusy: false, failed: false });
  await page.show();
  assert.equal(reads, 0);
  assert.equal(await page.copy('imei-0'), false);
  current = true;
  assert.equal(reads, 0, 'foreground entry alone never reads');
  await page.show();
  assert.equal(reads, 1);
  assert.equal(page.snapshot().data.slots[0].simState.value, 'No SIM');
  assert.equal(await page.copy('imei-0'), true);
  assert.deepEqual(copied, ['123456789012345'], 'exact individual identifier only');
  for (const token of ['imei-1', 'imei-99', 'iccid-1', 'eid', 'hardware', '123456789012345']) {
    assert.equal(await page.copy(token), false, token);
  }
  page.clear();
  assert.equal(page.snapshot().data, undefined);
  assert.equal(await page.copy('imei-0'), false);
  assert.equal(reads, 1, 'clearing or reopening does not trigger a new read');
});

test('leaving or backgrounding invalidates delayed replies even after returning to the same page', async () => {
  let current = true, reads = 0;
  const pending = [];
  const page = session.createCarrierSetupSession({ read: () => { reads++; const task = deferred(); pending.push(task); return task.promise; }, copy: async () => {}, current: () => current, changed() {} });
  const first = page.show();
  await page.show();
  assert.equal(reads, 1, 'one in-flight read');
  current = false;
  page.clear();
  current = true;
  const second = page.show();
  pending[0].resolve(data);
  await first;
  assert.equal(page.snapshot().data, undefined);
  assert.equal(page.snapshot().busy, true, 'stale completion cannot finish the new read');
  pending[1].resolve(data);
  await second;
  assert.equal(page.snapshot().data, data);
  current = false;
  assert.equal(await page.copy('imei-0'), false);
  page.clear();
  current = true;
  assert.equal(page.snapshot().data, undefined);
});

test('unreadable and denied facts remain distinct; failure never preserves previous identifiers', async () => {
  assert.equal(session.carrierFieldText({ status: 'permission-denied' }), 'Access denied by Android');
  assert.equal(session.carrierFieldText({ status: 'unsupported' }), 'Not supported on this device');
  for (const value of [undefined, { status: 'unavailable' }, { status: 'available', value: '' }]) {
    assert.equal(session.carrierFieldText(value), 'Unavailable from Android');
  }
  let fail = false;
  const page = session.createCarrierSetupSession({ read: async () => { if (fail) throw Error('no hardware'); return data; }, copy: async () => {}, current: () => true, changed() {} });
  await page.show();
  fail = true;
  await page.show();
  assert.deepEqual(page.snapshot(), { data: undefined, busy: false, eidBusy: false, failed: true });
});

test('optional EID is independent of the physical SIM read and cannot replace a refreshed or closed page', async () => {
  let eidReads = 0;
  const pending = deferred();
  const page = session.createCarrierSetupSession({ read: async () => data, readEid: () => { eidReads++; return pending.promise; }, copy: async () => {}, current: () => true, changed() {} });
  await page.show();
  assert.equal(eidReads, 0);
  const eid = page.showEid();
  await page.showEid();
  assert.equal(eidReads, 1);
  assert.equal(page.snapshot().eidBusy, true);
  await page.show();
  assert.equal(page.snapshot().data.slots[0].imei.value, '123456789012345', 'a pending EID does not hold up an IMEI refresh');
  pending.resolve(field('89012345678901234567890123456789'));
  await eid;
  assert.equal(page.snapshot().data.eid.status, 'permission-denied', 'old EID result cannot replace a refresh');
  page.clear();
  assert.equal(page.snapshot().data, undefined);
});

test('native identifier field preserves genuine values and does not turn denial or missing hardware into a fabricated identifier', { skip: jvmSkip('javac') }, () => {
  const java = readFileSync('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaCarrierSetupPlugin.java', 'utf8');
  const begin = java.indexOf(' interface Read {');
  const end = java.indexOf(' private static JSObject unavailable()', begin);
  const body = `import java.util.*;class JSObject extends HashMap<String,Object>{}class Build{static final String UNKNOWN="unknown";}public class CarrierFieldHarness{${java.slice(begin, end)}public static void main(String[]args){if(!"123456789012345".equals(field(()->"123456789012345").get("value")))throw new AssertionError();for(Object value:new Object[]{null,"","unknown"}){JSObject f=field(()->value);if(!"unavailable".equals(f.get("status"))||f.containsKey("value"))throw new AssertionError();}if(!"permission-denied".equals(field(()->{throw new SecurityException("private failure");}).get("status")))throw new AssertionError();if(!"unsupported".equals(field(()->{throw new UnsupportedOperationException();}).get("status")))throw new AssertionError();if(!"unavailable".equals(field(()->{throw new IllegalStateException();}).get("status")))throw new AssertionError();System.out.println("PASS");}}`;
  const temporary = mkdtempSync(join(tmpdir(), 'alpha-carrier-field-'));
  try {
    const file = join(temporary, 'CarrierFieldHarness.java');
    writeFileSync(file, body);
    execFileSync(javaBinary('javac'), ['-d', temporary, file]);
    assert.equal(execFileSync(javaBinary('java'), ['-cp', temporary, 'CarrierFieldHarness'], { encoding: 'utf8' }).trim(), 'PASS');
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('identifier IPC stays outside routine facts, storage, diagnostics and agent context', () => {
  const dialog = readFileSync('apps/app/src/web/settings/CarrierSetupDialog.tsx', 'utf8');
  const facts = readFileSync('apps/app/src/settings/facts.vibe', 'utf8');
  const host = readFileSync('apps/app/src/shell/assistantHost.vibe', 'utf8');
  const java = readFileSync('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaCarrierSetupPlugin.java', 'utf8');
  const device = readFileSync('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaDevicePlugin.java', 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage|console\.|fetch\(/);
  assert.doesNotMatch(dialog, /localStorage|sessionStorage|console\.|fetch\(/);
  assert.doesNotMatch(facts, /getImei|getEid|getIccId|AlphaCarrierSetup/);
  assert.doesNotMatch(device, /getImei|getEid|getIccId|CarrierSetup/);
  assert.doesNotMatch(java, /Log\.|SharedPreferences|FileOutputStream|BroadcastReceiver/);
  assert.match(java, /getSupportedModemCount\(\)/);
  assert.match(java, /getImei\(slot\)/);
  assert.ok(java.indexOf('getImei(slot)') < java.indexOf('getActiveSubscriptionInfoList()'), 'IMEI is not dependent on an activated SIM');
  assert.doesNotMatch(java.slice(java.indexOf(' private JSObject readNow('), java.indexOf(' @PluginMethod public void read(')), /getEid/, 'initial read never calls the potentially blocking LPA');
  assert.match(java, /notifyListeners\("foregroundEnded",new JSObject\(\)\)/, 'native pause event carries no identifiers');
  assert.match(java, /PluginWorkers\.submit\(reads/);
  assert.match(java, /handleOnPause\(\)\{epoch\+\+/);
  assert.match(java, /token!=epoch\|\|!AlphaDevicePlugin\.shareForeground/);
  assert.match(readFileSync('android/app/src/main/java/ai/alphacompute/alphaphone/MainActivity.java', 'utf8'), /registerPlugin\(AlphaCarrierSetupPlugin\.class\)/);
  assert.match(readFileSync('apps/app/src/platform/native-plugins.ts', 'utf8'), /AlphaCarrierSetup:/);
  assert.match(dialog, /window\.addEventListener\("blur", forget\)/);
  assert.match(dialog, /document\.addEventListener\("visibilitychange", onVisibility\)/);
  assert.match(host, /nav\.layers\.some\(\(layer\) => layer\.id\.startsWith\("carrier"\)\)/);
  const launcher = readFileSync('android/app/manifests/launcher/AndroidManifest.xml', 'utf8');
  assert.match(launcher, /READ_PRIVILEGED_PHONE_STATE/);
});
