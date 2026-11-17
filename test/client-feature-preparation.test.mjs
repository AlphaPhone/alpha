import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {buildSync} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn, spawnSync} from 'node:child_process';
import {git as fixtureGit} from './fixtures/git-fixture.mjs';
import {prepareClientFeatures, CLIENT_FEATURE_PATHS} from '../scripts/prepare-client-features.ts';
const fixtureLeaf=CLIENT_FEATURE_PATHS.find(prefix=>path.extname(prefix));
assert.ok(fixtureLeaf,'the authentication fixtures need a selected leaf file');
function fixture(run) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'alpha-client-source-'));
 const vendor=path.join(root,'vendor/eliza');fs.mkdirSync(vendor,{recursive:true});
 const git=args=>fixtureGit(vendor,...args),cleanup=()=>fs.rmSync(root,{recursive:true,force:true});
 let pending=false;
 try {
  git(['init','-q']);
  for(const prefix of CLIENT_FEATURE_PATHS) {
   const file=path.join(vendor,path.extname(prefix)?prefix:prefix+'/fixture.ts');
   fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'export const value = 1;\n');
  }
  // A concrete upstream Google host leaf exercises direct source copying.
  fs.writeFileSync(path.join(vendor,'packages/app/src/runtime/managed-google-agent/managed-google-agent-host.ts'),'export const value = 1;\n');
  // The development launcher imports the shared verifier through its product adapter.
  for(const name of ['immutable-workspace-source.mjs','committed-source.mjs']) {
   const relative=`packages/app/scripts/lib/${name}`,target=path.join(vendor,relative);
   fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join('vendor/eliza',relative),target);
  }
  git(['add','.']);git(['-c','user.name=Source fixture','-c','user.email=fixture@example.invalid','commit','-qm','Fixture']);
  const commit=git(['rev-parse','HEAD']);fs.writeFileSync(path.join(root,'upstream.lock.json'),JSON.stringify({commit}));
  const result=run({root,vendor,commit,git});
  if(result?.then){pending=true;return result.finally(cleanup);}
  return result;
 } finally {if(!pending)cleanup();}
}
test('prepared client source repairs changed, missing and unexpected cached files',()=>fixture(({root,commit})=>{
 const source=prepareClientFeatures({root,projectVoice:false}),stamp=JSON.parse(fs.readFileSync(path.join(source,'.source.json'))),file=Object.keys(stamp.files)[0],original=fs.readFileSync(path.join(source,file));
 fs.writeFileSync(path.join(source,file),'corrupt');fs.writeFileSync(path.join(source,'unexpected.ts'),'unreviewed');
 assert.equal(prepareClientFeatures({root,projectVoice:false}),source);assert.deepEqual(fs.readFileSync(path.join(source,file)),original);assert.equal(fs.existsSync(path.join(source,'unexpected.ts')),false);
 fs.unlinkSync(path.join(source,file));prepareClientFeatures({root,projectVoice:false});assert.deepEqual(fs.readFileSync(path.join(source,file)),original);assert.equal(stamp.baseCommit,commit);
}));
test('concurrent preparers after a source change all succeed and leave one authenticated tree',()=>fixture(async({root,vendor,git})=>{
 prepareClientFeatures({root,projectVoice:false});
 fs.appendFileSync(path.join(vendor,fixtureLeaf),'export const changed = 2;\n');
 git(['add','.']);git(['-c','user.name=Source fixture','-c','user.email=fixture@example.invalid','commit','-qm','Change']);
 const commit=git(['rev-parse','HEAD']);fs.writeFileSync(path.join(root,'upstream.lock.json'),JSON.stringify({commit}));
 const script=`import {prepareClientFeatures} from ${JSON.stringify(path.resolve('scripts/prepare-client-features.ts'))};prepareClientFeatures({root:${JSON.stringify(root)},projectVoice:false});`;
 const run=()=>new Promise(resolve=>{const child=spawn(process.execPath,['-e',script],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk;});child.on('close',status=>resolve({status,stderr}));});
 for(const result of await Promise.all(Array.from({length:12},run))) assert.equal(result.status,0,result.stderr);
 const source=path.join(root,'.eliza/client-features'),stamp=JSON.parse(fs.readFileSync(path.join(source,'.source.json')));
 assert.equal(stamp.baseCommit,commit);assert.match(fs.readFileSync(path.join(source,fixtureLeaf),'utf8'),/changed = 2/);
 assert.equal(prepareClientFeatures({root,projectVoice:false,check:true}),source);
 assert.deepEqual(fs.readdirSync(path.join(root,'.eliza')),['client-features'],'no staging or set-aside tree is left behind');
}));
test('client feature publication retires once while a peer moves the winner',()=>fixture(async({root,vendor,git})=>{
 const destination=prepareClientFeatures({root,projectVoice:false});
 const prior=JSON.parse(fs.readFileSync(path.join(destination,'.source.json')));
 fs.appendFileSync(path.join(vendor,fixtureLeaf),'export const changed = 2;\n');
 git(['add','.']);git(['commit','-qm','Change']);
 const commit=git(['rev-parse','HEAD']);fs.writeFileSync(path.join(root,'upstream.lock.json'),JSON.stringify({commit}));
 const changed=createHash('sha256').update(fs.readFileSync(path.join(vendor,fixtureLeaf))).digest('hex');
 const expected={...prior,baseCommit:commit,sourceFiles:{...prior.sourceFiles,[fixtureLeaf]:changed},files:{...prior.files,[fixtureLeaf]:changed}};
 const control=path.join(root,'control');fs.mkdirSync(control);
 const actors=['reader','peer1','peer2'],events=[],locations={};
 const worker=String.raw`
  import fs from 'node:fs';import path from 'node:path';
  const [actor,root,control,preparer]=process.argv.slice(1),destination=path.join(root,'.eliza/client-features');
  const original={rename:fs.renameSync,lstat:fs.lstatSync,remove:fs.rmSync,mkdtemp:fs.mkdtempSync};
  const wait=new Int32Array(new SharedArrayBuffer(4));let stage,aside,retire=0,publish=0,read=0,collided=false;
  function writeControl(key,value){const file=path.join(control,actor+'-'+key+'.json'),pending=file+'.'+process.pid+'.pending';fs.writeFileSync(pending,JSON.stringify(value));original.rename(pending,file);}
  function gate(key,value,timeout=20000){writeControl(key,{actor,...value,stage,aside});const until=Date.now()+timeout;while(!fs.existsSync(path.join(control,actor+'-'+key+'.allow'))){if(Date.now()>until)throw Error('Fixture gate timed out: '+actor+' '+key);Atomics.wait(wait,0,0,5);}}
  fs.mkdtempSync=function(prefix,...args){const result=original.mkdtemp(prefix,...args);if(String(prefix).includes('client-features-stage-'))stage=result;return result;};
  fs.renameSync=function(from,to){
   const kind=from===destination?'retire':to===destination&&from===stage?'publish':undefined;
   if(!kind)return original.rename(from,to);
   const attempt=kind==='retire'?++retire:++publish;if(kind==='retire')aside=to;
   if(kind==='retire'&&attempt===1)gate('prepared-ready',{operation:'prepared',phase:'ready'},60000);
   gate(kind+'-'+attempt+'-ready',{operation:kind,phase:'ready',attempt});
   let outcome='success',error;try{original.rename(from,to);}catch(cause){outcome=cause.code;error=cause;}
   if(kind==='publish'&&['EEXIST','ENOTEMPTY'].includes(outcome))collided=true;
   gate(kind+'-'+attempt+'-done',{operation:kind,phase:'done',attempt,outcome});
   if(error)throw error;
  };
  fs.lstatSync=function(file,...args){
   if(actor!=='reader'||!collided||file!==destination)return original.lstat(file,...args);
   const attempt=++read;gate('read-'+attempt+'-ready',{operation:'read',phase:'ready',attempt});
   let result,error,outcome='present';try{result=original.lstat(file,...args);collided=false;}catch(cause){outcome=cause.code;error=cause;}
   gate('read-'+attempt+'-done',{operation:'read',phase:'done',attempt,outcome});if(error)throw error;return result;
  };
  fs.rmSync=function(file,...args){
   const kind=file===aside?'aside':file===stage?'stage':undefined;if(!kind)return original.remove(file,...args);
   gate('cleanup-'+kind+'-ready',{operation:'cleanup',slot:kind,phase:'ready'});
   const result=original.remove(file,...args);gate('cleanup-'+kind+'-done',{operation:'cleanup',slot:kind,phase:'done',outcome:'success'});return result;
  };
  try{const {prepareClientFeatures}=await import(preparer);prepareClientFeatures({root,projectVoice:false});writeControl('complete',{status:0,retire,publish,read});}
  catch(error){writeControl('complete',{status:1,retire,publish,read,error:error.stack});process.exitCode=1;}
 `;
 const children=actors.map(actor=>{
  const child=spawn(process.execPath,['-e',worker,actor,root,control,pathToFileURL(path.resolve('scripts/prepare-client-features.ts')).href],{stdio:['ignore','ignore','pipe']});
  let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk;});
  const closed=new Promise(resolve=>child.on('close',status=>resolve({actor,status,stderr})));
  return {actor,child,closed,diagnostic:()=>({status:child.exitCode,signal:child.signalCode,stderr})};
 });
 const marker=(actor,key)=>path.join(control,actor+'-'+key);
 async function ready(actor,key,timeout=20000){
  const until=Date.now()+timeout,target=marker(actor,key+'.json');
  while(!fs.existsSync(target)){
   const running=children.find(row=>row.actor===actor),state=running.diagnostic(),complete=marker(actor,'complete.json');
   const finished=fs.existsSync(complete),expired=Date.now()>until;
   // The child can publish the requested event between the first poll and the completion check.
   if(fs.existsSync(target))break;
   if(finished)throw Error('Worker completed before fixture event: '+actor+' '+key+'; '+fs.readFileSync(complete,'utf8')+'; '+JSON.stringify(state));
   if(state.status!==null||state.signal!==null)throw Error('Worker exited before fixture event: '+actor+' '+key+'; '+JSON.stringify(state));
   if(expired)throw Error('Missing fixture event: '+actor+' '+key+'; '+JSON.stringify(state));
   await new Promise(resolve=>setTimeout(resolve,5));
  }
  const event=JSON.parse(fs.readFileSync(target));locations[actor]={stage:event.stage,aside:event.aside};return event;
 }
 const allow=(actor,key)=>fs.writeFileSync(marker(actor,key+'.allow'),'');
 function inventoryAt(directory){
  if(!directory||!fs.existsSync(directory))return null;
  const result={};function visit(current){for(const entry of fs.readdirSync(current,{withFileTypes:true})){const file=path.join(current,entry.name);assert.equal(entry.isSymbolicLink(),false);if(entry.isDirectory())visit(file);else{assert.equal(entry.isFile(),true);result[path.relative(directory,file)]=createHash('sha256').update(fs.readFileSync(file)).digest('hex');}}}visit(directory);return result;
 }
 function classify(directory){
  const actual=inventoryAt(directory);if(!actual)return 'absent';
  const stamp=JSON.parse(fs.readFileSync(path.join(directory,'.source.json')));delete actual['.source.json'];
  const exact=expected.files;
  return JSON.stringify(stamp)===JSON.stringify(expected)&&Object.keys(actual).length===Object.keys(exact).length&&Object.entries(exact).every(([key,value])=>actual[key]===value)?'current':stamp.baseCommit===prior.baseCommit?'stale':'other';
 }
 function record(event){events.push({...event,visible:classify(destination),actors:Object.fromEntries(actors.map(actor=>[actor,{stage:classify(locations[actor]?.stage),aside:classify(locations[actor]?.aside)}]))});}
 async function operation(actor,kind,attempt=1){
  const key=kind+'-'+attempt,event=await ready(actor,key+'-ready');allow(actor,key+'-ready');
  const result=await ready(actor,key+'-done');record(result);allow(actor,key+'-done');return {...event,...result};
 }
 async function cleanup(actor){
  for(const slot of ['aside','stage']){
   const key='cleanup-'+slot;await ready(actor,key+'-ready');allow(actor,key+'-ready');const result=await ready(actor,key+'-done');record(result);allow(actor,key+'-done');
  }
  return ready(actor,'complete');
 }
 try{
  // Source authentication/materialization is setup. Start the controlled race only
  // when every real worker has a complete private candidate, even on a busy host.
  await Promise.all(actors.map(actor=>ready(actor,'prepared-ready',60000)));
  for(const actor of actors)allow(actor,'prepared-ready');
  await Promise.all(actors.map(actor=>ready(actor,'retire-1-ready')));
  record({actor:'all',operation:'prepared',phase:'done'});
  await operation('reader','retire');
  await ready('reader','publish-1-ready');
  await operation('peer1','retire');await operation('peer1','publish');await cleanup('peer1');
  const collision=await operation('reader','publish');assert.ok(['EEXIST','ENOTEMPTY'].includes(collision.outcome));
  await ready('reader','read-1-ready');await operation('peer2','retire');
  assert.equal((await operation('reader','read')).outcome,'ENOENT');
  // The old implementation retires again here. Keep the fixture schedulable so its actual
  // extra mutation is reported by the assertion, instead of replacing it with a fake error.
  const until=Date.now()+20000;
  while(!fs.existsSync(marker('reader','read-2-ready.json'))&&!fs.existsSync(marker('reader','cleanup-aside-ready.json'))&&!fs.existsSync(marker('reader','retire-2-ready.json'))){if(Date.now()>until)throw Error('Reader did not continue after peer readback');await new Promise(resolve=>setTimeout(resolve,5));}
  if(fs.existsSync(marker('reader','cleanup-aside-ready.json'))){
   // Old retry cleans its first aside before its second retirement.
   for(const suffix of ['ready','done']){const key='cleanup-aside-'+suffix;const event=await ready('reader',key);if(suffix==='done')record(event);allow('reader',key);}
   await ready('reader','retire-2-ready');
  }
  if(fs.existsSync(marker('reader','retire-2-ready.json'))){
   await operation('reader','retire',2);await ready('reader','publish-2-ready');
   await operation('peer2','publish');await cleanup('peer2');await operation('reader','publish',2);
  }else{await operation('peer2','publish');await cleanup('peer2');}
  await operation('reader','read',2);const result=await cleanup('reader');
  const statuses=await Promise.all(children.map(child=>child.closed));
  const source=prepareClientFeatures({root,projectVoice:false,check:true});
  const noSidecars=JSON.stringify(fs.readdirSync(path.join(root,'.eliza')))===JSON.stringify(['client-features']);
  const trace={schema:'alpha-client-feature-publication-trace/v1',events,final:{statuses,reader:result,authenticated:source===destination&&classify(destination)==='current',noSidecars}};
  if(process.env.ALPHA_CLIENT_FEATURE_PUBLICATION_TRACE)fs.writeFileSync(process.env.ALPHA_CLIENT_FEATURE_PUBLICATION_TRACE,JSON.stringify(trace,null,2)+'\n');
  for(const status of statuses)assert.equal(status.status,0,status.stderr);
  assert.equal(result.retire,1,'a losing preparer must never retire the peer winner again');
  assert.equal(result.publish,1,'a losing preparer publishes its private candidate at most once');
  assert.equal(trace.final.authenticated,true);assert.equal(noSidecars,true);
 }finally{
  for(const {child}of children)if(child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM');
  await Promise.all(children.map(child=>child.closed));
 }
}));
test('client source rejects changed pin and upstream content without replacing its cache',()=>fixture(({root,vendor,commit})=>{
 const source=prepareClientFeatures({root,projectVoice:false}),stamp=fs.readFileSync(path.join(source,'.source.json'));
 fs.writeFileSync(path.join(root,'upstream.lock.json'),JSON.stringify({commit:'0'.repeat(40)}));assert.throws(()=>prepareClientFeatures({root,projectVoice:false}),/Unexpected upstream source pin/);
 fs.writeFileSync(path.join(root,'upstream.lock.json'),JSON.stringify({commit}));
 fs.appendFileSync(path.join(vendor,fixtureLeaf),'corrupt');assert.throws(()=>prepareClientFeatures({root,projectVoice:false}),/dirty|drift/);assert.deepEqual(fs.readFileSync(path.join(source,'.source.json')),stamp);
}));
test('client source refuses unknown directories and cache symlinks',()=>fixture(({root})=>{
 const source=path.join(root,'.eliza/client-features');fs.mkdirSync(source,{recursive:true});fs.writeFileSync(path.join(source,'keep'),'owned elsewhere');assert.throws(()=>prepareClientFeatures({root,projectVoice:false}),/unrecognized/);assert.equal(fs.readFileSync(path.join(source,'keep'),'utf8'),'owned elsewhere');
 fs.rmSync(source,{recursive:true});prepareClientFeatures({root,projectVoice:false});fs.symlinkSync(path.join(root,'upstream.lock.json'),path.join(source,'unexpected-link'));assert.throws(()=>prepareClientFeatures({root,projectVoice:false}),/Symlink/);assert.equal(fs.existsSync(path.join(root,'upstream.lock.json')),true);
}));
test('client source cannot follow a linked staging parent',()=>fixture(({root})=>{
 const outside=path.join(root,'outside');fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'keep'),'retained');fs.symlinkSync(outside,path.join(root,'.eliza'));assert.throws(()=>prepareClientFeatures({root,projectVoice:false}),/Nonregular/);assert.deepEqual(fs.readdirSync(outside),['keep']);
}));
test('client source rejects committed symlinks and missing source groups',()=>fixture(({root,vendor,git})=>{
 const file=path.join(vendor,fixtureLeaf);fs.unlinkSync(file);fs.symlinkSync('../../outside',file);
 git(['add','.']);git(['-c','user.name=Source fixture','-c','user.email=fixture@example.invalid','commit','-qm','Symlink']);
 fs.writeFileSync(path.join(root,'upstream.lock.json'),JSON.stringify({commit:git(['rev-parse','HEAD'])}));assert.throws(()=>prepareClientFeatures({root,projectVoice:false}),/Nonregular upstream/);
 fs.unlinkSync(file);git(['add','.']);git(['-c','user.name=Source fixture','-c','user.email=fixture@example.invalid','commit','-qm','Missing source']);
 fs.writeFileSync(path.join(root,'upstream.lock.json'),JSON.stringify({commit:git(['rev-parse','HEAD'])}));assert.throws(()=>prepareClientFeatures({root,projectVoice:false}),/Missing upstream source/);
}));
test('direct local development launcher prepares a clean client tree before starting services',()=>fixture(({root,commit})=>{
 for(const file of ['scripts/dev-local.ts','scripts/dev-speech-settings.ts','scripts/speech-env.ts','scripts/local-agent-source.ts','scripts/copy-file-clone.ts','scripts/prepare-client-features.ts','scripts/upstream-native-source.ts','scripts/upstream-pin.ts','scripts/sha256.ts']){const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);}
 // The generic copier fixture explicitly tests the non-voice projection path.
 const prep=path.join(root,'scripts/prepare-client-features.ts');fs.writeFileSync(prep,fs.readFileSync(prep,'utf8').replace('projectVoice = true','projectVoice = false'));
 // Source hashing and materialization can exceed 20 seconds on a loaded build host.
 const result=spawnSync(process.execPath,[path.join(root,'scripts/dev-local.ts')],{cwd:root,env:{...process.env,ALPHA_REMOTE_PORT:'0',ALPHA_REMOTE_PROFILE:path.join(root,'empty-profile')},encoding:'utf8',timeout:scaledTimeout(120000)});
 assert.equal(result.status,1);assert.match(result.stderr,/Invalid local agent port/);
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'.eliza/client-features/.source.json'))).baseCommit,commit);
 // Development uses authenticated upstream source without a patch cache.
 assert.equal(fs.existsSync(path.join(root,'.eliza/patched')),false);
}));

