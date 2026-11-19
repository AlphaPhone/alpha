// Browser toolbar and find bar on the installed Browser adapter over a recorded native tab host.
// Evidence class: host test; no device, WebView or Android touch routing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {browserAdapterHost} from '../specs/quint/refinement/application/browser-adapter-host.mjs';

async function browser(run){
 const host=await browserAdapterHost({instant:['bookmarks','browsingState','saveBrowsingState','present','close','cancelReading','addListener','readingSupport','create','navigate','command','find','clearFind','findNext']});
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
