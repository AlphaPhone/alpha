// Alpha's device-action coordinator admits a voice-note recording proposal with notes.record.v1
// alone, which the agent's own Notes negotiate, or with the older organise set. The organise
// capability alone or the list filter never admits it, and the other organise operations still
// need notes.organize.v1.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {tsImport} from './support/ts-import.mjs';

const root=path.resolve(import.meta.dirname,'..');
const contract=path.join(root,'.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/notes-organize-contract.ts');
const featuresReady=fs.existsSync(contract)&&fs.readFileSync(contract,'utf8').includes('NOTES_RECORD_CAPABILITY');
const session={ownerId:'owner-1',agentId:'agent-1',sessionId:'session-1',origin:'https://agent.example'};
const identity={installationId:'installation-1',enrollmentId:'enrollment-1'};

function proposal(operation){
 return {
  id:'11111111-1111-4111-8111-111111111111',subjectUserId:session.ownerId,requestedBy:session.agentId,action:'device_action',
  digest:'a'.repeat(64),state:'pending',expiresAt:new Date(Date.now()+60_000).toISOString(),
  payload:{action:'device_action',version:1,...identity,operation},
 };
}

test('a recording proposal needs notes.record.v1 or the full organise set',{skip:!featuresReady&&'prepared client features lack notes.record.v1'},async()=>{
 const {DeviceActionCoordinator}=await tsImport(path.join(root,'apps/app/src/ui/device-actions/client-coordinator.ts'),import.meta.url);
 const {NOTES_RECORD_CAPABILITY}=await tsImport(contract,import.meta.url);
 assert.equal(NOTES_RECORD_CAPABILITY,'notes.record.v1');
 const coordinator=capabilities=>new DeviceActionCoordinator({
  session,scope:'test',credential:{...identity,capabilities},
  profile:{assistantName:'Alpha',operations:{admitView:()=>true,parseWorkflowRead:()=>{throw Error('no workflow reads');}},workflow:{parseBinding:()=>{throw Error('no workflow');}}},
 });
 const record={type:'notes_record',action:'start'};
 for(const capabilities of [[],['notes.organize.v1'],['notes.list-filter.v1'],['notes.local-record.v1']])
  assert.throws(()=>coordinator(capabilities).parse(proposal(record)),/not negotiated/,JSON.stringify(capabilities));
 assert.deepEqual(coordinator([NOTES_RECORD_CAPABILITY]).parse(proposal(record)).operation,record);
 assert.deepEqual(coordinator(['notes.organize.v1','notes.local-record.v1']).parse(proposal(record)).operation,record);
 // Recording alone never admits the folder, move or restore operations.
 assert.throws(()=>coordinator([NOTES_RECORD_CAPABILITY,'notes.local-record.v1']).parse(proposal({type:'notes_folder_create',name:'Work'})),/not negotiated/);
});
