import test from 'node:test';
import assert from 'node:assert/strict';
import {attachmentPickerFixture} from './fixtures/attachment-picker.mjs';

test('browsing and selecting do not read file bytes; Attach returns only selected exact bytes and releases the grant',async()=>{
 const f=attachmentPickerFixture();await f.open();await f.files();f.select();
 assert.equal(f.inspect().readCalls,0);assert.equal(f.inspect().selectCalls,0);
 await f.attach();assert.equal(f.inspect().queued,1);assert.equal(f.inspect().leaseCount,0);
 assert.equal(await f.results.at(-1).files[0].text(),'test');
});
for(const retire of ['cancel','switchOwner','switchConversation','hide']){
 test('an in-flight byte read cannot attach after '+retire+' and its grant releases on the fair native reply',async()=>{
  const f=attachmentPickerFixture({holdRead:true});await f.open();await f.files();f.select();await f.attach();
  assert.equal(f.inspect().leaseCount,1);await f[retire]();assert.equal(f.inspect().queued,0);
  await f.releaseRead();assert.equal(f.inspect().queued,0);assert.equal(f.inspect().leaseCount,0);assert.equal(f.inspect().open,false);
 });
}
test('a late selection from a retired picker cannot start a byte read after a new picker opens',async()=>{
 const f=attachmentPickerFixture({holdSelect:true});await f.open();await f.files();f.select();await f.attach();
 await f.cancel();await f.open();await f.files();await f.releaseSelect();
 assert.equal(f.inspect().readCalls,0);assert.equal(f.inspect().leaseCount,0);assert.equal(f.inspect().queued,0);assert.equal(f.inspect().open,true);
 await f.cancel();
});
test('a failed read keeps the selection available for explicit retry without retaining a native grant',async()=>{
 const f=attachmentPickerFixture({holdRead:true});await f.open();await f.files();f.select();await f.attach();await f.releaseRead(false);
 assert.equal(f.inspect().open,true);assert.equal(f.inspect().selected,1);assert.equal(f.inspect().queued,0);assert.equal(f.inspect().leaseCount,0);assert.match(f.inspect().error,/Select it again/);await f.cancel();
});
test('selection respects the remaining shared composer count',async()=>{
 const f=attachmentPickerFixture();await f.open(1);await f.files();f.select(0);f.select(1);
 assert.equal(f.inspect().selected,1);assert.match(f.inspect().error,/up to 1/);await f.cancel();assert.equal(f.inspect().readCalls,0);
});

test('actual picker selection and late native callbacks refine the bounded ownership model',{timeout:60000},async()=>{const {checkAttachmentPicker}=await import('../specs/quint/refinement/application/attachment-picker.mjs');const result=await checkAttachmentPicker();assert.equal(result.passed,true);assert.equal(result.driverInputsBound,true);});
