import test from 'node:test';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifyParadeeRuntime,verifyParadeeAppLinkage,PARADEE_SOURCE,PARADEE_NATIVE} from '../scripts/paradee-runtime.ts';
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'alpha-paradee-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
function write(root,name,value){const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);return {path:name,bytes:Buffer.byteLength(value),sha256:createHash('sha256').update(value).digest('hex')};}
// The pinned engine (upstream local-inference engine.lock.json) checked out outside vendor, at .eliza/inference-engine/<commit>.
function enginePath(root,commit){return path.join(root,'.eliza/inference-engine',commit);}
function ffi(root){
 const vendor=path.join(root,'vendor/eliza'),staging=path.join(root,'engine-staging');
 fs.mkdirSync(staging,{recursive:true});
 const git=(directory,...args)=>execFileSync('git',['-C',directory,'-c','user.name=Fixture','-c','user.email=fixture@example.test',...args],{stdio:['ignore','pipe','pipe']}).toString().trim();
 git(staging,'init');write(staging,'tools/omnivoice/include/eliza-inference-ffi.h','// pinned header\n');git(staging,'add','.');git(staging,'commit','-m','ffi');
 const forkPin=git(staging,'rev-parse','HEAD'),fork=enginePath(root,forkPin);
 fs.mkdirSync(path.dirname(fork),{recursive:true});fs.renameSync(staging,fork);
 fs.mkdirSync(vendor,{recursive:true});git(vendor,'init');
 write(vendor,PARADEE_SOURCE.replace(/^vendor\/eliza\//,'')+'/engine.lock.json',JSON.stringify({schema:1,engine:{repository:'https://example.test/llama.cpp.git',commit:forkPin,ffiInclude:'tools/omnivoice/include',library:'libelizainference.so'}}));
 git(vendor,'add','.');git(vendor,'commit','-m','pin');
 write(root,'upstream.lock.json',JSON.stringify({commit:git(vendor,'rev-parse','HEAD')}));return {fork,git};
}
function complete(root){
 const {fork}=ffi(root);
 const native=path.join(root,PARADEE_NATIVE),bundle='assets/paradee-voice/v1/';
 const pins=[['tts/model.gguf','model'],['tts/lexicon.lex','lexicon'],['asr/model.gguf','asr'],['asr/mmproj.gguf','projector']].map(([name,data])=>({...write(native,bundle+name,data),path:name}));
 const inputs={paradee:pins[0],lexicon:pins[1]};write(root,PARADEE_SOURCE+'/inputs.json',JSON.stringify(inputs));
 write(root,'android/paradee-voice/asr-inputs.json',JSON.stringify({backend:'qwen3',files:pins.slice(2).map((pin,i)=>({...pin,role:i?'asr-mmproj':'asr-model'}))}));
 const manifest={format:'eliza-paradee-voice-v2',model:pins[0].path,lexicon:pins[1].path,files:pins};
 const files=pins.map(row=>({...row,path:bundle+row.path}));files.push(write(native,bundle+'manifest.json',JSON.stringify(manifest)));
 for(const abi of ['arm64-v8a','x86_64'])files.push(write(native,`jniLibs/${abi}/libelizainference.so`,abi));
 const sourceCommit=JSON.parse(fs.readFileSync(path.join(root,'upstream.lock.json'))).commit;
 const nativeCommit=execFileSync('git',['-C',fork,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const record={sourceCommit,nativeCommit,inputs,abis:['arm64-v8a','x86_64'],files};write(native,'build-record.json',JSON.stringify(record));return {native,record,fork,save:()=>write(native,'build-record.json',JSON.stringify(record))};
}
test('complete byte integrity never grants qualification; modified native and missing ASR pins fail',t=>{const root=fixture(t),{native}=complete(root);assert.deepEqual(verifyParadeeRuntime(root),{packaged:true,qualified:false});fs.unlinkSync(path.join(root,'android/paradee-voice/asr-inputs.json'));assert.throws(()=>verifyParadeeRuntime(root),/ASR/);write(root,'android/paradee-voice/asr-inputs.json','{"files":[]}');assert.throws(()=>verifyParadeeRuntime(root),/ASR/);write(native,'jniLibs/arm64-v8a/libelizainference.so','changed');assert.throws(()=>verifyParadeeRuntime(root),/input changed/);});
test('record path traversal and duplicate records cannot escape admission',t=>{const root=fixture(t),f=complete(root);f.record.files.push({...f.record.files[0],path:'../outside'});f.save();assert.throws(()=>verifyParadeeRuntime(root),/Invalid Paradee/);f.record.files.pop();f.record.files.push(f.record.files[0]);f.save();assert.throws(()=>verifyParadeeRuntime(root),/incomplete/);});

test('unrecorded packaged assets are rejected',t=>{const root=fixture(t),{native}=complete(root);write(native,'assets/paradee-voice/v1/extra.bin','unreviewed');assert.throws(()=>verifyParadeeRuntime(root),/Unrecorded/);});

test('staged runtime requires an exact clean FFI checkout of the pinned engine',t=>{const root=fixture(t);const {fork}=complete(root);const header=path.join(fork,'tools/omnivoice/include/eliza-inference-ffi.h');
 const original=fs.readFileSync(header);fs.writeFileSync(header,'changed');assert.throws(()=>verifyParadeeRuntime(root),/FFI source/);fs.writeFileSync(header,original);
 fs.unlinkSync(header);assert.throws(()=>verifyParadeeRuntime(root),/FFI source/);fs.writeFileSync(header,original);
 const saved=fork+'-saved';fs.renameSync(fork,saved);fs.mkdirSync(fork);assert.throws(()=>verifyParadeeRuntime(root),/Check out the pinned engine/);fs.rmdirSync(fork);fs.renameSync(saved,fork);
 execFileSync('git',['-C',fork,'-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','--allow-empty','-m','wrong head'],{stdio:'pipe'});assert.throws(()=>verifyParadeeRuntime(root),/FFI source/);
});

test('app packaging requires the exact inference bytes for both ABIs, independent of sense admission',t=>{
 const root=fixture(t),{native}=complete(root);assert.deepEqual(verifyParadeeRuntime(root),{packaged:true,qualified:false});
 assert.throws(()=>verifyParadeeAppLinkage(root),/App inference/);
 for(const abi of ['arm64-v8a','x86_64'])write(root,`android/app/src/main/jniLibs/${abi}/libelizainference.so`,fs.readFileSync(path.join(native,`jniLibs/${abi}/libelizainference.so`)));
 assert.deepEqual(verifyParadeeAppLinkage(root),{packaged:true,qualified:false});
 write(root,'android/app/src/main/jniLibs/x86_64/libelizainference.so','different');assert.throws(()=>verifyParadeeAppLinkage(root),/x86_64/);
});

test('a parakeet slot admits exactly one Phonon-2 GGUF and refuses any other file under asr/',t=>{
 const root=fixture(t),{native,record,save}=complete(root),slot=path.join(root,'android/paradee-voice/asr-inputs.json');
 const pair=JSON.parse(fs.readFileSync(slot,'utf8')).files;
 // One parakeet-tdt GGUF: the slot record lists one file and the projector would be a stray file in asr/.
 write(root,'android/paradee-voice/asr-inputs.json',JSON.stringify({backend:'parakeet',files:[pair[0]]}));
 assert.throws(()=>verifyParadeeRuntime(root),/ASR file outside the reviewed slot/);
 const bundle='assets/paradee-voice/v1/',manifestPath=path.join(native,bundle,'manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 manifest.files=manifest.files.filter(row=>row.path!==pair[1].path);fs.unlinkSync(path.join(native,bundle,pair[1].path));
 const entry=write(native,bundle+'manifest.json',JSON.stringify(manifest));
 record.files=record.files.filter(row=>row.path!==bundle+pair[1].path&&row.path!==bundle+'manifest.json').concat([{...entry}]);save();
 assert.deepEqual(verifyParadeeRuntime(root),{packaged:true,qualified:false});
 // Backend and file count must agree, and an unknown backend is refused.
 write(root,'android/paradee-voice/asr-inputs.json',JSON.stringify({backend:'parakeet',files:pair}));assert.throws(()=>verifyParadeeRuntime(root),/incomplete for the parakeet backend/);
 write(root,'android/paradee-voice/asr-inputs.json',JSON.stringify({backend:'whisper',files:[pair[0]]}));assert.throws(()=>verifyParadeeRuntime(root),/backend must be parakeet or qwen3/);
});

test('voice build records must identify the exact Eliza and native source pins',t=>{
 const root=fixture(t),f=complete(root),source=f.record.sourceCommit,native=f.record.nativeCommit;
 f.record.sourceCommit='0'.repeat(40);f.save();assert.throws(()=>verifyParadeeRuntime(root),/pinned source revisions/);
 f.record.sourceCommit=source;f.record.nativeCommit='0'.repeat(40);f.save();assert.throws(()=>verifyParadeeRuntime(root),/pinned source revisions/);
 f.record.nativeCommit=native;f.save();assert.deepEqual(verifyParadeeRuntime(root),{packaged:true,qualified:false});
});

import {selectedAndroidAbis,abiArguments} from '../scripts/android-abis.ts';
function arm64Only(root){const f=complete(root);f.record.abis=['arm64-v8a'];f.record.files=f.record.files.filter(row=>!row.path.startsWith('jniLibs/x86_64/'));fs.rmSync(path.join(f.native,'jniLibs/x86_64'),{recursive:true});f.save();return f;}
test('default matrix still refuses missing x86',t=>{const root=fixture(t);arm64Only(root);assert.throws(()=>verifyParadeeRuntime(root),/missing a requested/);});
test('explicit ARM64 admits exact complete ARM64 runtime',t=>{const root=fixture(t);arm64Only(root);assert.deepEqual(verifyParadeeRuntime(root,{abis:['arm64-v8a']}),{packaged:true,qualified:false});});
test('explicit x86 refuses ARM64-only runtime',t=>{const root=fixture(t);arm64Only(root);assert.throws(()=>verifyParadeeRuntime(root,{abis:['x86_64']}),/missing a requested/);});
test('ABI selection rejects unknown duplicate and explicit empty',()=>{for(const abis of [[],['riscv'],['arm64-v8a','arm64-v8a']])assert.throws(()=>selectedAndroidAbis(abis),/unique/);assert.throws(()=>abiArguments(['--abi']),/requires/);assert.deepEqual(abiArguments(['--abi','arm64-v8a','--verify']),{rest:['--verify'],abis:['arm64-v8a']});});
test('selected engine hash mismatch still rejects',t=>{const root=fixture(t),f=arm64Only(root);fs.appendFileSync(path.join(f.native,'jniLibs/arm64-v8a/libelizainference.so'),'bad');assert.throws(()=>verifyParadeeRuntime(root,{abis:['arm64-v8a']}),/changed/);});
test('selected ABI never omits required models',t=>{const root=fixture(t),f=arm64Only(root);fs.unlinkSync(path.join(f.native,'assets/paradee-voice/v1/tts/model.gguf'));assert.throws(()=>verifyParadeeRuntime(root,{abis:['arm64-v8a']}));});
test('all recorded files verified even when other ABI not requested',t=>{const root=fixture(t),f=complete(root);fs.appendFileSync(path.join(f.native,'jniLibs/x86_64/libelizainference.so'),'bad');assert.throws(()=>verifyParadeeRuntime(root,{abis:['arm64-v8a']}),/changed/);});
test('app linkage checks exactly requested ABI bytes',t=>{const root=fixture(t);arm64Only(root);write(root,'android/app/src/main/jniLibs/arm64-v8a/libelizainference.so','arm64-v8a');assert.deepEqual(verifyParadeeAppLinkage(root,{abis:['arm64-v8a']}),{packaged:true,qualified:false});});
