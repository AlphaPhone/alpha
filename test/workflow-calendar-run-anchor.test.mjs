import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import vm from 'node:vm';
import {resolve} from 'node:path';
import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import {stripTypeScriptTypes} from './support/strip-types.mjs';

const root=resolve(import.meta.dirname,'..');
const run=`
import assert from 'node:assert/strict';
import {WorkflowProtocol} from './apps/app/src/runtime/workflow-protocol.ts';
import {assertWorkflowOperation,workflowSha} from './apps/app/src/runtime/workflow-device-contract.ts';
import {phoneWorkflowRequiredProtocol} from './.eliza/client-features/packages/contracts/src/phone-workflow.ts';

const device={installationId:'phone-x',enrollmentId:'enrollment-x'};
const identity={id:'run-x',workflowId:'workflow-x',versionId:'version-x'};
const signal=new AbortController().signal;
const anchor='2027-03-15T03:55:00.000Z';
const afterMidnight=Date.parse('2027-03-15T04:20:00Z');
const zone='America/New_York';
const relative={calendarIds:['owner-calendar'],days:1,timeZone:zone,maximumEvents:42};
const absolute={calendarIds:relative.calendarIds,start:'2027-03-14T05:00:00.000Z',end:'2027-03-15T04:00:00.000Z',timeZone:zone,maximumEvents:42};
const priorRead={type:'read_calendar_range',...absolute};
const todayRead={...priorRead,start:absolute.end,end:'2027-03-16T04:00:00.000Z'};

async function fetchReview(range,calendarAnchorAt){
 const spec={version:1,name:'Calendar window',description:'',trigger:{kind:'manual'},device,steps:[{id:'read',kind:'Read',operation:'calendar_range',range}]};
 const specDigest=await workflowSha(spec);
 const client=new WorkflowProtocol(async(path,body,received)=>{
  assert.equal(path,'/api/workflow/executions/run-x/phone-review');
  assert.equal(body,undefined);
  assert.equal(received,signal);
  return {runId:identity.id,workflowId:identity.workflowId,versionId:identity.versionId,spec,specDigest,
   status:'waiting-approval',finished:false,cancellationRequestedAt:null,...(calendarAnchorAt===undefined?{}:{calendarAnchorAt})};
 });
 const review=await client.phoneReview(identity,signal);
 return {review,binding:{runId:identity.id,workflowId:identity.workflowId,versionId:identity.versionId,stepId:'read',specDigest}};
}
const anchored=await fetchReview(relative,anchor);
assert.equal(anchored.review.calendarAnchorAt,anchor);
assert.equal(phoneWorkflowRequiredProtocol(anchored.review.spec),5);
assert.equal((Date.parse(absolute.end)-Date.parse(absolute.start))/3600000,23);
assert.doesNotThrow(()=>assertWorkflowOperation(anchored.review,anchored.binding,device,priorRead,afterMidnight));
for(const read of [todayRead,{...priorRead,calendarIds:['foreign-calendar']},{...priorRead,maximumEvents:43}]){
 assert.throws(()=>assertWorkflowOperation(anchored.review,anchored.binding,device,read,afterMidnight));
}
assert.throws(()=>assertWorkflowOperation(anchored.review,anchored.binding,{...device,enrollmentId:'retired'},priorRead,afterMidnight));
await assert.rejects(fetchReview(relative,'2027-03-15'));

const legacy=await fetchReview(relative);
assert.equal(legacy.review.calendarAnchorAt,undefined);
assert.doesNotThrow(()=>assertWorkflowOperation(legacy.review,legacy.binding,device,priorRead,Date.parse('2027-03-15T04:05:00Z')));
assert.throws(()=>assertWorkflowOperation(legacy.review,legacy.binding,device,priorRead,afterMidnight));
const fixed=await fetchReview(absolute);
assert.equal(phoneWorkflowRequiredProtocol(fixed.review.spec),1);
assert.doesNotThrow(()=>assertWorkflowOperation(fixed.review,fixed.binding,device,priorRead,afterMidnight));
assert.throws(()=>assertWorkflowOperation(fixed.review,fixed.binding,device,todayRead,afterMidnight));
const fall=await fetchReview({...relative,days:7},'2027-11-06T12:00:00.000Z');
const fallRead={...priorRead,start:'2027-11-06T04:00:00.000Z',end:'2027-11-13T05:00:00.000Z'};
assert.equal((Date.parse(fallRead.end)-Date.parse(fallRead.start))/3600000,169);
assert.doesNotThrow(()=>assertWorkflowOperation(fall.review,fall.binding,device,fallRead,Date.parse('2027-11-08T12:00:00Z')));
console.log('PASS anchored, legacy and fixed Calendar review');
`;
test('the pinned shared contract checks a Calendar read against the persisted run day across midnight and DST',()=>{
 assert.match(execFileSync(process.execPath,['-e',run],{
  cwd:root,encoding:'utf8',timeout:scaledTimeout(60000),
 }),/^PASS anchored, legacy and fixed Calendar review/);
});

