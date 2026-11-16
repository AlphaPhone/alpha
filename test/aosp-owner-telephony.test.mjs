// Owner development image telephony (stage-aosp --owner-telephony) from a fabricated aapt xmltree.
// Staging output only: not an image build, boot, role assignment or device acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {aospTelephonyRoleComponents, writeAospTelephonyRoleOverrides} from '../scripts/aosp-telephony-roles.ts';
import {provisioningComponents, writeProvisioningOverlay} from '../scripts/aosp-provisioning-overlay.ts';
import {admitOwnerTelephonyApk, assertOwnerTelephonyLauncher, assertOwnerTelephonyOptions, writeOwnerImageTelephony} from '../scripts/stage-aosp.ts';

const root = path.resolve(import.meta.dirname, '..');
const pkg = 'ai.alphacompute.alphaphone';
const yes = '(type 0x12)0xffffffff';
const no = '(type 0x12)0x0';
const element = (depth, name, attrs) => [
  `${' '.repeat(depth)}E: ${name} (line=1)`,
  ...Object.entries(attrs).map(([key, value]) =>
    `${' '.repeat(depth + 2)}A: android:${key}(0x01010003)=${value.startsWith('(type') ? value : JSON.stringify(value)}`),
];
const component = (tag, name, exported, permission, attrs = {}) =>
  element(6, tag, {name, enabled: no, exported: exported ? yes : no, ...(permission && {permission}), ...attrs});
const filter = (action, data, defaultCategory = false) => [
  ...element(8, 'intent-filter', {}),
  ...element(10, 'action', {name: action}),
  ...(defaultCategory ? element(10, 'category', {name: 'android.intent.category.DEFAULT'}) : []),
  ...(data ? element(10, 'data', data) : []),
];
const launcherTree = ({debuggable = false, setupReceiver = true} = {}) => [
  '  E: manifest (line=1)', `    A: package="${pkg}"`, '    E: application (line=2)',
  ...(debuggable ? [`      A: android:debuggable(0x0101000f)=${yes}`] : []),
  ...element(6, 'activity', {name: '.MainActivity', exported: yes}),
  ...(setupReceiver ? element(6, 'receiver', {name: `${pkg}.AlphaTelephonySetupReceiver`, exported: yes, permission: 'android.permission.MANAGE_ROLE_HOLDERS'}) : []),
  ...component('service', '.AlphaInCallService', true, 'android.permission.BIND_INCALL_SERVICE'),
  ...element(8, 'meta-data', {name: 'android.telecom.IN_CALL_SERVICE_UI', value: yes}),
  ...filter('android.telecom.InCallService'),
  ...component('activity', '.AlphaCallActivity', false),
  ...component('activity', '.AlphaDialPadActivity', true),
  ...filter('android.intent.action.DIAL', null, true),
  ...filter('android.intent.action.DIAL', {scheme: 'tel'}, true),
  ...component('receiver', '.AlphaSmsDeliverReceiver', true, 'android.permission.BROADCAST_SMS'),
  ...filter('android.provider.Telephony.SMS_DELIVER'),
  ...component('receiver', '.AlphaMmsWapPushReceiver', true, 'android.permission.BROADCAST_WAP_PUSH'),
  ...filter('android.provider.Telephony.WAP_PUSH_DELIVER', {mimeType: 'application/vnd.wap.mms-message'}),
  ...component('receiver', '.AlphaMmsResultReceiver', false),
  ...component('service', '.AlphaRespondViaMessageService', true, 'android.permission.SEND_RESPOND_VIA_MESSAGE'),
  ...filter('android.intent.action.RESPOND_VIA_MESSAGE', {scheme: 'smsto'}, true),
  ...component('activity', '.AlphaSmsComposeActivity', true),
  ...filter('android.intent.action.SENDTO', {scheme: 'smsto'}, true),
  ...component('provider', 'ai.eliza.plugins.messages.MmsFileProvider', false, null, {authorities: `${pkg}.mms`, grantUriPermissions: yes}),
].join('\n');

/** Expand product.mk with GNU make as an AOSP product include would, and list its copy rules. */
function copyRules(output) {
  const wrapper = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-owner-mk-')), 'wrapper.mk');
  fs.writeFileSync(wrapper, `TARGET_COPY_OUT_SYSTEM_EXT := system_ext\nTARGET_COPY_OUT_PRODUCT := product\ninclude ${path.join(output, 'product.mk')}\nprint: ; @echo $(PRODUCT_COPY_FILES)\n`);
  try {
    return execFileSync('make', ['-s', '-f', wrapper, 'print'], {encoding: 'utf8'}).trim().split(/\s+/).filter(Boolean)
      .map(rule => { const [from, to] = rule.split(':'); return {from, to}; });
  } finally { fs.rmSync(path.dirname(wrapper), {recursive: true, force: true}); }
}
const hasMake = spawnSync('make', ['--version']).status === 0;

