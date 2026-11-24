import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
import {build} from 'esbuild';
import {createFilesIndex} from '../apps/app/src/prototype/files-index.ts';

const imports=new Map([
 ['./file-email-review','export const reviewFileEmail=()=>{throw Error("Email outside fixture")};'],
 ['../platform-plugins','export const registerPlugin=__ports.plugin;'],
 ['../runtime/inbox-attachment','export const reviewMailAttachment=__ports.reviewAttachment;'],
 ['../../../../.eliza/client-features/plugins/plugin-native-browser-surface/src/page-reading.ts','export const sensitiveReadingText=()=>false;'],
 ['../ui/files/files-browser-adapter.ts','export const installFilesBrowserAdapter=()=>({});'],
 ['@capacitor/core','export const Capacitor=__ports.capacitor;'],
 ['../daily','export const DailyApps=__ports.daily;'],
 ['./files-index','export const filesIndex=__ports.index;'],
 ['../runtime/inline-modal','export const createInlineModal=()=>{throw Error("Modal outside fixture")};'],
]);
const compiled=await build({
 entryPoints:['apps/app/src/prototype/selection-adapter.ts'],bundle:true,platform:'node',format:'cjs',write:false,
 plugins:[{name:'selected-document-ports',setup(builder){
  builder.onResolve({filter:/.*/},args=>imports.has(args.path)?{path:args.path,namespace:'ports'}:undefined);
  builder.onLoad({filter:/.*/,namespace:'ports'},args=>({contents:imports.get(args.path),loader:'js'}));
 }}],
});
function fixture({read=async()=>({status:'read',text:'Readable excerpt'}),pdf=async()=>({status:'rendered',page:0,pageCount:1,imageUri:'blob:pdf-page'}),native=false,
  sourceRead=async()=>{throw Error('Source read outside fixture');},
  index={record:()=>[],setOpen(){},list:()=>[],open:()=>null,has:()=>true},
  describe=async()=>({status:'unavailable'}),rename=async()=>({status:'unavailable'}),messages}={}){
 const state={open:null},document={hidden:false,querySelector:()=>null},attachments=[],forgotten=[];
 let active=true;
 const api={active:true,isActive:()=>active,get:()=>state,set:patch=>Object.assign(state,patch),setView(){},
  open:(_module,patch)=>Object.assign(state,patch),attachSelectedFile:async selection=>{attachments.push(selection);return true;},ic:{},toast(){}};
 const ports={
  capacitor:{isNativePlatform:()=>native,convertFileSrc:value=>value},
  daily:{readSelected:read,pdfSelected:pdf,describeSelected:describe,renameSelected:rename,forgetSelected:async input=>forgotten.push(input.selectionId)},
  index,
  plugin:name=>name==='AlphaMailAttachments'?{readSelected:sourceRead}:{},
  reviewAttachment:async file=>file,
 };
 const module={exports:{}};
 new Function('require','module','exports','__ports','window','document','navigator',compiled.outputFiles[0].text)(
  createRequire(import.meta.url),module,module.exports,ports,new EventTarget(),document,{});
 const views={files:{render:()=>({})},inbox:{},...(messages?{messages}:{})},Component=class {};
 const accept=module.exports.installSelectedDocumentAdapter(Component,views);
 return {accept:(result,recent)=>accept('files',result,api,recent),render:()=>views.files.render(state,api),api,state,document,attachments,forgotten,
  active(value){active=value;},leave:()=>views.files.onLeave?.(api),close:()=>views.files.back(state,api)};
}
const selected=(id='one',mimeType='text/plain')=>({status:'selected',selectionId:id,name:id+'.file',mimeType,uri:'blob:'+id});

function textReceipt(text) {
 return {name:'one.file',mimeType:'text/plain',sha256:'a'.repeat(64),size:Buffer.byteLength(text),text,dataBase64:Buffer.from(text).toString('base64')};
}

