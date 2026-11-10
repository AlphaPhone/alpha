// Files folder view driven through its real render handlers with a controlled folder
// provider. No Android document provider or picker is involved.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const source=stripTypeScriptTypes(fs.readFileSync('apps/app/src/prototype/files-tree-adapter.ts','utf8').replace(/^import .*;\n/gm,'').replace('export function','function'),{mode:'strip'});
const entry=(id,extra={})=>({id,parentId:'root',name:id,mimeType:'text/plain',directory:false,size:1,revision:'r-'+id,canCreate:false,canRename:true,canDelete:true,canMove:true,...extra});
const folder={id:'root',name:'Chosen',mimeType:'dir',directory:true,size:0,revision:'r-root',canCreate:true,canRename:false,canDelete:false,canMove:false};
const ready=names=>({status:'ready',message:'',folder,entries:names.map(name=>entry(name))});
const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
async function harness(){
 let active=true;const state={folder:null},toasts=[],sets=[],events=[],cleared=[];
 const tree={choose:async()=>ready(['a','b'])};
 const api={ic:{folder:'folder-icon'},get:()=>state,set:patch=>{sets.push(patch);Object.assign(state,patch);},isActive:()=>active,toast:message=>toasts.push(message)};
 const view={render:()=>({locs:[]}),onLeave(){}};
 class HTMLElement{}
 const ctx=vm.createContext({Date,Set,Map,Number,HTMLElement,window:{dispatchEvent:event=>events.push(event)},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},document:{hidden:false,querySelector:()=>null},
  Capacitor:{isNativePlatform:()=>false},registerPlugin:()=>tree,DailyApps:{perform:async()=>({status:'cancelled'}),forgetSelected:async()=>{}},filesIndex:{list:()=>[],revokeTree(){}},createInlineModal:()=>({ref:null}),
  FOLDER_CONTEXT_EVENT:'folder-context',createFolderRevisions:()=>scope=>scope,folderScope:listing=>listing?.folder?{folder:listing.folder.id,entries:listing.entries.length}:undefined,compareFilesEntries:()=>(a,b)=>a.name.localeCompare(b.name),matchesFileQuery:()=>false,sortLabel:()=>'',typeLabel:()=>'File'});
 vm.runInContext(source+';globalThis.install=installFilesTreeAdapter',ctx);
 ctx.install({files:view},async()=>{},()=>cleared.push(true));
 const render=()=>view.render(state,api);
 await render().locs.find(row=>row.name==='App files').go();await settle();
 assert.equal(state.folder,'__native_tree');cleared.length=0;
 return {tree,state,toasts,sets,events,cleared,view,render,leave:()=>view.onLeave(),deactivate:()=>{active=false;}};
}
const names=view=>Array.from(view.fd.items,row=>row.name);
const menu=(view,label)=>view.fd.menuRows.find(row=>row.label===label);

test('a folder listing that arrives after Files was left changes nothing',async()=>{
 for(const departure of ['leave','deactivate']){
  const f=await harness();let reply;f.tree.list=()=>new Promise(resolve=>{reply=resolve;});
  menu(f.render(),'Refresh folder').go();await settle();
  f[departure]();const events=f.events.length,sets=f.sets.length;
  reply({status:'revoked',message:'Access ended.'});await settle();
  assert.deepEqual(names(f.render()),['a','b'],departure+': the late reply did not replace the folder');
  assert.equal(events>0,true);assert.deepEqual({...f.events.at(-1).detail},{folder:'root',entries:2},departure+': the published folder context still describes the folder that was shown');
  assert.equal(f.cleared.length,0,departure+': a selection shared with another view is not cleared');
  assert.equal(f.sets.slice(sets).some(patch=>'open' in patch),false,departure+': no preview is closed');
  assert.equal(f.render().nativeTreeStatus,'',departure+': the loading notice does not linger');
 }
});
test('a listing for the view that asked for it still applies',async()=>{
 const f=await harness();f.tree.list=async()=>ready(['c']);
 menu(f.render(),'Refresh folder').go();await settle();
 assert.deepEqual(names(f.render()),['c']);
});

test('losing folder access ends selection mode with the rows it selected',async()=>{
 const f=await harness();f.tree.changeMany=async()=>({status:'revoked',message:'Folder access ended.'});
 let view=f.render();view.fd.select();view=f.render();view.fd.items[0].tap();view=f.render();
 assert.equal(view.isSel,true);assert.equal(view.selCount,'1');
 view.selDel({currentTarget:null});f.render().nativeTreeDialog.confirm();await settle();
 view=f.render();
 assert.deepEqual(names(view),[]);assert.equal(view.isSel,false,'no selection bar over an empty folder');assert.equal(view.selCount,'0');
 assert.match(f.toasts.join('|'),/Folder access ended/);
});

test('creating a folder leaves the current selection alone',async()=>{
 const f=await harness();f.tree.createFolder=async()=>({status:'created',message:'Created.'});f.tree.list=async()=>ready(['a','b','New']);
 menu(f.render(),'New folder').go();
 f.render().nativeTreeDialog.onName({target:{value:'New'}});
 const sets=f.sets.length;await f.render().nativeTreeDialog.confirm();await settle();
 assert.deepEqual(names(f.render()),['a','b','New']);
 assert.equal(f.cleared.length,0,'no file was open as the preview, so nothing is cleared');
 assert.equal(f.sets.slice(sets).some(patch=>'open' in patch),false);
});
