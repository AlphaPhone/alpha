// The pinned device-action contracts (elizaOS/eliza#39944, #39949) accept new operation forms:
// Files named by shown position, a voice note with notes.record.v1 alone, and a Photos album or
// share of the open item. Alpha's coordinator admits each only with its own negotiated capability,
// as the shared coordinator does. Photo library proposals now pass the agent's own gate, and
// Alpha's negotiation offers the library only where the native Photos plugin exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {tsImport} from './support/ts-import.mjs';

const root=path.resolve(import.meta.dirname,'..');
const contracts=path.join(root,'.eliza/client-features/plugins/plugin-assistant/src/services/device-actions');
const session={ownerId:'owner-1',agentId:'agent-1',sessionId:'session-1',origin:'https://agent.example'};
const identity={installationId:'installation-1',enrollmentId:'enrollment-1'};
const {DeviceActionCoordinator}=await tsImport(path.join(root,'apps/app/src/ui/device-actions/client-coordinator.ts'),import.meta.url);

function proposal(operation){
 return {
  id:'11111111-1111-4111-8111-111111111111',subjectUserId:session.ownerId,requestedBy:session.agentId,action:'device_action',
  digest:'a'.repeat(64),state:'pending',expiresAt:new Date(Date.now()+60_000).toISOString(),
  payload:{action:'device_action',version:1,...identity,operation},
 };
}
const coordinator=capabilities=>new DeviceActionCoordinator({
 session,scope:'test',credential:{...identity,capabilities},
 profile:{assistantName:'Alpha',operations:{admitView:()=>true,parseWorkflowRead:()=>{throw Error('no workflow reads');}},workflow:{parseBinding:()=>{throw Error('no workflow');}}},
});

test('files named by shown position need files.shown-target.v1',async()=>{
 const {FILES_CAPABILITY,FILES_SHOWN_TARGET_CAPABILITY}=await tsImport(path.join(contracts,'files-browser-contract.ts'),import.meta.url);
 const shown={type:'files_trash',shown:[1,2]};
 assert.throws(()=>coordinator([FILES_CAPABILITY]).parse(proposal(shown)),/shown items were not negotiated/);
 assert.deepEqual(coordinator([FILES_CAPABILITY,FILES_SHOWN_TARGET_CAPABILITY]).parse(proposal(shown)).operation.shown,[1,2]);
 // Named paths are unaffected by the shown-position negotiation.
 assert.deepEqual(coordinator([FILES_CAPABILITY]).parse(proposal({type:'files_share',paths:['Download/a.txt']})).operation.paths,['Download/a.txt']);
});

test('a voice note is admitted with notes.record.v1 alone or with the organise pair',async()=>{
 const {NOTES_ORGANIZE_CAPABILITY,NOTES_RECORD_CAPABILITY}=await tsImport(path.join(contracts,'notes-organize-contract.ts'),import.meta.url);
 const record={type:'notes_record',action:'start'};
 assert.throws(()=>coordinator(['notes.local-record.v1']).parse(proposal(record)),/Notes folders were not negotiated/);
 assert.throws(()=>coordinator([NOTES_ORGANIZE_CAPABILITY]).parse(proposal(record)),/Notes folders were not negotiated/);
 assert.equal(coordinator([NOTES_RECORD_CAPABILITY]).parse(proposal(record)).operation.action,'start');
 assert.equal(coordinator([NOTES_ORGANIZE_CAPABILITY,'notes.local-record.v1']).parse(proposal(record)).operation.action,'start');
 // The other organise operations still need the organise capability.
 assert.throws(()=>coordinator([NOTES_RECORD_CAPABILITY]).parse(proposal({type:'notes_folder_create',name:'Trips'})),/Notes folders were not negotiated/);
});

test('an album or share of the open Photos item needs photos.view-selected.v1',async()=>{
 const {PHOTOS_SELECTED_CAPABILITY,PHOTOS_VIEW_CAPABILITY}=await tsImport(path.join(contracts,'photos-view-contract.ts'),import.meta.url);
 const view=['photos.library.v1',PHOTOS_VIEW_CAPABILITY],selected={type:'photos_share',ids:[],selected:true};
 assert.throws(()=>coordinator(view).parse(proposal(selected)),/Photos actions were not negotiated/);
 assert.equal(coordinator([...view,PHOTOS_SELECTED_CAPABILITY]).parse(proposal(selected)).operation.selected,true);
 assert.throws(()=>coordinator([PHOTOS_SELECTED_CAPABILITY]).parse(proposal(selected)),/Photos actions were not negotiated/,'the open-item form never stands in for the view capability');
});

test('the agent accepts photo library proposals for a phone that negotiated the library',async()=>{
 const {deviceOperationSupportedByCapabilities}=await tsImport(path.join(contracts,'contract.ts'),import.meta.url);
 const {selectDeviceCapabilities}=await tsImport(path.join(root,'apps/app/src/runtime/phone-context.ts'),import.meta.url);
 const profile={android:true,native:true,camera:true,foregroundReview:true,photoLibrary:true,clockRepeatDays:false,aospImage:false};
 const negotiated=selectDeviceCapabilities(['photos.library.v1'],profile);
 assert.ok(negotiated.includes('photos.library.v1'));
 for(const type of ['photo_library_search','photo_library_inspect','photo_library_select','photo_library_review'])
  assert.equal(deviceOperationSupportedByCapabilities(type,negotiated),true,type);
 // Without the native Photos plugin the library is not negotiated, and the agent offers none of them.
 const web=selectDeviceCapabilities(['photos.library.v1'],{...profile,android:false,native:false,photoLibrary:false});
 assert.equal(web.includes('photos.library.v1'),false);
 assert.equal(deviceOperationSupportedByCapabilities('photo_library_select',web),false);
 assert.equal(coordinator(negotiated).parse(proposal({type:'photo_library_select',ids:['lib:i:1:1']})).operation.type,'photo_library_select');
});
