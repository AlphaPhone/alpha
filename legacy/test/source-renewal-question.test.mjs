import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
test('source renewal Ask stages the bounded text for only the matching current route',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'hosted-ask-')),previous=globalThis.window;globalThis.window=new EventTarget();
 const port={sensitive:false};globalThis.__hostedQuestionFixture=port;
 try{
  const bundle=await build({entryPoints:[resolve('apps/app/src/runtime/source-renewal-question.ts')],bundle:true,format:'esm',platform:'node',write:false,plugins:[{name:'ports',setup(b){b.onResolve({filter:/alpha-client$/},a=>({path:a.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const alphaClient={getState:()=>({context:{sensitive:globalThis.__hostedQuestionFixture.sensitive}})};'}));}}]});
  const file=join(dir,'question.mjs');writeFileSync(file,bundle.outputFiles[0].text);const {reviewSourceRenewalQuestion,renewalMatches}=await import(pathToFileURL(file));
  const selection={provider:'native',ownerId:'owner',agentId:'agent',installationId:'install',enrollmentId:'enroll',sourceId:'source',revision:'r1'};
  const tap={token:'token',question:true,selection,expiresAt:Date.parse('2026-10-15T00:00:00Z')};
  let current=true,settled=0,reported=0;
  const staged=[];
  const tick=()=>new Promise(r=>setImmediate(r));
  const options={tap,signal:new AbortController().signal,current:()=>current,recheck:async()=>tap,consume:async()=>{settled++},canCompose:()=>true,
   async attach(selection){
    const file=await selection.read(selection.current);
    if(!file||!selection.current()||!await selection.commit(selection.current))return false;
    staged.push({name:file.name,text:await file.text(),prompt:selection.prompt});
    return true;
   },report:()=>{reported++},closed:()=>{}};
  assert.equal(renewalMatches(tap,selection,'2026-10-15T00:00:00Z'),true);
  for(const field of ['ownerId','agentId','installationId','enrollmentId','sourceId','revision'])assert.equal(renewalMatches(tap,{...selection,[field]:'changed'},'2026-10-15T00:00:00Z'),false);
  reviewSourceRenewalQuestion({...options,attach:async selection=>{assert.ok(await selection.read(selection.current));return false;}});await tick();assert.equal(settled,0);
  reviewSourceRenewalQuestion(options);await tick();assert.equal(settled,1);
  assert.deepEqual(staged,[{name:'Source renewal.txt',text:'Access for your daily brief expires soon. Renew it to keep your brief updated.',prompt:'Help me understand this source renewal.'}]);
  reviewSourceRenewalQuestion({...options,recheck:async()=>({...tap,token:'new'})});await tick();assert.equal(settled,1);assert.equal(staged.length,1);
  reviewSourceRenewalQuestion({...options,recheck:async()=>{current=false;return tap}});await tick();assert.equal(settled,1);assert.equal(staged.length,1);
  current=true;reviewSourceRenewalQuestion({...options,consume:async()=>{current=false}});await tick();assert.equal(staged.length,1);
  current=true;reviewSourceRenewalQuestion(options);window.dispatchEvent(new Event('blur'));await tick();assert.equal(settled,1,'lifecycle close preserves pending');
  port.sensitive=true;assert.equal(reviewSourceRenewalQuestion(options),undefined);assert.ok(reported>=3);
 }finally{globalThis.window=previous;delete globalThis.__hostedQuestionFixture;rmSync(dir,{recursive:true,force:true});}
});
