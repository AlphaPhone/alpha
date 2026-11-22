import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {nativeSource, fixture, runJvm, jvmSkip} from './fixtures/jvm-tools.mjs';

// AP-16 AC-19 on the Alpha image: the Telecom reading the renderer gates Alpha's actions on
// (AlphaCallState.java), run on the JVM against stand-ins for the Android types it reads. This
// proves the rule and the unknown cases, not a device's Telecom.
const stubs = dir => readdirSync(dir).flatMap(name => statSync(join(dir, name)).isDirectory() ? stubs(join(dir, name)) : name.endsWith('.java') ? [join(dir, name)] : []);

test('a live call that cannot be ruled out as an emergency call holds AC-19', () => {
  assert.match(runJvm([nativeSource('AlphaCallState.java'), fixture('CallStateTest.java'), ...stubs(fixture('call-state-jvm'))], 'ai.alphacompute.alphaphone.CallStateTest'), /PASS call state/);
});

test('the renderer re-derives exactly the native rule for every reading', async () => {
  const {parseCallState} = await import('../apps/app/src/runtime/call-state.ts');
  const table = runJvm([nativeSource('AlphaCallState.java'), fixture('CallStateTest.java'), ...stubs(fixture('call-state-jvm'))], 'ai.alphacompute.alphaphone.CallStateTest', {args: ['table']}).trim().split('\n');
  assert.equal(table.length, 9);
  const value = text => text === 'null' ? null : text === 'true';
  for (const row of table) {
    const [inCall, emergency, live] = row.split(',').map(value);
    assert.equal(parseCallState({inCall, emergency, emergencyLive: false, watching: true}).emergencyLive, live, row);
  }
});

test('the call-state listener registers once phone-state access exists, follows changes and stops cleanly', () => {
  assert.match(runJvm([nativeSource('AlphaCallStateWatch.java'), fixture('CallStateWatchTest.java'), ...stubs(fixture('call-state-jvm'))], 'ai.alphacompute.alphaphone.CallStateWatchTest'), /PASS call-state watch/);
});

// AlphaContactLookup also shapes contact search rows as JSON, so it compiles with the pinned org.json jar.
test('AC-20: PhoneLookup names a contact on the card only for an exact number match', {skip: jvmSkip('json')}, () => {
  assert.match(runJvm([nativeSource('AlphaContactLookup.java'), fixture('ContactLookupTest.java'), ...stubs(fixture('call-state-jvm'))], 'ai.alphacompute.alphaphone.ContactLookupTest', {json: true}), /PASS contact lookup/);
});

test('a contact too large to read completely is left out of a contact search instead of failing it', {skip: jvmSkip('json')}, () => {
  assert.match(runJvm([nativeSource('AlphaContactLookup.java'), fixture('ContactSearchRowsTest.java'), ...stubs(fixture('call-state-jvm'))], 'ai.alphacompute.alphaphone.ContactSearchRowsTest', {json: true}), /PASS contact search rows/);
});
