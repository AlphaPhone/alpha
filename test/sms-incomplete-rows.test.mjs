// Mount the product adapter over the real shared client and foreground SMS session.
// The recording native port supplies canonical complete/incomplete provider rows;
// this verifies renderer behavior and read/write effects without a real phone.
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const directory=mkdtempSync(join(tmpdir(),'sms-incomplete-adapter-'));
const bundled=await build({
  entryPoints:[resolve('apps/app/src/prototype/sms-adapter.ts')],bundle:true,
  format:'esm',platform:'node',write:false,
  plugins:[{name:'native-fixture',setup(builder){
    builder.onResolve({filter:/^(\.\.\/platform-plugins|\.\.\/runtime\/aosp-image|\.\/native-adapter)$/},args=>({path:args.path,namespace:'fixture'}));
    builder.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:
      args.path.includes('platform-plugins')?'export const registerPlugin=()=>globalThis.__incompleteSmsPlugin;':
      args.path.includes('aosp-image')?"export const aospImage=true;export const admittedAospViews=()=>['phone','messages','contacts'];":
      'export const watchReturnToApp=()=>()=>{};'}));
  }}],
});
const filename=join(directory,'adapter.mjs');
writeFileSync(filename,bundled.outputFiles[0].text);
process.on('exit',()=>rmSync(directory,{recursive:true,force:true}));
const {installSmsAdapter}=await import(pathToFileURL(filename));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const status={version:2,voiceCapable:true,smsCapable:true,
  permissions:{contacts:'granted',phoneState:'granted',sms:'granted',sendSms:'granted'},sendMode:'direct',
  roles:{dialer:{available:true,held:false,eligible:true},sms:{available:true,held:true,eligible:true}},
  defaultDialer:'com.android.dialer',defaultSms:'ai.elizaresearch.alphaphone',
  subscriptions:[{id:3,slot:0,displayName:'SIM',carrierName:'Carrier',defaultSms:true,defaultVoice:true}],defaultSmsSubscriptionId:3};
const completeThread={id:'thread:1',date:1700000001000,messageCount:2,snippet:'Known preview',unread:true,addresses:['+15555550100']};
const incompleteThread={id:'thread:2',date:1700000002000,incomplete:true,reason:'too-many-addresses'};
const completeMessage={id:'sms:1',kind:'sms',threadId:'thread:1',direction:'incoming',status:'received',date:1700000001000,read:false,subscriptionId:3,addresses:['+15555550100'],body:'Known full text',deliveryReport:null,attachments:0};
const incompleteMessage={id:'mms:2',kind:'mms',threadId:'thread:1',date:1700000002000,incomplete:true,reason:'text-as-attachment'};

async function mount(messages=[],nativeStatus=status){
  const calls=[],previousDocument=globalThis.document,previousPlugin=globalThis.__incompleteSmsPlugin;
  globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};
  globalThis.__incompleteSmsPlugin=new Proxy({},{get:(_,method)=>method==='then'?undefined:async options=>{
    calls.push([method,options]);
    if(method==='status')return nativeStatus;
    if(method==='smsSendHistory')return {receipts:[]};
    if(method==='listThreads')return {threads:[incompleteThread,completeThread],next:null};
    if(method==='listMessages')return {messages,next:null};
    if(method==='markThreadRead')return {defaultSmsApp:true,updated:1};
    if(method==='addListener')return {remove:async()=>{}};
    if(method==='observeMessages')return {};
    throw Error('Unexpected native effect: '+String(method));
  }});
  class Component{view='messages';S(){return {view:this.view};}setState(){}}
  const views={messages:{}};installSmsAdapter(Component,views,{load:async()=>[],save:async()=>{throw Error('Unexpected local draft write');},remove:async()=>{throw Error('Unexpected local draft removal');}});
  const owner=new Component();owner.componentDidMount();await tick();
  return {owner,calls,model:()=>views.messages.render({},{}),async close(){owner.componentWillUnmount();await tick();globalThis.document=previousDocument;globalThis.__incompleteSmsPlugin=previousPlugin;}};
}
const effects=calls=>calls.filter(([method])=>['markThreadRead','sendSms','sendMms','composeSms'].includes(method));

