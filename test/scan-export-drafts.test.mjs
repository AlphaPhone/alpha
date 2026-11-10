// Scan document review, searchable review and page capture driven through their real
// entry points in jsdom. Storage, OCR, the PDF provider and the camera are controlled ports:
// this proves the renderer's decisions, not Android storage, a provider or a camera.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {stripTypeScriptTypes} from './support/strip-types.mjs';

const RETRYABLE="export const scanPdfRetryable = status => ['cancelled', 'failed', 'unavailable', 'too-large'].includes(status);";
async function bundle(entry,stubs){
 const result=await build({entryPoints:[resolve(entry)],bundle:true,write:false,format:'iife',globalName:'ScanSource',platform:'browser',plugins:[{name:'ports',setup(builder){
  builder.onResolve({filter:/.*/},args=>{if(args.kind==='entry-point')return;if(!(args.path in stubs))throw new Error(`Unreviewed dependency ${args.path}`);return {path:args.path,namespace:'port'};});
  builder.onLoad({filter:/.*/,namespace:'port'},args=>({contents:stubs[args.path],loader:'ts'}));
 }}]});
 return result.outputFiles[0].text;
}
const documentBundle=await bundle('apps/app/src/prototype/scan-document.ts',{
 '../runtime/abort-signal':'export const anyAbortSignal = signals => signals[0];',
 './media-review-controls':'export const mediaToolIcon = () => {};',
 './scan-dialog.css':'',
 './scan-searchable-review':'export const reviewSearchableScan = (...args) => globalThis.scanPorts.search(...args);',
 './scan-correction-review':'export const reviewScanCorrection = async () => undefined;',
 '../browser/scan-draft':'export const readScanDraft = () => globalThis.scanPorts.read(); export const saveScanDraft = (...args) => globalThis.scanPorts.save(...args); export const deleteScanDraft = (...args) => globalThis.scanPorts.remove(...args);',
 './scan-page-camera':'export const captureScanPage = async () => undefined;',
 '../browser/file-picker':'export const inputFiles = async () => []; export const runFilePicker = async () => [];',
 './scan-pdf':`export class ScanPdfExportError extends Error {} export const exportScanPdf = () => globalThis.scanPorts.export(); export const duringSystemPicker = task => task(); export const systemPickerActive = () => false; ${RETRYABLE}`,
 '@capacitor/core':'export const Capacitor = { isNativePlatform: () => true };',
 '../daily':'export const DailyApps = { perform: async () => ({status:"cancelled"}), forgetSelected: async () => {} };',
});
const searchableBundle=await bundle('apps/app/src/prototype/scan-searchable-review.ts',{
 './media-review-controls':'export const mediaToolIcon = () => {};',
 './scan-dialog.css':'',
 '../browser/scan-draft':'export const copyScanTextLayers = layers => layers;',
 './local-ocr':'export const recognizeLocalText = async () => ({lines: []});',
 './scan-pdf':'export class ScanPdfExportError extends Error {} export const exportScanPdf = (...args) => globalThis.scanPorts.export(...args); export const systemPickerActive = () => false;',
 '@capacitor/core':'export const Capacitor = { isNativePlatform: () => true };',
});
const tick=async(n=10)=>{for(let i=0;i<n;i++)await new Promise(done=>setTimeout(done,0));};
function environment(code,ports){
 const dom=new JSDOM('<!doctype html><html><body><main class="os"></main></body></html>',{url:'https://scan.example.test/'});
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 const context=vm.createContext({document:dom.window.document,window:dom.window,HTMLElement:dom.window.HTMLElement,AbortController,Blob,scanPorts:ports,console,DOMException,URL:{createObjectURL:()=>'blob:scan-test',revokeObjectURL(){}}});
 vm.runInContext(code,context);
 const button=label=>{const element=dom.window.document.querySelector(`button[aria-label="${label}"]`)||[...dom.window.document.querySelectorAll('button')].find(b=>b.textContent===label);assert.ok(element,`Missing ${label}`);return element;};
 return {dom,source:context.ScanSource,button};
}
function draftPorts(initial){
 const state={stored:initial,saves:0,deletes:0,exports:0,exportResult:{status:'exported',message:'receipt'},searchResult:undefined};
 const ports={
  async read(){return state.stored;},
  async save(pages,expected,signal,textLayers){signal.throwIfAborted();assert.equal(expected,state.stored?.revision,'saves are compare-and-set on the latest revision');state.stored={pages:[...pages],textLayers,revision:`revision-${++state.saves}`};return state.stored;},
  async remove(expected,signal){signal.throwIfAborted();assert.equal(expected,state.stored?.revision);state.stored=undefined;state.deletes++;},
  async export(){state.exports++;return state.exportResult;},
  async search(){return state.searchResult;},
 };
 return {state,ports};
}
const page=name=>new Blob([name],{type:'image/png'});

