import {fixtureTest} from './support/fixture-build-context.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {embeddingProducerInputPaths,nativeInputPaths,nativeJavaPath,nativeBinding,nativeInputs,nativeGenerated} from '../scripts/embedding-native-contract.ts';
import {nativeRecipe,nativeRecipeDigest,readNativeBuildReceipt,verifyNativeFileBytes,verifyNativeBuildLibraries,nativeOutputInventory,NATIVE_BUILD_RECEIPT,fileDigest,bytesDigest,withNativeCacheLock,prepareNativeSource,nativeAndroidSdk,clearStagedNativeInputs} from '../scripts/native-build-inputs.ts';
import {verifyVoiceHost} from '../scripts/voice-host.ts';

const root=path.resolve(import.meta.dirname,'..');
function fixture(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'alpha-native-recipe-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  for(const name of ['upstream.lock.json','app.config.json','android/consumer-host.json','scripts/android-identity.ts','android/voice-host/qualified-voice-host.json','android/embedding-host/build-toolchain.json','android/embedding-host/qualified-host.json','android/embedding-host/native-requirements.txt','android/embedding-host/bootstrap-requirements.txt','android/paradee-voice/asr-inputs.json','scripts/build-embedding-host.ts','scripts/prepare-embedding-host.ts','scripts/embedding-native-contract.ts','scripts/embedding-build-remap.ts','scripts/native-build-inputs.ts','scripts/android-stage-voice-models.ts','scripts/voice-host.ts','scripts/paradee-runtime.ts','scripts/android-abis.ts','scripts/copy-file-clone.ts','scripts/stage-embedding-host.ts']){
    fs.mkdirSync(path.dirname(path.join(dir,name)),{recursive:true});fs.copyFileSync(path.join(root,name),path.join(dir,name));
  }
  fs.mkdirSync(path.join(dir,'vendor'));fs.symlinkSync(path.join(root,'vendor/eliza'),path.join(dir,'vendor/eliza'),'dir');
  return dir;
}
test('native cache identity changes with producer code, model pins and compiler inputs',t=>{
  const dir=fixture(t),before=nativeRecipeDigest(nativeRecipe(dir));
  for(const name of ['scripts/prepare-embedding-host.ts','android/embedding-host/native-requirements.txt','android/embedding-host/bootstrap-requirements.txt','android/voice-host/qualified-voice-host.json','android/embedding-host/qualified-host.json','scripts/voice-host.ts','scripts/paradee-runtime.ts','scripts/android-abis.ts','scripts/copy-file-clone.ts','scripts/stage-embedding-host.ts']){
    const file=path.join(dir,name),original=fs.readFileSync(file);
    if(name.endsWith('.json')){const record=JSON.parse(original);(record.models?.[0]??record.model).sha256='0'.repeat(64);fs.writeFileSync(file,JSON.stringify(record));}
    else fs.appendFileSync(file,'\n# new producer input\n');
    assert.notEqual(nativeRecipeDigest(nativeRecipe(dir)),before,name);fs.writeFileSync(file,original);
  }
});
test('archive source freeze binds every native producer input and changes with ABI policy',t=>{
  const dir=fixture(t),recipe=nativeRecipe(dir);
  const snapshot=()=>JSON.parse(execFileSync(process.execPath,[path.join(root,'scripts/source-snapshot.ts')],{cwd:dir,encoding:'utf8'}));
  const before=snapshot();
  for(const [name,digest] of Object.entries(recipe.productInputs))assert.equal(before.files[name],digest,`Missing native producer input: ${name}`);
  const policy='scripts/android-abis.ts';
  fs.appendFileSync(path.join(dir,policy),'\n// changed ABI policy\n');
  const after=snapshot();
  assert.notEqual(after.digest,before.digest);
  assert.equal(after.files[policy],fileDigest(path.join(dir,policy)));
  assert.notEqual(after.files[policy],recipe.productInputs[policy]);
});
function receiptFor(dir){
  const recipe=nativeRecipe(dir),pin=JSON.parse(fs.readFileSync(path.join(dir,'upstream.lock.json'))).commit;
  const voice=JSON.parse(fs.readFileSync(path.join(dir,'android/voice-host/qualified-voice-host.json')));voice.pin=pin;voice.forkPin=recipe.engineCommit;
  const source=name=>execFileSync('git',['-C',path.join(dir,'vendor/eliza'),'show',pin+':'+name]);
  const binding=nativeBinding(source(nativeInputPaths.at(-1)).toString(),source(nativeInputPaths.at(-2)).toString(),recipe.identity);
  const embedding={model:JSON.parse(fs.readFileSync(path.join(dir,'android/embedding-host/qualified-host.json'))).model,identity:recipe.identity,pin,forkPin:recipe.engineCommit,abi:'arm64-v8a',jniIdentityRelocated:true,jniBinding:binding,
    libraries:[...voice.abis[0].libraries.map(row=>({...row,alignment16KiB:true})),{name:'libparadeevoicejni.so',bytes:4,sha256:'a'.repeat(64),alignment16KiB:true}],
    inputs:nativeInputs(binding).map(name=>({path:name,sourceSha256:bytesDigest(source(name)),generatedSha256:bytesDigest(nativeGenerated(name,source(name).toString(),recipe.identity,binding))})),
    producerInputs:embeddingProducerInputPaths.map(name=>({path:name,sha256:bytesDigest(source(name))})),
    additionalAbis:[{abi:'x86_64',libraries:[...voice.abis[1].libraries.map(row=>({...row,alignment16KiB:true})),{name:'libparadeevoicejni.so',bytes:4,sha256:'b'.repeat(64),alignment16KiB:true}]}]};
  const receipt={schema:'alpha-native-build/v1',consumerSdkCommit:pin,recipeSha256:nativeRecipeDigest(recipe),recipe,producer:{sdkCommit:pin,platform:'linux',arch:'x64',...recipe.toolchain,python:recipe.python},voice,embedding,files:[],qualification:{deviceExecuted:false,userAccepted:false}};
  receipt.files=[...nativeOutputInventory(receipt)].map(([name,row])=>({path:name,bytes:row?.bytes||4,sha256:row?.sha256||'a'.repeat(64)}));
  return receipt;
}
fixtureTest('generated native receipts reject qualification claims, incomplete inventories and substituted bytes',t=>{
  const dir=fixture(t),original=receiptFor(dir);
  const file=path.join(dir,NATIVE_BUILD_RECEIPT);fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(original));assert.ok(readNativeBuildReceipt(dir));
  for(const mutate of [r=>r.qualification.deviceExecuted=true,r=>r.voice.models[0].sha256='0'.repeat(64),r=>r.files.pop(),r=>r.files.push({path:'extra',bytes:1,sha256:'a'.repeat(64)}),r=>r.embedding.libraries[0].sha256='0'.repeat(64),r=>r.voice.abis[0].libraries[0].sha256='0'.repeat(64),r=>delete r.embedding.additionalAbis,r=>r.embedding.additionalAbis[0].abi='arm64-v8a',r=>r.embedding.additionalAbis[0].libraries[0].sha256='0'.repeat(64),r=>r.embedding.additionalAbis[0].libraries.pop()]){
    const receipt=structuredClone(original);mutate(receipt);fs.writeFileSync(file,JSON.stringify(receipt));assert.throws(()=>readNativeBuildReceipt(dir));
  }
});
fixtureTest('voice admission accepts only the receipt-bound JNI bytes in the main source set',t=>{
  const dir=fixture(t);
  const sdk=path.join(dir,'vendor/eliza');
  fs.unlinkSync(sdk);
  execFileSync('git',['clone','--shared','--no-checkout',path.join(root,'vendor/eliza'),sdk],{stdio:'pipe'});
  const pin=JSON.parse(fs.readFileSync(path.join(dir,'upstream.lock.json'))).commit;
  execFileSync('git',['-C',sdk,'sparse-checkout','set','--cone','packages/os/android/local-inference'],{stdio:'pipe'});
  execFileSync('git',['-C',sdk,'checkout','--detach',pin],{stdio:'pipe'});
  const receipt=receiptFor(dir);
  const name='libparadeevoicejni.so';
  const relative=`android/app/src/main/jniLibs/arm64-v8a/${name}`;
  const staged=path.join(dir,relative);
  fs.mkdirSync(path.dirname(staged),{recursive:true});
  fs.writeFileSync(staged,'fixture JNI');
  assert.throws(()=>verifyVoiceHost(dir),/Unrecorded voice JNI payload/);

  const evidence={bytes:fs.statSync(staged).size,sha256:fileDigest(staged)};
  Object.assign(receipt.embedding.libraries.find(row=>row.name===name),evidence);
  Object.assign(receipt.files.find(row=>row.path===relative),evidence);
  const receiptPath=path.join(dir,NATIVE_BUILD_RECEIPT);
  fs.mkdirSync(path.dirname(receiptPath),{recursive:true});
  fs.writeFileSync(receiptPath,JSON.stringify(receipt));
  assert.throws(()=>verifyVoiceHost(dir),/voice outputs are not staged/);

  const overlay=path.join(dir,`android/app/src/debug/jniLibs/arm64-v8a/${name}`);
  fs.mkdirSync(path.dirname(overlay),{recursive:true});
  fs.copyFileSync(staged,overlay);
  assert.throws(()=>verifyVoiceHost(dir),/Unrecorded voice JNI payload/);
  fs.unlinkSync(overlay);
  fs.appendFileSync(staged,'changed');
  assert.throws(()=>verifyVoiceHost(dir),/Native output changed/);
});
test('native cache reuse rejects changed, linked and escaping outputs',t=>{
  const dir=fixture(t),file=path.join(dir,'output');fs.writeFileSync(file,'good');
  const files=[{path:'output',bytes:4,sha256:fileDigest(file)}];
  assert.doesNotThrow(()=>verifyNativeFileBytes(dir,files));
  fs.writeFileSync(file,'evil');assert.throws(()=>verifyNativeFileBytes(dir,files),/Native output changed/);
  fs.unlinkSync(file);fs.symlinkSync(path.join(root,'package.json'),file);assert.throws(()=>verifyNativeFileBytes(dir,files),/symbolic link/);
  files[0].path='../output';assert.throws(()=>verifyNativeFileBytes(dir,files),/Invalid native output path/);
});
test('native cache inspection loads its inspector from the source checkout',t=>{
  const dir=fixture(t);
  const output=path.join(dir,'output');
  const sdk=path.join(dir,'sdk');
  const ndk='fixture-ndk';
  const bin=path.join(sdk,'ndk',ndk,'toolchains/llvm/prebuilt/host/bin');
  fs.mkdirSync(bin,{recursive:true});
  fs.writeFileSync(path.join(bin,'llvm-nm'),'');
  const previousAndroidHome=process.env.ANDROID_HOME;
  process.env.ANDROID_HOME=sdk;
  t.after(()=>{
    if(previousAndroidHome===undefined)delete process.env.ANDROID_HOME;
    else process.env.ANDROID_HOME=previousAndroidHome;
  });

  const abi='arm64-v8a';
  const name='libelizainference.so';
  const libraries=path.join(output,'android/app/src/main/jniLibs',abi);
  fs.mkdirSync(libraries,{recursive:true});
  fs.writeFileSync(path.join(libraries,name),'invalid ELF');
  const receipt={producer:{ndk},voice:{abis:[{abi,libraries:[{name}]}]}};

  assert.throws(()=>verifyNativeBuildLibraries(dir,output,receipt),/Native library ABI or page alignment differs/);
});
for(const linkedAbi of ['arm64-v8a','x86_64'])test(`native refresh refuses linked ${linkedAbi} before deleting any staged inputs`,t=>{
  const temp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'alpha-native-refresh-')));
  t.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
  const product=path.join(temp,'product'),external=path.join(temp,'external');
  const bundle=path.join(product,'.eliza/paradee-voice/native/build-record.json');
  fs.mkdirSync(path.dirname(bundle),{recursive:true});fs.writeFileSync(bundle,'prior bundle');
  const survivors=[bundle];
  for(const abi of ['arm64-v8a','x86_64']){
    const directory=path.join(product,'android/app/src/main/jniLibs',abi);
    fs.mkdirSync(path.dirname(directory),{recursive:true});
    const target=abi===linkedAbi?external:directory;fs.mkdirSync(target,{recursive:true});
    if(abi===linkedAbi)fs.symlinkSync(external,directory,'dir');
    for(const name of ['libelizainference.so','libparadeevoicejni.so','libc++_shared.so']){
      const file=path.join(target,name);fs.writeFileSync(file,'retained '+abi);survivors.push(file);
    }
  }
  assert.throws(()=>clearStagedNativeInputs(product),/symbolic link/);
  for(const file of survivors)assert.ok(fs.existsSync(file),`refresh removed ${file}`);
  assert.equal(fs.readFileSync(bundle,'utf8'),'prior bundle');
  for(const name of ['libelizainference.so','libparadeevoicejni.so','libc++_shared.so'])assert.equal(fs.readFileSync(path.join(external,name),'utf8'),'retained '+linkedAbi);
});
test('native refresh clears its owned outputs and preserves unrelated JNI files',t=>{
  const product=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'alpha-native-refresh-owned-')));
  t.after(()=>fs.rmSync(product,{recursive:true,force:true}));
  const bundle=path.join(product,'.eliza/paradee-voice/native/build-record.json');
  fs.mkdirSync(path.dirname(bundle),{recursive:true});fs.writeFileSync(bundle,'prior bundle');
  const removed=[bundle],retained=[];
  for(const abi of ['arm64-v8a','x86_64']){
    const directory=path.join(product,'android/app/src/main/jniLibs',abi);fs.mkdirSync(directory,{recursive:true});
    for(const name of ['libelizainference.so','libparadeevoicejni.so','libc++_shared.so']){const file=path.join(directory,name);fs.writeFileSync(file,'old');removed.push(file);}
    const other=path.join(directory,'libeliza_node.so');fs.writeFileSync(other,'unrelated');retained.push(other);
  }
  clearStagedNativeInputs(product);
  for(const file of removed)assert.equal(fs.existsSync(file),false);
  for(const file of retained)assert.equal(fs.readFileSync(file,'utf8'),'unrelated');
});
test('concurrent native producers serialize and a failed producer releases its cache',async t=>{
  const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'alpha-native-lock-')));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const events=[];
  let release;
  const pending=new Promise(resolve=>{release=resolve;});
  let started;
  const entered=new Promise(resolve=>{started=resolve;});
  const first=withNativeCacheLock(dir,async()=>{events.push('first');started();await pending;throw Error('producer failed');});
  await entered;
  const second=withNativeCacheLock(dir,async()=>{events.push('second');});
  await new Promise(resolve=>setTimeout(resolve,120));assert.deepEqual(events,['first']);
  release();await assert.rejects(first,/producer failed/);await second;
  assert.deepEqual(events,['first','second']);
  await withNativeCacheLock(dir,async()=>events.push('third'));assert.equal(events.at(-1),'third');
});
test('a fresh native source cache checks out successfully and preserves later dirty files',t=>{
  const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'alpha-native-source-')));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const repository=path.join(dir,'repository'),source=path.join(dir,'source');fs.mkdirSync(repository);
  const git=(...args)=>execFileSync('git',['-C',repository,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git('init','--quiet');fs.writeFileSync(path.join(repository,'input'),'reviewed');git('add','.');git('-c','user.name=fixture','-c','user.email=fixture@example.invalid','commit','-qm','input');
  const pin=git('rev-parse','HEAD');prepareNativeSource(repository,source,pin);
  assert.equal(fs.readFileSync(path.join(source,'input'),'utf8'),'reviewed');assert.equal(fs.existsSync(path.join(source,'.git/objects/info/alternates')),false);
  fs.writeFileSync(path.join(source,'input'),'local work');assert.throws(()=>prepareNativeSource(repository,source,pin),/tracked modifications/);assert.equal(fs.readFileSync(path.join(source,'input'),'utf8'),'local work');
  const linked=path.join(dir,'linked-source'),before=git('symbolic-ref','HEAD');fs.symlinkSync(repository,linked,'dir');
  assert.throws(()=>prepareNativeSource(repository,linked,pin),/symbolic link/);
  assert.equal(git('symbolic-ref','HEAD'),before);assert.equal(fs.existsSync(path.join(repository,'.git/alpha-native-checkout')),false);
  const child=path.join(linked,'new-cache');assert.throws(()=>prepareNativeSource(repository,child,pin),/symbolic link/);assert.equal(fs.existsSync(child),false);
});
test('native build and inspection share Linux and macOS SDK discovery',t=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'alpha-native-sdk-'));t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const linux=path.join(home,'Android/Sdk');fs.mkdirSync(linux,{recursive:true});assert.equal(nativeAndroidSdk({},home),linux);
  const mac=path.join(home,'Library/Android/sdk');fs.mkdirSync(mac,{recursive:true});assert.equal(nativeAndroidSdk({},home),mac);assert.equal(nativeAndroidSdk({ANDROID_HOME:linux},home),linux);
});
