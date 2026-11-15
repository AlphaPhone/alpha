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
      args.path.includes('platform-plugins')?'export const registerPlugin=name=>name==="AlphaContacts"?globalThis.__smsRecipientContacts:globalThis.__incompleteSmsPlugin;':
      args.path.includes('aosp-image')?'export const aospImage=true;':
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
  defaultDialer:'com.android.dialer',defaultSms:'ai.alphacompute.alphaphone',
  subscriptions:[{id:3,slot:0,displayName:'SIM',carrierName:'Carrier',defaultSms:true,defaultVoice:true}],defaultSmsSubscriptionId:3};
const completeThread={id:'thread:1',date:1700000001000,messageCount:2,snippet:'Known preview',unread:true,addresses:['+15555550100']};
const incompleteThread={id:'thread:2',date:1700000002000,incomplete:true,reason:'too-many-addresses'};
const completeMessage={id:'sms:1',kind:'sms',threadId:'thread:1',direction:'incoming',status:'received',date:1700000001000,read:false,subscriptionId:3,addresses:['+15555550100'],body:'Known full text',deliveryReport:null,attachments:0};
const incompleteMessage={id:'mms:2',kind:'mms',threadId:'thread:1',date:1700000002000,incomplete:true,reason:'text-as-attachment'};

async function mount(messages=[],nativeStatus=status,book,store){
  const calls=[],previousDocument=globalThis.document,previousPlugin=globalThis.__incompleteSmsPlugin;
  const previousBook=globalThis.__smsRecipientContacts;
  const previousWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
  globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};
  globalThis.window=new EventTarget();
  globalThis.__smsRecipientContacts=book;
  globalThis.__incompleteSmsPlugin=new Proxy({},{get:(_,method)=>method==='then'?undefined:async options=>{
    calls.push([method,options]);
    if(method==='status')return nativeStatus;
    if(method==='smsNoticePending')return {};
    if(method==='smsSendHistory')return {receipts:[]};
    if(method==='listThreads')return {threads:[incompleteThread,completeThread],next:null};
    if(method==='listMessages')return {messages,next:null};
    if(method==='markThreadRead')return {defaultSmsApp:true,updated:1};
    if(method==='addListener')return {remove:async()=>{}};
    if(method==='observeMessages')return {};
    throw Error('Unexpected native effect: '+String(method));
  }});
  class Component{view='messages';S(){return {screen:'home',view:this.view};}setState(){}}
  const restore=()=>{
    globalThis.document=previousDocument;globalThis.__incompleteSmsPlugin=previousPlugin;globalThis.__smsRecipientContacts=previousBook;
    if(previousWindow)Object.defineProperty(globalThis,'window',previousWindow);
    else delete globalThis.window;
  };
  const views={messages:{}};installSmsAdapter(Component,views,store);
  const owner=new Component();
  try{owner.componentDidMount();await tick();}
  catch(error){restore();throw error;}
  return {owner,calls,model:()=>views.messages.render({},{}),async close(){try{owner.componentWillUnmount();await tick();}finally{restore();}}};
}
const effects=calls=>calls.filter(([method])=>['markThreadRead','sendSms','sendMms','composeSms'].includes(method));
const contact=(id,name,phones)=>({id,lookup:'lookup-'+id,name,revision:'1',starred:false,phones,emails:['private@example.invalid']});

