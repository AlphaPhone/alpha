// Camera view lifecycle, driven through the adapter's own start, control, agent-capture and
// keep functions with a synthetic camera boundary. No camera frames, provider or native writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes,createRequire} from 'node:module';
const {JSDOM}=createRequire(import.meta.url)('jsdom');
const source=fs.readFileSync(new URL('../apps/app/src/prototype/camera-adapter.ts',import.meta.url),'utf8');
const between=(from,to)=>{const start=source.indexOf(from),end=source.indexOf(to,start);assert.ok(start>=0&&end>start,from);return source.slice(start,end);};
const ui=between('  function hideAccess()','  async function stop()');
const lifecycle=between('  async function start(retry','  async function finishVideo()');
const requested=between('  const takeRequestedPhoto=','  requestedPhoto=takeRequestedPhoto;');
const keep=between('  async function keepScan(','  /** Android: the system picker');
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function fixture({browserMode=true}={}){
 const env=new JSDOM('<div data-alpha-camera-root data-alpha-layer><button aria-label="Viewfinder. Tap to focus, hold to ask Alpha, swipe to change mode"></button></div>');
 env.window.setTimeout=()=>1;env.window.clearTimeout=()=>{};
 const calls={starts:0,captures:0,kept:[],views:[]};let pending=[];
 const camera={startPreview:()=>{calls.starts++;return new Promise((resolve,reject)=>pending.push({resolve,reject}));}};
 const library={keepCapture:input=>{calls.kept.push(input);return new Promise(resolve=>pending.push({resolve}));}};
 const context=vm.createContext({window:env.window,document:env.window.document,console,crypto,Error,camera,library,mediaAccessDenied:()=>undefined,mask(){},active:()=>true,Capacitor:{isPluginAvailable:()=>true},
  cameraViewVisible:()=>true,schedule(){},nativeId:id=>id,normalize:row=>row,importBrowserPhoto:async()=>({id:'b'}),validateCameraCaptureResult:value=>value,
  saveCameraPhoto:async()=>{calls.captures++;return {id:'42',width:4,height:3};}});
 const prelude=`let accessPanel,denied,disposed=false,recordingStarting=false,finalizing=false,phase='off',epoch=0,direction='back',flash=false,controlBusy=false,capturing=false,recording=false,requestedCaptureActive=false,loaded=true,captures=[];const browserMode=${browserMode},stopping=Promise.resolve();const finder='[aria-label="Viewfinder. Tap to focus, hold to ask Alpha, swipe to change mode"]';let state={said:''};const api={set:patch=>Object.assign(state,patch),get:()=>state};`;
 vm.runInContext(stripTypeScriptTypes(prelude+ui+lifecycle+requested+keep+`;globalThis.testCamera={start,control,previewLost,takeRequestedPhoto,keepScan,state:()=>({phase,denied,loaded,controlBusy,epoch}),setPhase:value=>{phase=value;}};`,{mode:'strip'}),context);
 const owner={setView:(...args)=>calls.views.push(args)};
 return {env,calls,owner,api:context.testCamera,next:()=>pending.shift(),alert:()=>env.window.document.querySelector('[role="alert"]')};
}