// Alpha's own approval path: the real workflow adapter reviews the phone step and, at confirmation,
// re-reads the review and executes only when the agent still reports the reviewed run anchor.
const {workflowRendererFixture}=await import('../scripts/workflow-renderer-fixture.ts');
const {WorkflowProtocol,WorkflowAdmissionRejected,WorkflowMetadataRejected,WorkflowLifecycleRejected}=await import('../apps/app/src/runtime/workflow-protocol.ts');
const {resolveWorkflowTap,readyTapStep,tapRecheck,assertWorkflowOperation,workflowSha}=await import('../apps/app/src/runtime/workflow-device-contract.ts');
const adapterSource=fs.readFileSync(resolve(root,'apps/app/src/prototype/workflow-adapter.ts'),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function')+'\nglobalThis.install=installWorkflowAdapter;';
const session={sessionId:'session',origin:'https://synthetic.invalid',ownerId:'owner',agentId:'agent'};
const device={installationId:'phone-x',enrollmentId:'enrollment-x'};
const zone='America/New_York';
// New York midnight is 04:00Z on 2027-03-15. The run started four minutes before it; the owner confirms twenty
// minutes after it, past the 15-minute grace an unanchored (legacy) review allows.
const runAnchor='2027-03-15T03:56:00.000Z';
const afterMidnight=Date.parse('2027-03-15T04:20:00Z');
const relative={calendarIds:['owner-calendar'],days:1,timeZone:zone,maximumEvents:42};
const runDayRead={type:'read_calendar_range',calendarIds:relative.calendarIds,start:'2027-03-14T05:00:00.000Z',end:'2027-03-15T04:00:00.000Z',timeZone:zone,maximumEvents:42};
const spec={version:1,name:'Calendar window',description:'',trigger:{kind:'manual'},device,steps:[{id:'read',kind:'Read',operation:'calendar_range',range:relative}]};
const workflow={id:'flow',name:'Calendar window',description:'',versionId:'v1',active:true,removed:false,steps:[{label:'Read',description:'Read Calendar'}]};
const execution={id:'run',workflowId:'flow',versionId:'v1',status:'waiting-approval',finished:false,startedAt:runAnchor,events:[]};
const tap={token:'tap-1',operationId:'op',bindingHash:'hash',scope:'scope',origin:session.origin,ownerId:session.ownerId,agentId:session.agentId,workflowId:'flow',runId:'run',versionId:'v1',retained:true};
const binding={runId:'run',workflowId:'flow',versionId:'v1',stepId:'read'};

async function anchoredAdapter(){
 const specDigest=await workflowSha(spec),agent={anchor:runAnchor,reviews:0},effects={checked:[],executed:[],rejected:[]};
 // The agent's phone review, parsed by Alpha's WorkflowProtocol client.
 const reviews=new WorkflowProtocol(async path=>{
  assert.equal(path,'/api/workflow/executions/run/phone-review');agent.reviews++;
  return {runId:'run',workflowId:'flow',versionId:'v1',spec,specDigest,calendarAnchorAt:agent.anchor,status:'waiting-approval',finished:false,cancellationRequestedAt:null};
 });
 const proposal={id:'proposal-read',title:'read calendar',description:'Read Calendar',expiresAt:Date.now()+3600000,operation:runDayRead,workflow:{...binding,specDigest}};
 const client={
  lifecycleSupported:async()=>false,supportsSubmissionReconciliation:async()=>false,
  list:async()=>[workflow],removedWorkflows:async()=>[],detail:async()=>({...workflow}),executions:async()=>[],
  receipt:async()=>({...execution}),approvals:async()=>null,reconcile:async()=>null,
  phoneReview:(run,signal)=>reviews.phoneReview(run,signal),
 };
 let view='settings',pendingTap={...tap};
 const toasts=[],listeners=new Set(),tapListeners=new Set(),storage={};
 const native={
  pendingWorkflowTap:async()=>pendingTap?{...pendingTap}:{},
  consumeWorkflowTap:async()=>{pendingTap=null;},
  addListener:async(_event,listener)=>{tapListeners.add(listener);return {remove(){tapListeners.delete(listener);}};},
 };
 const localStorage={getItem:key=>storage[key]??null,setItem:(key,value)=>{storage[key]=value;},removeItem:key=>{delete storage[key];}};
 class Shell{live=true;renderVals(){return {};}componentDidMount(){}componentWillUnmount(){}componentDidUpdate(){}S(){return {view};}vset(){}vget(){return {};}api(){return api;}openView(next){view=next;}toast(message){toasts.push(message);}}
 const api={isActive:()=>true,track:()=>'',kx:()=>0,toast:message=>toasts.push(message),ic:{clock:'',check:''}};
 const views={workflows:{automationsManaged:true}};
 const controller={
  getWorkflowClient:()=>({sessionId:session.sessionId,scope:'scope',client}),
  getSnapshot:()=>({session,open:false,busy:false,startupResolved:true}),
  subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},open(){},
  workflowNoticeActions:async()=>[],getWorkflowDeviceTarget:()=>device,
  // The device check the shared coordinator applies to each issued proposal, here at the confirmation time.
  workflowPhoneActions:async review=>{assertWorkflowOperation(review,{...binding,specDigest},device,runDayRead,afterMidnight);effects.checked.push(review.calendarAnchorAt);return [proposal];},
  execute:async issued=>{effects.executed.push(issued.id);return {summary:'Calendar read'};},
  rejectWorkflowPhoneAction:async id=>{effects.rejected.push(id);},
 };
 const alphaClient={getState:()=>({context:{view:'workflows',sensitive:false,selectedObject:{kind:'workflow-run',id:'run',revision:'v1'}}})};
 const context=workflowRendererFixture({WorkflowAdmissionRejected,WorkflowMetadataRejected,WorkflowLifecycleRejected,resolveWorkflowTap,readyTapStep,tapRecheck,
  Capacitor:{isNativePlatform:()=>true,getPlatform:()=>'android'},connectionController:controller,localStorage,queueMicrotask,AbortController,Date,console,structuredClone});
 // The run is open in the foreground Workflows view, the only context a phone step is reviewed from.
 context.alphaClient=alphaClient;
 context.registerPlugin=name=>name==='AlphaNotifications'?native:new Proxy({},{get:()=>async()=>({})});
 vm.runInNewContext(stripTypeScriptTypes(adapterSource,{mode:'strip'}),context);
 context.install(Shell,views);const shell=new Shell();shell.componentDidMount();
 const run=()=>views.workflows.render({},api).r;
 return {agent,effects,toasts,run,close:()=>shell.componentWillUnmount()};
}
const settle=async(fn,label)=>{for(let count=0;count<400;count++){if(fn())return;await new Promise(done=>setTimeout(done,5));}throw Error(label);};
async function reviewed(app){
 await settle(()=>app.run(),'The tapped run did not open.');
 app.run().phoneReview();
 await settle(()=>app.run()?.phoneSteps.length===1&&!app.run().phoneBusy,'The phone step was not reviewed.');
 assert.deepEqual(app.effects.checked,[runAnchor]);
}
const confirm=async(app,decision)=>{app.run().phoneSteps[0][decision]();app.run().phoneSteps[0][decision]();await settle(()=>app.agent.reviews===2&&!app.run().phoneBusy,'The confirmation did not re-read the review.');};

