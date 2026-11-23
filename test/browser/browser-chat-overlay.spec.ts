import {test,expect,type Page} from '@playwright/test';
import {settled as settleScreen} from './helpers/settled';

// The chat sheet is an overlay. Pulling it up over a website, opening it and expanding it must not
// resize, hide, reflow or scroll the page underneath (owner report, 2026-10-30: the frame shrank with
// the finger, then went blank with its scroll reset while the sheet was open). A phone-sized browser
// window scales the phone canvas, so the page is also checked to lay out at the presented size.
test.use({viewport:{width:390,height:844}});

const SITE='https://overlay.example/long';
type ViewportSize = {width: number; height: number};
type OverlayProbeWindow = Window & {overlayResizes: ViewportSize[]};
const BODY='<!doctype html><meta name="viewport" content="width=device-width"><title>Overlay probe</title>'+
 '<style>body{margin:0;font:16px system-ui}section{height:220px;border-bottom:1px solid #ccc}</style><h1>Overlay probe</h1>'+
 Array.from({length:20},(_,i)=>`<section>Section ${i}</section>`).join('')+
 '<button id="tap" style="position:fixed;top:8px;right:8px" onclick="this.textContent=\'Tapped\'">Tap</button>'+
 '<script>window.overlayResizes=[];addEventListener("resize",()=>window.overlayResizes.push({width:innerWidth,height:innerHeight}));</script>';