test('Files waits for readable text and stages the exact file without an excerpt editor',async()=>{
 const pending=Promise.withResolvers(),f=fixture({read:()=>pending.promise,sourceRead:async()=>textReceipt('Current excerpt')});
 const accepting=f.accept(selected()),loading=f.render().pv;
 assert.equal(loading.canAsk,false);
 loading.ask();assert.equal(f.attachments.length,0);
 pending.resolve({status:'read',text:'Current excerpt'});await accepting;
 const ready=f.render().pv;
 assert.equal(ready.canAsk,true);
 loading.ask();assert.equal(f.attachments.length,0);
 assert.equal(await ready.ask(),true);
 const [attachment]=f.attachments;
 const file=await attachment.read(attachment.current);
 assert.equal(file.name,'one.file');assert.equal(file.type.split(';')[0],'text/plain');assert.equal(await file.text(),'Current excerpt');
 for(const response of [{status:'read',text:' \n '},{status:'binary'},{status:'failed'}]){
  const empty=fixture({read:async()=>response});await empty.accept(selected());
  assert.equal(empty.render().pv.canAsk,false);empty.render().pv.ask();assert.equal(empty.attachments.length,0);
 }
});

test('selected images and PDFs stage attachments when their preview is ready',async()=>{
 for(const native of [false,true]){
  const image=fixture({native,read:async()=>({status:'binary'})}),input=selected('image','image/png');
  input.uri=native?'content://fixture/image':'blob:image';
  await image.accept(input);const preview=image.render().pv;
  assert.equal(preview.canAsk,true);await preview.ask();assert.equal(image.attachments.length,1);
  const pending=Promise.withResolvers(),pdf=fixture({native,pdf:()=>pending.promise}),accepting=pdf.accept(selected('pdf','application/pdf'));
  assert.equal(pdf.render().pv.canAsk,false);pdf.render().pv.ask();assert.equal(pdf.attachments.length,0);
  pending.resolve({status:'rendered',page:0,pageCount:1,imageUri:native?'file://fixture/page.jpg':'blob:pdf-page'});
  await accepting;assert.equal(pdf.render().pv.canAsk,true);await pdf.render().pv.ask();assert.equal(pdf.attachments.length,1);
 }
});

test('Ask retires with the selected identity, view or page visibility',async()=>{
 for(const change of ['selection','view','hidden','closed']){
  const f=fixture();await f.accept(selected());const preview=f.render().pv;
  await preview.ask();assert.equal(f.attachments.length,1);
  assert.equal(f.attachments[0].current(),true);
  if(change==='selection')await f.accept(selected('two'));
  if(change==='view')f.active(false);
  if(change==='hidden')f.document.hidden=true;
  if(change==='closed')f.close();
  assert.equal(f.attachments[0].current(),false,change);
  preview.ask();assert.equal(f.attachments.length,1,change);
 }
});

test('leaving a pending selected read preserves the retired selection fence',async()=>{
 const pending=Promise.withResolvers(),f=fixture({read:()=>pending.promise});
 const accepting=f.accept(selected());f.close();
 pending.resolve({status:'read',text:'Late excerpt'});await accepting;
 assert.equal(f.render().pv,undefined);assert.equal(f.attachments.length,0);
});

test('an exact file read rechecks the current view before returning bytes',async()=>{
 const pending=Promise.withResolvers(),f=fixture({sourceRead:()=>pending.promise});
 await f.accept(selected());await f.render().pv.ask();
 const [attachment]=f.attachments,result=attachment.read(attachment.current);
 f.active(false);pending.resolve(textReceipt('Readable excerpt'));
 await assert.rejects(result,/file changed/i);
});

test('a verified size refusal stages only a bounded text excerpt',async()=>{
 const f=fixture({read:async()=>({status:'read',text:'a'.repeat(13000)}),sourceRead:async()=>{throw Object.assign(Error('Too large'),{code:'too-large'});}});
 await f.accept(selected());await f.render().pv.ask();
 const [attachment]=f.attachments,file=await attachment.read(attachment.current);
 assert.equal(file.name,'one.file (excerpt).txt');assert.equal(file.type.split(';')[0],'text/plain');assert.equal(await file.text(),'a'.repeat(12000));
});

function rendererStorage(){
 const rows=new Map();
 const store={getItem:key=>rows.get(key)??null,setItem:(key,value)=>rows.set(key,value),removeItem:key=>rows.delete(key)};
 return ()=>createFilesIndex(store);
}
const nativeFile=id=>({...selected(id),uri:'content://fixture/'+id,action:'files'});
const settleRenderer=()=>new Promise(resolve=>setImmediate(resolve));

