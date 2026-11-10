// Run with `node --import=tsx` from test/photo-library-revalidation.test.mjs. Drives the Photos
// device library adapter against an in-memory port: no Android, no MediaStore, no device.
import assert from 'node:assert/strict';
const visibility=[];
globalThis.document={hidden:false,addEventListener:(name,listener)=>{if(name==='visibilitychange')visibility.push(listener);},removeEventListener:(name,listener)=>{const index=visibility.indexOf(listener);if(index>=0)visibility.splice(index,1);}};
const {createDeviceLibrary,createLibraryDateLabels}=await import('../../apps/app/src/prototype/photo-library-adapter.ts');

const tick=async(n=8)=>{for(let i=0;i<n;i++)await new Promise(resolve=>setTimeout(resolve,0));};
const item=row=>({id:`lib:i:${row}:${row*10}`,revision:`${1700000000+row}:${123456+row}:${row}`,kind:'image',mime:'image/jpeg',name:`IMG_${row}.jpg`,album:'Camera',width:400,height:300,takenAt:1700000000000+row,modifiedAt:1700000000000,size:123456+row,duration:0,favorite:false,owned:false,image:''});
function fakePort(){
 const state={rows:[3,2,1],scope:'full',calls:{scope:0,validate:0,changes:0,page:0},listeners:{}};
 const scope=()=>({scope:state.scope,images:state.scope==='full',videos:state.scope==='full',canSelectMore:false,canEditOthers:true,locked:false,version:'v1'});
 const port={
  async scope(){state.calls.scope++;return scope();},async requestAccess(){return scope();},
  async page(options){state.calls.page++;if(state.scope==='denied')throw Object.assign(Error('denied'),{code:'LIBRARY_DENIED'});return {...scope(),items:state.rows.slice(0,options.limit).map(item),next:'',generation:40};},
  async inspect(){throw Error('not in this fixture');},
  async validate({items}){state.calls.validate++;return {...scope(),items:items.map(entry=>({id:entry.id,status:state.rows.some(r=>item(r).id===entry.id)?'current':'missing'}))};},
  async changes(){state.calls.changes++;return {...scope(),reset:false,items:[],generation:40};},
  async requestChange(){throw Error('not in this fixture');},async share(){throw Error('not in this fixture');},
  async watch({active}){return {active};},
  async addListener(event,listener){state.listeners[event]=listener;return {remove:async()=>{}};},
 };
 return {state,port};
}
const fakeApi=()=>{const store={photos:{album:'device'}};return {store,api:{get:name=>store[name],set(){},isActive:()=>true}};};
async function opened(){
 const {state,port}=fakePort(),{api}=fakeApi(),library=createDeviceLibrary(port,()=>true);
 library.tile(api);library.album({},api);await tick();
 assert.equal(library.album({},api).items.length,3);
 return {state,api,library};
}
async function reviewing(f){
 f.library.album({},f.api).items[0].tap();f.library.album({},f.api).dev.share();
 assert.equal(f.library.album({},f.api).dev.reviewing,true);
}

// 1. A burst of change events runs one pass and one further pass, never one per event.
{
 const f=await opened();
 const before={...f.state.calls};
 for(let i=0;i<5;i++)f.state.listeners.libraryChanged({});
 await tick(20);
 assert.equal(f.state.calls.validate-before.validate,2,'five events revalidate twice: the pass in flight and one after it');
 assert.equal(f.state.calls.changes-before.changes,2);
 f.state.listeners.libraryChanged({});await tick(20);
 assert.equal(f.state.calls.validate-before.validate,3,'a later event starts a new pass');
 f.state.rows=[3,1];f.state.listeners.libraryChanged({});f.state.listeners.libraryChanged({});await tick(20);
 assert.deepEqual(f.library.album({},f.api).items.map(row=>row.nativeMediaId),['lib:i:3:30','lib:i:1:10'],'overlapping requests still remove what left the library');
 f.library.dispose();
}

// 2. A denial found by a load ends the open review along with the catalog and selection.
{
 const f=await opened();await reviewing(f);
 f.state.scope='denied';f.library.album({},f.api).loadMore();await tick(20);
 const view=f.library.album({},f.api);
 assert.equal(view.items.length,0);assert.equal(view.dev.reviewing,false,'no review prompt over an empty library');
 f.library.dispose();
}

// 3. A denial found by a scope read during revalidation ends the review too.
{
 const f=await opened();await reviewing(f);
 f.state.scope='denied';f.state.listeners.libraryChanged({});await tick(20);
 assert.equal(f.library.album({},f.api).dev.reviewing,false);
 f.library.dispose();
}

// 4. Hiding the app ends the review; nothing else changes.
{
 const f=await opened();await reviewing(f);
 assert.equal(visibility.length,1,'one visibility listener per mounted library');
 globalThis.document.hidden=true;for(const listener of visibility)listener();globalThis.document.hidden=false;
 const view=f.library.album({},f.api);
 assert.equal(view.dev.reviewing,false);assert.equal(view.items.length,3);assert.match(view.status,/Review cancelled/);
 f.library.dispose();assert.equal(visibility.length,0,'disposing removes the listener');
}

// 5. Row date labels are formatted once per row object.
{
 let formatted=0;const label=createLibraryDateLabels(takenAt=>{formatted++;return 'day '+takenAt;});
 const a={takenAt:1},b={takenAt:2};
 for(let i=0;i<100;i++){assert.equal(label(a),'day 1');assert.equal(label(b),'day 2');}
 assert.equal(formatted,2);
 assert.equal(label({takenAt:1}),'day 1');assert.equal(formatted,3,'a replaced row is formatted again');
 assert.equal(createLibraryDateLabels(()=>{throw RangeError('bad date');})({takenAt:NaN}),'Invalid Date');
 assert.equal(createLibraryDateLabels()({takenAt:1700000000000}),new Date(1700000000000).toLocaleDateString(),'the default label is the locale date shown before');
}
console.log('PASS photo library revalidation');
