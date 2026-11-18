// Alpha's device-action coordinator accepts an address opened in a tab of its own only when this
// phone negotiated browser.open-new-tab.v1; an ordinary open needs no new-tab capability.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {tsImport} from './support/ts-import.mjs';

const root=path.resolve(import.meta.dirname,'..');
const contract=path.join(root,'.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/browser-contract.ts');
const featuresReady=fs.existsSync(contract)&&fs.readFileSync(contract,'utf8').includes('BROWSER_OPEN_NEW_TAB_CAPABILITY');
const session={ownerId:'owner-1',agentId:'agent-1',sessionId:'session-1',origin:'https://agent.example'};
const identity={installationId:'installation-1',enrollmentId:'enrollment-1'};

function proposal(operation){
 return {
  id:'11111111-1111-4111-8111-111111111111',subjectUserId:session.ownerId,requestedBy:session.agentId,action:'device_action',
  digest:'a'.repeat(64),state:'pending',expiresAt:new Date(Date.now()+60_000).toISOString(),
  payload:{action:'device_action',version:1,...identity,operation},
 };
}

test('a new-tab open is refused unless this phone negotiated it',{skip:!featuresReady&&'prepared client features lack the new-tab capability'},async()=>{
 const {DeviceActionCoordinator}=await tsImport(path.join(root,'apps/app/src/ui/device-actions/client-coordinator.ts'),import.meta.url);
 const {BROWSER_OPEN_NEW_TAB_CAPABILITY}=await tsImport(contract,import.meta.url);
 assert.equal(BROWSER_OPEN_NEW_TAB_CAPABILITY,'browser.open-new-tab.v1');
 const coordinator=capabilities=>new DeviceActionCoordinator({
  session,scope:'test',credential:{...identity,capabilities},
  profile:{assistantName:'Alpha',operations:{admitView:()=>true,parseWorkflowRead:()=>{throw Error('no workflow reads');}},workflow:{parseBinding:()=>{throw Error('no workflow');}}},
 });
 const newTab={type:'browser_navigate',url:'https://example.com/',newTab:true};
 const sameTab={type:'browser_navigate',url:'https://example.com/'};
 assert.throws(()=>coordinator([]).parse(proposal(newTab)),/new tab was not negotiated/);
 assert.throws(()=>coordinator(['browser.tabs.v1']).parse(proposal(newTab)),/new tab was not negotiated/,'the tabs capability alone is not the new-tab one');
 assert.equal(coordinator([BROWSER_OPEN_NEW_TAB_CAPABILITY]).parse(proposal(newTab)).operation.newTab,true);
 // An ordinary open in the current tab is unaffected by the new-tab negotiation.
 assert.equal(coordinator([]).parse(proposal(sameTab)).operation.newTab,undefined);
});
