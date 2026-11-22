import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

// The Notes "Note actions" popup is a menu over a scrim (NOTES-12). The shared inline modal owns its
// focus as it does a dialog's, and the arrow keys move between the menu's entries.
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://alpha.invalid'});
const keys=['window','document','HTMLElement','HTMLDialogElement','KeyboardEvent','Event','MutationObserver','getComputedStyle','Element','Node'];
const previous=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
for(const key of keys)Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:key==='window'?dom.window:key==='getComputedStyle'?dom.window.getComputedStyle.bind(dom.window):dom.window[key]});
// jsdom has no layout: every element counts as shown.
dom.window.HTMLElement.prototype.getClientRects=function(){return [{width:1,height:1}];};
after(()=>{dom.window.close();for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
const {createInlineModal}=await import('../apps/app/src/runtime/inline-modal.ts');

const press=key=>document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
const focused=()=>document.activeElement?.textContent;

test('a menu over a scrim takes focus on its first entry, moves with the arrow keys and closes on Escape',async()=>{
 document.body.innerHTML=`<div class="os"><button id="more" aria-haspopup="menu">More</button>
  <div id="popup" data-alpha-popup><div role="menu" aria-label="Note actions">
   <button role="menuitem">Share</button><button role="menuitem">Pin</button><hr><button role="menuitem">Delete</button>
  </div></div></div>`;
 const more=document.getElementById('more');more.focus();
 let closed=0;
 const modal=createInlineModal(()=>{closed++;},()=>more);
 modal.ref(document.getElementById('popup'));
 assert.equal(focused(),'Share');
 press('ArrowDown');assert.equal(focused(),'Pin');
 press('ArrowDown');assert.equal(focused(),'Delete');
 press('ArrowDown');assert.equal(focused(),'Share','ArrowDown wraps to the first entry');
 press('ArrowUp');assert.equal(focused(),'Delete','ArrowUp wraps to the last entry');
 press('Home');assert.equal(focused(),'Share');
 press('End');assert.equal(focused(),'Delete');
 assert.equal(more.getAttribute('aria-hidden'),'true','the page under the menu leaves the accessibility tree');
 press('Escape');assert.equal(closed,1);
 modal.ref(null);
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(document.activeElement,more,'focus returns to More');
 assert.equal(more.hasAttribute('aria-hidden'),false);
});

test('the arrow keys do not move focus inside a dialog',()=>{
 document.body.innerHTML=`<div class="os"><div id="popup" data-alpha-popup><div role="dialog" aria-label="Share">
  <button>Email</button><button>Copy</button></div></div></div>`;
 const modal=createInlineModal(()=>{});
 modal.ref(document.getElementById('popup'));
 assert.equal(focused(),'Email');
 press('ArrowDown');assert.equal(focused(),'Email');
 modal.ref(null);
});
