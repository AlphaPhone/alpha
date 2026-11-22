import {test,expect,type Page} from '@playwright/test';
import {returnToApps} from './app-navigation';

// The real shell, chat sheet and Camera adapter over a synthetic camera stream; offline, no agent.
// Switching to Camera keeps the conversation exactly where it was: closed stays closed, the open sheet stays
// open with Camera laid out above it, and full stays full. Not a device acceptance test.
test.use({hasTouch:true});
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'}));
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;const ctx=canvas.getContext('2d')!;
  const paint=()=>{ctx.fillStyle='#3080ff';ctx.fillRect(0,0,320,240);};paint();setInterval(paint,50);
  const devices=navigator.mediaDevices;devices.getUserMedia=async()=>canvas.captureStream(20);Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:devices});
 });
 await page.goto('/');
 // A handle on the shell, to switch views the way the chat's navigation does (agent-adapter openInternalView):
 // the conversation's current detent goes with the switch.
 await page.evaluate(async()=>{const {Component}=await import('/src/prototype/model.js');const render=Component.prototype.renderVals;Component.prototype.renderVals=function(){(window as any).cameraChatShell=this;return render.call(this);};});
 await returnToApps(page);
 await expect(page.locator('html')).toHaveAttribute('data-active-view','home');
 await expect.poll(()=>page.evaluate(()=>!!(window as any).cameraChatShell?.live)).toBe(true);
});
const detent=(page:Page)=>page.evaluate(()=>{
 const conversation=document.querySelector('[data-alpha-layer="conversation"]');
 if(!conversation||conversation.getAttribute('aria-hidden')==='true')return 'closed';
 return document.querySelector('[data-screen]')!.getAttribute('data-alpha-chat-half')==='true'?'sheet':'full';
});
const previewLive=(page:Page)=>expect.poll(()=>page.locator('[data-alpha-camera="viewfinder"] video').evaluate((v:HTMLVideoElement)=>v.readyState).catch(()=>0)).toBeGreaterThanOrEqual(2);
/** The viewfinder is on top across its visible span, and the shutter, Photo mode and flip are on top at their centres, above any open sheet. */
const cameraUsable=(page:Page)=>page.evaluate(()=>{
 const finder=document.querySelector('[data-alpha-camera="viewfinder"]'),zoom=document.querySelector('[data-alpha-camera="zoom"]'),header=document.querySelector('[data-alpha-camera-root] [data-alpha-app-header]');
 const shutter=[...document.querySelectorAll('[data-alpha-camera="capture"] button')].find(button=>button.getBoundingClientRect().width>=70);
 const flip=document.querySelector('[data-alpha-camera-root] [aria-label="Switch camera"]'),photo=document.querySelector('[data-alpha-camera="modes"] [aria-label="Photo mode"]');
 const conversation=document.querySelector('[data-alpha-layer="conversation"]');
 const sheetTop=conversation&&conversation.getAttribute('aria-hidden')!=='true'?conversation.getBoundingClientRect().top:Infinity;
 if(!finder||!shutter||!flip||!photo)return {ok:false,why:'missing'};
 const r=finder.getBoundingClientRect(),top=Math.max(r.top,header?header.getBoundingClientRect().bottom:r.top)+2,bottom=Math.min(r.bottom,sheetTop,...[zoom,...document.querySelectorAll('[data-alpha-camera="modes"],[data-alpha-camera="capture"]')].filter(Boolean).map(row=>row!.getBoundingClientRect().top))-2;
 if(bottom-top<60)return {ok:false,why:'viewfinder '+Math.round(bottom-top)+'px'};
 for(const fx of [.05,.25,.5,.75,.95])for(const fy of [0,.25,.5,.75,1]){const hit=document.elementFromPoint(r.left+r.width*fx,top+(bottom-top)*fy);if(!finder.contains(hit))return {ok:false,why:'viewfinder covered by '+(hit?.outerHTML.slice(0,80))};}
 for(const control of [shutter,flip,photo]){
  const c=control.getBoundingClientRect(),hit=document.elementFromPoint(c.left+c.width/2,c.top+c.height/2);
  if(!control.contains(hit))return {ok:false,why:(control.getAttribute('aria-label')||'control')+' covered by '+(hit?.outerHTML.slice(0,80))};
  if(c.bottom>sheetTop+1)return {ok:false,why:(control.getAttribute('aria-label')||'control')+' under the sheet'};
 }
 return {ok:true,why:''};
});

