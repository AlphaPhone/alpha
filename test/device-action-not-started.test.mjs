import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// Alpha's device executor checks the reviewed screen again before each effect. A refusal there ran
// nothing, so it throws the shared DeviceActionNotStarted and the coordinator journals `failed`
// ("Not started") instead of "Action outcome needs review" (#855 AGENT-06). The coordinator mapping
// itself is replayed through Alpha's binding in quint-device-action-review.
const adapter=fs.readFileSync('apps/app/src/prototype/agent-adapter.ts','utf8');
const executor=adapter.slice(adapter.indexOf('connectionController.setDeviceExecutor('));

test('pre-effect screen guards of the device executor refuse as not started',()=>{
 assert.match(adapter,/import \{[^}]*\bDeviceActionNotStarted\b[^}]*\} from '\.\.\/runtime\/device-actions'/);
 for(const old of ['Phone context changed','Dial review context changed','Reminder context changed'])
  assert.equal(executor.includes(old),false,old);
 const entry=executor.slice(0,executor.indexOf('if(isCameraCapture(operation))'));
 assert.match(entry,/throw new DeviceActionNotStarted\('The screen changed\.'\)/,'entry guard runs before any effect');
 // Each guard precedes the effect it protects in its branch.
 for(const [guard,effect] of [['isPhoneDial(operation)','client.dial('],['isReminderCreate(operation)','DailyApps.operateReminder(']]){
  const branch=executor.slice(executor.indexOf(guard));
  assert.ok(branch.indexOf('DeviceActionNotStarted')<branch.indexOf(effect),guard);
 }
});

test('an opened view is named by its label, never its id',()=>{
 assert.equal(adapter.includes('Opened ${operation.view} on this phone'),false);
 assert.match(adapter,/const target=alphaViews\.target\(operation\.view\);/);
});