test('native Messages pages Contacts and retains only the selected number with its draft',async()=>{
  const reads=[];
  const records=new Map();
  const store={
    async readRaw(slot){return records.get(slot)??null;},
    async compareExchangeRaw(slot,expected,value){
      if((records.get(slot)??null)!==expected)return {status:'conflict'};
      if(value===null)records.delete(slot);
      else records.set(slot,value);
      return {status:'saved'};
    },
  };
  let readable=false;
  const book={
    async status(){reads.push('status');return {available:true,readable,writable:false};},
    async requestPermissions(){reads.push('request');readable=true;return {available:true,readable,writable:false};},
    async list(input){
      reads.push(input);
      if(input.query==='Lee'&&!input.cursor)return {contacts:[contact('2','Lee',['(415) 555-0123','bad'])],more:true,next:'opaque:Lee'};
      if(input.cursor)return {contacts:[contact('3','Lee Home',['+14155550124']),{id:'4',incomplete:true,reason:'too-many-fields'}],more:false};
      return {contacts:[contact('1','Other',['+14155550125'])],more:false};
    },
  };
  const fixture=await mount([],status,book,store);
  try{
    fixture.model().compose();await tick();
    fixture.model().nativeOnRecipients({target:{value:'+15555550199'}});
    fixture.model().nativeOnBody({target:{value:'Leave my draft here'}});
    assert.deepEqual(reads,[]);
    fixture.model().toggleContacts();await tick();
    assert.equal(fixture.model().contacts.needsAccess,true);
    assert.deepEqual(reads,['status']);
    fixture.model().contacts.allow();await tick();
    assert.equal(reads.filter(value=>value==='request').length,1);
    fixture.model().contacts.onQuery({target:{value:'Lee'}});
    fixture.model().contacts.search();await tick();
    assert.deepEqual(fixture.model().contacts.choices.map(row=>row.name),['Lee']);
    fixture.model().contacts.loadMore();await tick();
    assert.deepEqual(reads.at(-1),{query:'Lee',limit:50,cursor:'opaque:Lee'});
    assert.deepEqual(fixture.model().contacts.choices.map(row=>row.name),['Lee','Lee Home']);
    fixture.model().contacts.choices[1].pick();
    assert.equal(fixture.model().contactsOpen,false);
    assert.equal(fixture.model().nativeRecipients,'+15555550199, +14155550124');
    assert.equal(fixture.model().nativeBody,'Leave my draft here');
    assert.deepEqual(effects(fixture.calls),[]);
    await fixture.owner.flushMessagesForAppUpdate(()=>true);
    const saved=JSON.parse(records.get('sms-draft:v1:new'));
    assert.equal(saved.recipients,'+15555550199, +14155550124');
    assert.equal(saved.body,'Leave my draft here');
    assert.equal(saved.operation,null);
    assert.doesNotMatch(JSON.stringify(saved),/Lee|private@example/);
  }finally{await fixture.close();}
  const restored=await mount([],status,book,store);
  try{
    const previousReads=reads.length;
    restored.model().compose();await tick();
    assert.equal(restored.model().nativeRecipients,'+15555550199, +14155550124');
    assert.equal(restored.model().nativeBody,'Leave my draft here');
    assert.equal(reads.length,previousReads,'restoring a draft never rereads Contacts');
    assert.deepEqual(effects(restored.calls),[]);
  }finally{await restored.close();}
});

test('native Messages drops stale Contacts reads and selections on newer queries and close',async()=>{
  let settle;
  const book={
    async status(){return {available:true,readable:true,writable:false};},
    async list(input){
      if(!input.query)return new Promise(resolve=>{settle=resolve;});
      return {contacts:[contact('2','Current',['+14155550123'])],more:false};
    },
  };
  const fixture=await mount([],status,book);
  try{
    fixture.model().compose();fixture.model().toggleContacts();await tick();
    const pending=settle;
    fixture.model().contacts.onQuery({target:{value:'Current'}});
    fixture.model().contacts.search();await tick();
    pending({contacts:[contact('1','Stale',['+14155550129'])],more:false});await tick();
    assert.deepEqual(fixture.model().contacts.choices.map(row=>row.name),['Current']);
    const stalePick=fixture.model().contacts.choices[0].pick;
    fixture.model().closeNew();stalePick();
    assert.equal(fixture.model().contactsOpen,false);
    assert.equal(fixture.model().showNew,true);
    assert.equal(fixture.model().nativeRecipients,'');
    fixture.model().toggleContacts();await tick();
    fixture.owner.view='home';fixture.owner.componentDidUpdate();
    settle({contacts:[contact('3','After Home',['+14155550128'])],more:false});await tick();
    assert.equal(fixture.model().contactsOpen,false);
    assert.deepEqual(effects(fixture.calls),[]);
  }finally{await fixture.close();}
});

test('agent context uses the sole current SIM and respects explicit choices',async()=>{
  const nativeStatus=structuredClone(status),single=nativeStatus.subscriptions[0];
  const fixture=await mount([],nativeStatus);
  try{
    assert.equal(fixture.owner.smsSelection()?.id,String(single.id));
    nativeStatus.subscriptions=[single,{...single,id:4,slot:1,defaultSms:false,defaultVoice:false}];
    fixture.model().nativeRefresh();await tick();
    assert.equal(fixture.owner.smsSelection(),undefined);
    fixture.model().nativeSims.find(row=>row.id===4).pick();
    assert.equal(fixture.owner.smsSelection()?.id,'4');
    nativeStatus.subscriptions=[single];
    fixture.model().nativeRefresh();await tick();
    assert.equal(fixture.owner.smsSelection(),undefined);
    fixture.owner.view='home';fixture.owner.componentDidUpdate();await tick();
    assert.equal(fixture.owner.smsSelection(),undefined);
    assert.deepEqual(effects(fixture.calls),[]);
  }finally{await fixture.close();}
});

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
    assert.equal(row.body,'');assert.equal(row.direction,'');assert.ok(row.when);
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
