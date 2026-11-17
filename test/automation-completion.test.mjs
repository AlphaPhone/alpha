import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBrowserModule} from './fixtures/browser-source.mjs';
const {automationsCommitted,workflowChanges,workflowViewRefusal}=await loadBrowserModule('apps/app/src/runtime/automation-completion.ts');

const receipt=(kind,overrides={})=>({receiptId:'receipt-'+kind,operation:kind+'.create',resource:{kind,id:'record'},artifacts:[],idempotency:{key:null,replayed:false},observedAt:'2026-11-06T12:00:00.000Z',outcome:'applied',commit:{kind:'durable',id:'commit',committedAt:'2026-11-06T12:00:00.000Z'},...overrides});
const result=(...receipts)=>({success:true,effectReceipts:receipts});

test('an applied durable receipt of every listed kind refreshes the unified list',()=>{
 for(const kind of ['lifeops.definition','lifeops.occurrence','lifeops.scheduled_task','trigger.task','workflow.definition'])assert.equal(automationsCommitted([result(receipt(kind))]),true,kind);
});
test('tentative, failed and unrelated receipts do not refresh it',()=>{
 const {commit,...base}=receipt('trigger.task');
 assert.equal(automationsCommitted([result(receipt('trigger.task',{commit:{kind:'provider_accepted',id:'commit',committedAt:'2026-11-06T12:00:00.000Z'}}))]),false);
 assert.equal(automationsCommitted([result({...base,outcome:'preview'})]),false);
 assert.equal(automationsCommitted([result({...base,outcome:'failed',failure:{code:'refused',retryable:false,acceptance:'rejected'}})]),false);
 assert.equal(automationsCommitted([result(receipt('calendar.event'))]),false);
 assert.equal(automationsCommitted([{success:false,effectReceipts:[receipt('trigger.task')]}]),false);
 assert.equal(automationsCommitted([{success:true}]),false);
 assert.equal(automationsCommitted(undefined),false);
});
test('each workflow a reply saved or changed gives one card entry with its last change',()=>{
 const change=(operation,id='flow')=>receipt('workflow.definition',{receiptId:operation+id,operation,resource:{kind:'workflow.definition',id,version:'v'}});
 for(const [operation,word] of [['workflow.create','Created'],['workflow.modify','Updated'],['workflow.activate','Turned on'],['workflow.deactivate','Paused'],['workflow.restore','Restored'],['workflow.rename','Renamed'],['workflow.remove','Removed'],['workflow.restore_removed','Restored'],['workflow.some_later_operation','Changed']])
  assert.deepEqual(workflowChanges([result(change(operation))]),[{workflowId:'flow',change:word}],operation);
 // Two changes to one workflow in a reply are one card naming the last; another workflow keeps its own.
 assert.deepEqual(workflowChanges([result(change('workflow.create'),change('workflow.create','other')),result(change('workflow.activate'))]),[{workflowId:'other',change:'Created'},{workflowId:'flow',change:'Turned on'}]);
 // A run submission, a prompt, a failed result and an unapplied receipt are not a saved workflow.
 const {commit,...base}=change('workflow.modify');
 assert.deepEqual(workflowChanges([result(receipt('workflow.execution'),receipt('trigger.task'),{...base,outcome:'preview'}),{success:false,effectReceipts:[change('workflow.modify')]},{success:true}]),[]);
 assert.deepEqual(workflowChanges(undefined),[]);
});
test('only a refusal that sends the owner to the Workflows view offers to open it',()=>{
 for(const code of ['WORKFLOW_EDIT_IN_VIEW','WORKFLOW_ACTIVATE_IN_VIEW'])assert.equal(workflowViewRefusal([{success:true,text:'Loaded.'},{success:false,error:code,text:'Nothing was changed.'}]),true,code);
 for(const results of [[{success:false,error:'WORKFLOW_REMOVED'}],[{success:false,error:'WORKFLOW_NOT_FOUND'}],[{success:true,error:'WORKFLOW_EDIT_IN_VIEW'}],[{success:false}],['WORKFLOW_EDIT_IN_VIEW'],[],undefined])assert.equal(workflowViewRefusal(results),false,JSON.stringify(results));
});
