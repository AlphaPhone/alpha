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
const cameraNotice={proposalId:'camera',proposal:null,notice:'Take photo: Open Camera to take the requested photo.',cameraRequestMessageId:message};

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
 assert.match(connection,/cameraProposalOnly=requestedCameraNeedsCameraView\(turnItems,/);
});
