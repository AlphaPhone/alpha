// The phone erases the recording of each voice note the agent erased from its Notes Trash, through
// the recording store's own receipts, and acknowledges an agent receipt only after that erase is
// confirmed. A fake store and agent stand in for AlphaNoteAudio and the owner Trash routes.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {tsImport} from './support/ts-import.mjs';

const root=path.resolve(import.meta.dirname,'..');
const {eraseCanonicalNoteRecordings}=await tsImport(path.join(root,'apps/app/src/runtime/canonical-notes-recording-cleanup.ts'),import.meta.url);
const receipt=(n,noteId=`note-${n}`)=>({operationId:`${String(n).repeat(8)}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,noteId,audioId:`audio-${n}`,deletedAt:'2026-11-08T12:00:00.000Z'});

/** Recording store with the native RecordingStore's per-operation receipts. */
function store(recordings){
 const calls=[],state=new Map(recordings.map(r=>[r.audioId,{noteId:r.noteId,ops:{...(r.ops??{})},bytes:true,owner:r.owner}]));
 const owned=({audioId,noteId})=>{const r=state.get(audioId);if(!r||r.noteId!==noteId)throw Error('Saved recording is unavailable');return r;};
 const out=(input,status)=>({audioId:input.audioId,noteId:input.noteId,operationId:input.operationId,status});
 return {calls,state,recordings:{
  async deletionStatus(input){calls.push(['status',input.audioId]);return out(input,owned(input).ops[input.operationId]??'unknown');},
  async remove(input){calls.push(['remove',input.audioId]);const r=owned(input);if(r.owner&&r.owner!==input.operationId)throw Error('Another deletion owns recording');r.ops[input.operationId]??='removed';r.owner=input.operationId;return out(input,r.ops[input.operationId]);},
  async purge(input){calls.push(['purge',input.audioId]);const r=owned(input);if(r.ops[input.operationId]!=='removed'||r.owner!==input.operationId)throw Error('Recording is not in this deletion');r.bytes=false;r.ops[input.operationId]='purged';return out(input,'purged');},
 }};
}
/** The agent: pending receipts, retired only on an acknowledgement it accepts. */
function agent(pending,{accept=()=>true,read}={}){
 const acknowledged=[];
 return {acknowledged,pending,source:{
  async readTrashRecordingCleanup(){if(read)return read();return structuredClone(pending);},
  async completeTrashRecordingCleanup(r){if(!accept(r))throw Error('The device has not confirmed recording erase.');const i=pending.findIndex(p=>JSON.stringify(p)===JSON.stringify(r));if(i<0)return false;pending.splice(i,1);acknowledged.push(r);return true;},
 }};
}
const signal=()=>new AbortController().signal;

test('a receipt is acknowledged only after its recording is erased under that erase operation',async()=>{
 const first=receipt(1),{calls,state,recordings}=store([{audioId:'audio-1',noteId:'note-1'}]);
 const a=agent([first],{accept:r=>state.get(r.audioId).ops[r.operationId]==='purged'&&!state.get(r.audioId).bytes});
 assert.deepEqual(await eraseCanonicalNoteRecordings(a.source,recordings,signal()),{erased:1,acknowledged:1,retained:0});
 assert.deepEqual(calls,[['status','audio-1'],['remove','audio-1'],['purge','audio-1']]);
 assert.deepEqual(a.acknowledged,[first]);assert.deepEqual(a.pending,[]);
});

test('an agent that refuses the acknowledgement keeps the receipt, and the erase is not repeated',async()=>{
 const first=receipt(1),{calls,state,recordings}=store([{audioId:'audio-1',noteId:'note-1'}]);
 let accept=false;const a=agent([first],{accept:()=>accept});
 assert.deepEqual(await eraseCanonicalNoteRecordings(a.source,recordings,signal()),{erased:1,acknowledged:0,retained:1});
 assert.equal(state.get('audio-1').bytes,false);assert.deepEqual(a.pending,[first]);
 accept=true;calls.length=0;
 assert.deepEqual(await eraseCanonicalNoteRecordings(a.source,recordings,signal()),{erased:0,acknowledged:1,retained:0});
 assert.deepEqual(calls,[['status','audio-1']]);assert.deepEqual(a.pending,[]);
});

test('a recording this phone cannot erase under the receipt stays unacknowledged; the others proceed',async()=>{
 const missing=receipt(1),foreign=receipt(2,'note-2'),owned=receipt(3),restored=receipt(4),held=receipt(5);
 const {state,recordings}=store([
  {audioId:'audio-2',noteId:'another-note'},
  {audioId:'audio-3',noteId:'note-3'},
  {audioId:'audio-4',noteId:'note-4',ops:{[restored.operationId]:'restored'}},
  {audioId:'audio-5',noteId:'note-5',owner:'99999999-aaaa-4aaa-8aaa-aaaaaaaaaaaa',ops:{'99999999-aaaa-4aaa-8aaa-aaaaaaaaaaaa':'removed'}},
 ]);
 const a=agent([missing,foreign,owned,restored,held]);
 assert.deepEqual(await eraseCanonicalNoteRecordings(a.source,recordings,signal()),{erased:1,acknowledged:1,retained:4});
 assert.deepEqual(a.pending,[missing,foreign,restored,held]);assert.deepEqual(a.acknowledged,[owned]);
 for(const id of ['audio-2','audio-4','audio-5'])assert.equal(state.get(id).bytes,true,id);
});

test('a store answer for another operation or not purged is never taken as the erase',async()=>{
 const first=receipt(1),{recordings}=store([{audioId:'audio-1',noteId:'note-1'}]);
 const a=agent([first]);
 const wrong={...recordings,async purge(input){return {...input,operationId:receipt(7).operationId,status:'purged'};}};
 assert.deepEqual(await eraseCanonicalNoteRecordings(a.source,wrong,signal()),{erased:0,acknowledged:0,retained:1});
 const notPurged={...recordings,async purge(input){return {...input,status:'removed'};}};
 assert.deepEqual(await eraseCanonicalNoteRecordings(a.source,notPurged,signal()),{erased:0,acknowledged:0,retained:1});
 assert.deepEqual(a.pending,[first]);
});

test('an agent whose Trash keeps notes until restored has nothing to clean up and no recording is touched',async()=>{
 const {calls,recordings}=store([{audioId:'audio-1',noteId:'note-1'}]);
 const a=agent([],{read:()=>{throw Error('Permanent Notes Trash erase is disabled for this host.');}});
 assert.equal(await eraseCanonicalNoteRecordings(a.source,recordings,signal()),null);
 assert.deepEqual(calls,[]);
});

test('a retired view stops the pass before the next receipt',async()=>{
 const controller=new AbortController(),{calls,recordings}=store([{audioId:'audio-1',noteId:'note-1'},{audioId:'audio-2',noteId:'note-2'}]);
 const a=agent([receipt(1),receipt(2)],{accept:()=>{controller.abort();return true;}});
 await assert.rejects(eraseCanonicalNoteRecordings(a.source,recordings,controller.signal),{name:'AbortError'});
 assert.ok(!calls.some(([,id])=>id==='audio-2'));
});
