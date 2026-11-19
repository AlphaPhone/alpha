import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
// What Alpha's Files browser shows and does (apps/app/src/ui/files) over an in-memory storage port.
const {outputFiles:[bundle]}=await build({entryPoints:['apps/app/src/ui/files/files-browser-adapter.ts'],bundle:true,platform:'browser',format:'iife',globalName:'filesBrowser',write:false});
const template=readFileSync('apps/app/src/prototype/template.html','utf8');
const MARKER='__native_selected_document';

/** Folders and files by volume-relative path; Trash rows by id. */
async function harness({state={status:'ready',access:'granted'},files={}}={}){
 const tree=new Map(Object.entries(files)),trash=new Map(),calls=[],toasts=[],accepted=[],forgotten=[];let selections=0;
 const entry=path=>{const value=tree.get(path),name=path.split('/').pop();return value==='dir'?{path,name,directory:true,mimeType:'',size:0,modified:0}:{path,name,directory:false,mimeType:value.mimeType,size:value.size,modified:value.modified};};
 const children=path=>[...tree.keys()].filter(p=>p.slice(0,p.lastIndexOf('/')+1)===(path?path+'/':'')&&p!==path&&!p.slice(path?path.length+1:0).includes('/')).map(entry);
 const storage={
  storageState:async()=>{calls.push(['state']);return typeof state==='function'?state():{volumes:[{id:'primary',name:'Internal storage',primary:true,free:1,total:2}],...state};},
  storageRequestAccess:async()=>({status:'ready'}),
  storageList:async({path})=>{calls.push(['list',path]);return path===''||tree.get(path)==='dir'?{status:'ready',entries:children(path)}:{status:'missing'};},
  storageCategory:async({category})=>{const entries=category==='documents'?[...tree.keys()].filter(p=>tree.get(p)!=='dir'&&tree.get(p).mimeType==='text/plain').map(entry):[];return {status:'ready',entries,count:entries.length};},
  storageQuery:async()=>({status:'ready',entries:[],truncated:false}),
  storageTrashList:async()=>({status:'ready',items:[...trash.values()]}),
  storageRestore:async({ids})=>{calls.push(['restore',ids]);const outcomes=ids.map(id=>{const row=trash.get(id);trash.delete(id);tree.set(row.origin?row.origin+'/'+row.name:row.name,{mimeType:'text/plain',size:1,modified:1});return {path:id,status:'restored',to:row.name};});return {status:'ready',outcomes};},
  storageEmptyTrash:async()=>({status:'ready',count:0}),
  storageCreateFolder:async({parent,name})=>{const path=parent?parent+'/'+name:name;calls.push(['create',path]);tree.set(path,'dir');return {status:'ready',path};},
  storageRename:async({path,name})=>{const to=path.includes('/')?path.slice(0,path.lastIndexOf('/')+1)+name:name;calls.push(['rename',path,to]);tree.set(to,tree.get(path));tree.delete(path);return {status:'ready',path:to};},
  storageTransfer:async()=>({status:'ready',outcomes:[]}),
  storageTrash:async()=>({status:'ready',outcomes:[]}),
  storageShare:async()=>({status:'opened'}),
  storageSelect:async({path})=>{calls.push(['select',path]);return tree.has(path)?{status:'selected',selectionId:'s'+(++selections),name:path.split('/').pop(),mimeType:tree.get(path).mimeType}:{status:'missing'};},
  storageWatch:async()=>({status:'ready'}),storageUnwatch:async()=>({status:'ready'}),addListener:async()=>({remove:async()=>{}}),
 };
 const view={render:st=>st.open===MARKER?{isPreview:true,pv:{meta:'Text'}}:{},onLeave(){}};
 const st={},api={ic:{folder:'FOLDER'},get:()=>st,set:patch=>Object.assign(st,patch),isActive:()=>true,toast:text=>toasts.push(text),open(){}};
 const ctx=vm.createContext({setTimeout,clearTimeout,queueMicrotask,window:new EventTarget(),CustomEvent:class{},HTMLElement:class{},document:Object.assign(new EventTarget(),{hidden:false})});
 vm.runInContext(bundle.text+';globalThis.install=filesBrowser.installFilesBrowserAdapter',ctx);
 ctx.install(view,async(_m,value,a)=>{accepted.push(value.selectionId);a.set({open:MARKER});},()=>{},{storage,createInlineModal:()=>({ref(){}}),menuFocus:()=>null,forgetSelected:async id=>forgotten.push(id)});
 const settle=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
 const render=()=>view.render(st,api);
 render();await settle();
 return {render,settle,calls,toasts,accepted,forgotten,trash,tree,back:()=>view.back(st,api),
  async folder(path=''){render().browse.allFiles();await settle();for(const part of path.split('/').filter(Boolean)){render().fd.items.find(r=>r.name===part).tap();await settle();}return render();}};
}
const text={mimeType:'text/plain',size:2048,modified:Date.UTC(2020,0,15)};

