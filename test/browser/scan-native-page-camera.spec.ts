import {test,expect,type Page} from '@playwright/test';
import {openScanDraftOptions} from './scan-review-navigation';

// Actual Camera session, scanner, review and draft store. Only Android IPC is
// controlled. Chromium cannot prove that a CameraX surface is visible on a phone.
async function nativeCamera(page:Page){
 await page.addInitScript(()=>{
  const w=window as any;w.androidBridge={};localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'}));
  const f=w.scanNative={calls:[] as any[],hold:false,release:undefined as (()=>void)|undefined,streams:0},store=new Map<string,string>();
  navigator.mediaDevices.getUserMedia=async()=>{f.streams++;throw Error('Android scan must use the bound native Camera');};
  const methods=(names:string[])=>names.map(name=>({name,rtype:'promise'}));
  w.Capacitor={PluginHeaders:[
   {name:'ElizaCamera',methods:[...methods(['startPreview','stopPreview','capturePhoto','setCaptureMode','checkPermissions','checkCameraPermission']),{name:'addListener',rtype:'callback'},{name:'removeListener',rtype:'callback'}]},
   {name:'AlphaConnection',methods:methods(['secureRead','secureWrite','secureCompareExchange','secureRemove'])},
   {name:'Agent',methods:methods(['getStatus','setGoogleAgentAccess'])},
   {name:'AlphaNotifications',methods:methods(['status','crossAppStatus'])},
   {name:'AlphaVoiceCloud',methods:methods(['checkPermissions'])},
   {name:'ElizaSystem',methods:methods(['getBuildInfo'])},
   {name:'DailyApps',methods:[...methods(['surfaceInfo']),{name:'addListener',rtype:'callback'},{name:'removeListener',rtype:'callback'}]},
  ],nativeCallback:()=> 'listener',nativePromise:async(plugin:string,method:string,input:any)=>{
   if(plugin==='ElizaCamera'){
    f.calls.push({method,input});
    if(method==='checkPermissions'||method==='checkCameraPermission')return {camera:'granted'};
    if(method==='startPreview')return {width:1280,height:720,captureSize:{width:4000,height:3000},deviceId:'back',minZoom:1,maxZoom:1,hasFlash:false};
    if(method==='capturePhoto'){
     if(f.hold){f.hold=false;await new Promise<void>(resolve=>f.release=()=>{f.release=undefined;resolve();});}
     // A frame capture names no size; the native plugin then returns the preview's own.
     const canvas=document.createElement('canvas');canvas.width=input.width??1280;canvas.height=input.height??720;const context=canvas.getContext('2d')!;
     context.fillStyle=['red','blue','green'][Math.min(2,f.calls.filter((call:any)=>call.method==='capturePhoto').length-1)];context.fillRect(0,0,canvas.width,canvas.height);
     return {base64:canvas.toDataURL('image/jpeg').split(',')[1],format:'jpeg',width:canvas.width,height:canvas.height};
    }
    return {};
   }
   if(plugin==='AlphaConnection'){
    if(method==='secureRead')return {value:store.get(input.slot)??null};
    if(method==='secureCompareExchange'){if((store.get(input.slot)??null)!==input.expectedValue)return {status:'conflict'};if(input.value===null)store.delete(input.slot);else store.set(input.slot,input.value);return {status:'saved'};}
    if(method==='secureWrite')store.set(input.slot,input.value);return {};
   }
   if(plugin==='Agent')return {packaged:false,state:'unavailable'};
   if(plugin==='AlphaNotifications')return {permissionGranted:true,appEnabled:true};
   if(plugin==='AlphaVoiceCloud')return {microphone:'granted'};
   if(plugin==='ElizaSystem')return {launcher:false,version:'fixture'};
   if(plugin==='DailyApps')return {launcher:false};
   throw Error('Unexpected native call '+plugin+'.'+method);
  }};
 });
 await page.goto('/');await page.getByRole('button',{name:'Camera',exact:true}).click();
 await expect.poll(()=>page.locator('[data-alpha-camera="viewfinder"]').evaluate(element=>element.hasAttribute('data-alpha-camera-clear'))).toBe(true);
 // Camera has no Scan document button: asking to scan in Camera reviews one frame, whose
 // Multi-page entry opens the document on this visit's preview.
 await page.getByRole('button',{name:'Type',exact:true}).click();
 const ask=page.locator('[data-alpha-layer="composer"][aria-hidden="false"], [data-alpha-layer="conversation"][aria-hidden="false"]').getByRole('textbox').first();
 await ask.fill('Scan this document');await ask.press('Enter');
 await scanReview(page).getByRole('button',{name:'Multi-page',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Review scan document',exact:true})).toBeVisible();
}
const scanReview=(page:Page)=>page.getByRole('dialog',{name:'Review scanned text',exact:true});
const frameCapture={format:'jpeg',quality:85,saveToGallery:false};
const builder=(page:Page)=>page.getByRole('dialog',{name:'Review scan document',exact:true});
const camera=(page:Page)=>page.getByRole('dialog',{name:'Capture document page',exact:true});
async function capturePage(page:Page){
 await builder(page).getByRole('button',{name:'Capture new page',exact:true}).click();
 await expect(builder(page)).toBeHidden();await expect(camera(page)).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 await camera(page).getByRole('button',{name:'Capture page',exact:true}).click();
 await expect(camera(page).getByRole('img',{name:'Review captured document page',exact:true})).toBeVisible();
 await camera(page).getByRole('button',{name:'Use captured page',exact:true}).click();
 await expect(builder(page)).toBeVisible();
}
test('native document entry captures, reviews, retakes and resumes without gallery or a second camera owner',async({page},info)=>{
 await nativeCamera(page);await capturePage(page);await capturePage(page);
 // The scanned frame is page 1; two more pages come from the preview.
 await expect(builder(page).getByRole('img')).toHaveCount(3);
 await builder(page).getByRole('button',{name:'Retake page 1',exact:true}).click();
 await camera(page).getByRole('button',{name:'Capture page',exact:true}).click();
 await expect(camera(page).getByRole('button',{name:'Use captured page',exact:true})).toBeEnabled();
 await camera(page).getByRole('button',{name:'Retake capture',exact:true}).click();
 await expect(camera(page).getByRole('button',{name:'Capture page',exact:true})).toBeEnabled();
 await camera(page).getByRole('button',{name:'Capture page',exact:true}).click();
 await camera(page).getByRole('button',{name:'Use captured page',exact:true}).click();
 await expect(builder(page).getByRole('img')).toHaveCount(3);
 const calls=await page.evaluate(()=>(window as any).scanNative.calls);
 expect(calls.filter((call:any)=>call.method==='startPreview')).toHaveLength(1);
 expect(calls.filter((call:any)=>call.method==='capturePhoto').map((call:any)=>call.input)).toEqual([frameCapture,...Array(4).fill({...frameCapture,width:2048,height:1536})]);
 expect(await page.evaluate(()=>(window as any).scanNative.streams)).toBe(0);
 await page.screenshot({path:info.outputPath('native-contract-document.png')});
 await builder(page).getByRole('button',{name:'Close document',exact:true}).click();await builder(page).getByRole('button',{name:'Keep draft',exact:true}).click();
 await scanReview(page).getByRole('button',{name:'Multi-page',exact:true}).click();await openScanDraftOptions(page);
 // Re-entry starts from the frame again, so loading the kept draft replaces it after confirmation.
 await builder(page).getByRole('button',{name:'Load saved draft',exact:true}).click();
 await page.getByRole('dialog',{name:'Load saved draft?',exact:true}).getByRole('button',{name:'Load draft',exact:true}).click();
 await expect(builder(page).getByRole('img')).toHaveCount(3);
});
test('cancel and Camera leave drop delayed native pages and restore covered dialogs',async({page})=>{
 await nativeCamera(page);await page.evaluate(()=>(window as any).scanNative.hold=true);
 await builder(page).getByRole('button',{name:'Capture new page',exact:true}).click();await camera(page).getByRole('button',{name:'Capture page',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>typeof (window as any).scanNative.release)).toBe('function');
 await camera(page).getByRole('button',{name:'Cancel capture',exact:true}).click();await expect(builder(page)).toBeVisible();
 await page.evaluate(async()=>{(window as any).scanNative.release();await new Promise(resolve=>setTimeout(resolve,0));});
 // Only the scanned frame remains: the cancelled page is dropped.
 await expect(builder(page).getByRole('img')).toHaveCount(1);
 await page.evaluate(()=>(window as any).scanNative.hold=true);
 await builder(page).getByRole('button',{name:'Capture new page',exact:true}).click();await camera(page).getByRole('button',{name:'Capture page',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>typeof (window as any).scanNative.release)).toBe('function');
 await page.evaluate(()=>window.dispatchEvent(new Event('launcher-home')));await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.evaluate(()=>(window as any).scanNative.release());await expect(page.getByRole('dialog')).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).scanNative.streams)).toBe(0);
});
