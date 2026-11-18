// A photo the owner asked for is taken only on the visible Camera viewfinder: a reply that
// proposes it without showing Camera opens Camera on the phone first.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {tsImport} from './support/ts-import.mjs';

const root=path.resolve(import.meta.dirname,'..');
const featuresReady=fs.existsSync(path.join(root,'.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/camera-contract.ts'));
const message='87654321-4321-4321-8321-cba987654321';
const cameraNotice={proposalId:'camera',proposal:null,notice:'Take photo: Open Camera to take the requested photo.',cameraCapture:true,cameraRequestMessageId:message};
// Ask-first: the agent records no message binding; the reply's own receipts name the proposal.
const unboundCamera={proposalId:'camera',proposal:null,notice:'Take photo: Open Camera to take the requested photo.',cameraCapture:true};
const receipt=(id,operation='device.camera_capture_photo')=>({receiptId:id,operation,resource:{kind:'device.approval',id},artifacts:[],idempotency:{key:'device:k',replayed:false},observedAt:new Date(0).toISOString(),outcome:'preview'});

test('a photo request waiting only on Camera opens Camera first',{skip:!featuresReady&&'prepared client features are missing'},async()=>{
 const {requestedCameraNeedsCameraView,proposalContextNotice,CAMERA_CONTEXT_NOTICE}=await tsImport(path.join(root,'apps/app/src/ui/device-actions/client-coordinator.ts'),import.meta.url);
 // The capture is refused anywhere but the unlocked Camera view: nothing is taken invisibly.
 const ports={foregroundHidden:()=>false};
 assert.equal(proposalContextNotice({type:'camera_capture_photo'},{view:'home',revision:1},ports),CAMERA_CONTEXT_NOTICE);
 assert.equal(proposalContextNotice({type:'camera_capture_photo'},{view:'camera',revision:1,sensitive:true},ports),CAMERA_CONTEXT_NOTICE);
 assert.equal(proposalContextNotice({type:'camera_capture_photo'},{view:'camera',revision:1},ports),undefined);
 assert.equal(requestedCameraNeedsCameraView([cameraNotice],message,false),true);
 // Other actions this screen cannot review do not keep Camera closed.
 assert.equal(requestedCameraNeedsCameraView([cameraNotice,{proposalId:'note',proposal:null,notice:'Open Notes to review this action.'}],message,false),true);
 // The agent's own navigation shows Camera; this phone does not open it a second time.
 assert.equal(requestedCameraNeedsCameraView([cameraNotice],message,true),false);
 // A photo asked for by another message, or no photo at all, never moves the screen.
 assert.equal(requestedCameraNeedsCameraView([cameraNotice],'other-message',false),false);
 assert.equal(requestedCameraNeedsCameraView([cameraNotice],undefined,false),false);
 assert.equal(requestedCameraNeedsCameraView([{proposalId:'note',proposal:null,notice:'Open Notes to review this action.'}],message,false),false);
 // A review card shown on this screen is not dropped by leaving it.
 assert.equal(requestedCameraNeedsCameraView([cameraNotice,{proposalId:'note',proposal:{id:'note'}}],message,false),false);
});