test('--owner-telephony is refused outside a plain development Pixel 10a or Cuttlefish stage', () => {
  assert.throws(() => assertOwnerTelephonyOptions({development: false, target: 'pixel10a', senseImage: false}), /requires --development/);
  assert.throws(() => assertOwnerTelephonyOptions({development: true, target: 'cuttlefish_x86_64', senseImage: false}), /--target pixel10a or --target cuttlefish/);
  assert.throws(() => assertOwnerTelephonyOptions({development: true, target: null, senseImage: false}), /--target pixel10a or --target cuttlefish/);
  assert.throws(() => assertOwnerTelephonyOptions({development: true, target: 'pixel10a', senseImage: true}), /activated Sense image/);
  for (const target of ['pixel10a', 'cuttlefish'])
    assert.doesNotThrow(() => assertOwnerTelephonyOptions({development: true, target, senseImage: false}));
});

test('stage-aosp refuses --owner-telephony without --development before reading any input', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-owner-stage-'));
  try {
    fs.copyFileSync(path.join(root, 'app.config.json'), path.join(dir, 'app.config.json'));
    const out = spawnSync(process.execPath, [path.join(root, 'scripts/stage-aosp.ts'), '--target', 'cuttlefish',
      '--aosp-source', 'absent-source', '--apk', 'absent.apk', '--owner-telephony'], {cwd: dir, encoding: 'utf8'});
    assert.notEqual(out.status, 0);
    assert.match(out.stderr, /--owner-telephony requires --development/);
    assert.doesNotMatch(out.stderr, /product lock|absent\.apk/);
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});

test('owner admission takes only a release, non-test-mocks launcher, even when it is not distributable', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-owner-admit-'));
  try {
    const apk = path.join(dir, 'launcher-release.apk');
    fs.writeFileSync(apk, 'apk');
    const manifestFile = path.join(dir, 'apk-manifest.json');
    const testMocksDir = path.join(dir, 'test-mocks');
    const release = () => launcherTree();
    const admit = (options = {}) => admitOwnerTelephonyApk({apk, hash: 'a'.repeat(64), manifestFile, testMocksDir,
      readBuildFlags: () => ({testMocks: false}), readManifestTree: release, ...options});
    assert.doesNotThrow(() => admit());
    assert.throws(() => admit({readManifestTree: () => launcherTree({debuggable: true})}), /release \(non-debuggable\)/);
    assert.throws(() => admit({readBuildFlags: () => ({testMocks: true})}), /test mocks enabled/);
    assert.throws(() => admit({readBuildFlags: () => { throw Error('no flags'); }}), /test-mocks flag is unverified/);
    fs.mkdirSync(testMocksDir);
    const mocked = path.join(testMocksDir, 'launcher-release.apk');
    fs.writeFileSync(mocked, 'apk');
    assert.throws(() => admit({apk: mocked}), /test-mocks builds are never staged/);
    const record = row => fs.writeFileSync(manifestFile, JSON.stringify({testMocks: false, results: [{sha256: 'a'.repeat(64), ...row}]}));
    record({mode: 'release', distributable: false, signed: true});
    assert.doesNotThrow(() => admit());
    record({mode: 'release', testMocks: true});
    assert.throws(() => admit(), /records it as a test-mocks build/);
    record({mode: 'debug'});
    assert.throws(() => admit(), /records a debug build/);
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});

test('the staged owner launcher must be release, carry the first-run contract and every role handler', () => {
  assert.deepEqual(assertOwnerTelephonyLauncher(launcherTree(), pkg), aospTelephonyRoleComponents(launcherTree(), pkg));
  assert.throws(() => assertOwnerTelephonyLauncher(launcherTree({debuggable: true}), pkg), /non-debuggable/);
  assert.throws(() => assertOwnerTelephonyLauncher(launcherTree({setupReceiver: false}), pkg), /Production launcher cannot be staged/);
  assert.throws(() => assertOwnerTelephonyLauncher(launcherTree().replace('BIND_INCALL_SERVICE', 'UNRELATED'), pkg), /AlphaInCallService/);
});

