import test from 'node:test';
import assert from 'node:assert/strict';
import {aospTelephonyRoleComponents, writeAospTelephonyRoleOverrides} from '../scripts/aosp-telephony-roles.ts';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const pkg = 'ai.alphacompute.alphaphone';
const enabled = '(type 0x12)0xffffffff';
const disabled = '(type 0x12)0x0';
const element = (depth, name, attrs) => [
  `${' '.repeat(depth)}E: ${name} (line=1)`,
  ...Object.entries(attrs).map(([key, value]) =>
    `${' '.repeat(depth + 2)}A: android:${key}(0x01010003)=${value.startsWith('(type') ? value : JSON.stringify(value)}`),
];
const component = (tag, name, publicEntry, permission, attrs = {}) =>
  element(6, tag, {name, enabled: disabled, exported: publicEntry ? enabled : disabled, ...(permission && {permission}), ...attrs});
const filter = (action, data, defaultCategory = false) => [
  ...element(8, 'intent-filter', {}),
  ...element(10, 'action', {name: action}),
  ...(defaultCategory ? element(10, 'category', {name: 'android.intent.category.DEFAULT'}) : []),
  ...(data ? element(10, 'data', data) : []),
];
const apkTree = [
  '  E: manifest (line=1)', `    A: package="${pkg}"`, '    E: application (line=2)',
  ...component('activity', '.MainActivity', true),
  ...component('service', '.AlphaInCallService', true, 'android.permission.BIND_INCALL_SERVICE'),
  ...element(8, 'meta-data', {name: 'android.telecom.IN_CALL_SERVICE_UI', value: enabled}),
  ...filter('android.telecom.InCallService'),
  ...component('activity', '.AlphaCallActivity', false),
  ...component('activity', `${pkg}.AlphaDialPadActivity`, true),
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
  ...component('provider', 'ai.eliza.plugins.messages.MmsFileProvider', false, null, {
    authorities: `${pkg}.mms`, grantUriPermissions: enabled,
  }),
].join('\n');

test('refuses unqualified role handlers before enabling anything on the image', () => {
  for (const [broken, error] of [
    [apkTree.replace(pkg, 'example.wrong.package'), /package manifest/],
    [apkTree.replace('BIND_INCALL_SERVICE', 'UNRELATED'), /AlphaInCallService/],
    [apkTree.replace('IN_CALL_SERVICE_UI', 'UNKNOWN_UI'), /InCallService UI/],
    [apkTree.replace('="tel"', '="other"'), /AlphaDialPadActivity/],
    [apkTree.replace('vnd.wap.mms-message', 'text'), /AlphaMmsWapPushReceiver/],
    [apkTree.replace('="smsto"', '="sms"'), /AlphaRespondViaMessageService/],
    [apkTree.replace('AlphaSmsComposeActivity', 'OtherComposeActivity'), /AlphaSmsComposeActivity/],
    [apkTree.replace('AlphaMmsResultReceiver', 'AlphaSmsDeliverReceiver'), /AlphaSmsDeliverReceiver/],
    [apkTree.replace(`AlphaInCallService"\n        A: android:enabled(0x01010003)=${disabled}`,
      `AlphaInCallService"\n        A: android:enabled(0x01010003)=${enabled}`), /AlphaInCallService/],
  ]) {
    assert.notEqual(broken, apkTree);
    assert.throws(() => aospTelephonyRoleComponents(broken, pkg), error);
  }
});

test('rejects role filters that narrow the required Android intents to specific URIs', () => {
  const tel = element(10, 'data', {scheme: 'tel'}).join('\n');
  for (const restriction of [{host: 'phone.example'}, {pathPrefix: '/extension'}, {sspPrefix: '012'}]) {
    const narrowed = apkTree.replace(tel, element(10, 'data', {scheme: 'tel', ...restriction}).join('\n'));
    assert.throws(() => aospTelephonyRoleComponents(narrowed, pkg), /AlphaDialPadActivity/);
  }
  const group = [
    ...element(10, 'uri-relative-filter-group', {allow: enabled}),
    ...element(12, 'data', {pathPrefix: '/extension'}),
  ].join('\n');
  assert.throws(() => aospTelephonyRoleComponents(apkTree.replace(tel, `${tel}\n${group}`), pkg), /AlphaDialPadActivity/);
});

test('requires the private MMS provider to serve the application authority and grant URI access', () => {
  const badAuthority = apkTree.replace(`${pkg}.mms`, `${pkg}.other`);
  const noGrant = apkTree.replace(`grantUriPermissions(0x01010003)=${enabled}`, `grantUriPermissions(0x01010003)=${disabled}`);
  for (const manifest of [badAuthority, noGrant])
    assert.throws(() => aospTelephonyRoleComponents(manifest, pkg), /MmsFileProvider/);
});

test('the image enables every admitted role handler before Activity startup without assigning role holders', () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-image-role-defaults-'));
  try {
    fs.writeFileSync(path.join(output, 'product.mk'), '# existing image setup\n');
    const expected = aospTelephonyRoleComponents(apkTree, pkg);
    assert.deepEqual(writeAospTelephonyRoleOverrides(output, apkTree, pkg), expected);
    const xml = fs.readFileSync(path.join(output, 'provisioning/alpha-telephony-components.xml'), 'utf8');
    const actual = [...xml.matchAll(/<component class="([^"]+)" enabled="true" \/>/g)].map(match => match[1]);
    assert.deepEqual(actual, expected);
    assert.equal(actual.length, 9);
    assert.ok(!xml.includes('MainActivity') && !xml.includes('role-holder'));
    const makefile = fs.readFileSync(path.join(output, 'product.mk'), 'utf8');
    assert.ok(makefile.startsWith('# existing image setup\n'));
    assert.match(makefile, /TARGET_COPY_OUT_SYSTEM_EXT\)\/etc\/sysconfig\/alpha-telephony-components\.xml/);
    assert.throws(() => writeAospTelephonyRoleOverrides(output, apkTree, pkg), /EEXIST/);
    const refused = path.join(output, 'refused');
    assert.throws(() => writeAospTelephonyRoleOverrides(refused, apkTree.replace('BIND_INCALL_SERVICE', 'UNRELATED'), pkg), /AlphaInCallService/);
    assert.equal(fs.existsSync(refused), false);
    const retained = 'ai.elizaresearch.alphaphone';
    const retainedOutput = path.join(output, 'retained');
    fs.mkdirSync(retainedOutput);
    fs.writeFileSync(path.join(retainedOutput, 'product.mk'), '# retained image\n');
    const retainedComponents = writeAospTelephonyRoleOverrides(retainedOutput, apkTree.replaceAll(pkg, retained), retained);
    assert.equal(retainedComponents[0], `${retained}.AlphaInCallService`);
    const retainedXml = fs.readFileSync(path.join(retainedOutput, 'provisioning/alpha-telephony-components.xml'), 'utf8');
    assert.ok(retainedXml.includes(`package="${retained}"`) && !retainedXml.includes(pkg));
  } finally { fs.rmSync(output, {recursive: true, force: true}); }
});