test('Files browsing previews do not become picker previews after the renderer is recreated',async()=>{
 const index=rendererStorage(),value=nativeFile('storage-preview'),first=fixture({native:true,index:index()});
 await first.accept(value,false);
 assert.equal(first.render().pv.nativeSelectionId,value.selectionId);
 const describeCalls=[];
 const describe=async input=>{describeCalls.push(input.selectionId);return value;};
 const recreated=fixture({native:true,index:index(),describe});
 recreated.render();
 await settleRenderer();
 assert.equal(recreated.render().pv,undefined);
 assert.equal(index().open(),null);
 assert.deepEqual(describeCalls,[]);
 // Earlier versions stored a raw open ID even when no picker row existed.
 index().setOpen(value.selectionId);
 const legacy=fixture({native:true,index:index(),describe});
 legacy.render();
 await settleRenderer();
 assert.equal(legacy.render().pv,undefined);
 assert.equal(index().open(),null);
 assert.deepEqual(describeCalls,[]);
 assert.deepEqual(legacy.forgotten,[]);
});

test('an exact remembered picker grant survives rename and restores only while Files owns the request',async()=>{
 const index=rendererStorage(),first=fixture({native:true,index:index(),rename:async()=>nativeFile('picker-renamed')});
 await first.accept(nativeFile('picker-original'));
 first.api.set({rn:'picker-renamed.file'});
 await first.render().pv.saveRn();
 assert.equal(index().open(),'picker-renamed');
 assert.deepEqual(index().list().map(row=>row.selectionId),['picker-renamed']);
 const wrong=fixture({native:true,index:index(),describe:async()=>nativeFile('different-picker')});
 wrong.render();await settleRenderer();
 assert.equal(wrong.render().pv,undefined);
 const held=Promise.withResolvers(),left=fixture({native:true,index:index(),describe:()=>held.promise});
 left.render();left.active(false);left.leave();left.active(true);held.resolve(nativeFile('picker-renamed'));await settleRenderer();
 assert.equal(left.render().pv,undefined);
 const moving=Promise.withResolvers(),folder=fixture({native:true,index:index(),describe:()=>moving.promise});
 folder.render();folder.api.set({folder:'folder'});folder.render();folder.api.set({folder:null});
 moving.resolve(nativeFile('picker-renamed'));await settleRenderer();
 assert.equal(folder.render().pv,undefined);
 for(let recreation=0;recreation<2;recreation++){
  const restored=fixture({native:true,index:index(),describe:async({selectionId})=>nativeFile(selectionId)});
  restored.render();await settleRenderer();
  assert.equal(restored.render().pv.nativeSelectionId,'picker-renamed');
  assert.equal(restored.render().pv.canForget,true);
  assert.equal(index().open(),'picker-renamed');
 }
});

test('a picked file shows its type, size and date, never a MIME type, and only what the provider reported (FILE-13)',async()=>{
 const f=fixture();
 await f.accept({...selected('report','application/vnd.openxmlformats-officedocument.wordprocessingml.document'),size:1536,modified:Date.UTC(2020,0,15)});
 const pv=f.render().pv;
 assert.match(pv.meta,/^Document · 1\.5 KB · .*2020$/);
 assert.equal(pv.metaType,'Document');assert.equal(pv.size,1536);
 const g=fixture();
 await g.accept(selected('plain'));
 assert.equal(g.render().pv.meta,'Text');
});

test('Files offers Messages only for a PNG or JPEG whose known size Messages accepts, and a rename keeps that size',async()=>{
 // Messages publishes its limit as pictureFits; this stand-in has sms-adapter's rule (mmsPictureFits).
 const messages={sharePicture:async()=>{},pictureFits:(type,size)=>['image/png','image/jpeg','image/gif'].includes(type)&&Number.isInteger(size)&&size>0&&size<=1024*1024};
 const offered=async(result,renamed)=>{
  const f=fixture({messages,rename:async()=>renamed});await f.accept(result,false);
  if(renamed){f.api.set({rn:renamed.name});await f.render().pv.saveRn();}
  return f.render().pv.canMessage;
 };
 assert.equal(await offered({...selected('small','image/png'),size:68}),true);
 assert.equal(await offered(selected('unknown','image/png')),false,'an unknown size is never assumed small');
 assert.equal(await offered({...selected('large','image/jpeg'),size:1024*1024+1}),false);
 assert.equal(await offered({...selected('text','text/plain'),size:68}),false);
 assert.equal(await offered({...selected('small','image/png'),size:68},{...selected('renamed','image/png'),name:'renamed.png'}),true);
});
