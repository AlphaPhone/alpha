import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
// The capability probe is the shared page-reading module from the prepared client features; the
// wording is Alpha's own (apps/app/src/ui/browser/page-reading.ts). These probes touch no DOM;
// the web build's menu cases stay in test/browser/reading-capability.spec.ts.
import {createReadingSupport} from '../.eliza/client-features/plugins/plugin-native-browser-surface/src/page-reading.ts';
import {READING_UNSUPPORTED_MESSAGE,SENSITIVE_PAGE_MESSAGE,SENSITIVE_READING_MESSAGE} from '../apps/app/src/ui/browser/page-reading.ts';
import {BROWSER_REFUSALS} from '../apps/app/src/ui/browser/browser-messages.ts';
import {browserAdapterHost} from '../specs/quint/refinement/application/browser-adapter-host.mjs';

const probe=async answers=>{
 let asked=0,changed=0;const states=[];
 const support=createReadingSupport(async()=>{const answer=answers[Math.min(asked++,answers.length-1)];if(answer==='throw')throw new Error('bridge closed');return answer;},()=>{changed++;});
 states.push(support.state);
 const together=await Promise.all([support.check(),support.check()]);states.push(support.state);
 const again=await support.check();states.push(support.state);
 return {asked,changed,states,together,again};
};
test('an explicit native "no" is remembered as unavailable and asked for once',async()=>{
 assert.deepEqual(await probe([{available:false}]),{asked:1,changed:1,states:['unknown','unavailable','unavailable'],together:['unavailable','unavailable'],again:'unavailable'});
});
test('an explicit native "yes" is remembered as available',async()=>{
 assert.deepEqual(await probe([{available:true}]),{asked:1,changed:1,states:['unknown','available','available'],together:['available','available'],again:'available'});
});
test('a failed or malformed answer is never read as unavailable or available, and is asked again',async()=>{
 // Unknown lets the review start; the native side then refuses on its own if it must.
 assert.deepEqual(await probe(['throw',{available:false}]),{asked:2,changed:1,states:['unknown','unknown','unavailable'],together:['unknown','unknown'],again:'unavailable'});
 for(const malformed of [null,{},{available:'false'},{available:0},'no'])
  assert.deepEqual((await probe([malformed,malformed])).states,['unknown','unknown','unknown'],JSON.stringify(malformed));
});
test('the message names Read aloud, the cause and the remedy, and promises nothing else',()=>{
 assert.equal(READING_UNSUPPORTED_MESSAGE,'Read aloud is unavailable on this device: its Android System WebView cannot read a page privately. Update Android System WebView.');
});
test('the native unsupported refusal at the pin is shown in the menu note\'s words',()=>{
 // The shared sentence still names the former Ask about page action; the owner sees Alpha's.
 const java=readFileSync('vendor/eliza/plugins/plugin-native-browser-surface/android/src/main/java/ai/eliza/plugins/browsersurface/BrowserPageReading.java','utf8');
 const native=java.match(/public static final String UNSUPPORTED_MESSAGE\s*=\s*"((?:[^"\\]|\\.)*)";/);
 assert.ok(native,'BrowserPageReading.UNSUPPORTED_MESSAGE was found');
 assert.equal(BROWSER_REFUSALS.get(JSON.parse(`"${native[1]}"`)),READING_UNSUPPORTED_MESSAGE);
});
test('the sensitive refusal tells the user what the page may hold and what to do',()=>{
 assert.equal(SENSITIVE_READING_MESSAGE,'This page may contain credentials or verification codes. Open a different page.');
});

test('a device that lacks isolated reading support declines local reading without touching the native page',async()=>{
 const host=await browserAdapterHost({results:{readingSupport:()=>({available:false})}});
 try{
  host.rendered().readAloud();await host.sync();
  const menu=host.rendered();
  assert.deepEqual({messages:host.messages,note:menu.readingNote,unavailable:menu.readingUnavailable,reads:host.calls.filter(call=>/^review/.test(call.name)).length},
   {messages:[READING_UNSUPPORTED_MESSAGE],note:READING_UNSUPPORTED_MESSAGE,unavailable:true,reads:0});
 }finally{await host.teardown();}
});