test('Files says why a place is empty in words, not only an icon (FILE-12)',async()=>{
 const h=await harness({files:{Docs:'dir'}});
 assert.equal((await h.folder('Docs')).fd.emptyText,'This folder is empty');
 h.render().fd.close();await h.settle();h.render().fd.close();await h.settle();
 h.render().browse.openTrash();await h.settle();
 const trash=h.render().fd;
 assert.equal(trash.empty,true);
 assert.equal(trash.emptyText,'Trash is empty. Items in Trash are deleted after 30 days.');
 // The template shows the adapter's sentence, never a fixed placeholder.
 assert.match(template,/<sc-if value="\{\{files\.fd\.empty\}\}">[\s\S]{0,300}\{\{files\.fd\.emptyText\}\}/);
 assert.match(template,/<sc-if value="\{\{files\.filterEmpty\}\}">[\s\S]{0,300}\{\{files\.filterEmptyText\}\}/);
 assert.doesNotMatch(template,/No files to show|No results to show/);
});

test('unavailable storage offers Retry, which reads storage again (FILE-12)',async()=>{
 let ready=false;
 const h=await harness({state:()=>ready?{status:'ready',access:'granted',volumes:[]}:{status:'unavailable'}});
 assert.equal(h.render().browse.unavailable,true);
 const reads=h.calls.filter(c=>c[0]==='state').length;
 ready=true;h.render().browse.retry();await h.settle();
 assert.equal(h.calls.filter(c=>c[0]==='state').length,reads+1);
 assert.equal(h.render().browse.unavailable,false);
 assert.equal((template.match(/\{\{files\.browse\.retry\}\}/g)||[]).length,2,'Browse and the folder page both offer Retry');
});

test('the move picker opens where the items are and can make a folder there (FILE-16)',async()=>{
 const h=await harness({files:{Docs:'dir','Docs/Old':'dir','Docs/a.txt':text}});
 const docs=await h.folder('Docs');
 docs.fd.menuRows.find(r=>r.id==='select').go();
 h.render().fd.items.find(r=>r.name==='a.txt').tap();
 h.render().selMove();await h.settle();
 let dlg=h.render().dlg;
 assert.equal(dlg.isDest,true);
 assert.equal(dlg.at,'Internal storage › Docs','starts in the folder the file is in');
 assert.deepEqual(Array.from(dlg.folders,f=>f.name),['Old']);
 assert.equal(dlg.canNewFolder,true);
 dlg.newFolder();
 dlg=h.render().dlg;
 assert.equal(dlg.isName,true);assert.equal(dlg.title,'New folder');
 dlg.cancel();
 assert.equal(h.render().dlg.isDest,true,'Cancel returns to the picker');
 h.render().dlg.newFolder();
 h.render().dlg.onValue({target:{value:'Taxes'}});
 h.render().dlg.confirm();await h.settle();
 dlg=h.render().dlg;
 assert.deepEqual(h.calls.filter(c=>c[0]==='create'),[['create','Docs/Taxes']]);
 assert.equal(dlg.isDest,true,'the picker comes back');
 assert.equal(dlg.at,'Internal storage › Docs › Taxes','inside the new folder');
});

test('Copy also opens in the folder the items are in (FILE-16)',async()=>{
 const h=await harness({files:{A:'dir',B:'dir','A/x.txt':text}});
 await h.folder('A');
 h.render().fd.menuRows.find(r=>r.id==='select').go();
 h.render().fd.items.find(r=>r.name==='x.txt').tap();
 h.render().selCopy();await h.settle();
 assert.equal(h.render().dlg.at,'Internal storage › A');
});