async function openSite(page:Page){
 let loads=0;
 await page.addInitScript(()=>localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'})));
 await page.route(SITE,route=>{loads++;return route.fulfill({contentType:'text/html',body:BODY});});
 await page.goto('/');
 await page.getByRole('button',{name:'Browser',exact:true}).click();
 await page.getByRole('button',{name:'Search or type address',exact:true}).click();
 const address=page.getByRole('textbox',{name:'Address',exact:true});
 await address.fill(SITE);await address.press('Enter');
 await expect(page.frameLocator('iframe[title="Website"]').getByRole('heading',{name:'Overlay probe'})).toBeVisible();
 const site=page.frames().find(frame=>frame.url()===SITE)!;
 await site.waitForLoadState('load');
 await expect(page.getByRole('progressbar',{name:'Loading website'})).toHaveCount(0);
 await settleScreen(page);
 const surface=page.locator('[data-browser-surface]');
 // Browser publishes the website bounds on its own update after the loading bar disappears.
 await expect.poll(() => surface.evaluate(element => {
  const viewport=document.querySelector('[data-native-browser-viewport]');
  return viewport ? Math.abs(element.getBoundingClientRect().top-viewport.getBoundingClientRect().top) : Infinity;
 })).toBeLessThanOrEqual(1);
 const viewportSize=await surface.locator('iframe').evaluate(iframe=>({width:iframe.clientWidth,height:iframe.clientHeight}));
 await site.evaluate(async()=>{
  await document.fonts.ready;
  scrollTo(0,600);
 });
 // Wait for the child viewport to reach the presented size and drain its initial resize delivery.
 await expect.poll(() => site.evaluate(size => new Promise<boolean>(resolve => {
  const probe=window as OverlayProbeWindow;
  const resizeCount=probe.overlayResizes.length;
  requestAnimationFrame(() => requestAnimationFrame(() => resolve(
   innerWidth===size.width && innerHeight===size.height && scrollY===600 && probe.overlayResizes.length===resizeCount
  )));
 }),viewportSize)).toBe(true);
 const resizeStart=await site.evaluate(()=>(window as OverlayProbeWindow).overlayResizes.length);
 const geometry=async()=>({
  frame:await surface.evaluate(element=>{const box=element.getBoundingClientRect();return {display:getComputedStyle(element).display,x:Math.round(box.x),y:Math.round(box.y),width:Math.round(box.width),height:Math.round(box.height)};}),
  page:await site.evaluate(({resizeStart,viewportSize})=>({
   width:innerWidth,height:innerHeight,scrollY:Math.round(scrollY),
   // A same-size notification is harmless. Record even a transient size change that later reverts.
   viewportChanges:(window as OverlayProbeWindow).overlayResizes.slice(resizeStart)
    .filter(size=>size.width!==viewportSize.width||size.height!==viewportSize.height),
  }),{resizeStart,viewportSize}),
 });
 const settled=await geometry();
 expect(settled.page).toEqual({...viewportSize,scrollY:600,viewportChanges:[]});
 return {site,geometry,settled,loads:()=>loads};
}
const nextFrame=(page:Page)=>page.evaluate(()=>new Promise(requestAnimationFrame));
const layerAt=(page:Page,point:'above'|'inside')=>page.evaluate(point=>{
 const frame=document.querySelector('[data-browser-surface] iframe')!.getBoundingClientRect(),sheet=document.querySelector('[data-alpha-layer="conversation"]')!.getBoundingClientRect();
 const hit=document.elementFromPoint(frame.left+frame.width/2,point==='above'?sheet.top-24:sheet.top+80);
 return hit?.tagName==='IFRAME'?'website':hit?.closest('[data-alpha-layer]')?.getAttribute('data-alpha-layer');
},point);

test('pulling, opening and expanding the chat sheet leaves the website under it untouched',async({page})=>{
 const {site,geometry,settled,loads}=await openSite(page);
 expect(settled.frame.display).toBe('flex');
 expect(settled.page.scrollY).toBe(600);
 // Presented at viewport size inside the scaled canvas, beneath the resting composer.
 expect(settled.page).toMatchObject({width:settled.frame.width});
 const composer=page.locator('[data-alpha-input-bar]');
 const screenBounds=(await page.locator('[data-screen]').boundingBox())!;
 expect(Math.abs(settled.frame.y+settled.frame.height-screenBounds.y-screenBounds.height)).toBeLessThanOrEqual(2);

 // Pull the composer up the way a finger does, checking the page at every step of the drag.
 const handle=(await composer.locator('[data-alpha-input-drag-background]').boundingBox())!;
 const x=handle.x+24,y=handle.y+handle.height/2;
 await page.mouse.move(x,y);await page.mouse.down();
 try{
  for(let step=1;step<=15;step++){
   await page.mouse.move(x,y-step*22);await nextFrame(page);
   if(step%3===0){await page.waitForTimeout(120);expect(await geometry(),`pulled ${step*22}px`).toEqual(settled);}
  }
 }finally{await page.mouse.up();}
 const screen=page.locator('[data-screen]');
 await expect(screen).toHaveAttribute('data-alpha-chat-half','true');
 await page.waitForTimeout(600);
 expect(await geometry()).toEqual(settled);
 // The resting sheet is drawn over the page. The page above it stays visible, and a touch there
 // only collapses the sheet; the next touch reaches the page.
 expect(await layerAt(page,'inside')).toBe('conversation');
 expect(await layerAt(page,'above')).toBeUndefined();

 // Full chat covers the page and retires it from focus with the app, without hiding or resizing it.
 await page.getByRole('button',{name:'Expand chat',exact:true}).click();
 await expect(page.locator('[data-alpha-browser-surfaces]')).toHaveAttribute('inert','');
 await page.waitForTimeout(600);
 expect(await geometry()).toEqual(settled);

 // Closing returns the view's resting form: the page reserve is the same for pill and composer.
 await page.getByRole('button',{name:'Minimize chat',exact:true}).click();
 await expect(screen).toHaveAttribute('data-alpha-chat-half','false');
 await expect(page.locator('[data-alpha-browser-surfaces]')).not.toHaveAttribute('inert','');
 await page.waitForTimeout(600);
 expect(await geometry()).toEqual(settled);
 expect(await site.evaluate(()=>scrollY)).toBe(600);
 expect(loads()).toBe(1);
 await page.frameLocator('iframe[title="Website"]').getByRole('button',{name:'Tap'}).click();
 await expect(page.frameLocator('iframe[title="Website"]').getByRole('button',{name:'Tapped'})).toBeVisible();
});

test('a website is not reloaded or scrolled when Browser is left and opened again',async({page})=>{
 const {site,geometry,settled,loads}=await openSite(page);
 await page.getByRole('button',{name:'Back to apps',exact:true}).first().click();
 await expect(page.locator('[data-browser-surface]')).toBeHidden();
 await page.getByRole('button',{name:'Browser',exact:true}).click();
 await expect.poll(async()=>(await geometry()).frame).toEqual(settled.frame);
 expect(await site.evaluate(()=>scrollY)).toBe(600);
 expect(loads()).toBe(1);
});

type InputProbeEvent={type:string;pointerType:string|null;defaultPrevented:boolean;targetTag:string|null;activeTag:string|null};
type InputProbeWindow=Window&{__browserInputEvents?:InputProbeEvent[];__browserComposerBlurs?:number;__browserComposerRef?:Element|null};

async function touchTapPoint(page:Page,x:number,y:number){
 const client=await page.context().newCDPSession(page);
 try{
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,radiusX:4,radiusY:4,force:1,id:1}]});
  await page.waitForTimeout(30);
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }finally{
  await client.detach();
 }
}

