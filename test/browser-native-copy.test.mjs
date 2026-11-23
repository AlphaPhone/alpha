// Alpha's Browser native windows (android/.../alphaphone/browser): the site permission and sign-in
// prompt text, what a tapped link to another app does, the tab frame's page-error sentences and
// the tab layer geometry, run on the host
// JVM. The tab frame and the renderer must say the same thing for a page that failed, so every
// sentence of the native table is compared with apps/app/src/browser/messages.ts (pageErrorText).
// The renderer's table is private to that module, so a renderer-only sentence is not caught here.
// This does not exercise WebView, dialogs or input routing on Android (androidTest
// BrowserTabLayerInstrumentedTest).
import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {runJvm,jvmSkip,nativeSource,fixture} from './fixtures/jvm-tools.mjs';

const {pageErrorText}=await import('../apps/app/src/browser/messages.ts');
const sources=['AlphaBrowserCopy','HostRect','LinkHandoff','TabLayer'].map(name=>nativeSource(join('browser',name+'.java')));

test('Browser prompt text, page errors and tab geometry',{skip:jvmSkip('javac')},()=>{
 const out=JSON.parse(runJvm([...sources,fixture('browser-native-jvm/BrowserNativeCopyTest.java')],'BrowserNativeCopyTest').trim());
 assert.ok(out.assertions>=40,String(out.assertions));
 assert.ok(Object.keys(out.pageErrors).length>=10,String(Object.keys(out.pageErrors).length));
 for(const [reason,sentence] of Object.entries(out.pageErrors))assert.equal(pageErrorText(reason),sentence,`the tab frame and the renderer word "${reason}" alike`);
 assert.equal(out.fallback,pageErrorText('A new upstream failure'));
});
