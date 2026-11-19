// App review AGENT-06 / CHAT-02: the phone executor refuses a changed screen, a stale Maps
// selection, Calendar access that is off and a changed reminder screen before any native call,
// read or send. Those refusals throw DeviceActionNotStarted so the coordinator journals them as
// failed/not started with their reason instead of an outcome that needs review. The coordinator
// side is replayed in test/quint-device-action-review.test.mjs (trace `executor-not-started`).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const adapter=source('apps/app/src/prototype/agent-adapter.ts');

test('the executor imports the class the coordinator recognises',async()=>{
  const runtime=await import('../apps/app/src/runtime/device-actions.ts');
  const shared=await import('../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/client-coordinator.ts');
  assert.equal(runtime.DeviceActionNotStarted,shared.DeviceActionNotStarted);
  assert.match(adapter,/import \{[^}]*\bDeviceActionNotStarted\b[^}]*\} from '\.\.\/runtime\/device-actions';/);
});

test('pre-effect executor guards refuse as not started',()=>{
  for(const reason of ['The screen changed','The selected Maps place changed','The Maps screen changed',
    'Open Calendar on the unlocked phone','The reminder screen changed','Return to Alpha Phone and review again'])
    assert.ok(adapter.includes(`DeviceActionNotStarted('${reason}')`),reason);
  // The entry guard runs before every native branch.
  assert.match(adapter,/JSON\.stringify\(expectedContext\)\) throw new DeviceActionNotStarted\('The screen changed'\);\n\s+if\(isCameraCapture\(operation\)\)/);
  // Calendar access is asked before the native calendar is called; a refusal there is not started.
  assert.match(adapter,/throw new DeviceActionNotStarted\(permission\.status!=='granted'\?'Calendar access is off':'The screen changed'\);\}\n\s+const calendar=registerPlugin/);
  // Dial and SMS send fences run only before the native call (guardedEffect), never after it.
  assert.match(adapter,/const fence=\(\)=>\{[^\n]*throw new DeviceActionNotStarted\('The screen changed'\);\};\n[^\n]*\n[^\n]*\n\s+const handoff=await imageDialHandoff/);
  assert.match(adapter,/const current=\(\)=>\{[^\n]*throw new DeviceActionNotStarted\('The screen changed'\);\};\n[^\n]*\n\s+const status=await client\.status\(\);current\(\);/);
  // The old plain throws for these guards were journaled as unknown.
  for(const old of ["throw new Error('Phone context changed')","throw Error('Maps context changed')",
    "throw Error('Calendar permission or phone context changed')","throw Error('Reminder context changed')",
    "throw Error('Return to the supported foreground Calendar')","throw Error('Dial review context changed')",
    "throw Error('SMS review context changed')"])
    assert.ok(!adapter.includes(old),old);
});

test('an unsupported foreground review says what happened without promising a later release',()=>{
  assert.ok(adapter.includes("summary:'This phone can’t review that request. Nothing was shared or changed.'"));
  assert.ok(!adapter.includes('This review is not available on this phone yet.'));
});
