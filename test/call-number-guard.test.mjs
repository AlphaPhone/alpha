// A call or text proposed for a number other than the one the owner wrote in the message that asked
// for it gets a notice and no card (apps/app/src/ui/device-actions/client-coordinator.ts). Seen on a
// Pixel: the typed message "call 415-555-0100" produced a "Place call" card for a different number.
// A card only protects an owner who reads it, so a number that contradicts the request is refused
// before there is anything to approve. Recording request and journal stubs: no device and no call.
import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const dir=mkdtempSync(join(tmpdir(),'call-number-guard-'));
const output=await build({stdin:{contents:"export {DeviceActions} from './apps/app/src/runtime/device-actions.ts';export {numberContradictsRequest,NUMBER_MISMATCH_NOTICE,CONTACT_NUMBER_MISMATCH_NOTICE} from './apps/app/src/ui/device-actions/client-coordinator.ts';",resolveDir:resolve('.'),loader:'ts'},bundle:true,format:'esm',platform:'node',write:false});
writeFileSync(join(dir,'sdk.mjs'),output.outputFiles[0].text);const {DeviceActions,numberContradictsRequest,NUMBER_MISMATCH_NOTICE,CONTACT_NUMBER_MISMATCH_NOTICE}=await import(pathToFileURL(join(dir,'sdk.mjs')));process.on('exit',()=>rmSync(dir,{recursive:true,force:true}));

const call=number=>({type:'phone_call',target:{kind:'number',number}});
test('a number the owner wrote must be the number proposed, in whatever format either is written',()=>{
 assert.equal(numberContradictsRequest(call('6505715862'),'call 415-555-0100'),true);
 for(const [number,request] of [['+14155550100','call 415-555-0100'],['4155550100','call (415) 555-0100'],['4155550100','please call +1 415 555 0100 now'],['+442079460958','call 020 7946 0958'],['5550100','call 555-0100']])
  assert.equal(numberContradictsRequest(call(number),request),false,`${number} for "${request}"`);
 // A shorter local number is compared exactly: the last digits of another line are not it.
 assert.equal(numberContradictsRequest(call('4155550100'),'call 555-0100'),true);
 for(const type of ['phone_dial','sms_compose'])assert.equal(numberContradictsRequest({type,target:{kind:'number',number:'6505715862'},body:'On my way'},'reach 415-555-0100'),true,type);
});
test('a request that writes no number is not judged',()=>{
 for(const request of ['call Maya','call the number in that email','call Maya at 5','call back about invoice 2026-11-20'])assert.equal(numberContradictsRequest(call('6505715862'),request),false,request);
 assert.equal(numberContradictsRequest({type:'phone_call',target:{kind:'contact',query:'Maya'}},'call Maya'),false);
 assert.equal(numberContradictsRequest({type:'open_view',view:'phone'},'call 415-555-0100'),false);
});
test('a contact chosen in place of the written number contradicts it, unless the owner wrote that name too',()=>{
 const contact=query=>({type:'phone_call',target:{kind:'contact',query}});
 assert.equal(numberContradictsRequest(contact('Shaw'),'call 415-555-0100'),true);
 assert.equal(numberContradictsRequest({type:'sms_compose',target:{kind:'contact',query:'Shaw'},body:'hi'},'text 415-555-0100 saying hi'),true);
 assert.equal(numberContradictsRequest({type:'sms_compose',query:'Shaw',body:'hi'},'text 415-555-0100 saying hi'),true,'the query form too');
 assert.equal(numberContradictsRequest(contact('Maya'),"call Maya's cell, 415-555-0100"),false);
 assert.equal(numberContradictsRequest({type:'sms_compose',target:{kind:'contact',query:'Sam'},body:'call me at 415-555-0100'},'text Sam saying call me at 415-555-0100'),false,'the number is the body');
});
test('a text must go to the number written, and a number inside the text being sent is content',()=>{
 const text=(recipients,body)=>({type:'sms_send',recipients,body,subscriptionId:1});
 assert.equal(numberContradictsRequest(text(['+16505715862'],'v612 test'),'text 415-555-0100 saying v612 test'),true);
 assert.equal(numberContradictsRequest(text(['+14155550100'],'v612 test'),'text 415-555-0100 saying v612 test'),false);
 assert.equal(numberContradictsRequest(text(['+14155550100','+16505715862'],'hi'),'text 415-555-0100 saying hi'),true,'every recipient is checked');
 assert.equal(numberContradictsRequest(text(['+16505550123'],'Call me at 415-555-0100'),'text Mom saying call me at 415-555-0100'),false);
 // A body the owner wrote that repeats the addressee does not hide it: the recipient is still judged.
 assert.equal(numberContradictsRequest(text(['+16505715862'],'my number is 415-555-0100'),'text 415-555-0100 saying my number is 415-555-0100'),true);
 assert.equal(numberContradictsRequest(text(['+14155550100'],'my number is 415-555-0100'),'text 415-555-0100 saying my number is 415-555-0100'),false);
});