test('a photo this reply proposed opens Camera whether or not it is bound, and stale reviews never block it',{skip:!featuresReady&&'prepared client features are missing'},async()=>{
 const {requestedCameraNeedsCameraView,replyDeviceProposalIds}=await tsImport(path.join(root,'apps/app/src/ui/device-actions/client-coordinator.ts'),import.meta.url);
 const reply=replyDeviceProposalIds([{actionName:'DEVICE_ACTION',success:true,effectReceipts:[receipt('camera')]}]);
 assert.deepEqual([...reply],['camera']);
 // Only device.approval receipts with a plain identifier name a proposal; other effects never do.
 assert.deepEqual([...replyDeviceProposalIds([{effectReceipts:[{...receipt('x'),resource:{kind:'notes.note',id:'x'}},{...receipt('y'),operation:'notes.create-note'},{...receipt('bad id')},null]},null,'VIEWS',{effectReceipts:'no'}])],[]);
 // Review mode: no binding, but this reply proposed the photo, so Camera opens and its card waits there.
 assert.equal(requestedCameraNeedsCameraView([unboundCamera],message,false,reply),true);
 // Without this reply's receipts an unbound photo never moves the screen.
 assert.equal(requestedCameraNeedsCameraView([unboundCamera],message,false),false);
 assert.equal(requestedCameraNeedsCameraView([unboundCamera],message,false,new Set()),false);
 // A pending photo of another turn is not this reply's photo.
 assert.equal(requestedCameraNeedsCameraView([unboundCamera],message,false,new Set(['other'])),false);
 // A photo bound to another message stays put even when listed in this reply.
 assert.equal(requestedCameraNeedsCameraView([{...cameraNotice,cameraRequestMessageId:'old-message'}],message,false,reply),false);
 // Pending call, SMS or camera reviews of earlier turns do not keep the current screen.
 const stale=[{proposalId:'old-call',proposal:{id:'old-call'}},{proposalId:'old-sms',proposal:{id:'old-sms'},requestMessageId:'older-message'},{proposalId:'old-camera',proposal:null,notice:'Take photo: Open Camera to take the requested photo.',cameraCapture:true}];
 assert.equal(requestedCameraNeedsCameraView([...stale,unboundCamera],message,false,reply),true);
 assert.equal(requestedCameraNeedsCameraView([...stale,cameraNotice],message,false,new Set()),true);
 // A card of this reply, named by its receipt or by its binding, still keeps the current screen.
 assert.equal(requestedCameraNeedsCameraView([unboundCamera,{proposalId:'sms',proposal:{id:'sms'}}],message,false,new Set(['camera','sms'])),false);
 assert.equal(requestedCameraNeedsCameraView([cameraNotice,{proposalId:'sms',proposal:{id:'sms'},requestMessageId:message}],message,false,new Set()),false);
 // Direct mode is unchanged, and the agent's own Camera navigation still wins.
 assert.equal(requestedCameraNeedsCameraView([cameraNotice],message,false,reply),true);
 assert.equal(requestedCameraNeedsCameraView([unboundCamera],message,true,reply),false);
 // A reply that proposed no photo never opens Camera.
 assert.equal(requestedCameraNeedsCameraView([{proposalId:'note',proposal:null,notice:'Open Notes to review this action.'}],message,false,new Set(['note'])),false);
 assert.equal(requestedCameraNeedsCameraView([unboundCamera],undefined,false,reply),false);
});

test('every reply path opens Camera before continuing the requested photo',()=>{
 const adapter=fs.readFileSync(path.join(root,'apps/app/src/prototype/agent-adapter.ts'),'utf8');
 const connection=fs.readFileSync(path.join(root,'apps/app/src/runtime/connection-ui.tsx'),'utf8');
 // Typed and spoken turns both open Camera when the agent only proposed the photo, then continue it there.
 const typed=adapter.indexOf('requestedCameraNeedsOpening(reply.userMessageId))delivered=await openRequestedCamera(this)');
 assert.ok(typed>0&&typed<adapter.indexOf('continueRequestedCamera(reply.userMessageId,attempt.stop.signal)'));
 const voice=adapter.indexOf("input.navigation.apply('camera',live");
 assert.ok(voice>0&&voice<adapter.indexOf('continueRequestedCamera(reply.userMessageId,signal)'));
 // Ask-first phones open Camera too; the photo then waits there as its review card.
 assert.match(connection,/if\(!failed&&!message\.context\.sensitive&&cameraNavigation&&cameraAttempt/);
 assert.match(connection,/cameraProposalOnly=requestedCameraNeedsCameraView\(replyProposals\?items:turnItems,[^;]*,replyProposals\);/);
 assert.match(connection,/const replyProposals=Array\.isArray\(reply\.actionResults\)\?replyDeviceProposalIds\(reply\.actionResults\):undefined;/);
});
