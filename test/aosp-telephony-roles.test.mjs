import test from 'node:test';
import assert from 'node:assert/strict';
import {aospTelephonyRoleComponents, writeAospTelephonyRoleOverrides} from '../scripts/aosp-telephony-roles.ts';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {disabled, element, enabled, telephonyRoleTree} from './fixtures/telephony-launcher-tree.mjs';

const pkg = 'ai.alphacompute.alphaphone';
const apkTree = telephonyRoleTree(pkg);

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

