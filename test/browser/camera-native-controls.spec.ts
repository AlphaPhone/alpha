import {test,expect,type Page} from '@playwright/test';

// Actual Camera adapter, session and controls. Only Android IPC is controlled: these record
// what the native ElizaCamera plugin is asked to do. Chromium cannot show that CameraX zooms,
// lights the torch or binds a 16:9 photo stream on a phone.
type Fixture={ratios?:string[]};
async function nativeCamera(page:Page,fixture:Fixture={}){
 await page.addInitScript((fixture:Fixture)=>{
  const w=window as any;w.androidBridge={};localStorage.setItem('alpha.connection.selection.v1',JSON.stringify({kind:'offline'}));
  const f=w.nativeCamera={calls:[] as {method:string;input:any;recording:boolean}[],recording:false};
  navigator.mediaDevices.getUserMedia=async()=>{throw Error('Android Camera must use the native preview');};
  const methods=(names:string[])=>names.map(name=>({name,rtype:'promise'}));
  w.Capacitor={PluginHeaders:[
   {name:'ElizaCamera',methods:[...methods(['startPreview','stopPreview','capturePhoto','setCaptureMode','checkPermissions','checkCameraPermission','getDevices','setZoom','setSettings','setFocusPoint','switchCamera','startRecording','stopRecording','getRecordingState']),{name:'addListener',rtype:'callback'},{name:'removeListener',rtype:'callback'}]},
   {name:'AlphaDevice',methods:methods(['setVolumeShutter','openSettings'])},
   {name:'AlphaConnection',methods:methods(['secureRead','secureWrite','secureCompareExchange','secureRemove'])},
   {name:'Agent',methods:methods(['getStatus','setGoogleAgentAccess'])},
   {name:'AlphaNotifications',methods:methods(['status','crossAppStatus'])},
   {name:'AlphaVoiceCloud',methods:methods(['checkPermissions'])},
   {name:'ElizaSystem',methods:methods(['getBuildInfo'])},
   {name:'DailyApps',methods:[...methods(['surfaceInfo']),{name:'addListener',rtype:'callback'},{name:'removeListener',rtype:'callback'}]},
  ],nativeCallback:()=> 'listener',nativePromise:async(plugin:string,method:string,input:any)=>{
   if(plugin==='ElizaCamera'){
    f.calls.push({method,input,recording:f.recording});
    if(method==='checkPermissions'||method==='checkCameraPermission')return {camera:'granted',microphone:'granted'};
    if(method==='startPreview'||method==='switchCamera')return {width:1280,height:720,captureSize:{width:4000,height:3000},deviceId:'back',minZoom:1,maxZoom:8,hasFlash:true,zoom:1,flash:'off'};
    if(method==='getDevices')return {devices:[{deviceId:'back',label:'Back',direction:'back',hasFlash:true,hasZoom:true,maxZoom:8,supportedResolutions:[],supportedFrameRates:[],...(fixture.ratios?{supportedCaptureAspectRatios:fixture.ratios}:{})}]};
    if(method==='startRecording'){f.recording=true;return {};}
    if(method==='getRecordingState')return {isRecording:f.recording,duration:f.recording?1:0,fileSize:f.recording?1000:0};
    if(method==='stopRecording'){f.recording=false;return {path:'content://media/external/video/media/7',duration:1,fileSize:1000};}
    return {};
   }
   if(plugin==='AlphaDevice')return {};
   if(plugin==='AlphaConnection'){
    if(method==='secureRead')return {value:null};
    if(method==='secureCompareExchange')return {status:'saved'};
    return {};
   }
   if(plugin==='Agent')return {packaged:false,state:'unavailable'};
   if(plugin==='AlphaNotifications')return {permissionGranted:true,appEnabled:true};
   if(plugin==='AlphaVoiceCloud')return {microphone:'granted'};
   if(plugin==='ElizaSystem')return {launcher:false,version:'fixture'};
   if(plugin==='DailyApps')return {launcher:false};
   throw Error('Unexpected native call '+plugin+'.'+method);
  }};
 },fixture);
 await page.goto('/');await page.getByRole('button',{name:'Camera',exact:true}).click();
 await expect.poll(()=>page.locator('[data-alpha-camera="viewfinder"]').evaluate(element=>element.hasAttribute('data-alpha-camera-clear'))).toBe(true);
}
const calls=(page:Page,method:string)=>page.evaluate(name=>(window as any).nativeCamera.calls.filter((call:any)=>call.method===name),method);
const header=(page:Page)=>page.locator('[data-alpha-camera-root] [data-alpha-app-header="main"]');

