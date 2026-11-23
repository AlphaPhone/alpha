// Alpha's native page-context boundary (android/.../alphaphone/browser/AlphaPageContext.java), run on
// the host JVM: the address the agent may see, the title as one line, and the shape check on the
// isolated-world script's result. The compiled script must be the exact text that
// apps/app/test/browser/pageContextScript.browser.test.ts runs in Chromium. This does not exercise a WebView, an
// isolated world or a device.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runJvm,jvmSkip,nativeSource,fixture} from './fixtures/jvm-tools.mjs';

test('the page-context boundary bounds what Android hands the renderer',{skip:jvmSkip('javac','json')},()=>{
 const out=JSON.parse(runJvm([nativeSource(join('browser','AlphaPageContext.java')),fixture('browser-native-jvm/AlphaPageContextTest.java')],'AlphaPageContextTest',{json:true,release:'21'}).trim());
 assert.ok(out.assertions>=30,String(out.assertions));
 // The spec's text-block unescaping yields exactly the string Java compiles.
 const java=readFileSync('android/app/src/main/java/ai/alphacompute/alphaphone/browser/AlphaPageContext.java','utf8');
 const spec=java.split('public static final String SCRIPT = """')[1].split('""";')[0].split('\n').map(line=>line.replace(/^ {4}/,'')).join('\n').replace(/^\n/,'').replaceAll('\\\\','\\');
 assert.equal(out.script,spec);
 assert.doesNotThrow(()=>new Function(out.script),'the compiled script is valid JavaScript');
});
