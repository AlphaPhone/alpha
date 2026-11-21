import test from 'node:test';import assert from 'node:assert/strict';
// Photos view agent tools. Source-level: the phone
// consumer tests of the shared Photos view leaf and of Alpha's Photos review card.
const m=await import('../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/photos-view-contract.ts');
const {LIBRARY_LIMITS}=await import('../apps/app/src/runtime/photo-library.ts');
const {describePhotosViewOperation}=await import('../apps/app/src/ui/photos/photos-view-presentation.ts');
const id=(n,kind='i')=>`lib:${kind}:${n}:${n*10}`;
const ids=count=>Array.from({length:count},(_,i)=>id(i+1));
const v=m.validatePhotosViewOperation;

test('types, direct types, albums and capability',()=>{
  assert.equal(m.PHOTOS_VIEW_CAPABILITY,'photos.view.v1');
  assert.deepEqual([...m.PHOTOS_VIEW_TYPES],['photos_filter','photos_open','photos_album_create','photos_share']);
  assert.deepEqual([...m.PHOTOS_VIEW_DIRECT_TYPES],['photos_filter','photos_open']);
  assert.deepEqual([...m.PHOTOS_FILTER_ALBUMS],['favorites','videos','camera','screenshots']);
  for(const type of m.PHOTOS_VIEW_TYPES)assert.equal(m.isPhotosViewOperation({type}),true);
  for(const value of [{type:'photo_library_select'},{type:'photos_trash'},null,'photos_open'])assert.equal(m.isPhotosViewOperation(value),false);
  assert.equal(m.photosViewCapabilityAvailable(['photos.library.v1','photos.view.v1']),true);
  for(const caps of [['photos.library.v1'],['photos.view.v1'],[],undefined])assert.equal(m.photosViewCapabilityAvailable(caps),false);
  assert.throws(()=>v({type:'photos_trash',ids:[id(1)]}),/Unsupported Photos operation/);
  assert.throws(()=>v([]),/Invalid Photos operation/);
});

test('photos_filter validation',()=>{
  assert.deepEqual(v({type:'photos_filter'}),{type:'photos_filter'});
  const full={type:'photos_filter',from:0,to:1_700_000_000_000,kind:'video',favorite:false,album:'custom:trip_2026-a',text:'beach'};
  assert.deepEqual(v(full),full);
  for(const album of m.PHOTOS_FILTER_ALBUMS)assert.deepEqual(v({type:'photos_filter',album}),{type:'photos_filter',album});
  assert.equal(v({type:'photos_filter',text:'x'.repeat(LIBRARY_LIMITS.query)}).text.length,LIBRARY_LIMITS.query);
  for(const from of [-1,1.5,'1',Number.MAX_SAFE_INTEGER+1,Number.NaN])assert.throws(()=>v({type:'photos_filter',from}),/Invalid filter date/);
  assert.throws(()=>v({type:'photos_filter',from:2,to:1}),/Invalid filter date range/);
  assert.throws(()=>v({type:'photos_filter',kind:'all'}),/Invalid filter kind/);
  assert.throws(()=>v({type:'photos_filter',favorite:'yes'}),/Invalid favorites filter/);
  for(const album of ['Favorites','custom:','custom:a b',`custom:${'a'.repeat(81)}`,3])assert.throws(()=>v({type:'photos_filter',album}),/Invalid filter album/);
  for(const text of ['x'.repeat(LIBRARY_LIMITS.query+1),'a\nb','a\u007f',7])assert.throws(()=>v({type:'photos_filter',text}),/Invalid filter text/);
  assert.throws(()=>v({type:'photos_filter',favorites:true}),/Unexpected Photos field/);
});

test('photos_open, photos_album_create and photos_share validation',()=>{
  assert.deepEqual(v({type:'photos_open',id:id(4,'v')}),{type:'photos_open',id:id(4,'v')});
  for(const bad of ['4','lib:x:1:1','m:external:i:1',undefined])assert.throws(()=>v({type:'photos_open',id:bad}),/Invalid library id/);
  assert.throws(()=>v({type:'photos_open',id:id(1),ids:[]}),/Unexpected Photos field/);
  assert.deepEqual(v({type:'photos_album_create',name:'  Trip  ',ids:[id(1)]}),{type:'photos_album_create',name:'Trip',ids:[id(1)]});
  assert.equal(v({type:'photos_album_create',name:'a'.repeat(80),ids:[id(1)]}).name,'a'.repeat(80));
  assert.equal(v({type:'photos_album_create',name:'All',ids:ids(LIBRARY_LIMITS.kept)}).ids.length,LIBRARY_LIMITS.kept);
  for(const name of ['','   ','a'.repeat(81),'a\tb',1,undefined])assert.throws(()=>v({type:'photos_album_create',name,ids:[id(1)]}),/Choose an album name between 1 and 80 characters/);
  for(const bad of [[],[id(1),id(1)],['x'],ids(LIBRARY_LIMITS.kept+1),'x'])assert.throws(()=>v({type:'photos_album_create',name:'Trip',ids:bad}),/Invalid album items/);
  assert.deepEqual(v({type:'photos_share',ids:[id(1),id(2,'v')]}),{type:'photos_share',ids:[id(1),id(2,'v')]});
  assert.equal(v({type:'photos_share',ids:ids(100)}).ids.length,100);
  for(const bad of [[],[id(1),id(1)],['x'],ids(101)])assert.throws(()=>v({type:'photos_share',ids:bad}),/Invalid share items/);
  assert.throws(()=>v({type:'photos_share',ids:[id(1)],target:'mail'}),/Unexpected Photos field/);
});

