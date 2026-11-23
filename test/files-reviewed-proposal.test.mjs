import test from 'node:test';
import assert from 'node:assert/strict';
import {tsImport} from './support/ts-import.mjs';

const {DeviceActions,setFilesReviewIdentity,setFilesShownPaths}=await tsImport('../apps/app/src/runtime/device-actions.ts',import.meta.url);

const context={view:'files',revision:1,sensitive:false};
const token=letter=>letter.repeat(43);
const signal=()=>new AbortController().signal;
function fixture(operation={type:'files_move',paths:['Download/reviewed.txt'],dest:'Documents',reviewed:[token('x')]},capabilities=['files.browser.v1']){
 let state='pending',entry,dispatched;
 const id='files-review',digest='b'.repeat(64),expiresAt=new Date(Date.now()+60000).toISOString();
 const proposal=()=>({id,digest,state,subjectUserId:'owner',requestedBy:'agent',action:'device_action',expiresAt,
  payload:{version:1,action:'device_action',installationId:'device',enrollmentId:'enrollment',
   operation},
  execution:state==='executing'?{attemptId:'attempt-one'}:undefined});
 const request=async(path,body)=>{
  if(body===undefined)return {proposals:[proposal()]};
  if(path.endsWith('/decision'))state='approved';
  if(path.endsWith('/claim'))state='executing';
  return {proposal:proposal(),digest};
 };
 const journal={reserve:async input=>({created:true,entry:entry={...input,phase:'reserved'}}),
  markApplying:async input=>Object.assign(entry,{phase:'applying',attemptId:input.attemptId}),
  finish:async input=>Object.assign(entry,input,{phase:'terminal'}),get:async()=>({entry}),list:async()=>({entries:entry?[entry]:[]})};
 const client=new DeviceActions({ownerId:'owner',agentId:'agent',origin:'https://agent.invalid',sessionId:'session'},
  {installationId:'device',enrollmentId:'enrollment',key:'a'.repeat(64),capabilities},
  'c'.repeat(64),request,journal,async operation=>{dispatched=operation;return {status:'succeeded',summary:'Synthetic receipt'};});
 return {id,client,get entry(){return entry},get dispatched(){return dispatched}};
}

test('refresh keeps the originally reviewed token and the journal records that token',async()=>{
 const f=fixture();let identity=token('a'),reads=0;
 setFilesReviewIdentity(async()=>{reads++;return [identity];});
 assert.ok((await f.client.pendingReview(context,signal()))[0].proposal);
 identity=token('b');
 assert.ok((await f.client.pendingReview(context,signal()))[0].proposal);
 assert.equal(reads,1,'Refreshing the same proposal cannot bind a replacement');
 const approved=await f.client.approve(f.id,context,signal());
 assert.equal(approved.status,'succeeded');
 assert.deepEqual(f.dispatched.reviewed,[token('a')]);
 assert.deepEqual(f.entry.record.operation.reviewed,[token('a')]);
 assert.equal(f.entry.phase,'terminal');
});

test('an unbound Files proposal cannot be approved or written to the journal',async()=>{
 const f=fixture();setFilesReviewIdentity(async()=>{throw Error('File missing');});
 const items=await f.client.pendingReview(context,signal());
 assert.equal(items[0].proposal,null);
 await assert.rejects(f.client.approve(f.id,context,signal()),/Review this action again/);
 assert.equal(f.entry,undefined);assert.equal(f.dispatched,undefined);
});

test('a phone with base Files access keeps unbound result positions out of approval and execution',async()=>{
 for(const operation of [{type:'files_share',shown:[1]},{type:'files_move',shown:[1],dest:'Documents'},{type:'files_trash',shown:[1]}]){
   const f=fixture(operation);
   assert.deepEqual(await f.client.list(signal()),[]);
   assert.deepEqual(await f.client.pendingReview(context,signal()),[
     {proposal:null,notice:"This action isn't available on this phone."},
   ]);
   await assert.rejects(f.client.approve(f.id,context,signal()));
   assert.equal(f.entry,undefined);
   assert.equal(f.dispatched,undefined);
 }
});

const shownCapabilities=['files.browser.v1','files.shown-target.v1'];
test('a share of shown items is reviewed as the files Files shows, and a refresh keeps them (FILE-04)',async()=>{
 const f=fixture({type:'files_share',shown:[2,1]},shownCapabilities);let rows=['Download/b.pdf','Download/a.pdf'],reads=0;
 setFilesShownPaths(async shown=>{reads++;return shown.map(n=>rows[n-1]);});
 const [first]=await f.client.pendingReview(context,signal());
 assert.equal(first.proposal.title,'Share 2 items');
 assert.equal(first.proposal.description,'a.pdf, b.pdf','The card names the files, not the positions');
 rows=['Download/other.pdf','Download/else.pdf'];
 const [again]=await f.client.pendingReview(context,signal());
 assert.equal(again.proposal.description,'a.pdf, b.pdf');
 assert.equal(reads,1,'A refresh cannot point the card at other files');
 assert.equal((await f.client.approve(f.id,context,signal())).status,'succeeded');
 assert.deepEqual(f.dispatched,{type:'files_share',paths:['Download/a.pdf','Download/b.pdf']});
 assert.deepEqual(f.entry.record.operation,f.dispatched);
});

test('a trash of shown items resolves its paths, then binds each identity (FILE-04)',async()=>{
 const f=fixture({type:'files_trash',shown:[1]},shownCapabilities);let identityReads;
 setFilesShownPaths(async()=>['Download/a.pdf']);
 setFilesReviewIdentity(async paths=>{identityReads=paths;return [token('a')];});
 assert.equal((await f.client.pendingReview(context,signal()))[0].proposal.description,'a.pdf');
 assert.deepEqual(identityReads,['Download/a.pdf']);
 assert.equal((await f.client.approve(f.id,context,signal())).status,'succeeded');
 assert.deepEqual(f.dispatched,{type:'files_trash',paths:['Download/a.pdf'],reviewed:[token('a')]});
});

test('a shown position Files does not show leaves no card and nothing to approve (FILE-04)',async()=>{
 for(const resolved of [async()=>{throw Error('Files does not show that item');},async()=>['Download/a.pdf']]){
  const f=fixture({type:'files_share',shown:[1,2]},shownCapabilities);setFilesShownPaths(resolved);
  const [item]=await f.client.pendingReview(context,signal());
  assert.equal(item.proposal,null);assert.equal(item.notice,'Share 2 items: These files are not in Files.');
  await assert.rejects(f.client.approve(f.id,context,signal()),/Review this action again/);
  assert.equal(f.entry,undefined);assert.equal(f.dispatched,undefined);
 }
});

test('shown items need files.shown-target.v1 negotiated (FILE-04)',async()=>{
 const f=fixture({type:'files_share',shown:[1]});let reads=0;
 setFilesShownPaths(async()=>{reads++;return ['Download/a.pdf'];});
 const [item]=await f.client.pendingReview(context,signal());
 assert.equal(item.proposal,null);assert.equal(reads,0);
 assert.equal(f.dispatched,undefined);
});