test('the phone changes zoom and the light while a recording runs, through the native camera',async({page})=>{
 await nativeCamera(page);
 await page.getByRole('button',{name:'Video mode',exact:true}).click();
 await expect(header(page).getByRole('button',{name:'Light off',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Start recording',exact:true}).click();
 await expect(page.getByRole('timer',{name:'Recording',exact:true})).toBeVisible();
 // Flip and the mode row stay hidden: only zoom and the light are recording controls.
 await expect(header(page).getByRole('button',{name:'Switch camera',exact:true})).toBeHidden();
 await expect(page.locator('[data-alpha-camera="modes"]')).toBeHidden();
 await page.getByRole('button',{name:'Zoom 2x',exact:true}).click();
 await expect.poll(async()=>(await calls(page,'setZoom')).map((call:any)=>[call.input.zoom,call.recording])).toEqual([[2,true]]);
 await header(page).getByRole('button',{name:'Light off',exact:true}).click();
 await expect(header(page).getByRole('button',{name:'Light on',exact:true})).toBeVisible();
 await header(page).getByRole('button',{name:'Light on',exact:true}).click();
 await expect(header(page).getByRole('button',{name:'Light off',exact:true})).toBeVisible();
 expect((await calls(page,'setSettings')).map((call:any)=>[call.input.settings.flash,call.recording])).toEqual([['torch',true],['off',true]]);
 await page.getByRole('button',{name:'Stop recording',exact:true}).click();
 await expect.poll(async()=>(await calls(page,'stopRecording')).length).toBe(1);
 await expect(page.getByRole('timer',{name:'Recording',exact:true})).toBeHidden();
});

test('the aspect chip restarts the preview with the ratio the camera lists, in Photo mode only',async({page})=>{
 await nativeCamera(page,{ratios:['4:3','16:9']});
 const chip=header(page).locator('[data-alpha-camera="aspect"]'),frame=page.locator('[data-alpha-camera="frame"]');
 await expect(chip).toHaveAccessibleName('Aspect ratio 4:3');
 await expect(frame).toHaveCSS('aspect-ratio','3 / 4');
 // The first preview leaves the camera's default ratio: no option is sent.
 expect((await calls(page,'startPreview')).map((call:any)=>call.input.captureAspectRatio)).toEqual([undefined]);
 await chip.click();
 await expect(chip).toHaveAccessibleName('Aspect ratio 16:9');
 await expect.poll(async()=>(await calls(page,'startPreview')).map((call:any)=>call.input.captureAspectRatio)).toEqual([undefined,'16:9']);
 expect((await calls(page,'stopPreview')).length).toBeGreaterThanOrEqual(1);
 await expect(frame).toHaveCSS('aspect-ratio','9 / 16');
 await chip.click();
 await expect.poll(async()=>(await calls(page,'startPreview')).map((call:any)=>call.input.captureAspectRatio)).toEqual([undefined,'16:9',undefined]);
 await expect(chip).toHaveAccessibleName('Aspect ratio 4:3');
 await page.getByRole('button',{name:'Video mode',exact:true}).click();
 await expect(chip).toBeHidden();
 await expect(frame).toHaveCSS('aspect-ratio','3 / 4');
});

test('a camera that lists no photo ratios offers no aspect chip',async({page})=>{
 await nativeCamera(page);
 await expect(header(page).getByRole('button',{name:'Framing grid',exact:true})).toBeVisible();
 await expect.poll(async()=>(await calls(page,'getDevices')).length).toBe(1);
 await expect(header(page).locator('[data-alpha-camera="aspect"]')).toHaveCount(0);
});
