import assert from 'node:assert/strict';
import {test} from 'node:test';
import {resolve,join} from 'node:path';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

test('private SMS drafts survive closing and reopening the page; stale edits and storage refusal preserve complete text, pictures and operation identity', {timeout:90000},async()=>{
 const {outputFiles:[bundle]}=await build({stdin:{resolveDir:process.cwd(),contents:`import {nativeSmsDraftShelf} from './apps/app/src/runtime/native-sms-drafts'; import {browserDocuments} from './apps/app/src/browser/documents'; globalThis.smsDraftFixture={nativeSmsDraftShelf,browserDocuments};`},bundle:true,write:false,platform:'browser',format:'iife',alias:{'@elizaos/core/protocol':resolve('.eliza/client-features/alpha-voice-core-protocol.ts')}});
 const browser=await chromium.launch({headless:true,...(process.env.ALPHA_CHROMIUM_PATH?{executablePath:process.env.ALPHA_CHROMIUM_PATH}:{})});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});await context.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<title>Private SMS draft storage</title>'}));
  let page=await context.newPage();await page.goto('https://sms-drafts.refinement.invalid/');await page.addScriptTag({content:bundle.text});
  const original={id:'draft-1',revision:'revision-1',thread:'thread:12',recipients:'+15555550100, unfinished',body:'Unsent body\nwith original spacing ',sim:'3',updatedAt:1794700000000,pictures:[{name:'Photo.jpg',contentType:'image/jpeg',dataBase64:'AQID'}],mms:{id:'reviewed-operation-1',recipients:['+15555550100'],body:'Unsent body\nwith original spacing ',subscriptionId:3}};
  await page.evaluate(row=>globalThis.smsDraftFixture.nativeSmsDraftShelf().save(row,null),original);await page.close();
  page=await context.newPage();await page.goto('https://sms-drafts.refinement.invalid/');await page.addScriptTag({content:bundle.text});
  assert.deepEqual(await page.evaluate(()=>globalThis.smsDraftFixture.nativeSmsDraftShelf().load()),[original]);
  const result=await page.evaluate(async original=>{
   const {nativeSmsDraftShelf,browserDocuments}=globalThis.smsDraftFixture,shelf=nativeSmsDraftShelf();
   const next={...original,revision:'revision-2',body:'Newer saved text'};await shelf.save(next,original.revision);
   let conflict='';try{await shelf.save({...original,body:'Stale overwrite'},original.revision);}catch(error){conflict=error.message;}
   const before=await browserDocuments.read('alpha.native.sms.drafts.v1'),put=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(){throw new DOMException('Quota refused','QuotaExceededError');};
   let refused='';try{await shelf.save({...next,revision:'revision-3',body:'Keep in composer'},next.revision);}catch(error){refused=error.message;}finally{IDBObjectStore.prototype.put=put;}
   const after=await browserDocuments.read('alpha.native.sms.drafts.v1');
   let staleDelete='';try{await shelf.remove(original.id,original.revision);}catch(error){staleDelete=error.message;}
   return {conflict,refused,staleDelete,bytesEqual:before.raw===after.raw,rows:await shelf.load()};
  },original);
  assert.match(result.conflict,/changed elsewhere/);assert.match(result.refused,/Quota refused/);assert.match(result.staleDelete,/newer message draft/);assert.equal(result.bytesEqual,true);assert.deepEqual(result.rows,[{...original,revision:'revision-2',body:'Newer saved text'}]);
  const traceDir=mkdtempSync(join(tmpdir(),'alpha-message-draft-trace-'));
  try{
   const model=spawnSync(process.execPath,[resolve('node_modules/@informalsystems/quint/dist/src/cli.js'),'test','specs/quint/application/NativeMessageDraft.qnt','--main=NativeMessageDraft','--backend=typescript','--max-samples=1','--seed=20261107','--match=^storageRefusalTest$',`--out-itf=${traceDir}/trace-{test}-{seq}.json`],{encoding:'utf8',timeout:30000});
   assert.equal(model.status,0,model.stdout+'\n'+model.stderr);
   const trace=JSON.parse(readFileSync(join(traceDir,'trace-storageRefusalTest-0.json'),'utf8'),(_key,value)=>value&&typeof value==='object'&&'#bigint' in value?Number(value['#bigint']):value);
   const final=trace.states.at(-1).s;assert.equal(final.disk,Number(result.rows[0].revision.split('-')[1]));assert.equal(final.refused,!!result.refused);assert.equal(final.sends,0);
  }finally{rmSync(traceDir,{recursive:true,force:true});}
  await context.close();
 }finally{await browser.close();}
});
