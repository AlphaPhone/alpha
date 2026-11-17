// Alpha's Browser native windows (android/.../alphaphone/browser): the site permission and sign-in
// prompt text, the tab frame's page-error sentences and the tab layer geometry, run on the host
// JVM. The tab frame and the renderer must say the same thing for a page that failed, so the
// native table is compared with apps/app/src/ui/browser/browser-messages.ts. This does not
// exercise WebView, dialogs or input routing on Android (androidTest BrowserTabLayerInstrumentedTest).
import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {runJvm,jvmSkip,nativeSource,fixture} from './fixtures/jvm-tools.mjs';

const {BROWSER_PAGE_ERRORS,browserPageErrorText}=await import('../apps/app/src/ui/browser/browser-messages.ts');
const sources=['AlphaBrowserCopy','HostRect','TabLayer'].map(name=>nativeSource(join('browser',name+'.java')));

test('Browser prompt text, page errors and tab geometry',{skip:jvmSkip('javac')},()=>{
 const out=JSON.parse(runJvm([...sources,fixture('browser-native-jvm/BrowserNativeCopyTest.java')],'BrowserNativeCopyTest').trim());
 assert.ok(out.assertions>=40,String(out.assertions));
 assert.deepEqual(out.pageErrors,Object.fromEntries(BROWSER_PAGE_ERRORS),'the tab frame and the renderer word page errors alike');
 assert.equal(out.fallback,browserPageErrorText('A new upstream failure'));
});
