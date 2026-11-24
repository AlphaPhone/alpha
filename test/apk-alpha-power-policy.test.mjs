import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distributionProblems } from '../scripts/apk.ts';

function assess({appId="ai.alphacompute.alphaphone",policyAppId=appId,name='.AlphaPowerVoiceActivity', permission='android.permission.STATUS_BAR_SERVICE', tag='activity', applicationAttributes='', extra=''}={}) {
  return distributionProblems({xml:`E: manifest
  A: package="${appId}"
  E: application
    A: android:allowBackup=(type 0x12)0x0
    A: android:usesCleartextTraffic=(type 0x12)0x0
    A: android:networkSecurityConfig=@0x7f010001
${applicationAttributes}    E: ${tag}
      A: android:name="${name}"
      A: android:exported=(type 0x12)0xffffffff
      ${permission ? `A: android:permission="${permission}"` : ''}
${extra}`, badging:`package: name='${appId}' versionCode='15' versionName='15'`, names:['assets/public/licenses/third-party-notices.json']}, {mode:'release',appId:policyAppId}).problems;
}

test('release admits the exact platform-protected Power activity', () => {
  assert.deepEqual(assess(), []);
});
test('a debuggable APK cannot be recorded as a release', () => {
  for (const value of ['(type 0x12)0xffffffff', '(type 0x12)0x1', '@0x7f050001']) {
    const applicationAttributes = `    A: android:debuggable(0x0101000f)=${value}\n`;
    assert.match(assess({applicationAttributes}).join('\n'), /Release manifest must not allow debugging/, value);
  }
  assert.deepEqual(assess({applicationAttributes: '    A: android:debuggable(0x0101000f)=(type 0x12)0x0\n'}), []);
});
test('release refuses unprotected or incorrectly protected Power entry', () => {
  for (const permission of ['', 'android.permission.INTERNET', 'android.permission.BIND_QUICK_SETTINGS_TILE'])
    assert.ok(assess({permission}).some(problem => problem.includes('AlphaPowerVoiceActivity')), permission);
});
test('release refuses the Power name on other component types', () => {
  for (const tag of ['service', 'receiver', 'provider'])
    assert.ok(assess({tag}).some(problem => problem.includes('AlphaPowerVoiceActivity')), tag);
});
test('platform permission does not admit an unexpected exported component', () => {
  assert.ok(assess({name:'.OtherPowerActivity'}).some(problem => problem.includes('Unexpected exported activity')));
  assert.ok(assess({extra:`    E: activity
      A: android:name=".UnexpectedActivity"
      A: android:exported=(type 0x12)0xffffffff
      A: android:permission="android.permission.STATUS_BAR_SERVICE"
`}).some(problem => problem.includes('Unexpected exported activity')));
});

test('retained Power policy admits only its selected product names and preserves shared service permissions', () => {
  const appId='ai.elizaresearch.alphaphone';
  assert.deepEqual(assess({appId}), []);
  assert.match(assess({appId:'ai.alphacompute.alphaphone',policyAppId:appId,name:appId+'.AlphaPowerVoiceActivity'}).join(), /package differs from selected application identity/);
  for (const change of [{name:'ai.alphacompute.alphaphone.AlphaPowerVoiceActivity'}, {permission:''}, {permission:'android.permission.INTERNET'}, {tag:'service'}])
    assert.ok(assess({appId,...change}).length, JSON.stringify(change));
  const shared=`    E: service
      A: android:name="ai.eliza.plugins.passwords.ElizaPasswordAutofillService"
      A: android:exported=(type 0x12)0xffffffff
      A: android:permission="android.permission.BIND_AUTOFILL_SERVICE"
`;
  assert.deepEqual(assess({appId,extra:shared}), []);
  assert.ok(assess({appId,extra:shared.replace('BIND_AUTOFILL_SERVICE','INTERNET')}).length);
});