test('an agent capture that arrives while the preview is starting waits for it and takes the photo',async()=>{
 const f=fixture();const starting=f.api.start();await settle();
 assert.equal(f.api.state().phase,'starting');
 const attempt=f.api.takeRequestedPhoto('operation',new AbortController().signal,()=>{});await settle();
 assert.equal(f.calls.captures,0,'nothing is captured before the preview is ready');assert.equal(f.calls.starts,1,'the request joins the start in flight');
 f.next().resolve();await starting;
 const result=await attempt;
 assert.equal(result.status,'succeeded');assert.equal(f.calls.captures,1);assert.equal(f.api.state().phase,'ready');
 f.env.window.close();
});
test('an agent capture that joins a start which fails reports that no photo was taken',async()=>{
 const f=fixture();void f.api.start();await settle();
 const attempt=f.api.takeRequestedPhoto('operation',new AbortController().signal,()=>{});await settle();
 f.next().reject(Error('busy'));
 const result=await attempt;
 assert.equal(result.status,'failed');assert.match(result.summary,/No photo was taken/);assert.equal(f.calls.captures,0);
 f.env.window.close();
});
test('concurrent starts share one preview start',async()=>{
 const f=fixture();const first=f.api.start(),second=f.api.start(true);await settle();
 assert.equal(f.calls.starts,1);f.next().resolve();await Promise.all([first,second]);
 assert.equal(f.api.state().phase,'ready');
 await f.api.start();assert.equal(f.calls.starts,1,'a ready preview is not restarted');
 f.env.window.close();
});
async function ready(f){const starting=f.api.start();await settle();f.next().resolve();await starting;assert.equal(f.api.state().phase,'ready');}
test('a failed camera switch that ended the preview offers a restart instead of staying ready',async()=>{
 const f=fixture();await ready(f);
 await f.api.control(async()=>{throw Error('no second camera');},()=>{throw Error('must not complete');},true);
 assert.equal(f.api.state().phase,'error');assert.equal(f.api.state().controlBusy,false);assert.equal(f.alert().getAttribute('aria-label'),'Camera unavailable');
 f.alert().querySelector('button').click();await settle();assert.equal(f.calls.starts,2);f.next().resolve();await settle();
 assert.equal(f.api.state().phase,'ready');assert.equal(f.alert(),null);
 await f.api.control(async()=>{throw Error('unsupported');},()=>{},false);
 assert.equal(f.api.state().phase,'ready','a control that leaves the preview running keeps it ready');
 f.env.window.close();
});
test('a camera track that ends on its own leaves the ready state and offers a restart',async()=>{
 const f=fixture();f.api.previewLost();assert.equal(f.api.state().phase,'off','nothing to lose before the preview is ready');assert.equal(f.alert(),null);
 await ready(f);const epoch=f.api.state().epoch;
 f.api.previewLost();
 assert.equal(f.api.state().phase,'error');assert.equal(f.api.state().epoch,epoch+1,'work begun under the lost preview is retired');assert.equal(f.alert().getAttribute('aria-label'),'Camera unavailable');
 f.env.window.close();
});
test('keeping a scanned photo: a closed review keeps nothing; a committed photo always refreshes Photos',async()=>{
 const photo={base64:'AAAA',width:4,height:3};
 {
  const f=fixture({browserMode:false}),controller=new AbortController();controller.abort();
  await assert.rejects(f.api.keepScan(photo,controller.signal,f.owner));
  assert.equal(f.calls.kept.length,0,'nothing is committed for a review that already closed');assert.equal(f.api.state().loaded,true);
  f.env.window.close();
 }
 {
  const f=fixture({browserMode:false}),controller=new AbortController(),kept=f.api.keepScan(photo,controller.signal,f.owner);await settle();
  assert.equal(f.calls.kept.length,1);controller.abort();f.next().resolve({status:'saved',id:'77'});
  await assert.rejects(kept);
  assert.equal(f.api.state().loaded,false,'the Photos cache is stale once the photo was committed');assert.equal(f.calls.views.length,0,'a closed review does not navigate');
  f.env.window.close();
 }
 {
  const f=fixture({browserMode:false}),kept=f.api.keepScan(photo,new AbortController().signal,f.owner);await settle();
  f.next().resolve({status:'saved',id:'78'});
  assert.equal(await kept,'Photo kept in Android Photos.');assert.equal(f.api.state().loaded,false);assert.equal(f.calls.views[0][1].nativeCaptureRevision,'native-camera-78');
  f.env.window.close();
 }
 {
  const f=fixture({browserMode:false}),kept=f.api.keepScan(photo,new AbortController().signal,f.owner);await settle();
  f.next().resolve({status:'failed',message:'Storage full.'});
  await assert.rejects(kept,/Storage full/);assert.equal(f.api.state().loaded,true,'an uncommitted keep leaves the cache alone');
  f.env.window.close();
 }
});
test('the browser Camera view hears about an ended track and video rows are read before playback',()=>{
 assert.match(source,/if\(browserMode\)onBrowserPreviewEnded\(previewLost\);/);
 assert.match(source,/if\(browserMode\)onBrowserPreviewEnded\(undefined\);/,'the listener is released with the view');
 assert.match(source,/camera\.switchCamera\(\{ direction: next \}\), \(\) => \{[^\n]*\}, browserMode\); \};/,'only the browser switch ends the preview first');
 assert.match(source,/preview\?\.id === selected\.id && preview\.path \? preview : normalize\(await library\.read/);
});