const context={view:'home',revision:1,sensitive:false},session={ownerId:'owner',agentId:'agent',origin:'https://agent.example',sessionId:'session'},id='5d1f0d2a-7f0e-4c8a-9a51-0e6c1c1f9b20',message='7b0d6c1e-52a4-4f0e-9d3b-2f6a8c1e4d70',digest='d'.repeat(64);
// The agent's side of a proposal: a reject decision ends it; nothing else may be decided, claimed or receipted.
function fixture(operation,{offline=false,capabilities=['phone.call.v1']}={}){let effects=0,state='pending';const posts=[];
 const proposal=()=>({id,digest,state,subjectUserId:'owner',requestedBy:'agent',action:'device_action',expiresAt:new Date(Date.now()+600000).toISOString(),payload:{action:'device_action',version:1,installationId:'device',enrollmentId:'enrollment',requestMessageId:message,operation},execution:null});
 const request=async(path,body)=>{if(body===undefined)return {proposals:[proposal()]};posts.push({path,body});
  if(!path.endsWith(`/proposals/${id}/decision`)||body.decision!=='reject')throw Error('only a refusal may reach the agent: '+path);
  if(offline)throw Error('offline');state='rejected';return {proposal:proposal(),digest};};
 const journal={reserve:async()=>{throw Error('nothing may be reserved');},markApplying:async()=>{},finish:async()=>{},get:async()=>({entry:undefined}),list:async()=>({entries:[]})};
 const client=new DeviceActions(session,{installationId:'device',enrollmentId:'enrollment',key:'a'.repeat(64),capabilities},'c'.repeat(64),request,journal,async()=>{effects++;return {status:'succeeded',summary:'placed'};});
 // A reload: a new client for the same agent, with none of the old one's memory.
 const reloaded=()=>new DeviceActions(session,{installationId:'device',enrollmentId:'enrollment',key:'a'.repeat(64),capabilities},'c'.repeat(64),request,journal,async()=>{effects++;return {status:'succeeded',summary:'placed'};});
 return {client,reloaded,posts,get effects(){return effects;},get state(){return state;},online(){offline=false;}};}
const signal=()=>new AbortController().signal,asked=text=>({messageId:message,text,current(){}});

