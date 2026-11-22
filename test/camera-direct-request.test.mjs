// Fable review (camera 1 and 3): in direct-request mode the phone ran any bound
// camera capture with no check of what the owner wrote, and two bound captures
// of one message took two photos. A capture runs without its Take photo card
// only for the owner's own request for a photo now, and only once per message.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {policyFixture as fixture} from './fixtures/device-action-policy.mjs';
import {loadBrowserModule} from './fixtures/browser-source.mjs';
const proof=text=>({messageId:'request',text,current:()=>{}});
const run=(f,text,type)=>f.performRequested('request',{},new AbortController().signal,async()=>true,type,text===undefined?undefined:proof(text));
for(const text of ["don't take a photo",'summarize the page I have open','did you take a photo?','take a photo in five minutes','can you not take a picture?'])
 test(`a capture proposed for ${JSON.stringify(text)} keeps its card`,async()=>{
  const f=fixture([['cam','request',undefined,'camera_capture_photo']]);
  await run(f,text);
  assert.deepEqual(f.calls,[]);
  assert.equal(f.proposals.size,1,'the capture stays available as its review card');
 });
test('a capture with no proof of the owner\'s words keeps its card',async()=>{
 const f=fixture([['cam','request',undefined,'camera_capture_photo']]);
 await run(f,undefined,'camera_capture_photo');
 assert.deepEqual(f.calls,[]);
});
for(const text of ['take a photo','Alpha, snap a picture please','can you take a selfie?','could you please take a photo with the back camera?'])
 test(`the photo ${JSON.stringify(text)} asked for is taken once however many captures were bound`,async()=>{
  const f=fixture([['cam1','request',undefined,'camera_capture_photo'],['cam2','request',undefined,'camera_capture_photo']]);
  await run(f,text,'camera_capture_photo');
  assert.deepEqual(f.calls,['cam1']);
  // A later pass for the same message (Camera opened, voice retry) takes no second photo.
  await run(f,text,'camera_capture_photo');
  assert.deepEqual(f.calls,['cam1']);
 });
test('the phone reads a photo request as the agent does',async()=>{
 const {requestedCameraCapture}=await loadBrowserModule('apps/app/src/ui/device-actions/client-coordinator.ts');
 for(const text of ['take a picture','please snap a photo','can you take a picture?','Eliza, could you please take a selfie?','would you take a photo with the rear camera'])
  assert.equal(requestedCameraCapture(text),true,text);
 for(const text of ["don't take a photo",'do not take a picture','summarize the page I have open','did you take a photo?','what can you take a picture of?','take a photo of the page and send it to Sam','take a picture?','Luna, take a picture'])
  assert.equal(requestedCameraCapture(text),false,text);
 assert.equal(requestedCameraCapture('Luna, take a picture','Luna'),true);
 // A control character anywhere refuses the message, as the agent's own reading does.
 for(const text of ['can you\ttake a photo?','could you take a photo\u0000?','can you take a\npicture?'])
  assert.equal(requestedCameraCapture(text),false,JSON.stringify(text));
});
test('the Camera continuation hands the owner\'s words to the direct run',()=>{
 const source=fs.readFileSync(new URL('../apps/app/src/runtime/connection-ui.tsx',import.meta.url),'utf8');
 const start=source.indexOf('async continueRequestedCamera('),body=source.slice(start,source.indexOf('requestedCameraNeedsOpening(',start));
 assert.ok(start>0);
 assert.match(body,/const proof:CurrentDeviceActionRequest=\{messageId,text:pending\.text,current\}/);
 assert.match(body,/performRequested\(messageId,context,signal,allowed,'camera_capture_photo',proof\)/);
 assert.match(source,/requestedCameraContinuation=\{messageId:reply\.userMessageId,text:authoredRequestText,/);
});
