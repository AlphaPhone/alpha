// Browser toolbar and find bar on the installed Browser adapter over a recorded native tab host.
// Evidence class: host test; no device, WebView or Android touch routing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {browserAdapterHost} from '../specs/quint/refinement/application/browser-adapter-host.mjs';

async function browser(run){
 // The native bookmark store keeps addresses only.
 let marks=[];
 const setBookmark=input=>{marks=input.saved?[...marks.filter(url=>url!==input.url),input.url]:marks.filter(url=>url!==input.url);return {urls:marks};};
 const host=await browserAdapterHost({instant:['bookmarks','browsingState','saveBrowsingState','present','close','cancelReading','addListener','readingSupport','create','navigate','command','find','clearFind','findNext','setBookmark','downloads'],results:{bookmarks:()=>({urls:marks}),setBookmark}});
 let sequence=0;
 const page=async(id,url,title)=>{host.emit('stateChanged',{id,sequence:++sequence,navigation:'n'+sequence,url,title,committed:true,loading:false,canBack:false,canForward:false,error:''});await host.sync();};
 const type=async address=>{host.rendered().onAddrKey({key:'Enter',preventDefault(){},target:{value:address}});await host.sync();return host.state().cur;};
 try{await run({host,page,type});}finally{await host.teardown();}
}

test('opening Find focuses its field once, so the keyboard opens with it',async()=>{
 await browser(async({host,page,type})=>{
  const id=await type('https://example.com/');await page(id,'https://example.com/','Example');
  host.rendered().openFind();await host.sync();assert.equal(host.state().finding,true);
  const {document}=host.page.window,input=document.createElement('input'),other=document.createElement('button');
  document.body.append(input,other);
  host.rendered().find.focusRef(input);assert.equal(document.activeElement,input);
  other.focus();host.rendered().find.focusRef(input);
  assert.equal(document.activeElement,other,'a later render does not take focus back from the owner');
  host.rendered().find.focusRef(null);
 });
});

test('a new tab names itself in the toolbar instead of offering a second search field',async()=>{
 await browser(async({host,page,type})=>{
  assert.equal(host.rendered().isNew,true);assert.equal(host.rendered().host,'New tab');
  host.rendered().openPrivate();await host.sync();assert.equal(host.rendered().host,'New private tab');
  const id=await type('https://example.com/path');await page(id,'https://example.com/path','Example');
  assert.equal(host.rendered().host,'example.com');assert.equal(host.rendered().path,'/path');
 });
});

test('history is grouped by the day of each visit and both lists can be filtered',async()=>{
 await browser(async({host,page,type})=>{
  const first=await type('https://news.example/today');await page(first,'https://news.example/today','Morning news');
  const second=await type('https://recipes.example/soup');await page(second,'https://recipes.example/soup','Soup');
  const stamps=host.state().visitedAt;
  assert.deepEqual(Object.keys(stamps).sort(),['https://news.example/today','https://recipes.example/soup']);
  // One visit three days ago and one restored from before visit times were kept.
  const earlier=Date.now()-3*86400000;
  host.view.state.visits=[...host.state().visits,'https://old.example/','https://restored.example/'];
  host.view.state.visitedAt={...stamps,'https://old.example/':earlier};
  host.rendered().openLib();host.rendered().libHist();await host.sync();
  const rows=host.rendered().libRows;
  assert.deepEqual(rows.map(row=>row.id),['https://recipes.example/soup','https://news.example/today','https://old.example/','https://restored.example/']);
  assert.deepEqual(rows.map(row=>row.heading),['Today','',rows[2].heading,'Earlier']);
  assert.ok(rows[2].heading&&!['Today','Yesterday','Earlier'].includes(rows[2].heading));
  assert.equal(host.rendered().libSearchLabel,'Search history');

  host.rendered().onLibQuery({target:{value:'SOUP'}});
  assert.deepEqual(host.rendered().libRows.map(row=>row.id),['https://recipes.example/soup'],'a page name matches');
  host.rendered().onLibQuery({target:{value:'old.example'}});
  assert.deepEqual(host.rendered().libRows.map(row=>row.id),['https://old.example/'],'an address matches');
  host.rendered().onLibQuery({target:{value:'nothing here'}});
  assert.equal(host.rendered().libRows.length,0);assert.equal(host.rendered().libNoMatches,true);assert.equal(host.rendered().libEmpty,false);
  host.rendered().onLibQuery({target:{value:''}});

  host.rendered().libRows.find(row=>row.id==='https://old.example/').remove();
  assert.equal('https://old.example/' in host.state().visitedAt,false,'a removed visit forgets its time');
  host.rendered().clearHist();assert.deepEqual(host.state().visitedAt,{});assert.deepEqual(host.state().visits,[]);
  host.rendered().closeLib();host.rendered().openLib();assert.equal(host.state().libQuery,'','the filter starts empty');
 });
});

test('a private tab records no visit time',async()=>{
 await browser(async({host,page,type})=>{
  host.rendered().openPrivate();await host.sync();
  const id=await type('https://private.example/');await page(id,'https://private.example/','Private');
  assert.deepEqual(host.state().visits,[]);assert.deepEqual(host.state().visitedAt,{});
 });
});

test('a bookmark keeps the name of the page it saved, even from a private tab',async()=>{
 await browser(async({host,page,type})=>{
  host.rendered().openPrivate();await host.sync();
  const id=await type('https://private.example/recipe');await page(id,'https://private.example/recipe','Lentil soup');
  assert.deepEqual(host.state().visits,[],'the private visit is not kept');
  host.rendered().toggleMark();await host.settle();await host.sync();
  assert.deepEqual(host.state().marks,['https://private.example/recipe']);
  host.rendered().openLib();await host.sync();
  const [row]=host.rendered().libRows;
  assert.equal(row.name,'Lentil soup','the bookmark shows the page name, not only the site');
  assert.equal(row.host,'private.example/recipe');
  host.rendered().onLibQuery({target:{value:'lentil'}});
  assert.deepEqual(host.rendered().libRows.map(row=>row.id),['https://private.example/recipe'],'the name can be searched');
  host.rendered().onLibQuery({target:{value:''}});
  host.rendered().libRows[0].remove();await host.settle();await host.sync();
  assert.deepEqual(host.state().marks,[]);
  assert.equal('https://private.example/recipe' in host.state().titles,false,'a removed bookmark forgets its name');
 });
});

test('a bookmark saved without a page name shows its site',async()=>{
 await browser(async({host,page,type})=>{
  host.rendered().openPrivate();await host.sync();
  const id=await type('https://untitled.example/a');await page(id,'https://untitled.example/a','');
  host.rendered().toggleMark();await host.settle();await host.sync();
  host.rendered().openLib();await host.sync();
  assert.equal(host.rendered().libRows[0].name,'untitled.example');
  assert.deepEqual(host.state().titles,{});
 });
});

test('the Downloads list\'s Show in Files opens Files at Downloads for this Browser only',async()=>{
 await browser(async({host})=>{
  host.rendered().openDownloads();await host.sync();
  const session=host.calls.find(call=>call.name==='downloads').input.session;
  host.emit('showDownloads',{session:'another-browser'});
  assert.deepEqual(host.presets,[],'another Browser document\'s list opens nothing here');
  host.emit('showDownloads',{session});
  assert.deepEqual(host.presets,['files:folder']);
 });
});
