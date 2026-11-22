import test from 'node:test';
import assert from 'node:assert/strict';
import {policyFixture as fixture} from './fixtures/device-action-policy.mjs';
import {imageNativeViewDeclarationsJson,nativeViewDeclarationsJson} from '../scripts/native-view-policy.ts';
import {upstreamViews} from './fixtures/upstream-view-registry.mjs';
test('only current-request proposals execute; old, unbound and workflow stay pending',async()=>{const f=fixture([['old','previous'],['unbound',undefined],['current','request'],['workflow','request',{}]]);await f.performRequested('request',{},new AbortController().signal,async()=>true);assert.deepEqual(f.calls,['current']);});
test('ask-first preference executes nothing',async()=>{const f=fixture([['current','request']]);await f.performRequested('request',{},new AbortController().signal,async()=>false);assert.deepEqual(f.calls,[]);});
test('preference is rechecked before each action',async()=>{const f=fixture([['one','request'],['two','request']]);let n=0;await f.performRequested('request',{},new AbortController().signal,async()=>++n===1);assert.deepEqual(f.calls,['one']);});
test('uncertain outcome stops the batch without retrying',async()=>{const f=fixture([['one','request'],['two','request']],'unknown');await f.performRequested('request',{},new AbortController().signal,async()=>true);assert.deepEqual(f.calls,['one']);});
test('cancelled request dispatches nothing',async()=>{const f=fixture([['one','request']]);const c=new AbortController();c.abort();await assert.rejects(f.performRequested('request',{},c.signal,async()=>true));assert.deepEqual(f.calls,[]);});

test('Home native destinations remain discoverable before optional domain plugins load',()=>{const rows=JSON.parse(nativeViewDeclarationsJson);for(const id of ['camera','maps','photos','notes','calendar','inbox']){const row=rows.find(row=>row.id===id);assert.equal(row.path,'/'+id);assert.ok(row.fallbackFor);assert.equal(row.capabilities,undefined,'Navigation declaration must not invent device capabilities');}assert.equal(new Set(rows.map(x=>x.id)).size,rows.length);});
test('the resident accepts both launch policies, with the names owners say for a destination',()=>{
 const accepted=policy=>upstreamViews.nativeViewDeclarations(policy,upstreamViews.BUILTIN_VIEWS);
 const stock=accepted(nativeViewDeclarationsJson),image=accepted(imageNativeViewDeclarationsJson);
 const names=(views,id)=>views.find(view=>view.id===id)?.navigationAliases??[];
 for(const [id,spoken] of [['inbox',['email','mail']],['photos',['gallery','pictures']]])for(const views of [stock,image])for(const name of spoken)assert.ok(names(views,id).includes(name),`${id} answers to ${name}`);
 // Phone, Messages and Contacts are declared only for the verified image, as owner-only native routes.
 const imageOnly=['phone','messages','contacts'];
 assert.deepEqual(image.map(view=>view.id),[...stock.map(view=>view.id),...imageOnly]);
 for(const id of imageOnly){const view=image.find(view=>view.id===id);assert.equal(view.path,'/'+id);assert.equal(view.nativeOs,true);assert.deepEqual(view.roleGate,{minRole:'OWNER'});assert.ok(view.fallbackFor);}
 // A stock phone's view profile names none of them or their other names, so nothing there can open them.
 const stockProfile=stock.map(view=>view.id);
 for(const id of imageOnly)assert.equal(upstreamViews.viewEnabledByProfile(image.find(view=>view.id===id),stockProfile),false);
});

test('direct requests retain review for destructive, private and external operations',async()=>{
 const types=['sms_send','notes_delete','notes_update','notes_read_selected','notes_query','calendar_create_local','calendar_create','calendar_update','calendar_delete','calendar_named','reminder_create','create_reminder','reminder_update','reminder_delete','reminder_named','photo_library_review','maps_read_selected','future_operation'];
 const f=fixture(types.map(type=>[type,'request',undefined,type]));
 await f.performRequested('request',{},new AbortController().signal,async()=>true);
 assert.deepEqual(f.calls,[]);assert.equal(f.proposals.size,types.length,'protected proposals remain available for explicit review');
});
test('only the enumerated reversible local actions can run directly',async()=>{
 const types=['create_note','open_view','browser_navigate','camera_capture_photo','photo_library_select','second_note'];
 const f=fixture(types.map(type=>[type,'request',undefined,type==='second_note'?'create_note':type]));
 await f.performRequested('request',{},new AbortController().signal,async()=>true,undefined,{messageId:'request',text:'Open https://example.com/',current:()=>{}});
 // The camera capture keeps its card: these words never asked for a photo (camera-direct-request.test.mjs).
 assert.deepEqual(f.calls,['create_note','open_view','browser_navigate','photo_library_select'],'the existing four-action batch cap remains in force');
 const last=fixture([['photo_library_select','request',undefined,'photo_library_select']]);await last.performRequested('request',{},new AbortController().signal,async()=>true);assert.deepEqual(last.calls,['photo_library_select']);
});

test('navigation-only cards never auto-execute',async()=>{const f=fixture([['current','request']]);f.card=()=>({reviewDestination:'notes'});await f.performRequested('request',{},new AbortController().signal,async()=>true);assert.deepEqual(f.calls,[]);});

test('ordinary browser navigation reuses current-request execution and still respects ask-first',async()=>{
 const rows=[['old','old',undefined,'browser_navigate'],['unbound',undefined,undefined,'browser_navigate'],['current','request',undefined,'browser_navigate'],['workflow','request',{},'browser_navigate']];
 const direct=fixture(rows);await direct.performRequested('request',{},new AbortController().signal,async()=>true,undefined,{messageId:'request',text:'Open https://example.com/',current:()=>{}});assert.deepEqual(direct.calls,['current']);
 const reviewed=fixture(rows);await reviewed.performRequested('request',{},new AbortController().signal,async()=>false,undefined,{messageId:'request',text:'Open https://example.com/',current:()=>{}});assert.deepEqual(reviewed.calls,[]);
});
