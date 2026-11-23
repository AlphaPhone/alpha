// Predictive Back (app review #855, NOTIF-12). Alpha opts in to Android's back callbacks, keeps
// one androidx dispatcher callback that asks the renderer, and forwards the held gesture so the
// renderer can preview the layer Back closes. The preview itself is seen rendering in
// test/browser/haptics-predictive-back.spec.ts; BackDispatch (test/quint-back-dispatch.test.mjs)
// still covers what a committed Back does.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {BACK_PREVIEW_EVENT} from '../apps/app/src/runtime/predictive-back.ts';

const read=file=>readFileSync(file,'utf8');
const javaFiles=dir=>readdirSync(dir).flatMap(name=>{const path=join(dir,name);return statSync(path).isDirectory()?javaFiles(path):path.endsWith('.java')?[path]:[];});

test('the app opts in to Android back callbacks',()=>{
  assert.match(read('android/app/manifests/main/AndroidManifest.xml'),/<application [^>]*android:enableOnBackInvokedCallback="true"/);
});

test('with the opt-in, no activity relies on onBackPressed or the Back key',()=>{
  // Android 13+ stops calling these once an app opts in; Back must go through the androidx dispatcher.
  for(const file of [...javaFiles('android/app/src/main/java'),...javaFiles('android/app/src/launcher/java')]){
    const source=read(file);
    assert.doesNotMatch(source,/void onBackPressed\s*\(|KEYCODE_BACK/,`${file} handles Back outside the dispatcher`);
  }
});

test('MainActivity forwards the held gesture to the renderer event',()=>{
  const activity=read('android/app/src/main/java/ai/alphacompute/alphaphone/MainActivity.java');
  for(const [method,phase] of [['handleOnBackStarted(BackEventCompat event)','start'],['handleOnBackProgressed(BackEventCompat event)','progress'],['handleOnBackCancelled()','cancel']])
    assert.ok(activity.includes(`@Override public void ${method} { previewBack("${phase}"`),method);
  assert.ok(activity.includes(`"window.dispatchEvent(new CustomEvent('${BACK_PREVIEW_EVENT}',{detail:{phase:'"`),'event name the renderer listens for');
  assert.match(activity,/Math\.max\(0f, Math\.min\(1f, progress\)\)/,'progress is bounded');
  assert.match(activity,/getSwipeEdge\(\) == BackEventCompat\.EDGE_RIGHT/,'edge comes from the gesture');
});
