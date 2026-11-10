// Device library catalog lookups and the adapter's revalidation and review rules.
// Renderer contract only: no Android MediaStore behaviour is exercised.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';
const m=await import('../apps/app/src/runtime/photo-library.ts');
const scope={scope:'full',images:true,videos:true,canSelectMore:false,canEditOthers:true,locked:false,version:'v1'};
const id=row=>`lib:i:${row}:${row*10}`,rev=row=>`${1700000000+row}:${1000+row}:${row}`;
const item=row=>({id:id(row),revision:rev(row),kind:'image',mime:'image/jpeg',name:`IMG_${row}.jpg`,album:'Camera',width:4,height:3,takenAt:row,modifiedAt:row,size:1,duration:0,favorite:false,owned:false});
const page=rows=>({scope,items:rows.map(item),next:'',generation:1});

test('catalog lookups by id stay correct through appends, removals and replacements',()=>{
 const catalog=new m.LibraryCatalog();catalog.apply(page([5,4,3,2,1]),true);
 const check=()=>{catalog.items.forEach((row,index)=>{assert.equal(catalog.indexOf(row.id),index);assert.equal(catalog.find(row.id),row);});assert.equal(catalog.indexOf('lib:i:0:999'),-1);assert.equal(catalog.find('lib:i:0:999'),undefined);};
 check();
 catalog.apply(page([0]),false);check();assert.equal(catalog.indexOf(id(0)),5,'an appended row is found without a rebuild');
 assert.deepEqual(catalog.reconcile([{id:id(4),status:'missing'},{id:id(2),status:'changed',item:{...item(2),revision:rev(22)}},{id:id(1),status:'missing'}]),{removed:[id(4),id(1)],changed:[id(2)]});
 check();assert.equal(catalog.find(id(4)),undefined);assert.equal(catalog.find(id(2)).revision,rev(22));
 assert.deepEqual(catalog.applyChanges([{...item(5),trashed:true},{...item(3),revision:rev(33)},item(9)],2),{removed:[id(5)],changed:[id(3)],added:1});
 check();assert.deepEqual(catalog.items.map(row=>row.id),[id(3),id(2),id(0)]);
 catalog.reset();assert.equal(catalog.indexOf(id(3)),-1);
 catalog.apply(page([7]),true);check();
});
test('lookups do not scan the catalog while its order is unchanged',()=>{
 const catalog=new m.LibraryCatalog();catalog.apply(page(Array.from({length:500},(_,i)=>500-i)),true);
 catalog.indexOf(id(1));
 let reads=0;const items=catalog.items;catalog.items=new Proxy(items,{get(target,key,receiver){if(typeof key==='string'&&/^\d+$/.test(key))reads++;return Reflect.get(target,key,receiver);}});
 for(let i=1;i<=500;i++)assert.equal(catalog.find(id(i)).id,id(i));
 assert.equal(reads,500,'one row read per lookup');
 const selection=new m.LibrarySelection();selection.toggle(item(3));selection.toggle(item(4));reads=0;
 assert.deepEqual(selection.reconcile(catalog),{dropped:0,changed:0});assert.equal(reads,2);
 const review=m.prepareReview('share',selection.items());reads=0;
 assert.equal(m.reviewCurrent(review,catalog),true);assert.equal(reads,2);
});
test('review stays bound to exact revisions',()=>{
 const catalog=new m.LibraryCatalog();catalog.apply(page([2,1]),true);
 const review=m.prepareReview('share',[{id:id(2),revision:rev(2)}]);
 assert.equal(m.reviewCurrent(review,catalog),true);
 catalog.reconcile([{id:id(2),status:'changed',item:{...item(2),revision:rev(77)}}]);assert.equal(m.reviewCurrent(review,catalog),false);
 catalog.reset();assert.equal(m.reviewCurrent(review,catalog),false);
});
test('adapter: change bursts revalidate at most twice; denial, lock-out and hiding end an open review',()=>{
 const root=resolve(import.meta.dirname,'..');
 assert.match(execFileSync(process.execPath,['--import=tsx',join(root,'test/fixtures/photo-library-revalidation.mjs')],{cwd:root,encoding:'utf8',timeout:120000}),/PASS photo library revalidation/);
});