test('from a category the picker opens at the storage root, not inside the item folder (FILE-16)',async()=>{
 const h=await harness({files:{Docs:'dir',Taxes:'dir','Docs/a.txt':text}});
 h.render().browse.cats.find(c=>c.id==='documents').go();await h.settle();
 h.render().fd.menuRows.find(r=>r.id==='select').go();
 h.render().fd.items.find(r=>r.name==='a.txt').tap();
 h.render().selCopy();await h.settle();
 const dlg=h.render().dlg;
 assert.equal(dlg.at,'Internal storage');
 assert.deepEqual(Array.from(dlg.folders,f=>f.name),['Docs','Taxes']);
});

test('Parent folder falls back to the root, without an error, when the parent cannot be listed (FILE-16)',async()=>{
 const h=await harness({files:{A:'dir','A/B':'dir','A/B/a.txt':text}});
 await h.folder('A/B');
 h.render().fd.menuRows.find(r=>r.id==='select').go();
 h.render().fd.items.find(r=>r.name==='a.txt').tap();
 h.render().selMove();await h.settle();
 assert.equal(h.render().dlg.at,'Internal storage › A › B');
 h.tree.delete('A');h.tree.set('Elsewhere','dir');
 h.render().dlg.up();await h.settle();
 assert.deepEqual(h.calls.filter(c=>c[0]==='list').slice(-2),[['list','A'],['list','']]);
 assert.equal(h.render().dlg.at,'Internal storage');
 assert.deepEqual(h.toasts,[]);
});

test('rename selects the name without its extension, and the open file stays open under its new name (FILE-16)',async()=>{
 const h=await harness({files:{Docs:'dir','Docs/report.final.txt':text}});
 await h.folder('Docs');
 h.render().fd.items.find(r=>r.name==='report.final.txt').tap();await h.settle();
 assert.deepEqual(h.accepted,['s1']);
 let out=h.render();
 assert.equal(out.isPreview,true);
 assert.match(out.pv.meta,/^Text · 2 KB · .+ · Internal storage › Docs$/,'type, size, date and place, never a MIME type');
 out.pv.startRename({});
 const dlg=h.render().dlg,selected=[];
 assert.equal(dlg.value,'report.final.txt');
 dlg.onFocus({target:{setSelectionRange:(a,b)=>selected.push([a,b])}});
 dlg.onFocus({target:{setSelectionRange:(a,b)=>selected.push([a,b])}});
 assert.deepEqual(selected,[[0,'report.final'.length]],'only the first focus selects, and the extension stays');
 dlg.onValue({target:{value:'summary.txt'}});
 h.render().dlg.confirm();await h.settle();
 assert.deepEqual(h.calls.filter(c=>c[0]==='rename'),[['rename','Docs/report.final.txt','Docs/summary.txt']]);
 assert.deepEqual(h.accepted,['s1','s2'],'the renamed file is opened again');
 out=h.render();
 assert.equal(out.isPreview,true);assert.equal(out.dlg,null);
 assert.match(out.pv.meta,/Internal storage › Docs$/);
});

test('Trash offers Restore all, which restores every row shown (FILE-16)',async()=>{
 const h=await harness();
 for(const [id,name] of [['t1','a.txt'],['t2','b.txt']])h.trash.set(id,{id,name,origin:'Docs',size:1,deletedAt:Date.now(),directory:false,mimeType:'text/plain'});
 h.render().browse.openTrash();await h.settle();
 const fd=h.render().fd;
 assert.equal(fd.canRestoreAll,true);
 fd.restoreAll();await h.settle();
 assert.equal(h.calls.filter(c=>c[0]==='restore').length,1,'one call for the one volume');
 assert.equal(h.calls.filter(c=>c[0]==='restore').flatMap(c=>c[1]).sort().join(),'t1,t2');
 assert.equal(h.render().fd.canRestoreAll,false);
 assert.match(template,/\{\{files\.fd\.restoreAll\}\}/);
});

test('the mock-mode Files fixture gives every Browse icon tile a glyph (VIS-15)',()=>{
 const model=readFileSync('apps/app/src/prototype/model.js','utf8');
 const start=template.indexOf('<sc-if value="{{files.browse.ready}}">'),block=template.slice(start,template.indexOf('</sc-if>\n  </div>',start));
 const read=new Set([...block.matchAll(/<path d="\{\{files\.browse\.(\w+)\}\}"/g)].map(m=>m[1]));
 assert.ok(read.has('allFilesIcon'));
 const fixture=model.match(/\n {6}browse: \{([^\n]*)\},\n/)?.[1];
 assert.ok(fixture,'the fixture Browse object');
 for(const key of read)assert.match(fixture,new RegExp(`\\b${key}: `),`fixture Browse sets ${key}`);
});