test('draft ownership: only a save that creates the draft makes it this review\'s own',()=>{
 const {source,dom}=environment(documentBundle,draftPorts().ports);
 assert.equal(source.ownsAutoDraftAfterSave(false,undefined),true,'first automatic save creates the draft');
 assert.equal(source.ownsAutoDraftAfterSave(true,'r1'),true,'later automatic saves keep ownership');
 assert.equal(source.ownsAutoDraftAfterSave(false,'r1'),false,'a save over a loaded or user-saved draft does not adopt it');
 dom.window.close();
});

test('a confirmed export ends the automatic draft but keeps one the user saved',async()=>{
 {
  const {state,ports}=draftPorts(),env=environment(documentBundle,ports),close=env.source.openScanDocument(page('one'));
  try{
   await tick();assert.equal(state.saves,1,'the open page is saved automatically');
   env.button('Save document PDF').click();await tick();
   assert.equal(state.exports,1);assert.equal(state.deletes,1,'the automatic draft ends with its confirmed export');assert.equal(state.stored,undefined);
  }finally{close();env.dom.window.close();}
 }
 {
  const {state,ports}=draftPorts(),env=environment(documentBundle,ports),close=env.source.openScanDocument(page('one'));
  try{
   await tick();env.button('Save document draft').click();await tick();assert.equal(state.saves,2);
   env.button('Save document PDF').click();await tick();
   assert.equal(state.exports,1);assert.equal(state.deletes,0,'an explicitly saved draft is never deleted by an export');assert.equal(state.stored.revision,'revision-2');
  }finally{close();env.dom.window.close();}
 }
});

test('a loaded draft stays the user\'s after page edits and an export',async()=>{
 const {state,ports}=draftPorts({pages:[page('a'),page('b')],revision:'saved-earlier'}),env=environment(documentBundle,ports),close=env.source.openScanDocument();
 try{
  await tick();assert.equal(state.saves,0,'an empty review writes no draft');
  env.button('Load saved draft').click();await tick();
  env.button('Move page 1 later').click();await tick();assert.equal(state.saves,1,'the edit is saved over the loaded draft');
  env.button('Save document PDF').click();await tick();
  assert.equal(state.exports,1);assert.equal(state.deletes,0,'editing a loaded draft does not make it disposable');assert.equal(state.stored.revision,'revision-1');
 }finally{close();env.dom.window.close();}
});

test('removing the last page ends the automatic draft so it cannot be resumed; a loaded draft stays',async()=>{
 {
  const {state,ports}=draftPorts(),env=environment(documentBundle,ports),close=env.source.openScanDocument(page('one'));
  try{
   await tick();assert.equal(state.stored.revision,'revision-1');
   env.button('Remove page 1').click();await tick();
   assert.equal(state.deletes,1);assert.equal(state.stored,undefined,'the removed page is not left in a resumable draft');
   assert.equal(env.button('Delete saved draft').hidden,true);
  }finally{close();env.dom.window.close();}
 }
 {
  const {state,ports}=draftPorts({pages:[page('a')],revision:'saved-earlier'}),env=environment(documentBundle,ports),close=env.source.openScanDocument();
  try{
   await tick();env.button('Load saved draft').click();await tick();
   env.button('Remove page 1').click();await tick();
   assert.equal(state.deletes,0);assert.equal(state.stored.revision,'saved-earlier','a draft the user loaded is left alone');
  }finally{close();env.dom.window.close();}
 }
});

test('a searchable export that wrote nothing leaves export available; an unknown one locks it',async()=>{
 const {source,dom}=environment(documentBundle,draftPorts().ports);
 for(const status of ['reviewed','cancelled','failed','unavailable','too-large'])assert.equal(source.searchableReviewLocksExport(status),false,status);
 for(const status of ['exported','requested','unverified','unconfirmed'])assert.equal(source.searchableReviewLocksExport(status),true,status);
 dom.window.close();
 for(const [status,locked] of [['failed',false],['unavailable',false],['unconfirmed',true],['exported',true]]){
  const {state,ports}=draftPorts();state.searchResult={status,message:'searchable '+status};
  const env=environment(documentBundle,ports),close=env.source.openScanDocument(page('one'));
  try{
   await tick();env.button('Save searchable PDF').click();await tick();
   assert.equal(env.button('Save document PDF').disabled,locked,status);assert.equal(env.button('Save searchable PDF').disabled,locked,status);
   assert.equal(state.deletes,status==='exported'?1:0,status);
  }finally{close();env.dom.window.close();}
 }
});

