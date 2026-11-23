// Labels Alpha's manifest shows the owner (Android settings, the notification-access list, app
// screens) come from Alpha's string resources, not literals, so they can be translated later (PROD-08).
// docs/prd.md states the current language support plainly rather than implying localisation.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const MANIFEST = 'android/app/manifests/main/AndroidManifest.xml';
const LAUNCHER = 'android/app/manifests/launcher/AndroidManifest.xml';
const STRINGS = 'android/app/src/main/res/values/alpha-strings.xml';
const VALUES = 'android/app/src/main/res/values/';

test('every manifest label is a string resource Alpha defines', () => {
  const manifest = read(MANIFEST) + read(LAUNCHER);
  const strings = [VALUES, 'android/app/src/launcher/res/values/'].flatMap(dir => fs.readdirSync(dir).filter(f => f.endsWith('.xml')).map(f => read(dir + f))).join('\n');
  const defined = new Set([...strings.matchAll(/<string name="([a-z0-9_]+)">[^<]+<\/string>/g)].map(m => m[1]));
  const labels = [...manifest.matchAll(/android:label="([^"]*)"/g)].map(m => m[1]);
  assert.ok(labels.length >= 3, 'manifest declares owner-facing labels');
  for (const label of labels) {
    const ref = /^@string\/([a-z0-9_]+)$/.exec(label);
    assert.ok(ref, `manifest label ${JSON.stringify(label)} is a string resource`);
    if (ref[1].startsWith('alpha_')) assert.ok(defined.has(ref[1]), `${ref[1]} is defined in ${VALUES}`);
  }
  for (const name of ['alpha_mail_pdf_label', 'alpha_notification_listener_label', 'alpha_reset_recovery_label', 'alpha_messages_label', 'alpha_phone_label']) {
    assert.ok(manifest.includes(`@string/${name}`), `manifest uses ${name}`);
    assert.match(read(STRINGS), new RegExp(`<string name="${name}">`), `${name} is defined in ${STRINGS}`);
  }
});

test('the PRD states that the app is English only today', () => {
  const prd = read('docs/prd.md');
  assert.match(prd, /English only today/);
  assert.match(prd, /supportsRtl="false"/);
  assert.match(read(MANIFEST), /android:supportsRtl="false"/);
});

// The daily-brief and Gmail notices and the channel descriptions Alpha adds read their owner-facing
// text from alpha-notices.xml. The refinement harnesses (source-renewal, gmail-background) and
// test/native-notification-channels.test.mjs check that text through the same file.
test('notice posters take their owner-facing text from string resources', () => {
  const NOTICES = 'android/app/src/main/res/values/alpha-notices.xml';
  const defined = new Set([...read(NOTICES).matchAll(/<string name="([a-z0-9_]+)">[^<]+<\/string>/g)].map(m => m[1]));
  for (const poster of ['HostedNoticePoster', 'GmailNoticePoster', 'AlphaNotificationChannels']) {
    const source = read(`android/app/src/main/java/ai/alphacompute/alphaphone/${poster}.java`);
    const literal = /(setContentTitle|setContentText|setDescription|setTicker|setSubText)\("|new NotificationChannel\([^,]+,"|Action\.Builder\(null,"/.exec(source);
    assert.equal(literal, null, `${poster} passes owner-facing text as a literal: ${literal?.[0]}`);
    const used = [...source.matchAll(/R\.string\.([a-z0-9_]+)/g)].map(m => m[1]);
    assert.ok(used.length >= 5, `${poster} uses string resources`);
    for (const name of used) assert.ok(defined.has(name), `${poster} uses ${name}, defined in ${NOTICES}`);
  }
});