test('Alpha confirms a run-day Calendar read after midnight only at the reviewed run anchor',async()=>{
 const app=await anchoredAdapter();
 try{
  await reviewed(app);
  await confirm(app,'approve');
  assert.deepEqual(app.effects.executed,['proposal-read']);
  assert.equal(app.run().phoneStatus,'Calendar read');
 }finally{app.close();}
 // The same read is refused without the anchor: past the grace, the run day is no longer "today".
 const specDigest=await workflowSha(spec);
 assert.throws(()=>assertWorkflowOperation({runId:'run',workflowId:'flow',versionId:'v1',spec,specDigest,status:'waiting-approval',finished:false,cancellationRequestedAt:null},{...binding,specDigest},device,runDayRead,afterMidnight));
});

for(const decision of ['approve','deny'])test(`Alpha never sends a ${decision} when the agent's run anchor changed after review`,async()=>{
 const app=await anchoredAdapter();
 try{
  await reviewed(app);
  app.agent.anchor='2027-03-15T04:19:00.000Z';
  await confirm(app,decision);
  assert.deepEqual(app.effects.executed,[]);
  assert.deepEqual(app.effects.rejected,[]);
  assert.equal(app.run().phoneStatus,'The workflow run time changed. Review the device actions again.');
  assert.equal(app.run().phoneSteps.length,0);
 }finally{app.close();}
});
