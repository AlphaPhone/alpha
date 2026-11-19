import test from 'node:test';
import assert from 'node:assert/strict';
import {tsImport} from './support/ts-import.mjs';

const {DeviceActions,presentOpenView}=await tsImport('../apps/app/src/runtime/device-actions.ts',import.meta.url);

// The served operation names a view by id ("inbox", "workflows", "reminders"). The owner reads
// the name on the app's own screen, in the review card and in the receipt.
const named=[['inbox','Inbox'],['workflows','Workflows'],['reminders','Calendar'],['home','Home'],['settings','Settings']];
async function reviewCard(view){
 const proposal={id:'open-'+view,digest:'b'.repeat(64),state:'pending',subjectUserId:'owner',requestedBy:'agent',action:'device_action',expiresAt:new Date(Date.now()+60000).toISOString(),
  payload:{version:1,action:'device_action',installationId:'device',enrollmentId:'enrollment',operation:{type:'open_view',view}}};
 const client=new DeviceActions({ownerId:'owner',agentId:'agent',origin:'https://agent.invalid',sessionId:'session'},
  {installationId:'device',enrollmentId:'enrollment',key:'a'.repeat(64)},'c'.repeat(64),async()=>({proposals:[proposal]}),{list:async()=>({entries:[]})},async()=>({status:'succeeded',summary:'unused'}));
 const [item]=await client.pendingReview({view:'home',revision:1,sensitive:false},new AbortController().signal);
 return item.proposal;
}
for(const [view,label] of named)test(`an open_view request for ${view} is reviewed and reported as ${label}`,async()=>{
 const card=await reviewCard(view);
 assert.equal(card.title,`Open ${label}`);
 assert.equal(card.description,`Open ${label} on this phone`);
 assert.equal(presentOpenView(view).appliedSummary,`Opened ${label} on this phone.`);
});