test('review text is short and names Photos',()=>{
  const d=describePhotosViewOperation;
  assert.deepEqual(d({type:'photos_filter'}),{title:'Filter Photos',description:'Everything'});
  assert.deepEqual(d({type:'photos_filter',kind:'video',favorite:true,album:'camera',text:'beach',from:1}),{title:'Filter Photos',description:'Videos · Favorites · In Camera · “beach” · In the requested dates'});
  assert.deepEqual(d({type:'photos_open',id:id(1)}),{title:'Open photo',description:''});
  assert.equal(d({type:'photos_open',id:id(1,'v')}).title,'Open video');
  assert.deepEqual(d({type:'photos_album_create',name:'Trip',ids:[id(1),id(2)]}),{title:'Create album “Trip”',description:'2 items'});
  assert.deepEqual(d({type:'photos_share',ids:[id(1)]}),{title:'Share 1 item',description:"Android share sheet"});
  // The open-item target (photos.view-selected.v1) names no ids; the card says so instead of a count.
  assert.deepEqual(d({type:'photos_album_create',name:'Trip',ids:[],selected:true}),{title:'Create album “Trip”',description:'The open item'});
  assert.deepEqual(d({type:'photos_share',ids:[],selected:true}),{title:'Share the open item',description:"Android share sheet"});
});

test('results are validated exactly',()=>{
  const r=m.validatePhotosViewResult,filter={type:'photos_filter'},open={type:'photos_open',id:id(1)};
  assert.deepEqual(r(filter,{kind:'photos_filter',shown:0,more:false}),{kind:'photos_filter',shown:0,more:false});
  for(const bad of [{kind:'photos_filter',shown:-1,more:false},{kind:'photos_filter',shown:1.5,more:false},{kind:'photos_filter',shown:1},{kind:'photos_filter',shown:1,more:true,items:[]},{kind:'photos_open',opened:true},null])assert.throws(()=>r(filter,bad));
  assert.deepEqual(r(open,{kind:'photos_open',opened:false}),{kind:'photos_open',opened:false});
  assert.throws(()=>r(open,{kind:'photos_open',opened:1}),/Invalid photos open result/);
  for(const op of [{type:'photos_album_create',name:'Trip',ids:[id(1),id(2)]},{type:'photos_share',ids:[id(1),id(2)]}]){
    const row={kind:op.type,status:'review_opened',count:1,missing:1};
    assert.deepEqual(r(op,row),row);
    for(const bad of [{...row,count:0,missing:2},{...row,count:2,missing:1},{...row,status:'done'},{...row,ids:[]}])assert.throws(()=>r(op,bad));
  }
});

test('review only in Photos on the unlocked phone',()=>{
  assert.equal(m.photosViewContextAllowed({view:'photos'}),true);
  assert.equal(m.photosViewContextAllowed({view:'photos',sensitive:true}),false);
  assert.equal(m.photosViewContextAllowed({view:'home'}),false);
});

test('Alpha\'s coordinator accepts the open-item target only with photos.view-selected.v1',async()=>{
  const {tsImport}=await import('./support/ts-import.mjs');
  const {DeviceActionCoordinator}=await tsImport(new URL('../apps/app/src/ui/device-actions/client-coordinator.ts',import.meta.url).pathname,import.meta.url);
  assert.equal(m.PHOTOS_SELECTED_CAPABILITY,'photos.view-selected.v1');
  const session={ownerId:'owner-1',agentId:'agent-1',sessionId:'session-1',origin:'https://agent.example'},identity={installationId:'installation-1',enrollmentId:'enrollment-1'};
  const coordinator=capabilities=>new DeviceActionCoordinator({session,scope:'test',credential:{...identity,capabilities},
    profile:{assistantName:'Alpha',operations:{admitView:()=>true,parseWorkflowRead:()=>{throw Error('no workflow reads');}},workflow:{parseBinding:()=>{throw Error('no workflow');}}}});
  const proposal=operation=>({id:'11111111-1111-4111-8111-111111111111',subjectUserId:session.ownerId,requestedBy:session.agentId,action:'device_action',
    digest:'a'.repeat(64),state:'pending',expiresAt:new Date(Date.now()+60_000).toISOString(),payload:{action:'device_action',version:1,...identity,operation}});
  const view=['photos.library.v1','photos.view.v1'];
  for(const operation of [{type:'photos_share',ids:[],selected:true},{type:'photos_album_create',name:'Trip',ids:[],selected:true}]){
    assert.throws(()=>coordinator(view).parse(proposal(operation)),/Photos actions were not negotiated/,operation.type);
    assert.deepEqual(coordinator([...view,m.PHOTOS_SELECTED_CAPABILITY]).parse(proposal(operation)).operation,operation,operation.type);
    assert.throws(()=>coordinator(['photos.library.v1',m.PHOTOS_SELECTED_CAPABILITY]).parse(proposal(operation)),/Photos actions were not negotiated/,'the open-item form still needs the view capability');
  }
  // Library ids need only the view capability.
  assert.deepEqual(coordinator(view).parse(proposal({type:'photos_share',ids:[id(1)]})).operation,{type:'photos_share',ids:[id(1)]});
});
