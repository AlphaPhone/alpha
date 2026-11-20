import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {loadProductModule} from '../specs/quint/refinement/application/notes-files-media-itf.mjs';

const source='apps/app/src/prototype/note-source-adapter.ts';
const digest='a'.repeat(64);
const attachment={name:'source.txt',mimeType:'text/plain',dataBase64:'YQ==',sha256:digest,size:1};
const identity={version:1,name:attachment.name,mimeType:attachment.mimeType,sha256:digest,size:attachment.size};

async function run({reference,select,read},check){
 const dom=new JSDOM('',{url:'https://alpha.example/',pretendToBeVisual:true});
 const globals=Object.fromEntries(['window','document','AbortController'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,AbortController:dom.window.AbortController});
 const calls=[],notices=[];
 let active=true;
 globalThis.__alphaNoteSourcePorts={
  daily(name,input){
   calls.push([name,input]);
   if(name==='perform')return select();
   assert.equal(name,'forgetSelected');
   return Promise.resolve();
  },
  attachments(name,input){
   calls.push([name,input]);
   if(name==='readSelected')return read();
   return Promise.resolve({message:'Opened.'});
  },
 };
 try{
  const product=await loadProductModule(source,{stubs:{
   '@capacitor/core':'export const Capacitor={isNativePlatform:()=>true,getPlatform:()=>"android"};',
   '../daily':'export const DailyApps=new Proxy({},{get:(_target,method)=>input=>globalThis.__alphaNoteSourcePorts.daily(method,input)});',
   '../platform-plugins':'export const registerPlugin=()=>new Proxy({},{get:(_target,method)=>input=>globalThis.__alphaNoteSourcePorts.attachments(method,input)});',
   '../runtime/inbox-attachment':'export const reviewMailAttachment=async file=>({sha256:file.sha256,size:file.size});',
  }});
  const views={notes:{render:()=>({})}};
  const state={open:'note',list:[{id:'note',kind:'text',documentSource:{...identity,...(reference?{reference}:{})}}]};
  const api={get:()=>state,isActive:()=>active,toast:message=>notices.push(message)};
  product.installNoteSourceAdapter(views);
  await check({attach:()=>views.notes.render(state,api).sourceDocument(),leave:()=>{active=false;views.notes.onLeave();},calls,notices,state});
 }finally{
  delete globalThis.__alphaNoteSourcePorts;
  for(const [key,descriptor] of Object.entries(globals)){
   if(descriptor)Object.defineProperty(globalThis,key,descriptor);
   else delete globalThis[key];
  }
  dom.window.close();
 }
}

test('a retained Notes source opens once through its exact reference',async()=>{
 const reference='a1:'+digest;
 await run({reference},async({attach,calls,state})=>{
  const before=structuredClone(state);
  await Promise.all([attach(),attach()]);
  assert.deepEqual(calls,[['openSourceReference',{reference,sha256:digest,size:1,mimeType:'text/plain'}]]);
  assert.deepEqual(state,before);
 });
});

test('an unmatched legacy selection is released without opening a viewer',async()=>{
 await run({select:()=>Promise.resolve({status:'selected',selectionId:'sel'}),read:()=>Promise.resolve({...attachment,sha256:'b'.repeat(64)})},
 async({attach,calls,notices})=>{
  await attach();
  assert.deepEqual(calls.map(([name])=>name),['perform','readSelected','forgetSelected']);
  assert.deepEqual(notices,['That file doesn’t match this attachment.']);
 });
});

test('a native picker returning after leaving Notes releases its selection',async()=>{
 let resolve;
 const selected=new Promise(done=>{resolve=done;});
 await run({select:()=>selected},async({attach,leave,calls,notices})=>{
  const pending=attach();
  leave();
  resolve({status:'selected',selectionId:'sel'});
  await pending;
  assert.deepEqual(calls,[['perform',{action:'files'}],['forgetSelected',{selectionId:'sel'}]]);
  assert.deepEqual(notices,[]);
 });
});

test('the Android picker can hide Notes while returning the matching attachment',async()=>{
 let resolve;
 const selected=new Promise(done=>{resolve=done;});
 await run({select:()=>selected,read:()=>Promise.resolve(attachment)},async({attach,calls,notices})=>{
  const pending=attach();
  Object.defineProperty(document,'hidden',{value:true});
  document.dispatchEvent(new window.Event('visibilitychange'));
  resolve({status:'selected',selectionId:'sel'});
  await pending;
  assert.deepEqual(calls.map(([name])=>name),['perform','readSelected','openReviewed','forgetSelected']);
  assert.deepEqual(notices,[]);
 });
});