test('closing the searchable review is unconfirmed only after the provider was asked',async()=>{
 const layers=[[{text:'line',x:0,y:0,width:1,height:.1}]];
 for(const requested of [false,true]){
  let calls=0;const ports={export:(_images,_signal,_title,_layers,onRequest)=>{calls++;if(requested)onRequest();return new Promise(()=>{});}};
  const env=environment(searchableBundle,ports);
  assert.equal(env.source.searchableCloseUnconfirmed(true,false),false);assert.equal(env.source.searchableCloseUnconfirmed(true,true),true);assert.equal(env.source.searchableCloseUnconfirmed(false,true),false);
  const result=env.source.reviewSearchableScan([page('one')],new AbortController().signal,layers);
  await tick();env.button('Save reviewed searchable PDF').click();await tick();assert.equal(calls,1);
  env.button('Cancel searchable PDF').click();
  const value=await result;
  if(requested)assert.equal(value.status,'unconfirmed','a request that reached the provider has an unknown outcome');
  else assert.equal(value,undefined,'closing while the PDF is still being prepared wrote nothing');
  env.dom.window.close();
 }
});

test('exportScanPdf announces the request only when the provider is about to be called',async()=>{
 const url=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
 const index=url(stripTypeScriptTypes(readFileSync('apps/app/src/prototype/files-index.ts','utf8')));
 const source=stripTypeScriptTypes(readFileSync('apps/app/src/prototype/scan-pdf.ts','utf8'))
  .replace("'../../../../.eliza/client-features/plugins/plugin-files/src/documents/scan-pdf.ts'",JSON.stringify(url('export const createScanPdf=(...args)=>globalThis.scanRequestTest.create(...args);')))
  .replace("'../platform-plugins'",JSON.stringify(url('export const registerPlugin=()=>({exportPdf:input=>globalThis.scanRequestTest.exportPdf(input)});')))
  .replace("'./files-index'",JSON.stringify(index));
 const {exportScanPdf}=await import(url(source+'\n// request-order'));
 const order=[];
 globalThis.scanRequestTest={create:async()=>{order.push('create');throw Error('too large');},exportPdf:async()=>{order.push('export');return {status:'failed',message:'no'};}};
 await assert.rejects(exportScanPdf(new Blob(['x']),new AbortController().signal,'t',undefined,()=>order.push('request')));
 assert.deepEqual(order,['create'],'a conversion failure never reports a request');
 order.length=0;globalThis.scanRequestTest.create=async()=>{order.push('create');return new TextEncoder().encode('%PDF');};
 await exportScanPdf(new Blob(['x']),new AbortController().signal,'t',undefined,()=>order.push('request'));
 assert.deepEqual(order,['create','request','export']);
 order.length=0;const aborted=new AbortController();globalThis.scanRequestTest.create=async()=>{aborted.abort();return new TextEncoder().encode('%PDF');};
 await assert.rejects(exportScanPdf(new Blob(['x']),aborted.signal,'t',undefined,()=>order.push('request')));
 assert.deepEqual(order,[],'a review closed during preparation never reaches the provider');
});

test('page capture: a stopped camera cannot be used to discard the reviewed capture',async()=>{
 const dom=new JSDOM('<!doctype html><html><body><main class="os"></main></body></html>',{url:'https://scan.example.test/'});
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 const ended=[],track={readyState:'live',stop(){},addEventListener(_name,listener){ended.push(listener);}};
 const stream={getVideoTracks:()=>[track],getTracks:()=>[track]};
 const video=dom.window.HTMLVideoElement.prototype;video.play=async()=>{};video.pause=()=>{};
 Object.defineProperty(video,'readyState',{get:()=>4});Object.defineProperty(video,'videoWidth',{get:()=>640});Object.defineProperty(video,'videoHeight',{get:()=>480});Object.defineProperty(video,'srcObject',{set(){},get(){return null;}});
 const canvas=dom.window.HTMLCanvasElement.prototype;canvas.getContext=()=>({drawImage(){}});canvas.toBlob=done=>done(new Blob(['frame'],{type:'image/jpeg'}));
 const revoked=[];
 const context=vm.createContext({document:dom.window.document,window:dom.window,HTMLElement:dom.window.HTMLElement,console,setTimeout,clearTimeout,Blob,navigator:{mediaDevices:{getUserMedia:async()=>stream}},URL:{createObjectURL:()=>'blob:capture',revokeObjectURL:url=>revoked.push(url)}});
 const code=stripTypeScriptTypes(readFileSync('apps/app/src/prototype/scan-page-camera.ts','utf8').replace(/^import .*;\n/gm,'').replace('export function','function'));
 vm.runInContext(code+';globalThis.captureScanPage=captureScanPage;',context);
 const result=context.captureScanPage(new AbortController().signal);await tick();
 const button=name=>[...dom.window.document.querySelectorAll('button')].find(b=>b.textContent===name);
 button('Capture page').click();await tick();
 assert.equal(button('Use captured page').disabled,false);assert.equal(button('Retake capture').hidden,false);
 track.readyState='ended';for(const listener of ended)listener();
 assert.equal(button('Retake capture').disabled,true,'Retake is unavailable once the camera stopped');
 button('Retake capture').disabled=false;button('Retake capture').click();
 assert.deepEqual(revoked,[],'the only capture is not discarded without a live camera');assert.equal(button('Use captured page').disabled,false);
 button('Use captured page').click();
 assert.equal((await result).size,5,'the reviewed capture is still the result');
 dom.window.close();
});