test('a call card for a number the owner did not write is a notice, and the agent records the refusal',async()=>{
 const f=fixture(call('6505715862'));
 const items=await f.client.pendingReview(context,signal(),asked('call 415-555-0100'));
 assert.deepEqual(items.map(item=>[item.proposal,item.notice]),[[null,`Place call: ${NUMBER_MISMATCH_NOTICE}`]]);
 assert.deepEqual(f.posts.map(post=>[post.path.split('/').at(-1),post.body.decision,post.body.digest]),[['decision','reject',digest]]);
 assert.equal(f.state,'rejected');
 // The refusal is the agent's record now: later reviews and a reloaded app have no card and cannot approve it.
 assert.deepEqual(await f.client.pendingReview(context,signal()),[]);
 assert.deepEqual(await f.reloaded().pendingReview(context,signal()),[]);
 await assert.rejects(f.client.approve(id,context,signal()));
 await assert.rejects(f.reloaded().approve(id,context,signal()));
 assert.equal(f.posts.length,1,'refused once');assert.equal(f.effects,0);
});
test('a refusal the agent could not take holds on the phone and is recorded on the next review',async()=>{
 const f=fixture(call('6505715862'),{offline:true});
 const items=await f.client.pendingReview(context,signal(),asked('call 415-555-0100'));
 assert.deepEqual(items.map(item=>[item.proposal,item.notice]),[[null,`Place call: ${NUMBER_MISMATCH_NOTICE}`]]);
 assert.equal(f.state,'pending');
 // Still pending at the agent: this client keeps refusing it without the request text, and cannot approve it.
 assert.deepEqual((await f.client.pendingReview(context,signal())).map(item=>item.proposal),[null]);
 assert.deepEqual(await f.client.pending(context,signal()),[]);
 await assert.rejects(f.client.approve(id,context,signal()));
 f.online();
 assert.deepEqual((await f.client.pendingReview(context,signal())).map(item=>item.proposal),[null]);
 assert.equal(f.state,'rejected');
 assert.deepEqual(await f.client.pendingReview(context,signal()),[]);
 assert.equal(f.effects,0);
});
test('the number the owner wrote keeps its ordinary review card',async()=>{
 for(const number of ['+14155550100','4155550100']){
  const [item]=await fixture(call(number)).client.pendingReview(context,signal(),asked('call 415-555-0100'));
  assert.equal(item.proposal?.title,'Place call');assert.match(item.proposal.description,new RegExp(number.replace('+','\\+')));assert.equal(item.notice,undefined);
 }
 // No number in the request: the card is the owner's review, as before.
 const [named]=await fixture(call('6505715862')).client.pendingReview(context,signal(),asked('call the pharmacy back'));
 assert.equal(named.proposal?.title,'Place call');
});

// Review (contacts): a number saved under a name becomes the recipient of every later "call Bob", so a
// new contact or a contact change for a number the owner did not write is refused the same way (v612:
// "add a contact Bob Lee 415-555-0100" was proposed with 6505715862).
const newContact=numbers=>({type:'contact_create',contact:{displayName:'Bob Lee',phoneNumbers:numbers,emailAddresses:[]}});
const changeContact=(part,numbers)=>({type:'contact_update',query:'Bob Lee',[part]:{phoneNumbers:numbers}});
test('a new contact or a contact change must save the number the owner wrote',()=>{
 for(const operation of [newContact(['6505715862']),newContact(['4155550100','6505715862']),changeContact('set',['6505715862']),changeContact('add',['6505715862']),changeContact('remove',['6505715862'])])
  assert.equal(numberContradictsRequest(operation,'add a contact Bob Lee 415-555-0100'),true,JSON.stringify(operation));
 for(const operation of [newContact(['+14155550100']),changeContact('add',['4155550100']),changeContact('remove',['+14155550100'])])
  assert.equal(numberContradictsRequest(operation,'add a contact Bob Lee 415-555-0100'),false,JSON.stringify(operation));
 // A message that writes no number, and a change that saves no number, are the owner's review as before.
 assert.equal(numberContradictsRequest(newContact(['6505715862']),'save the pizza place as a contact'),false);
 assert.equal(numberContradictsRequest({type:'contact_update',query:'Bob Lee',add:{emailAddresses:['bob@example.com']}},'add bob@example.com to Bob Lee, his cell is 415-555-0100'),false);
 assert.equal(numberContradictsRequest({type:'contact_delete',query:'Bob Lee'},'delete Bob Lee 415-555-0100'),false);
});
test('a new contact for a number the owner did not write is a notice that says nothing was saved, and the agent records the refusal',async()=>{
 const f=fixture(newContact(['6505715862']),{capabilities:['contacts.write.v1']});
 const items=await f.client.pendingReview(context,signal(),asked('add a contact Bob Lee 415-555-0100'));
 assert.deepEqual(items.map(item=>[item.proposal,item.notice]),[[null,`Add contact: ${CONTACT_NUMBER_MISMATCH_NOTICE}`]]);
 assert.match(CONTACT_NUMBER_MISMATCH_NOTICE,/nothing was saved/);
 assert.deepEqual(f.posts.map(post=>[post.path.split('/').at(-1),post.body.decision]),[['decision','reject']]);
 assert.deepEqual(await f.reloaded().pendingReview(context,signal()),[]);
 assert.equal(f.effects,0);
});
