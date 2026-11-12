import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {voiceFailure} from '../apps/app/src/runtime/voice-states.ts';
import {voiceMarkup} from './fixtures/voice-markup.mjs';

// The actual voice adapter, production template and DCLogic renderer with closed ports only.
// Local models always ship, so a Cloud voice failure normally moves the conversation to on-device
// speech at once (the last tests here). These scenarios set on-device speech unavailable
// (`local:false`, the default of this helper): then a Cloud voice 429/503 is waited out quietly
// and a terminal failure is said once and plainly.
// Exhausted transient waits close quietly; no voice error toast.

let renderer,page;
const before={document:globalThis.document,matchMedia:globalThis.matchMedia};
test.before(async()=>{
 page=new JSDOM('<!doctype html>');globalThis.document=page.window.document;globalThis.matchMedia=()=>({matches:true});
 renderer=(await voiceMarkup()).render;
});
test.after(()=>{page?.window.close();globalThis.document=before.document;globalThis.matchMedia=before.matchMedia;});

test('a kept recording that failed to transcribe says so without reciting its controls',()=>{
 const shown=[
  voiceFailure({code:'no-speech'},{transcribing:true,browser:false,cloud:true,serviceName:'Eliza Cloud'}),
  voiceFailure({code:'local-agent-starting'},{transcribing:true,browser:false}),
  voiceFailure({code:'recognition-failed'},{transcribing:true,browser:false}),
 ].map(failure=>failure.message);
 assert.deepEqual(shown,['Eliza Cloud heard no speech. Your recording is kept.','Your agent is starting. Try again soon. Your recording is kept.','Transcription failed. Your recording is kept.']);
});