test('a closed chat stays closed when the owner opens Camera from Home',async({page})=>{
 expect(await detent(page)).toBe('closed');
 await page.getByRole('button',{name:'Camera',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-active-view','camera');
 await previewLive(page);
 await page.waitForTimeout(400);
 expect(await detent(page)).toBe('closed');
 await expect(page.getByRole('button',{name:'Open conversation',exact:true})).toBeVisible();
 await expect.poll(()=>cameraUsable(page)).toEqual({ok:true,why:''});
});

test('an open chat stays open over Camera, with the preview visible and the shutter reachable',async({page})=>{
 await page.getByRole('button',{name:'Open conversation',exact:true}).click();
 await expect.poll(()=>detent(page)).toBe('sheet');
 await page.evaluate(()=>(window as any).cameraChatShell.openView('camera',undefined,(window as any).cameraChatShell.S().chat));
 await expect(page.locator('html')).toHaveAttribute('data-active-view','camera');
 await previewLive(page);
 await expect.poll(()=>detent(page)).toBe('sheet');
 await expect.poll(()=>cameraUsable(page)).toEqual({ok:true,why:''});
 await page.waitForTimeout(400);expect(await detent(page)).toBe('sheet');
 // The shutter is the owner's to tap with the chat open: it takes the photo and the chat stays where it is.
 const before=await page.evaluate(async()=>{const {browserPhotoLibrary}=await import('/src/prototype/browser-camera.ts');return (await browserPhotoLibrary.list()).items.length;});
 await page.locator('[data-alpha-camera="capture"]').getByRole('button',{name:'Take photo',exact:true}).click();
 await expect.poll(()=>page.evaluate(async()=>{const {browserPhotoLibrary}=await import('/src/prototype/browser-camera.ts');return (await browserPhotoLibrary.list()).items.length;})).toBe(before+1);
 expect(await detent(page)).toBe('sheet');
 // Leaving Camera keeps the sheet too.
 await page.evaluate(()=>(window as any).cameraChatShell.openView('notes',undefined,(window as any).cameraChatShell.S().chat));
 await expect(page.locator('html')).toHaveAttribute('data-active-view','notes');
 expect(await detent(page)).toBe('sheet');
});

test('a full chat stays full when Camera opens',async({page})=>{
 await page.getByRole('button',{name:'Open conversation',exact:true}).click();
 await page.getByRole('button',{name:'Expand chat',exact:true}).click();
 await expect.poll(()=>detent(page)).toBe('full');
 await page.evaluate(()=>(window as any).cameraChatShell.openView('camera',undefined,(window as any).cameraChatShell.S().chat));
 await expect(page.locator('html')).toHaveAttribute('data-active-view','camera');
 await page.waitForTimeout(400);
 expect(await detent(page)).toBe('full');
 // Lowering it to the sheet shows Camera laid out above it.
 await page.evaluate(()=>(window as any).cameraChatShell.back());
 await expect.poll(()=>detent(page)).toBe('sheet');
 await previewLive(page);
 await expect.poll(()=>cameraUsable(page)).toEqual({ok:true,why:''});
});

test('a scan asked for on Camera keeps the open sheet, with scan review above it',async({page})=>{
 await page.getByRole('button',{name:'Open conversation',exact:true}).click();
 await expect.poll(()=>detent(page)).toBe('sheet');
 await page.evaluate(()=>(window as any).cameraChatShell.openView('camera',undefined,(window as any).cameraChatShell.S().chat));
 await expect(page.locator('html')).toHaveAttribute('data-active-view','camera');
 await previewLive(page);
 expect(await page.evaluate(async()=>{const {requestCameraScan}=await import('/src/prototype/camera-adapter.ts');return requestCameraScan();})).toBe(true);
 await expect(page.getByRole('dialog',{name:'Review scanned text'})).toBeVisible();
 expect(await detent(page)).toBe('sheet');
});
