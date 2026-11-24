// stage-aosp's branding source-packet wiring: CLI refusals and the publish step around the planner.
// Synthetic stage fixtures only; the planner itself is checked in aosp-image-packet.test.py.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {BRANDING_PRODUCT_INCLUDE, brandingPacketProblems, imagePolicyAdmission, stageBrandingPacket} from '../scripts/stage-aosp.ts';

const appId = JSON.parse(fs.readFileSync('app.config.json', 'utf8')).appId;
const sha = value => createHash('sha256').update(value).digest('hex');
const hex = character => character.repeat(64);

test('the source packet is refused outside production Pixel staging or without its report hash', () => {
  const ok = {physical: true, production: true, assets: '/assets', reportSha256: hex('a')};
  assert.deepEqual(brandingPacketProblems(ok), []);
  assert.deepEqual(brandingPacketProblems({...ok, assets: null, reportSha256: null}), []);
  assert.match(brandingPacketProblems({...ok, reportSha256: null}).join(), /exact report SHA-256/);
  assert.match(brandingPacketProblems({...ok, assets: null}).join(), /exact report SHA-256/);
  assert.match(brandingPacketProblems({...ok, physical: false}).join(), /Pixel image contract/);
  assert.match(brandingPacketProblems({...ok, production: false}).join(), /production launcher admission/);
});

function imageStage(t) {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-source-packet-'));
  t.after(() => fs.rmSync(output, {recursive: true, force: true}));
  fs.writeFileSync(path.join(output, 'launcher.json'), '{"packageName":"fixture"}\n');
  fs.mkdirSync(path.join(output, 'provisioning'));
  fs.writeFileSync(path.join(output, 'provisioning/alpha-telephony-components.xml'), '<config/>\n');
  fs.writeFileSync(path.join(output, 'product.mk'), '# generated\n');
  fs.writeFileSync(path.join(output, 'physical-product.json'), '{"schema":1}\n');
  const admission = imagePolicyAdmission({output, appId, apkSha256: hex('b'), sourceLockSha256: hex('c'), platformCertificateSha256: hex('d')});
  return {output, admission};
}

test('the admission is built from the published stage files for the canonical identity only', t => {
  const {output, admission} = imageStage(t);
  assert.deepEqual(admission, {schema: 1, packageName: appId, apkSha256: hex('b'),
    launcherDescriptorSha256: sha('{"packageName":"fixture"}\n'), sourceLockSha256: hex('c'), platformCertificateSha256: hex('d'),
    handlerDefaultsSha256: sha('<config/>\n')});
  const values = {output, appId, apkSha256: hex('b'), sourceLockSha256: hex('c'), platformCertificateSha256: hex('d')};
  assert.throws(() => imagePolicyAdmission({...values, appId: 'ai.elizaresearch.alphaphone'}), /staged only for ai\.alphacompute\.alphaphone/);
  assert.throws(() => imagePolicyAdmission({...values, sourceLockSha256: undefined}), /admitted sourceLockSha256/);
  assert.throws(() => imagePolicyAdmission({...values, platformCertificateSha256: 'x'}), /admitted platformCertificateSha256/);
});

test('staging records the planner packet in the Pixel report only when the receipt matches its admission', t => {
  const {output, admission} = imageStage(t);
  let argv;
  const planner = receipt => command => {
    argv = command;
    fs.writeFileSync(path.join(output, 'source-packet.zip'), 'archive');
    fs.writeFileSync(path.join(output, 'source-packet.json'), JSON.stringify(receipt));
  };
  const packet = stageBrandingPacket({output, source: '/aosp', assets: '/assets', reportSha256: hex('e'), aapt: 'aapt', apksigner: 'apksigner', admission,
    runPlanner: planner({imageIdentityAdmission: admission, packetSha256: sha('archive')})});
  // The planner reads the admission the stage wrote, and the stage product.mk pin precedes its include.
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, 'image-policy-admission.json'), 'utf8')), admission);
  assert.equal(argv[argv.indexOf('--product-mk-sha256') + 1], sha('# generated\n'));
  assert.equal(fs.readFileSync(path.join(output, 'product.mk'), 'utf8'), '# generated\n' + BRANDING_PRODUCT_INCLUDE);
  assert.equal(argv[argv.indexOf('--image-stage') + 1], output);
  const report = JSON.parse(fs.readFileSync(path.join(output, 'physical-product.json'), 'utf8'));
  assert.deepEqual(report.sourcePolicyPacket, packet);
  assert.deepEqual(packet, {file: 'source-packet.json', sha256: sha(fs.readFileSync(path.join(output, 'source-packet.json'))),
    archiveSha256: sha('archive'), packageName: appId, apkSha256: hex('b')});
  // An existing admission is never overwritten.
  assert.throws(() => stageBrandingPacket({output, source: '/aosp', assets: '/assets', reportSha256: hex('e'), aapt: 'aapt', apksigner: 'apksigner', admission,
    runPlanner: () => assert.fail('planner must not run')}), /EEXIST/);
});

test('a planner receipt that differs from the admission or archive is refused before the report changes', t => {
  for (const [receipt, error] of [
    [admission => ({imageIdentityAdmission: {...admission, apkSha256: hex('0')}, packetSha256: sha('archive')}), /differs from its image admission/],
    [admission => ({imageIdentityAdmission: admission, packetSha256: hex('0')}), /archive differs from its receipt/],
  ]) {
    const {output, admission} = imageStage(t);
    assert.throws(() => stageBrandingPacket({output, source: '/aosp', assets: '/assets', reportSha256: hex('e'), aapt: 'aapt', apksigner: 'apksigner', admission,
      runPlanner: () => {
        fs.writeFileSync(path.join(output, 'source-packet.zip'), 'archive');
        fs.writeFileSync(path.join(output, 'source-packet.json'), JSON.stringify(receipt(admission)));
      }}), error);
    assert.equal(fs.readFileSync(path.join(output, 'physical-product.json'), 'utf8'), '{"schema":1}\n');
  }
});

test('the stage-aosp CLI refuses a development or non-Pixel source packet before reading any input', () => {
  const stageAosp = (...args) => {
    try { execFileSyncLocal(['scripts/stage-aosp.ts', ...args]); return ''; } catch (error) { return String(error.stderr); }
  };
  assert.match(stageAosp('--target', 'cuttlefish', '--aosp-source', '/missing', '--apk', '/missing.apk', '--output', '/missing-out',
    '--development', '--branding-assets', '/assets', '--branding-assets-report-sha256', hex('a')), /Pixel image contract.*production launcher admission/s);
  assert.match(stageAosp('--target', 'cuttlefish', '--aosp-source', '/missing', '--apk', '/missing.apk', '--output', '/missing-out',
    '--development', '--branding-assets', '/assets'), /exact report SHA-256/);
});

// stage-aosp.ts loads upstream VibeLang (@elizaos/os/image), so it runs as package.json's aosp:stage runs it.
const VIBE = ['--conditions=eliza-source', '--import', import.meta.resolve('vibelang/register')];
function execFileSyncLocal(args) {
  return execFileSync(process.execPath, [...VIBE, ...args], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
}