test('an owner development image gets the capability overlay and resolvable role overrides, and no provisioning defaults', {skip: !hasMake && 'GNU make is unavailable'}, () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-owner-image-'));
  try {
    fs.writeFileSync(path.join(output, 'product.mk'), '# Launcher overlay (development)\nPRODUCT_PACKAGES += AlphaPhone\n');
    assert.throws(() => writeOwnerImageTelephony(output, launcherTree({debuggable: true}), pkg), /non-debuggable/);
    assert.deepEqual(fs.readdirSync(output), ['product.mk']);
    const components = writeOwnerImageTelephony(output, launcherTree(), pkg);
    assert.equal(components.length, 9);
    const xml = fs.readFileSync(path.join(output, 'provisioning/alpha-telephony-components.xml'), 'utf8');
    assert.deepEqual([...xml.matchAll(/<component class="([^"]+)" enabled="true" \/>/g)].map(match => match[1]), components);
    assert.ok(xml.includes(`<component-override package="${pkg}">`));
    for (const handler of ['AlphaInCallService', 'AlphaDialPadActivity', 'AlphaSmsDeliverReceiver', 'AlphaMmsWapPushReceiver',
      'AlphaRespondViaMessageService', 'AlphaSmsComposeActivity', 'AlphaCallActivity', 'AlphaMmsResultReceiver'])
      assert.ok(components.includes(`${pkg}.${handler}`), handler);
    assert.ok(components.includes('ai.eliza.plugins.messages.MmsFileProvider'));
    // The AlphaImageProvisioning RRO the app's capability check requires.
    const rro = fs.readFileSync(path.join(output, 'image-capabilities/AndroidManifest.xml'), 'utf8');
    assert.match(rro, new RegExp(`targetPackage="${pkg.replaceAll('.', '\\.')}" android:targetName="AlphaImageProvisioning"`));
    assert.match(fs.readFileSync(path.join(output, 'image-capabilities/res/values/capabilities.xml'), 'utf8'), /alpha_aosp_image_capability">true/);
    const makefile = fs.readFileSync(path.join(output, 'product.mk'), 'utf8');
    assert.ok(makefile.startsWith('# Launcher overlay (development)\n'));
    assert.match(makefile, /PRODUCT_PACKAGES \+= AlphaImageCapabilityOverlay/);
    // No default HOME/Autofill overlay or fresh-telephony Provision feature.
    assert.deepEqual(fs.readdirSync(path.join(output, 'provisioning')), ['alpha-telephony-components.xml']);
    assert.doesNotMatch(makefile, /PRODUCT_PACKAGE_OVERLAYS|preferred-apps|fresh_telephony_setup|fresh-telephony/);
    assert.equal((makefile.match(/^launcher_provisioning_dir :=/gm) ?? []).length, 1);
    const rules = copyRules(output);
    assert.deepEqual(rules.map(rule => rule.to), ['system_ext/etc/sysconfig/alpha-telephony-components.xml']);
    assert.equal(rules[0].from, path.join(output, 'provisioning/alpha-telephony-components.xml'));
    assert.ok(fs.existsSync(rules[0].from));
  } finally { fs.rmSync(output, {recursive: true, force: true}); }
});

test('production role overrides keep the provisioning overlay makefile unchanged and resolvable', {skip: !hasMake && 'GNU make is unavailable'}, () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-production-image-'));
  try {
    fs.writeFileSync(path.join(output, 'product.mk'), '# Launcher overlay\n');
    const tree = [
      'N: android=http://schemas.android.com/apk/res/android',
      launcherTree().replace('    E: application (line=2)', [
        ...element(4, 'uses-permission', {name: 'android.permission.MANAGE_EXTERNAL_STORAGE'}), '    E: application (line=2)'].join('\n'))
        .replace(element(6, 'activity', {name: '.MainActivity', exported: yes}).join('\n'), [
          ...element(6, 'activity', {name: `${pkg}.MainActivity`, exported: yes}),
          ...element(8, 'intent-filter', {}), ...element(10, 'action', {name: 'android.intent.action.MAIN'}),
          ...element(10, 'category', {name: 'android.intent.category.HOME'}), ...element(10, 'category', {name: 'android.intent.category.DEFAULT'}),
          ...element(6, 'service', {name: 'ai.eliza.plugins.passwords.ElizaPasswordAutofillService', permission: 'android.permission.BIND_AUTOFILL_SERVICE', exported: yes}),
          ...element(8, 'intent-filter', {}), ...element(10, 'action', {name: 'android.service.autofill.AutofillService'}),
        ].join('\n')),
    ].join('\n');
    const files = writeProvisioningOverlay(output, pkg, provisioningComponents(tree, pkg, {assistant: false}), {freshTelephony: true});
    const before = fs.readFileSync(path.join(output, 'product.mk'), 'utf8');
    assert.equal(before, `# Launcher overlay\n${files.productMakefile}`);
    writeAospTelephonyRoleOverrides(output, tree, pkg);
    assert.equal(fs.readFileSync(path.join(output, 'product.mk'), 'utf8'), before
      + '\nPRODUCT_COPY_FILES += $(launcher_provisioning_dir)/alpha-telephony-components.xml:$(TARGET_COPY_OUT_SYSTEM_EXT)/etc/sysconfig/alpha-telephony-components.xml\n');
    const sysconfig = copyRules(output).find(rule => rule.to === 'system_ext/etc/sysconfig/alpha-telephony-components.xml');
    assert.equal(sysconfig.from, path.join(output, 'provisioning/alpha-telephony-components.xml'));
  } finally { fs.rmSync(output, {recursive: true, force: true}); }
});