test('tapping browser input bar opens half-sheet with focused preserved textarea and allows IME touch activation',async({page},testInfo)=>{
 const {geometry,settled}=await openSite(page);
 const screen=page.locator('[data-screen]');
 const layer=page.locator('[data-alpha-layer="composer"]');
 const input=layer.locator('textarea[data-alpha-composer="true"]');
 await expect(input).toBeVisible();
 await expect(input).not.toBeFocused();
 await expect(screen).toHaveAttribute('data-alpha-chat-half','false');

 await page.evaluate(()=>{
  const w=window as InputProbeWindow;
  w.__browserInputEvents=[];
  w.__browserComposerBlurs=0;
  w.__browserComposerRef=document.querySelector('[data-alpha-layer="composer"] textarea[data-alpha-composer="true"]');
  const textarea=w.__browserComposerRef;
  textarea?.addEventListener('blur',()=>{w.__browserComposerBlurs=(w.__browserComposerBlurs??0)+1;});
  const record=(event:Event)=>{
   const target=event.target as Element|null;
   if(!target?.closest('[data-alpha-layer="composer"]'))return;
   const type=event.type;
   const pointerType='pointerType' in event?String((event as PointerEvent).pointerType):null;
   const targetTag=target.tagName??null;
   // Read defaultPrevented in a microtask after the full synchronous dispatch
   // completes so any cancellation in target, owner, or delegated root handlers
   // is guaranteed to be observed.
   queueMicrotask(()=>{
    w.__browserInputEvents?.push({
     type,
     pointerType,
     defaultPrevented:event.defaultPrevented,
     targetTag,
     activeTag:document.activeElement?.tagName??null,
    });
   });
  };
  for(const type of ['touchstart','touchend','focusin'] as const){
   document.addEventListener(type,record,{capture:false});
  }
  for(const type of ['pointerdown','pointerup'] as const){
   textarea?.addEventListener(type,record,{capture:false});
  }
 });

 // 1. Touch tap empty textarea: native touchstart/pointerdown are not defaultPrevented, sheet opens, and same textarea stays focused in dock.
 const box=(await input.boundingBox())!;
 await touchTapPoint(page,box.x+box.width/2,box.y+box.height/2);
 await expect(page.getByRole('button',{name:'Resize chat',exact:true})).toBeVisible();
 await expect(screen).toHaveAttribute('data-alpha-chat-half','true');
 await expect(layer).toHaveAttribute('data-alpha-promoted-editor','true');
 await expect(input).toBeFocused();
 await settleScreen(page);
 await page.screenshot({animations:'disabled',path:testInfo.outputPath('browser-input-tap-sheet.png')});

 const probe=await page.evaluate(()=>{
  const w=window as InputProbeWindow;
  const active=document.querySelector('[data-alpha-layer="composer"] textarea[data-alpha-composer="true"]');
  return {events:w.__browserInputEvents??[],blurs:w.__browserComposerBlurs??0,sameNode:active===w.__browserComposerRef&&!!active?.isConnected};
 });
 expect(probe.events.find(e=>e.type==='touchstart'&&e.targetTag==='TEXTAREA')?.defaultPrevented).toBe(false);
 expect(probe.events.find(e=>e.type==='pointerdown'&&e.targetTag==='TEXTAREA')?.defaultPrevented).toBe(false);
 expect(probe.blurs).toBe(0);
 expect(probe.sameNode).toBe(true);

 await page.keyboard.type('hello browser');
 await expect(input).toHaveValue('hello browser');

 // Minimize returns to resting bar with draft preserved and unfocused, then tapping non-empty textarea re-opens half-sheet with focus.
 await page.getByRole('button',{name:'Minimize chat',exact:true}).click();
 await expect(screen).toHaveAttribute('data-alpha-chat-half','false');
 await expect(page.getByRole('button',{name:'Resize chat',exact:true})).toHaveCount(0);
 await expect(input).not.toBeFocused();
 await expect(input).toHaveValue('hello browser');

 const nonEmptyBox=(await input.boundingBox())!;
 await touchTapPoint(page,nonEmptyBox.x+nonEmptyBox.width/2,nonEmptyBox.y+nonEmptyBox.height/2);
 await expect(page.getByRole('button',{name:'Resize chat',exact:true})).toBeVisible();
 await expect(screen).toHaveAttribute('data-alpha-chat-half','true');
 await expect(layer).toHaveAttribute('data-alpha-promoted-editor','true');
 await expect(input).toBeFocused();
 await expect(input).toHaveValue('hello browser');
 expect(await geometry()).toEqual(settled);
});