test('actual pinned client features retain shared voice source unchanged and exclude dashboard transport',()=>{
 const source=prepareClientFeatures(),stamp=JSON.parse(fs.readFileSync(path.join(source,'.source.json')));
 const scan='plugins/plugin-native-camera/src/scan-document.ts';
 assert.equal(stamp.sourceFiles[scan],stamp.files[scan],'Scan state is copied from the pinned shared owner without a product patch');
 assert.deepEqual(fs.readFileSync(path.join(source,scan)),fs.readFileSync(path.join('vendor/eliza',scan)));
assert.equal(stamp.baseCommit,JSON.parse(fs.readFileSync('upstream.lock.json','utf8')).commit);assert.equal(stamp.projectionVersion,16);
 // The browser parser stays byte-exact except its one Node-compatible value import.
 const browserCommand='plugins/plugin-browser/src/native-client-command.ts';
 const browserOriginal=fs.readFileSync(path.join('vendor/eliza',browserCommand),'utf8');
 const browserProjected=fs.readFileSync(path.join(source,browserCommand),'utf8');
 assert.equal(browserProjected,browserOriginal.replace(
  'import { readClientTurnObservation } from "@elizaos/contracts/client-turn-observation";',
  'import { readClientTurnObservation } from "../../../packages/contracts/src/client-turn-observation.ts";'));
 assert.notEqual(stamp.sourceFiles[browserCommand],stamp.files[browserCommand]);
 // Run plain Node without tsx, aliases or a custom loader and exercise the imported
 // observation parser, rather than only checking the spelling of its specifier.
 const browserImport=spawnSync(process.execPath,['-e',`
  import assert from 'node:assert/strict';
  import {observedNativeHistorySelection} from ${JSON.stringify(pathToFileURL(path.join(source,browserCommand)).href)};
  const message={content:{metadata:{clientDevice:{context:{view:'browser',revision:3,selectedObject:{kind:'browser-tab',id:'tab:7',revision:'document:2'}}}}}};
  assert.deepEqual(observedNativeHistorySelection(message,'back'),{id:'tab:7',revision:'document:2'});
  assert.equal(observedNativeHistorySelection(message,'open'),undefined);
  message.content.metadata.clientDevice.context.view='notes';
  assert.equal(observedNativeHistorySelection(message,'back'),undefined);
 `],{encoding:'utf8',timeout:scaledTimeout(30000)});
 assert.equal(browserImport.status,0,browserImport.stderr);
 // Node consumers (the Vite config bundle and backend hosts) load linked-sync through cloud-protocol.
 for(const file of ['google-sync-port.ts','sync-controller.ts','linked-store.ts']){
  const name='plugins/plugin-calendar/src/linked-sync/'+file,projected=fs.readFileSync(path.join(source,name),'utf8'),original=fs.readFileSync(path.join('vendor/eliza',name),'utf8');
  assert.doesNotMatch(projected,/["']@elizaos\/contracts["']/,name+' has no package-name contracts import');
  assert.equal(projected,original.replace('} from "@elizaos/contracts";','} from "../../../../packages/contracts/src/calendar-linked-sync.ts";'),name+' differs from the pinned SDK only in that specifier');
 }
 // Renderer types come from upstream leaf entries copied byte-for-byte; no declaration is extracted.
 // Upstream runs its own notes tests; Alpha copies none of them.
 assert.equal(fs.existsSync(path.join(source,'plugins/plugin-notes/test')),false);
 for(const name of ['alpha-voice-core-types.ts','alpha-client-fetch-types.ts']) assert.equal(fs.existsSync(path.join(source,name)),false,name+' is no longer projected');
 for(const file of ['packages/core/src/schema-types.ts','packages/core/src/types/json.ts','packages/core/src/types/schema.ts','packages/core/src/types/surface-manifest.ts','packages/core/src/types/view-capability.ts','packages/core/src/types/view-kind.ts','plugins/plugin-calendar/src/meetings/auto-join-types.ts','plugins/plugin-calendar/src/api/calendar-api.ts','plugins/plugin-notes/src/types.ts','plugins/plugin-notes/src/capabilities.ts','plugins/plugin-notes/src/client/notes-api.ts']){
  assert.equal(stamp.sourceFiles[file],stamp.files[file],file+' is not projected');
  assert.deepEqual(fs.readFileSync(path.join(source,file)),fs.readFileSync(path.join('vendor/eliza',file)),file+' is copied exactly');
 }
 for(const file of ['packages/core/src/types/plugin.ts','packages/core/src/types/components.ts','packages/core/src/types/model.ts','packages/core/src/types/primitives.ts','packages/ui/src/api/client-base.ts','plugins/plugin-calendar/src/meetings/auto-join-settings.ts']){
  assert.equal(stamp.files[file],undefined,file+' (runtime or class module) is not shipped to the browser');
 }
 const leafBundle=buildSync({entryPoints:[path.join(source,'plugins/plugin-notes/src/client/notes-api.ts')],bundle:true,write:false,platform:'browser',format:'esm',metafile:true,alias:{'@elizaos/core/schema-types':path.join(source,'packages/core/src/schema-types.ts'),'@elizaos/ui/api/transport':path.resolve('apps/app/src/ui/api/transport.ts')}});
 assert.equal(Object.keys(leafBundle.metafile.inputs).some(file=>/client-base|core\/src\/types\/(plugin|components|model)\.ts/.test(file)),false,'Notes client loads no root core or ElizaClient module');
 assert.equal(Object.keys(leafBundle.metafile.inputs).some(file=>/packages\/ui\//.test(file)),false,'Notes client types its fetch with Alpha\'s transport module, not upstream UI');
 // Alpha owns its renderer UI (apps/app/src/ui): no packages/ui source or plugin component is staged.
 assert.deepEqual(Object.keys(stamp.files).filter(file=>file.startsWith('packages/ui/')||/^plugins\/[^/]+\/src\/components\//.test(file)),[]);
 assert.equal(fs.existsSync(path.join(source,'packages/ui')),false,'no upstream UI package is staged');
 for(const dir of ['plugin-notes','plugin-calendar','plugin-inbox'])assert.equal(fs.existsSync(path.join(source,'plugins',dir,'src/components')),false,dir+' components are not staged');
 for(const file of ['plugins/plugin-calendar/src/api/client-calendar.ts','plugins/plugin-calendar/src/browser.ts','plugins/plugin-calendar/src/index.ts','plugins/plugin-notes/src/workspace.ts']){
  assert.equal(stamp.files[file],undefined,file+' (an upstream UI entry) is not staged');
 }
 // Nor is any other upstream UI entry: no JSX module, no React import, no upstream UI import
 // (only the transport type, aliased to Alpha's module), and no relative import left dangling.
 const stagedCode=Object.keys(stamp.files).filter(file=>/\.(?:[cm]?[jt]sx?)$/.test(file));
 assert.deepEqual(stagedCode.filter(file=>/\.[jt]sx$/.test(file)),[],'no JSX module is staged');
 const importsOf=text=>[...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+|\bexport\s+\*\s+from\s*)(['"])([^'"\n]+)\1/gm)].map(match=>match[2]);
 const uiImports=[],dangling=[];
 for(const file of stagedCode){
  for(const spec of importsOf(fs.readFileSync(path.join(source,file),'utf8'))){
   if(/^(?:react(?:-dom)?|maplibre-gl)(?:\/|$)/.test(spec)||(/^@elizaos\/ui(?:\/|$)/.test(spec)&&spec!=='@elizaos/ui/api/transport')||/(?:^|\/)components\//.test(spec))uiImports.push(file+': '+spec);
   // Upstream's own non-source helpers (e.g. a plugin's quint/ checks) may reference its monorepo tooling.
   if(spec.startsWith('.')&&/(?:^|\/)src\//.test(file)){
    const base=path.join(path.dirname(file),spec.split('?')[0]).replace(/\.js$/,'');
    if(!['','.ts','.tsx','.js','.mjs','.d.ts','.d.mts','/index.ts','/index.js'].some(suffix=>stamp.files[base+suffix]!==undefined||stamp.files[path.join(path.dirname(file),spec.split('?')[0])]!==undefined))dangling.push(file+': '+spec);
   }
  }
 }
 assert.deepEqual(uiImports,[],'no staged module imports React or upstream UI');
 assert.deepEqual(dangling,[],'every relative import in a staged source module resolves to a staged file');
 // Alpha's own mobile shell (registration, page registry, launcher, Home and app grid) loads only
 // its local UI tree and staged non-UI upstream modules; it never reaches upstream UI.
 const shellDir=path.resolve('apps/app/src/ui/mobile-shell');
 const shellBundle=buildSync({entryPoints:fs.readdirSync(shellDir).filter(name=>/\.tsx?$/.test(name)).map(name=>path.join(shellDir,name)),bundle:true,write:false,outdir:path.join(os.tmpdir(),'alpha-shell-bundle'),platform:'browser',format:'esm',metafile:true,external:['react','react-dom','react/jsx-runtime'],alias:{'@elizaos/core/schema-types':path.join(source,'packages/core/src/schema-types.ts'),'@elizaos/capacitor-system/launcher':path.join(source,'plugins/plugin-native-system/src/client/launcher.ts'),'@elizaos/contracts':path.join(source,'client-contracts.ts')}});
 const shellInputs=Object.keys(shellBundle.metafile.inputs).map(file=>path.resolve(file));
 const localUi=path.resolve('apps/app/src/ui')+path.sep;
 assert.ok(shellInputs.some(file=>file.startsWith(shellDir+path.sep)),'the local mobile shell is bundled');
 assert.deepEqual(shellInputs.filter(file=>!file.startsWith(localUi)&&!stamp.files[path.relative(source,file)]).map(file=>path.relative('.',file)),[],'the mobile shell loads only Alpha UI and staged non-UI modules');
 assert.deepEqual(shellInputs.filter(file=>/packages\/ui\/|\/src\/components\//.test(path.relative(source,file))&&!file.startsWith(localUi)),[],'the mobile shell reaches no upstream UI module');
 const relayPath='plugins/plugin-maps/src/client/navigation-relay.ts';
 // The WebView signal shim is upstream (elizaOS/eliza#37315); the relay is carried unchanged.
 assert.equal(stamp.sourceFiles[relayPath],stamp.files[relayPath]);
 assert.match(fs.readFileSync(path.join(source,relayPath),'utf8'),/host\.anySignal \? host\.anySignal\(signals\)/);
 // Alpha owns every screen controller and its view-model; the upstream ones are not staged, and
 // neither is a staged index that would re-export them.
 const alphaScreens={
  'plugins/plugin-maps/src/client/maps-screen.ts':'maps/maps-screen.ts','plugins/plugin-maps/src/client/map-plane.ts':'maps/map-plane.ts',
  'plugins/plugin-maps/src/client/share.ts':'maps/share.ts','plugins/plugin-maps/src/client/map-layout.ts':null,'plugins/plugin-maps/src/client/index.ts':null,
  'plugins/plugin-files/src/browser/files-browser-adapter.ts':'files/files-browser-adapter.ts','plugins/plugin-files/src/documents/scan-event.ts':'documents/scan-event.ts','plugins/plugin-files/src/index.ts':null,
  'plugins/plugin-inbox/src/mailbox/review-controller.ts':'mailbox/review-controller.ts','plugins/plugin-inbox/src/mailbox/drafts-controller.ts':'mailbox/drafts-controller.ts',
  'plugins/plugin-inbox/src/mailbox/use-in-email.ts':'mailbox/use-in-email.ts','plugins/plugin-inbox/src/mailbox/preview.ts':'mailbox/preview.ts','plugins/plugin-inbox/src/mailbox/index.ts':null,
  'plugins/plugin-notes/src/client/notes-controller.ts':'notes/notes-controller.ts','plugins/plugin-notes/src/client/notes-editor.ts':'notes/notes-editor.ts',
  'plugins/plugin-notes/src/client/notes-snapshot-state.ts':'notes/notes-snapshot-state.ts','plugins/plugin-notes/src/client/index.ts':null,
  'plugins/plugin-native-system/src/client/shade.ts':'shell/notification-shade.ts','packages/core/src/views/completed-action-navigation.ts':'shell/completed-action-navigation.ts',
  'packages/contracts/src/native-telephony-session.ts':'messages/sms-session.ts','plugins/plugin-assistant/src/services/device-actions/device-record-presentation.ts':'device-actions/device-record-presentation.ts',
 };
 for(const [file,alpha]of Object.entries(alphaScreens)){
  assert.equal(stamp.files[file],undefined,file+' is not staged');
  if(alpha)assert.ok(fs.existsSync(path.join('apps/app/src/ui',alpha)),alpha+' is Alpha-owned');
 }
 // The shared device-action module is staged without upstream's review screen (Alpha's
 // ui/device-actions/client-coordinator.ts): the queue protocol is the upstream text, unchanged.
 const coordinatorPath='plugins/plugin-assistant/src/services/device-actions/client-coordinator.ts';
 const coordinator=fs.readFileSync(path.join(source,coordinatorPath),'utf8'),upstreamCoordinator=fs.readFileSync(path.join('vendor/eliza',coordinatorPath),'utf8');
 assert.notEqual(stamp.files[coordinatorPath],stamp.sourceFiles[coordinatorPath],'the staged coordinator is projected');
 assert.doesNotMatch(coordinator,/class DeviceActionCoordinator|ContextNotice|describeForegroundReview|device-record-presentation/);
 for(const name of ['actionScope','smsAgentHash','validateReviewableDeviceOperation','DeviceActionNotStarted','publishCommittedDeviceChanges','deviceJournalContext','DeviceActionCoordinatorPorts'])assert.match(coordinator,new RegExp('^export (?:async )?(?:function|class|interface) '+name+'\\b','m'),name+' is kept');
 // Apart from the import bindings only the screen used, each kept block is upstream text.
 const statements=/^import (type )?\{[^}]*\} from "[^"]+";\n/gm,bindings=text=>new Set([...text.matchAll(/^import (?:type )?\{([^}]*)\} from "([^"]+)";$/gm)].flatMap(([,names,from])=>names.split(',').map(name=>name.trim()).filter(Boolean).map(name=>from+' '+name)));
 const upstreamBindings=bindings(upstreamCoordinator);
 assert.deepEqual([...bindings(coordinator)].filter(binding=>!upstreamBindings.has(binding)),[],'every kept import binding is upstream');
 for(const block of coordinator.replace(statements,'').split(/\n(?=\/\*\*\n \* Thrown by a device executor|\/\/ ── Committed-change publication)/))assert.ok(upstreamCoordinator.replace(statements,'').includes(block.trimEnd()),'each kept block is upstream text');
 const calendarPath='packages/contracts/src/calendar-linked-sync.ts';
 assert.deepEqual(Object.keys(stamp).sort(), ['baseCommit','files','projectionVersion','sourceFiles']);
 const googlePath='packages/app/src/runtime/managed-google-agent/managed-google-agent-host.ts';
 assert.equal(stamp.managedGoogleBodyLimitPatch,undefined);
 assert.equal(stamp.files[googlePath],'e848c0e814caebd58eac087684a6020825aeda81e8af7c2cc66530c584003214');
 for(const name of Object.keys(stamp.sourceFiles).filter(name=>name.startsWith('packages/app/src/runtime/managed-google-agent/'))){
  assert.equal(stamp.sourceFiles[name],stamp.files[name],name+' is copied directly from upstream');
  assert.deepEqual(fs.readFileSync(path.join(source,name)),fs.readFileSync(path.join('vendor/eliza',name)),name+' has exact raw upstream bytes');
 }
 // The update scheduler is Alpha's own module; no upstream copy or resume patch is staged.
 assert.equal(stamp.appUpdateResumePatch,undefined);
 assert.equal(stamp.files['packages/ui/src/state/app-update-gate.ts'],undefined);
 assert.match(fs.readFileSync('apps/app/src/ui/state/app-update-gate.ts','utf8'),/export function createAppUpdateScheduler/);
 for(const file of [
  calendarPath,
  'plugins/plugin-native-system/src/crash-log.ts',
  'plugins/plugin-native-system/src/client/launcher.ts',
  'plugins/plugin-files/src/browser/storage-volume.ts',
  'plugins/plugin-assistant/src/services/device-actions/photo-library-contract.ts',
  'packages/voice/src/native-cloud-speech.ts',
  'packages/voice/src/cloud-speech-chunks.ts',
 ]){
  assert.equal(stamp.sourceFiles[file],stamp.files[file],file+' is staged directly');
  assert.deepEqual(fs.readFileSync(path.join(source,file)),fs.readFileSync(path.join('vendor/eliza',file)),file+' is copied exactly');
 }
 // Browser downloads, file inputs and the voice-entry focus policy are Alpha's: the staged Files
 // backend takes the download as a host option, the Notes document module keeps no browser code
 // and the Sense module keeps no invocation controller. Everything kept is upstream text.
 const staged=file=>fs.readFileSync(path.join(source,file),'utf8'),pinned=file=>fs.readFileSync(path.join('vendor/eliza',file),'utf8');
 const filesPath='plugins/plugin-files/src/browser/files.ts',filesText=staged(filesPath);
 assert.notEqual(stamp.files[filesPath],stamp.sourceFiles[filesPath],'the staged Files backend is projected');
 assert.doesNotMatch(filesText,/document\.createElement\("a"\)/);
 assert.equal(filesText.split('this.options.download(').length,3,'both downloads use the host option');
 assert.match(filesText,/\n  download\(url: string, name: string\): void;\n\}/);
 const notesDocumentsPath='plugins/plugin-notes/src/client/note-documents.ts',notesDocuments=staged(notesDocumentsPath);
 assert.notEqual(stamp.files[notesDocumentsPath],stamp.sourceFiles[notesDocumentsPath],'the staged Notes document module is projected');
 assert.doesNotMatch(notesDocuments,/document\.|createElement|createBrowserNoteDocuments/);
 assert.ok(pinned(notesDocumentsPath).includes(notesDocuments.slice(notesDocuments.indexOf('\nexport interface NoteDocumentResult'))),'the kept Notes document rules are upstream text');
 const sensePath='plugins/plugin-native-system/src/sense.ts',sense=staged(sensePath);
 assert.notEqual(stamp.files[sensePath],stamp.sourceFiles[sensePath],'the staged Sense module is projected');
 assert.doesNotMatch(sense,/\bdocument\.|\bwindow\.|SENSE_MODAL_SELECTOR|createSenseInvocationController/);
 for(const kept of ['export function listenerStartsVoice(','export const SENSE_INVOCATION_EVENT','export interface SenseInvocationHost','export const SENSE_BRIDGE_TIMEOUT_MS','export function mobileVoiceEntryPolicy(','export async function stopSenseListenerForChatOnly('])assert.ok(sense.includes(kept),kept);
 // Their shell consumers are Alpha's own modules, never staged from upstream.
 for(const file of ['mobile-shell/view-registry.ts','accessibility/screen-focus.ts','mobile-shell/InstalledAppsGridDrawer.tsx','mobile-shell/photos-view.ts']){
  assert.ok(fs.existsSync(path.join('apps/app/src/ui',file)),file+' is Alpha-owned');
  assert.equal(stamp.files['packages/ui/src/'+file],undefined,file+' is not staged from upstream');
 }
 const calendarBundle=buildSync({entryPoints:[path.join(source,calendarPath)],bundle:true,write:false,platform:'browser',format:'esm',metafile:true});
 assert.equal(Object.keys(calendarBundle.metafile.inputs).length,1,'shared Calendar reconciliation has no Node, SQL, or runtime dependency');
 const voiceFiles=['packages/core/src/logging.ts','packages/core/src/view-interaction.ts','packages/host/src/voice/ui-context.ts'];
 for(const file of voiceFiles){
  assert.equal(stamp.sourceFiles[file],stamp.files[file],file+' is not projected');
  assert.deepEqual(fs.readFileSync(path.join(source,file)),fs.readFileSync(path.join('vendor/eliza',file)),file+' is copied exactly');
 }
 // Plain Node needs the copied .ts random-id import.
 for(const file of ['packages/voice/src/voice-assistant-session.ts','packages/voice/src/live-voice-session.ts']){
  const upstream=fs.readFileSync(path.join('vendor/eliza',file),'utf8'),projected=fs.readFileSync(path.join(source,file),'utf8');
  assert.notEqual(stamp.sourceFiles[file],stamp.files[file],file+' is projected');
  assert.equal(projected,upstream.replace('import { randomId } from "./random-id.js";','import { randomId } from "./random-id.ts";'));
 }
 assert.deepEqual(fs.readFileSync(path.join(source,'packages/voice/src/random-id.ts')),fs.readFileSync('vendor/eliza/packages/voice/src/random-id.ts'));
 // The voice session client is Alpha's own module over the staged shared voice contracts.
 const client=path.resolve('apps/app/src/ui/voice/voice-session-client-core.ts'),text=fs.readFileSync(client,'utf8');
 assert.doesNotMatch(text,/import\("\.\/voice-session-fetch"\)/);
 for(const file of ['packages/core/src/logger.ts','packages/host/src/voice.ts','packages/ui/src/voice/voice-chat-types.ts','packages/ui/src/voice/voice-session-client.ts','packages/ui/src/voice/voice-session-fetch.ts','packages/ui/src/voice/voice-session-client-core.ts','packages/ui/src/voice/voice-session-status.ts']){
  assert.equal(stamp.sourceFiles[file],undefined);assert.equal(stamp.files[file],undefined);
  assert.equal(fs.existsSync(path.join(source,file)),false,file+' is not staged');
 }

 const bundle=buildSync({entryPoints:[client],bundle:true,write:false,platform:'browser',format:'esm',metafile:true,alias:{
  '@elizaos/host/voice/ui-context':path.join(source,'packages/host/src/voice/ui-context.ts'),
  '@elizaos/core/view-interaction':path.join(source,'packages/core/src/view-interaction.ts'),
  '@elizaos/core/logging':path.join(source,'packages/core/src/logging.ts'),
  '@elizaos/core/speech':path.join(source,'packages/core/src/speech.ts'),
  '@elizaos/core/protocol':path.join(source,'alpha-voice-core-protocol.ts'),
 }});
 assert.ok(bundle.outputFiles[0].contents.length>10000);
 assert.equal(Object.keys(bundle.metafile.inputs).some(file=>/csrf-client|steward|persistence|core\/src\/logger|api\//.test(file)),false);

});

test('a receipt with an unknown slot cannot replace an admitted raw-source cache',()=>fixture(({root,vendor})=>{
 const file='packages/app/src/runtime/managed-google-agent/managed-google-agent-host.ts';
 const before='export const value = 1;\n';
 const projected=prepareClientFeatures({root,projectVoice:false});
 const stampFile=path.join(projected,'.source.json'),stamp=fs.readFileSync(stampFile);
 const unchanged=()=>{
  assert.deepEqual(fs.readFileSync(stampFile),stamp,'a rebuilt receipt is the admitted one');
  assert.equal(fs.readFileSync(path.join(projected,file),'utf8'),before);
 };
 assert.equal(fs.readFileSync(path.join(vendor,file),'utf8'),before);
 {
  const obsolete={...JSON.parse(stamp),unknownPatch:{manifestSha256:'0'.repeat(64)}};
  fs.writeFileSync(stampFile,JSON.stringify(obsolete));
  assert.throws(()=>prepareClientFeatures({root,projectVoice:false,check:true}),/missing or stale/);
  assert.deepEqual(JSON.parse(fs.readFileSync(stampFile)),obsolete,'check mode never rewrites a stale receipt');
  prepareClientFeatures({root,projectVoice:false});unchanged();
 }
 assert.equal(prepareClientFeatures({root,projectVoice:false,check:true}),projected);
}));
