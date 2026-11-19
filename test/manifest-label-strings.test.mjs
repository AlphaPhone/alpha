// Labels Alpha's manifest shows the owner (Android settings, the notification-access list, app
// screens) come from Alpha's string resources, not literals, so they can be translated later (PROD-08).
// docs/prd.md states the current language support plainly rather than implying localisation.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const MANIFEST = 'android/app/src/main/AndroidManifest.xml';
const STRINGS = 'android/app/src/main/res/values/alpha-strings.xml';
const VALUES = 'android/app/src/main/res/values/';

test('every manifest label is a string resource Alpha defines', () => {
  const manifest = read(MANIFEST);
  const strings = fs.readdirSync(VALUES).filter(f => f.endsWith('.xml')).map(f => read(VALUES + f)).join('\n');
  const defined = new Set([...strings.matchAll(/<string name="([a-z0-9_]+)">[^<]+<\/string>/g)].map(m => m[1]));
  const labels = [...manifest.matchAll(/android:label="([^"]*)"/g)].map(m => m[1]);
  assert.ok(labels.length >= 3, 'manifest declares owner-facing labels');
  for (const label of labels) {
    const ref = /^@string\/([a-z0-9_]+)$/.exec(label);
    assert.ok(ref, `manifest label ${JSON.stringify(label)} is a string resource`);
    if (ref[1].startsWith('alpha_')) assert.ok(defined.has(ref[1]), `${ref[1]} is defined in ${VALUES}`);
  }
  for (const name of ['alpha_mail_pdf_label', 'alpha_notification_listener_label', 'alpha_reset_recovery_label']) {
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