test('tapping browser input drag background opens half-sheet with focused composer',async({page})=>{
 const {geometry,settled}=await openSite(page);
 const screen=page.locator('[data-screen]');
 const layer=page.locator('[data-alpha-layer="composer"]');
 const input=layer.locator('textarea[data-alpha-composer="true"]');
 await expect(screen).toHaveAttribute('data-alpha-chat-half','false');
 const bgPoint=await page.evaluate(()=>{
  const bg=document.querySelector<HTMLElement>('[data-alpha-input-drag-background]');
  if(!bg)return null;
  const rect=bg.getBoundingClientRect();
  for(const [px,py] of [
   [rect.left+8,rect.top+rect.height/2],
   [rect.right-8,rect.top+rect.height/2],
   [rect.left+rect.width/2,rect.top+3],
   [rect.left+rect.width/2,rect.bottom-3],
  ]){
   if(document.elementFromPoint(px,py)===bg)return {x:px,y:py};
  }
  return {x:rect.left+rect.width/2,y:rect.top+3};
 });
 expect(bgPoint).not.toBeNull();
 await touchTapPoint(page,bgPoint!.x,bgPoint!.y);
 await expect(page.getByRole('button',{name:'Resize chat',exact:true})).toBeVisible();
 await expect(screen).toHaveAttribute('data-alpha-chat-half','true');
 await expect(layer).toHaveAttribute('data-alpha-promoted-editor','true');
 await expect(input).toBeFocused();
 expect(await geometry()).toEqual(settled);
});

test('dragging up from empty browser textarea opens half-sheet without premature focus',async({page})=>{
 const {geometry,settled}=await openSite(page);
 const screen=page.locator('[data-screen]');
 const input=page.locator('[data-alpha-layer="composer"] textarea[data-alpha-composer="true"]');
 await expect(input).toBeVisible();
 const box=(await input.boundingBox())!;
 const x=box.x+box.width/2,y=box.y+box.height/2;
 const client=await page.context().newCDPSession(page);
 try{
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,radiusX:4,radiusY:4,force:1,id:1}]});
  for(let step=1;step<=14;step++){
   await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-step*16,radiusX:4,radiusY:4,force:1,id:1}]});
   await nextFrame(page);
  }
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }finally{
  await client.detach();
 }
 await expect(page.getByRole('button',{name:'Resize chat',exact:true})).toBeVisible();
 await expect(screen).toHaveAttribute('data-alpha-chat-half','true');
 await expect(page.locator('textarea[data-alpha-composer="true"]')).not.toBeFocused();
 expect(await geometry()).toEqual(settled);
});