test('incomplete conversations show unavailable copy and cannot open, prefill or mark content read',async()=>{
  const fixture=await mount();
  try{
    let model=fixture.model();
    const thread=model.nativeThreads.find(row=>row.id===incompleteThread.id);
    assert.match(thread.label,/content unavailable/i);assert.match(thread.snippet,/system messaging app/i);
    assert.equal(thread.addresses,undefined);assert.equal(thread.unread,undefined);
    thread.open();await tick();model=fixture.model();
    assert.equal(model.nativeInThread,false);assert.equal(model.nativeRecipients,'');
    assert.match(model.nativeNotice,/Content unavailable.*system messaging app/);
    assert.equal(fixture.calls.some(([method])=>method==='listMessages'),false);
    assert.deepEqual(effects(fixture.calls),[]);
    model.nativeOnRecipients({target:{value:'+15555550199'}});
    model.nativeThreads.find(row=>row.id===incompleteThread.id).open();
    assert.equal(fixture.model().nativeRecipients,'+15555550199','an unavailable conversation preserves the owner draft');
  }finally{await fixture.close();}
});

test('an incomplete message renders an honest placeholder without invented metadata or a read receipt',async()=>{
  const fixture=await mount([incompleteMessage]);
  try{
    fixture.model().nativeThreads.find(row=>row.id===completeThread.id).open();await tick();
    const model=fixture.model(),row=model.nativeRows[0];
    assert.equal(model.nativeInThread,true);assert.equal(model.nativeRecipients,'+15555550100');
    assert.equal(row.id,incompleteMessage.id);assert.equal(row.address,'Content unavailable');
    assert.match(row.body,/system messaging app/i);assert.equal(row.direction,'');assert.ok(row.when);
    for(const field of ['addresses','status','subscriptionId','read','attachments'])assert.equal(row[field],undefined,field+' is unknown');
    assert.deepEqual(effects(fixture.calls),[],'a content-free row is neither shown content nor a send');
  }finally{await fixture.close();}
});

test('complete rows keep their content and reply numbers while incomplete rows cannot advance the read marker',async()=>{
  const fixture=await mount([incompleteMessage,completeMessage]);
  try{
    fixture.model().nativeThreads.find(row=>row.id===completeThread.id).open();await tick();await tick();
    const model=fixture.model(),row=model.nativeRows.find(row=>row.id===completeMessage.id);
    assert.equal(model.nativeRecipients,'+15555550100');assert.equal(row.address,'+15555550100');
    assert.equal(row.body,'Known full text');assert.equal(row.direction,'incoming · SMS · received');assert.equal(row.subscriptionId,3);
    assert.deepEqual(effects(fixture.calls),[['markThreadRead',{threadId:'thread:1',throughDate:completeMessage.date}]],'only the actual complete message bounds the read marker');
    assert.equal(model.nativeBody,'','reading a thread never creates an outgoing text');
  }finally{await fixture.close();}
});


test('agent context uses the only SIM without a hidden chooser; multiple or stale choices stay explicit',async()=>{
 const current=structuredClone(status),single=current.subscriptions[0];
 const fixture=await mount([],current);
 try{
  assert.equal(fixture.model().nativeSims.length,1);
  assert.equal(fixture.owner.smsSelection().id,String(single.id));
  current.subscriptions=[single,{...single,id:4,slot:1,displayName:'Other SIM',defaultSms:false,defaultVoice:false}];
  fixture.model().nativeRefresh();await tick();await tick();
  assert.equal(fixture.owner.smsSelection(),undefined,'multiple SIMs are not guessed');
  fixture.model().nativeSims.find(row=>row.id===4).pick();
  assert.equal(fixture.owner.smsSelection().id,'4','the explicit choice is preserved');
  current.subscriptions=[single];
  fixture.model().nativeRefresh();await tick();await tick();
  assert.equal(fixture.owner.smsSelection(),undefined,'an unavailable explicit choice never falls back to another SIM');
  fixture.owner.view='home';fixture.owner.componentDidUpdate();await tick();
  assert.equal(fixture.owner.smsSelection(),undefined,'a retired Messages view advertises no SIM context');
  assert.deepEqual(effects(fixture.calls),[],'SIM context resolution neither sends nor marks a message read');
 }finally{await fixture.close();}
});
