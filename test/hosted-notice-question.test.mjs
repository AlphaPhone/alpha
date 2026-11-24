import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
test('retained result Ask stages a file only for the exact current owner and content',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'hosted-ask-')),previous=globalThis.window;globalThis.window=new EventTarget();
 const port={sensitive:false};globalThis.__hostedQuestionFixture=port;
 try{
  const bundle=await build({entryPoints:[resolve('apps/app/src/runtime/hosted-notice-question.ts')],bundle:true,format:'esm',platform:'node',write:false,plugins:[{name:'ports',setup(b){b.onResolve({filter:/alpha-client$|hosted-digests$/},a=>({path:a.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path.endsWith('alpha-client')?'export const alphaClient={getState:()=>({context:{sensitive:globalThis.__hostedQuestionFixture.sensitive}})};':'export const digestSummaryText=result=>result.output;'}));}}]});
  const file=join(dir,'question.mjs');writeFileSync(file,bundle.outputFiles[0].text);const {reviewHostedNoticeQuestion,hostedTapResolver}=await import(pathToFileURL(file));
  const gate=hostedTapResolver();let release;let resolutions=0,dialogs=0;
  const first=gate(async()=>{resolutions++;await new Promise(r=>release=r);dialogs++;});
  await gate(async()=>{resolutions++;dialogs++;});assert.equal(resolutions,1);assert.equal(dialogs,0);
  release();await first;assert.equal(dialogs,1);
  await assert.rejects(gate(async()=>{throw Error('native unavailable')}));
  await gate(async()=>{resolutions++;});assert.equal(resolutions,2,'failure releases the reservation');
  const result={kind:'ready',question:true,token:'token-1',result:{runId:'run-1',output:'Your reviewed tasks are ready.'}};
  let current=true,ready=true,consumed=0,reported=0,unreviewable=0;
  const staged=[],closed=[];
  const tick=()=>new Promise(r=>setImmediate(r));
  const options={result,current:()=>current,recheck:async()=>result,canCompose:()=>ready,consume:async()=>{consumed++},
   async attach(selection){
    const file=await selection.read(selection.current);
    if(!file||!selection.current()||!await selection.commit(selection.current))return false;
    staged.push({name:file.name,text:await file.text(),prompt:selection.prompt});
    return true;
   },
   report:()=>{reported++},unreviewable:()=>{unreviewable++},closed:attached=>closed.push(attached)};
  reviewHostedNoticeQuestion({...options,attach:async selection=>{assert.ok(await selection.read(selection.current));return false;}});await tick();assert.equal(consumed,0);
  reviewHostedNoticeQuestion(options);await tick();assert.equal(consumed,1);
  assert.deepEqual(staged,[{name:'Saved result.txt',text:'Your reviewed tasks are ready.',prompt:'Help me understand this saved result.'}]);
  assert.deepEqual(closed,[false,true]);
  reviewHostedNoticeQuestion({...options,recheck:async()=>({...result,result:{...result.result,output:'changed'}})});await tick();assert.equal(consumed,1);assert.equal(staged.length,1);assert.equal(reported,1);
  reviewHostedNoticeQuestion({...options,recheck:async()=>{current=false;return result}});await tick();assert.equal(consumed,1);assert.equal(staged.length,1);
  current=true;ready=false;reviewHostedNoticeQuestion(options);await tick();assert.equal(consumed,1,'notice survives when the conversation cannot take the draft');assert.equal(staged.length,1);assert.equal(reported,3);
  ready=true;assert.equal(reviewHostedNoticeQuestion({...options,result:{...result,result:{...result.result,output:'No readable summary was returned. Open execution details to inspect this result.'}}}),undefined);assert.equal(unreviewable,1,'unreadable result falls back to the ordinary open path');assert.equal(reported,3);
  port.sensitive=true;assert.equal(reviewHostedNoticeQuestion(options),undefined);assert.equal(unreviewable,2);
 }finally{globalThis.window=previous;delete globalThis.__hostedQuestionFixture;rmSync(dir,{recursive:true,force:true});}
});
